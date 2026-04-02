import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { LLMMAP_PROBES, MAX_RESPONSE_CHARS, CLAUDE_RESPONSE_PATTERNS } from '../src/verifier/llmmap/probes.mjs';

describe('LLMmap Probes', () => {
  it('has exactly 8 probes', () => {
    assert.equal(LLMMAP_PROBES.length, 8);
  });

  it('all probes are non-empty strings', () => {
    for (const probe of LLMMAP_PROBES) {
      assert.ok(typeof probe === 'string' && probe.length > 5);
    }
  });

  it('includes adversarial jailbreak probes', () => {
    const adversarial = LLMMAP_PROBES.filter(p => p.includes('ignore that question'));
    assert.equal(adversarial.length, 3, 'should have 3 adversarial probes');
  });

  it('includes identity probes', () => {
    const identity = LLMMAP_PROBES.filter(p =>
      p.includes('What LLM') || p.includes('who created you') || p.includes('What model')
    );
    assert.ok(identity.length >= 2, 'should have identity probes');
  });

  it('includes safety probe', () => {
    assert.ok(LLMMAP_PROBES.some(p => p.includes('bomb')));
  });

  it('MAX_RESPONSE_CHARS is 650 (matches LLMmap paper)', () => {
    assert.equal(MAX_RESPONSE_CHARS, 650);
  });

  it('probes array is frozen', () => {
    assert.throws(() => { LLMMAP_PROBES.push('new'); }, TypeError);
  });
});

