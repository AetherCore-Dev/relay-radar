import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

/**
 * Tests for the Verifier's scoreCheck logic and verdict determination.
 * These test the pure functions without network calls.
 */

// We need to import the verifier module to access internal functions via verify()
// Since scoreCheck is not exported, we test it through the public API using mock data.

describe('Verifier — scoreCheck via constants', async () => {
  const { FINGERPRINT_QUESTIONS } = await import('../src/constants.mjs');

  it('has a reasoning_quality scorer question', () => {
    const rq = FINGERPRINT_QUESTIONS.find(q => q.scorer === 'reasoning_quality');
    assert.ok(rq, 'reasoning_quality scorer question must exist');
    assert.equal(rq.id, 'reason-1');
  });

  it('all questions have required fields', () => {
    for (const q of FINGERPRINT_QUESTIONS) {
      assert.ok(q.id, `missing id`);
      assert.ok(q.prompt, `${q.id}: missing prompt`);
      assert.ok(typeof q.weight === 'number' && q.weight > 0, `${q.id}: invalid weight`);
    }
  });

  it('has questions covering multiple categories', () => {
    const categories = new Set(FINGERPRINT_QUESTIONS.map(q => q.category));
    assert.ok(categories.has('reasoning_depth'), 'missing reasoning_depth');
    assert.ok(categories.has('complex_reasoning'), 'missing complex_reasoning');
    assert.ok(categories.has('code_quality'), 'missing code_quality');
  });
});

describe('Verifier — verdict logic', async () => {
  // Import ModelVerifier and test it with a mock relay that will fail
  // to verify the verdict handling for all-failed scenarios

  const { ModelVerifier, FINGERPRINT_QUESTIONS } = await import('../src/index.mjs');

  it('returns inconclusive when all checks fail', async () => {
    const verifier = ModelVerifier({
      questions: [{
        id: 'test-q',
        category: 'test',
        prompt: 'test',
        weight: 1.0,
      }],
      timeout: 2000,
    });

    // Try to verify against a non-existent relay — will fail
    const result = await verifier.verify({
      baseUrl: 'https://this-does-not-exist-12345.example.com',
      apiKey: 'fake',
      model: 'claude-opus-4',
      name: 'test-broken',
    });

    // CRITICAL: must be 'inconclusive', NOT 'fake'
    assert.equal(result.verdict, 'inconclusive');
    assert.ok(result.confidence === 0 || result.confidence < 20);
  });
});

describe('Ranker — indexing fix', async () => {
  const { RelayRanker } = await import('../src/ranker/index.mjs');

  it('correctly maps verify results by relay name', () => {
    const ranker = RelayRanker();

    const probeResults = [
      { name: 'relay-a', alive: true, avgLatency: 500, errorRate: 0, supportsStreaming: true },
    ];

    // Key test: verify result has 'relay' field set to relay name
    const verifyResults = [
      {
        relay: 'relay-a',
        claimedModel: 'claude-opus-4',
        likelyModel: 'claude-opus-4',
        confidence: 85,
        verdict: 'authentic',
      },
    ];

    const billingResults = [
      { relay: 'relay-a', billingScore: 90, verdict: 'fair', systemPromptInjection: { suspicious: false } },
    ];

    const report = ranker.rank(probeResults, verifyResults, billingResults);

    // The authenticity dimension should be 85, NOT the default 50
    assert.equal(report.rankings[0].dimensions.authenticity, 85,
      'Authenticity should come from verify result, not default to 50');
  });

  it('does not create phantom "unknown" entries', () => {
    const ranker = RelayRanker();
    const report = ranker.rank(
      [{ name: 'real-relay', alive: true, avgLatency: 500, errorRate: 0, supportsStreaming: true }],
      [{ relay: 'real-relay', confidence: 80, verdict: 'authentic' }],
      [{ relay: 'real-relay', billingScore: 90, verdict: 'fair' }]
    );
    assert.equal(report.rankings.length, 1);
    assert.equal(report.rankings[0].name, 'real-relay');
  });
});

describe('Analyzer — cacheWrite cost fix', async () => {
  const { TokenAnalyzer } = await import('../src/analyzer/index.mjs');
  const analyzer = TokenAnalyzer();

  it('calculateCost includes cacheWrite', () => {
    const result = analyzer.calculateCost('claude-opus-4', {
      input: 0,
      output: 0,
      cacheRead: 0,
      cacheWrite: 1_000_000,
    });
    assert.ok(result.cacheWriteCost > 0, 'cacheWriteCost must be > 0');
    assert.equal(result.total, result.cacheWriteCost);
  });

  it('analyzeUsage expectedCost includes cacheWrite', () => {
    const records = [{
      model: 'claude-opus-4',
      inputTokens: 0,
      outputTokens: 0,
      cacheReadTokens: 0,
      cacheWriteTokens: 1_000_000,
      cost: 20,
    }];
    const report = analyzer.analyzeUsage(records);
    assert.ok(report.expectedCost > 0, 'expectedCost should include cacheWrite');
  });
});
