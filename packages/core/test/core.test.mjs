import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { RelayConfig } from '../src/config.mjs';
import { SUPPORTED_MODELS, FINGERPRINT_QUESTIONS, RANKING_WEIGHTS, MODEL_PRICING } from '../src/constants.mjs';

describe('RelayConfig', () => {
  it('creates frozen config from input', () => {
    const config = RelayConfig({
      relays: [
        { name: 'test', baseUrl: 'https://api.test.com', apiKey: 'sk-test' },
      ],
    });

    assert.equal(config.relays.length, 1);
    assert.equal(config.relays[0].name, 'test');
    assert.equal(config.relays[0].baseUrl, 'https://api.test.com');
    assert.throws(() => { config.relays = []; }, TypeError);
  });

  it('normalizes URLs', () => {
    const config = RelayConfig({
      relays: [
        { name: 'a', baseUrl: 'api.test.com///', apiKey: 'k' },
      ],
    });
    assert.equal(config.relays[0].baseUrl, 'https://api.test.com');
  });

  it('resolves env var API keys', () => {
    process.env.TEST_RELAY_KEY = 'resolved-key';
    const config = RelayConfig({
      relays: [
        { name: 'a', baseUrl: 'https://api.test.com', apiKey: '${TEST_RELAY_KEY}' },
      ],
    });
    assert.equal(config.relays[0].apiKey, 'resolved-key');
    delete process.env.TEST_RELAY_KEY;
  });

  it('applies default probe config', () => {
    const config = RelayConfig({});
    assert.equal(config.probe.timeout, 30000);
    assert.equal(config.probe.testRounds, 5);
  });

  it('handles empty input', () => {
    const config = RelayConfig();
    assert.equal(config.relays.length, 0);
  });

  it('creates config from env', () => {
    process.env.RELAY_RADAR_ENDPOINTS = JSON.stringify([
      { name: 'env-relay', baseUrl: 'https://env.test.com', apiKey: 'sk-env' },
    ]);
    const config = RelayConfig.fromEnv();
    assert.equal(config.relays.length, 1);
    assert.equal(config.relays[0].name, 'env-relay');
    delete process.env.RELAY_RADAR_ENDPOINTS;
  });
});

describe('Constants', () => {
  it('has valid model definitions', () => {
    assert.ok(Object.keys(SUPPORTED_MODELS).length >= 3);
    for (const [key, model] of Object.entries(SUPPORTED_MODELS)) {
      assert.ok(model.name, `${key} missing name`);
      assert.ok(model.inputPrice > 0, `${key} missing inputPrice`);
      assert.ok(model.outputPrice > 0, `${key} missing outputPrice`);
      assert.ok(model.tier, `${key} missing tier`);
    }
  });

  it('has fingerprint questions with required fields', () => {
    assert.ok(FINGERPRINT_QUESTIONS.length >= 5);
    for (const q of FINGERPRINT_QUESTIONS) {
      assert.ok(q.id, 'missing id');
      assert.ok(q.category, 'missing category');
      assert.ok(q.prompt, 'missing prompt');
      assert.ok(typeof q.weight === 'number', 'missing weight');
    }
  });

  it('has ranking weights that sum to ~1.0', () => {
    const total = Object.values(RANKING_WEIGHTS).reduce((a, b) => a + b, 0);
    assert.ok(Math.abs(total - 1.0) < 0.01, `weights sum to ${total}, expected ~1.0`);
  });

  it('has pricing for all models', () => {
    for (const key of Object.keys(SUPPORTED_MODELS)) {
      assert.ok(MODEL_PRICING[key], `missing pricing for ${key}`);
      assert.ok(MODEL_PRICING[key].input > 0);
      assert.ok(MODEL_PRICING[key].output > 0);
    }
  });
});