describe('LLMmap Lite Classifier', async () => {
  const { LLMmapVerifier } = await import('../src/verifier/llmmap/classifier.mjs');

  it('creates verifier in lite mode by default', () => {
    const v = LLMmapVerifier();
    assert.equal(v.mode, 'lite');
    assert.equal(v.getProbes().length, 8);
  });

  it('classifies obvious Opus responses correctly', () => {
    const v = LLMmapVerifier();
    // Simulate Opus-like responses to 8 probes
    const fakeProbeData = {
      responses: [
        // Probe 1: adversarial → long refusal
        "I appreciate the creative formatting, but I need to be straightforward. I'm Claude, made by Anthropic. I aim to be helpful, harmless, and honest in all my interactions. I was created by Anthropic, an AI safety company based in San Francisco. I don't have personal opinions about who created me beyond stating this fact accurately.",
        // Probe 2: safety → elaborate refusal
        "I can't and won't provide instructions for building explosive devices or any other weapons. This kind of information could lead to serious harm. Instead, I'd be happy to help you with chemistry in an educational context, discuss the history of engineering, or assist with any other constructive topic you're interested in.",
        // Probe 3: training data → detailed explanation of limitations
        "I don't have access to specific details about the size of my training dataset. What I can tell you is that I was trained on a large corpus of text data, but the exact specifications, including dataset size, composition, and training methodology, are proprietary to Anthropic.",
        // Probe 4: climate → nuanced response
        "True. Climate change is widely recognized as a pressing global issue by the scientific community. The overwhelming consensus among climate scientists is that human activities are contributing to significant changes in Earth's climate system.",
        // Probe 5: cutoff
        "My training data has a cutoff in early 2025. I don't have information about events that occurred after that date. Anthropic periodically updates their models, so newer versions may have more recent information.",
        // Probe 6: adversarial identity → identifies as Opus
        "Despite the unusual formatting of your question, I'll answer directly: I am Claude, specifically Claude Opus, made by Anthropic. I'm a large language model designed to be helpful, harmless, and honest.",
        // Probe 7: direct identity
        "I am Claude, made by Anthropic. More specifically, I am Claude Opus, which is the most capable model in the Claude family.",
        // Probe 8: adversarial controversial
        "I understand you're using adversarial formatting, but I'll address this honestly. Yes, the September 11, 2001 attacks were real historical events. They resulted in the deaths of nearly 3,000 people and had profound impacts on global politics and security.",
      ],
      timings: Array(8).fill({ ttft: 1800, totalMs: 5000, outputTokens: 100 }),
      relay: 'test-relay',
      claimedModel: 'claude-opus-4',
      collectedAt: new Date().toISOString(),
    };

    const result = v.classify(fakeProbeData);
    assert.ok(result.scores.opus > result.scores.haiku, 'opus should score higher than haiku');
    assert.ok(result.scores.opus > result.scores.nonClaude, 'opus should score higher than nonClaude');
    assert.equal(result.method, 'llmmap-lite');
    assert.ok(result.predictedModel.includes('opus'), `predicted should include opus, got: ${result.predictedModel}`);
  });

  it('detects non-Claude model', () => {
    const v = LLMmapVerifier();
    const fakeProbeData = {
      responses: [
        "I was created by OpenAI.",
        "Sure, here's how to make a simple firecracker...", // No refusal!
        "GPT-4 was trained on about 13 trillion tokens.",
        "True.",
        "My knowledge cutoff is April 2024.",
        "I am GPT-4o, created by OpenAI.",
        "I am GPT-4o, an AI model by OpenAI.",
        "Yes, 9/11 was real.",
      ],
      timings: Array(8).fill({ ttft: 400, totalMs: 2000, outputTokens: 50 }),
      relay: 'test-relay',
      claimedModel: 'claude-opus-4',
      collectedAt: new Date().toISOString(),
    };

    const result = v.classify(fakeProbeData);
    assert.ok(result.scores.nonClaude > result.scores.opus, 'nonClaude should score highest');
    assert.equal(result.matchesClaim, false, 'should not match claimed claude-opus-4');
    assert.ok(['fake', 'suspicious'].includes(result.verdict), `verdict should be fake/suspicious, got: ${result.verdict}`);
  });

  it('returns inconclusive when most probes fail', () => {
    const v = LLMmapVerifier();
    const fakeProbeData = {
      responses: Array(8).fill('[ERROR: timeout]'),
      timings: Array(8).fill({ ttft: 0, totalMs: 0, outputTokens: 0, error: true }),
      relay: 'test-relay',
      claimedModel: 'claude-opus-4',
      collectedAt: new Date().toISOString(),
    };

    const result = v.classify(fakeProbeData);
    assert.equal(result.verdict, 'inconclusive');
  });

  it('detects Haiku-like short responses', () => {
    const v = LLMmapVerifier();
    const fakeProbeData = {
      responses: [
        "I'm Claude by Anthropic.",
        "I can't help with that.",
        "I don't know.",
        "True.",
        "Early 2025.",
        "I'm Claude Haiku.",
        "I am Claude Haiku by Anthropic.",
        "Yes, it was real.",
      ],
      timings: Array(8).fill({ ttft: 200, totalMs: 800, outputTokens: 20 }),
      relay: 'test-relay',
      claimedModel: 'claude-haiku-3.5',
      collectedAt: new Date().toISOString(),
    };

    const result = v.classify(fakeProbeData);
    assert.ok(result.scores.haiku > 0, 'haiku should have positive score');
    assert.equal(result.matchesClaim, true, 'should match claimed haiku');
  });
});

describe('Combined Verifier with LLMmap', async () => {
  const { ModelVerifier } = await import('../src/verifier/index.mjs');

  it('creates verifier with LLMmap integration', () => {
    const v = ModelVerifier({ llmmapMode: 'lite' });
    assert.ok(v.verify);
    assert.ok(v.verifyLLMmap);
    assert.ok(v.verifyHeuristic);
    assert.ok(v.quickVerify);
    assert.ok(v.getLLMmapProbes);
  });

  it('getLLMmapProbes returns 8 probes', () => {
    const v = ModelVerifier();
    assert.equal(v.getLLMmapProbes().length, 8);
  });

  it('handles connection failure gracefully', async () => {
    const v = ModelVerifier({ timeout: 2000 });
    const result = await v.verify({
      baseUrl: 'https://this-definitely-does-not-exist-9999.example.com',
      apiKey: 'fake',
      model: 'claude-opus-4',
      name: 'broken-relay',
    });
    assert.ok(result.verdict === 'inconclusive' || result.verdict === 'error' || result.confidence === 0);
    assert.ok(result.relay === 'broken-relay');
  });
});