describe('TokenAnalyzer.calculateCost', async () => {
  const { TokenAnalyzer } = await import('../src/analyzer/index.mjs');
  const analyzer = TokenAnalyzer();

  it('calculates opus cost correctly', () => {
    const result = analyzer.calculateCost('claude-opus-4', {
      input: 1_000_000,
      output: 1_000_000,
    });
    assert.equal(result.inputCost, 15);
    assert.equal(result.outputCost, 75);
    assert.equal(result.total, 90);
  });

  it('calculates sonnet cost correctly', () => {
    const result = analyzer.calculateCost('claude-sonnet-4', {
      input: 1_000_000,
      output: 1_000_000,
    });
    assert.equal(result.inputCost, 3);
    assert.equal(result.outputCost, 15);
  });

  it('includes CNY conversion', () => {
    const result = analyzer.calculateCost('claude-sonnet-4', {
      input: 100_000,
      output: 50_000,
    });
    assert.ok(result.totalCNY > 0);
  });

  it('handles zero tokens', () => {
    const result = analyzer.calculateCost('claude-opus-4', {
      input: 0,
      output: 0,
    });
    assert.equal(result.total, 0);
  });
});

describe('TokenAnalyzer.analyzeUsage', async () => {
  const { TokenAnalyzer } = await import('../src/analyzer/index.mjs');
  const analyzer = TokenAnalyzer();

  it('returns empty report for no data', () => {
    const report = analyzer.analyzeUsage([]);
    assert.equal(report.totalCost, 0);
    assert.equal(report.recommendations.length, 0);
  });

  it('generates recommendations for low cache rate', () => {
    const records = Array.from({ length: 10 }, () => ({
      model: 'claude-opus-4',
      inputTokens: 10000,
      outputTokens: 5000,
      cacheReadTokens: 0,
      cost: 0.5,
    }));
    const report = analyzer.analyzeUsage(records);
    const cacheRec = report.recommendations.find((r) => r.id === 'low-cache');
    assert.ok(cacheRec, 'should recommend improving cache');
  });

  it('suggests model downgrade for simple Opus tasks', () => {
    const records = Array.from({ length: 10 }, () => ({
      model: 'claude-opus-4',
      inputTokens: 1000,
      outputTokens: 50, // Very short output = simple task
      cacheReadTokens: 0,
      cost: 0.1,
    }));
    const report = analyzer.analyzeUsage(records);
    const downgradeRec = report.recommendations.find((r) => r.id === 'model-downgrade');
    assert.ok(downgradeRec, 'should suggest model downgrade');
  });
});

describe('RelayRanker', async () => {
  const { RelayRanker } = await import('../src/ranker/index.mjs');

  it('ranks relays by score descending', () => {
    const ranker = RelayRanker();

    const probeResults = [
      { name: 'relay-a', alive: true, avgLatency: 500, avgTTFT: 300, avgThroughput: 30, errorRate: 0, supportsStreaming: true },
      { name: 'relay-b', alive: true, avgLatency: 3000, avgTTFT: 1500, avgThroughput: 10, errorRate: 0.2, supportsStreaming: false },
    ];

    const verifyResults = [
      { relay: 'relay-a', claimedModel: 'claude-opus-4', likelyModel: 'claude-opus-4', confidence: 90, verdict: 'authentic' },
      { relay: 'relay-b', claimedModel: 'claude-opus-4', likelyModel: 'claude-sonnet-4', confidence: 75, verdict: 'fake' },
    ];

    const billingResults = [
      { relay: 'relay-a', billingScore: 90, verdict: 'fair', systemPromptInjection: { suspicious: false } },
      { relay: 'relay-b', billingScore: 40, verdict: 'unfair', systemPromptInjection: { suspicious: true } },
    ];

    const report = ranker.rank(probeResults, verifyResults, billingResults);

    assert.equal(report.rankings.length, 2);
    assert.equal(report.rankings[0].name, 'relay-a');
    assert.ok(report.rankings[0].overallScore > report.rankings[1].overallScore);
  });

  it('formats table output', () => {
    const ranker = RelayRanker();
    const report = ranker.rank(
      [{ name: 'test', alive: true, avgLatency: 1000, errorRate: 0, supportsStreaming: true }],
      [],
      []
    );
    const table = ranker.formatTable(report);
    assert.ok(table.includes('test'));
    assert.ok(table.includes('排名'));
  });
});
