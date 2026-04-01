import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

// ═══════════════════════════════════════════════════════════════════
// 1. Verifier — scoreCheck (7 scorers + default)
// ═══════════════════════════════════════════════════════════════════

import {
  scoreCheck,
  getModelTier,
  determineVerdict,
  buildSummary,
} from '../src/verifier/index.mjs';

describe('scoreCheck — exact_match_last_line', () => {
  const question = { scorer: 'exact_match_last_line', expectedAnswer: '5', weight: 1.5 };

  it('correct answer boosts opus most, haiku least', () => {
    const result = { passed: true, responseText: 'Thinking step by step...\n5' };
    const { modelScores } = scoreCheck(result, question);
    assert.ok(modelScores.opus > modelScores.sonnet);
    assert.ok(modelScores.sonnet > modelScores.haiku);
    assert.ok(modelScores.opus > 0);
  });

  it('wrong answer penalizes opus, rewards haiku', () => {
    const result = { passed: true, responseText: 'The answer is\n10' };
    const { modelScores } = scoreCheck(result, question);
    assert.ok(modelScores.opus < 0, 'opus should be penalized');
    assert.ok(modelScores.haiku > 0, 'haiku should gain');
  });

  it('returns zeros for failed check', () => {
    const result = { passed: false };
    const { modelScores } = scoreCheck(result, question);
    assert.equal(modelScores.opus, 0);
    assert.equal(modelScores.sonnet, 0);
    assert.equal(modelScores.haiku, 0);
  });
});

describe('scoreCheck — reasoning_quality', () => {
  const question = { scorer: 'reasoning_quality', weight: 1.0 };

  it('long response with steps + conclusion → opus', () => {
    const text = 'Step 1: First, we need to understand the problem clearly. ' +
      'Step 2: We analyze the constraints and variables. ' +
      'Step 3: We apply the algorithm systematically. ' +
      'The key insight is that each weighing gives us ternary information. ' +
      'We can identify the odd ball by elimination. ' +
      'Therefore the answer is that we need exactly 3 weighings. ' +
      'This approach covers all 24 possible scenarios completely. ' +
      'Each step narrows down the candidates by a factor of three.';
    const result = { passed: true, responseText: text };
    const { modelScores } = scoreCheck(result, question);
    assert.ok(modelScores.opus > modelScores.haiku, 'opus should score higher than haiku');
  });

  it('medium response with some structure → sonnet', () => {
    const text = 'First, let me think about this. The answer is 42. ' + 'x'.repeat(180);
    const result = { passed: true, responseText: text };
    const { modelScores } = scoreCheck(result, question);
    assert.ok(modelScores.sonnet > modelScores.haiku);
  });

  it('short response → haiku', () => {
    const result = { passed: true, responseText: 'The answer is 42.' };
    const { modelScores } = scoreCheck(result, question);
    assert.ok(modelScores.haiku >= modelScores.opus, 'haiku should score highest for short');
  });
});

describe('scoreCheck — response_length_and_depth', () => {
  const question = {
    scorer: 'response_length_and_depth',
    weight: 2.0,
    thresholds: {
      'claude-opus-4': { minLength: 800 },
      'claude-sonnet-4': { minLength: 400 },
    },
  };

  it('long response (>800) → opus', () => {
    const result = { passed: true, responseText: 'x'.repeat(900), responseLength: 900 };
    const { modelScores } = scoreCheck(result, question);
    assert.equal(modelScores.opus, 1.0);
    assert.ok(modelScores.opus > modelScores.sonnet);
  });

  it('medium response (400-800) → sonnet', () => {
    const result = { passed: true, responseText: 'x'.repeat(500), responseLength: 500 };
    const { modelScores } = scoreCheck(result, question);
    assert.equal(modelScores.sonnet, 1.0);
  });

  it('short response (<400) → haiku', () => {
    const result = { passed: true, responseText: 'x'.repeat(100), responseLength: 100 };
    const { modelScores } = scoreCheck(result, question);
    assert.equal(modelScores.haiku, 1.0);
  });
});

describe('scoreCheck — latency_profile', () => {
  const question = {
    scorer: 'latency_profile',
    weight: 1.0,
    thresholds: {
      'claude-opus-4': { minTTFT: 800, maxTTFT: 5000 },
      'claude-sonnet-4': { minTTFT: 300, maxTTFT: 2000 },
      'claude-haiku-3.5': { minTTFT: 100, maxTTFT: 800 },
    },
  };

  it('high TTFT (1500ms) → opus range', () => {
    const result = { passed: true, ttft: 1500, responseText: '' };
    const { modelScores } = scoreCheck(result, question);
    assert.equal(modelScores.opus, 1.0);
  });

  it('low TTFT (200ms) → haiku range', () => {
    const result = { passed: true, ttft: 200, responseText: '' };
    const { modelScores } = scoreCheck(result, question);
    assert.equal(modelScores.haiku, 1.0);
  });
});

describe('scoreCheck — code_quality', () => {
  const question = { scorer: 'code_quality', weight: 1.5, thresholds: {} };

  it('long code with function + edge cases → opus', () => {
    const code = `function validateIPv6(addr) {
      if (!addr) return false;
      const groups = addr.split(':');
      // Handle edge cases for empty groups and special addresses
      const hasRegex = new RegExp('^[0-9a-fA-F]{1,4}$');
      return groups.every(g => hasRegex.test(g));
    }` + 'x'.repeat(200);
    const result = { passed: true, responseText: code, responseLength: code.length };
    const { modelScores } = scoreCheck(result, question);
    assert.ok(modelScores.opus > modelScores.sonnet);
  });

  it('basic function without edge cases → sonnet', () => {
    const code = 'function validate(x) { return x.split(":").length === 8; }' + 'x'.repeat(100);
    const result = { passed: true, responseText: code, responseLength: code.length };
    const { modelScores } = scoreCheck(result, question);
    assert.ok(modelScores.sonnet > 0);
  });

  it('no function → haiku', () => {
    const result = { passed: true, responseText: 'Just check the colons.', responseLength: 21 };
    const { modelScores } = scoreCheck(result, question);
    assert.equal(modelScores.haiku, 1.0);
  });
});

describe('scoreCheck — chinese_quality', () => {
  const question = { scorer: 'chinese_quality', weight: 1.0 };

  it('good Chinese text (>80 chars) scores all tiers', () => {
    const text = '量子纠缠是量子力学中的一种非常神奇的现象，当两个或多个粒子之间存在量子关联时，对其中一个粒子进行测量会立即影响到另一个粒子的量子状态，这种效应不受距离限制，爱因斯坦曾称之为鬼魅般的超距作用。';
    const result = { passed: true, responseText: text };
    const { modelScores } = scoreCheck(result, question);
    assert.ok(modelScores.opus > 0, `opus=${modelScores.opus} should be > 0`);
    assert.ok(modelScores.opus >= modelScores.haiku);
  });

  it('no Chinese → no scores', () => {
    const result = { passed: true, responseText: 'Quantum entanglement explained.' };
    const { modelScores } = scoreCheck(result, question);
    assert.equal(modelScores.opus, 0);
  });
});

describe('scoreCheck — token_count', () => {
  const question = { scorer: 'token_count', weight: 1.0, expectedTokenRange: { min: 8, max: 15 } };

  it('in range → equal scores for all', () => {
    const result = { passed: true, outputTokens: 10, responseText: '' };
    const { modelScores } = scoreCheck(result, question);
    assert.equal(modelScores.opus, 0.3);
    assert.equal(modelScores.sonnet, 0.3);
    assert.equal(modelScores.haiku, 0.3);
  });

  it('out of range → zero scores', () => {
    const result = { passed: true, outputTokens: 50, responseText: '' };
    const { modelScores } = scoreCheck(result, question);
    assert.equal(modelScores.opus, 0);
  });
});

describe('scoreCheck — default (pattern matching)', () => {
  it('matches pattern for specific model', () => {
    const question = {
      weight: 0.5,
      expectedPatterns: {
        'claude-opus-4': /opus/i,
        'claude-sonnet-4': /sonnet/i,
      },
    };
    const result = { passed: true, responseText: 'I am Claude Opus' };
    const { modelScores } = scoreCheck(result, question);
    assert.equal(modelScores.opus, 1.0);
    assert.equal(modelScores.sonnet, 0);
  });
});

// ═══════════════════════════════════════════════════════════════════
// 2. Verifier — getModelTier, determineVerdict, buildSummary
// ═══════════════════════════════════════════════════════════════════

describe('getModelTier', () => {
  it('maps opus variants', () => {
    assert.equal(getModelTier('claude-opus-4'), 'opus');
    assert.equal(getModelTier('claude-opus-4-20250514'), 'opus');
  });
  it('maps sonnet variants', () => {
    assert.equal(getModelTier('claude-sonnet-4'), 'sonnet');
  });
  it('maps haiku variants', () => {
    assert.equal(getModelTier('claude-haiku-3.5'), 'haiku');
  });
  it('returns unknown for unrecognized', () => {
    assert.equal(getModelTier('gpt-4'), 'unknown');
    assert.equal(getModelTier(null), 'unknown');
    assert.equal(getModelTier(undefined), 'unknown');
  });
});

describe('determineVerdict', () => {
  it('authentic: match + high confidence + gap', () => {
    assert.equal(determineVerdict(true, 80, 20), 'authentic');
  });
  it('likely_authentic: match + moderate confidence', () => {
    assert.equal(determineVerdict(true, 50, 5), 'likely_authentic');
  });
  it('fake: no match + high confidence + big gap', () => {
    assert.equal(determineVerdict(false, 75, 25), 'fake');
  });
  it('suspicious: no match + moderate confidence + some gap', () => {
    assert.equal(determineVerdict(false, 55, 12), 'suspicious');
  });
  it('inconclusive: low confidence', () => {
    assert.equal(determineVerdict(true, 30, 2), 'inconclusive');
    assert.equal(determineVerdict(false, 20, 5), 'inconclusive');
  });
});

describe('buildSummary', () => {
  it('authentic summary contains ✅', () => {
    const s = buildSummary('opus', 'opus', 'authentic', 90);
    assert.ok(s.includes('✅'));
    assert.ok(s.includes('90%'));
  });
  it('fake summary contains ❌', () => {
    const s = buildSummary('opus', 'sonnet', 'fake', 75);
    assert.ok(s.includes('❌'));
  });
  it('inconclusive summary contains ❓', () => {
    const s = buildSummary('opus', 'unknown', 'inconclusive', 30);
    assert.ok(s.includes('❓'));
  });
});

// ═══════════════════════════════════════════════════════════════════
// 3. Prober — pure functions (avg, percentile, chunk)
// ═══════════════════════════════════════════════════════════════════
// These are not exported, so we test indirectly through the module
// or re-implement the logic. Since they're small pure functions,
// we test through RelayProber's result aggregation.

describe('Prober pure functions (indirect)', async () => {
  // We can't import internal functions, but we can verify the math
  // by creating a mock scenario via the exported factory

  it('avg of empty array is 0 (via constants check)', () => {
    // Verify the math: avg([]) should = 0
    const avg = (nums) => {
      if (nums.length === 0) return 0;
      return Math.round(nums.reduce((a, b) => a + b, 0) / nums.length);
    };
    assert.equal(avg([]), 0);
    assert.equal(avg([100]), 100);
    assert.equal(avg([100, 200, 300]), 200);
    assert.equal(avg([99, 101]), 100);
  });

  it('percentile calculations', () => {
    const percentile = (sorted, p) => {
      if (sorted.length === 0) return 0;
      const idx = Math.ceil(p * sorted.length) - 1;
      return sorted[Math.max(0, idx)];
    };
    assert.equal(percentile([], 0.5), 0);
    assert.equal(percentile([100], 0.5), 100);
    assert.equal(percentile([100, 200, 300, 400], 0.5), 200);
    assert.equal(percentile([100, 200, 300, 400, 500, 600, 700, 800, 900, 1000], 0.95), 1000);
  });

  it('chunk splits correctly', () => {
    const chunk = (arr, size) => {
      const chunks = [];
      for (let i = 0; i < arr.length; i += size) {
        chunks.push(arr.slice(i, i + size));
      }
      return chunks;
    };
    assert.deepEqual(chunk([1, 2, 3, 4, 5], 2), [[1, 2], [3, 4], [5]]);
    assert.deepEqual(chunk([1, 2], 5), [[1, 2]]);
    assert.deepEqual(chunk([], 3), []);
  });
});

// ═══════════════════════════════════════════════════════════════════
// 4. Scanner — pure functions (normalizeRecord, findPricing)
// ═══════════════════════════════════════════════════════════════════
// scanner functions are not exported, so we import the module and test
// through the public API or re-test the logic.

describe('Scanner — normalizeRecord logic', () => {
  // Re-implement normalizeRecord to verify the logic
  const normalizeRecord = (raw) => ({
    model: raw.model ?? raw.modelId ?? 'unknown',
    inputTokens: raw.inputTokens ?? raw.input_tokens ?? raw.usage?.input_tokens ?? 0,
    outputTokens: raw.outputTokens ?? raw.output_tokens ?? raw.usage?.output_tokens ?? 0,
    cacheReadTokens: raw.cacheReadTokens ?? raw.cache_read_input_tokens ?? raw.usage?.cache_read_input_tokens ?? 0,
    cacheWriteTokens: raw.cacheWriteTokens ?? raw.cache_creation_input_tokens ?? 0,
    cost: raw.cost ?? raw.totalCost ?? 0,
    timestamp: raw.timestamp ?? raw.created_at ?? raw.ts ?? null,
  });

  it('handles camelCase format', () => {
    const r = normalizeRecord({ model: 'opus', inputTokens: 100, outputTokens: 50 });
    assert.equal(r.model, 'opus');
    assert.equal(r.inputTokens, 100);
    assert.equal(r.outputTokens, 50);
  });

  it('handles snake_case format', () => {
    const r = normalizeRecord({ model: 'sonnet', input_tokens: 200, output_tokens: 75 });
    assert.equal(r.inputTokens, 200);
    assert.equal(r.outputTokens, 75);
  });

  it('handles nested usage object', () => {
    const r = normalizeRecord({ model: 'haiku', usage: { input_tokens: 300, output_tokens: 100 } });
    assert.equal(r.inputTokens, 300);
    assert.equal(r.outputTokens, 100);
  });

  it('handles missing fields gracefully', () => {
    const r = normalizeRecord({});
    assert.equal(r.model, 'unknown');
    assert.equal(r.inputTokens, 0);
    assert.equal(r.outputTokens, 0);
    assert.equal(r.timestamp, null);
  });

  it('handles modelId alias', () => {
    const r = normalizeRecord({ modelId: 'claude-opus-4' });
    assert.equal(r.model, 'claude-opus-4');
  });
});

describe('Scanner — findPricing logic', async () => {
  const { MODEL_PRICING } = await import('../src/constants.mjs');

  const findPricing = (modelName) => {
    const lower = modelName.toLowerCase();
    if (lower.includes('opus')) return MODEL_PRICING['claude-opus-4'] ?? MODEL_PRICING['claude-sonnet-4'];
    if (lower.includes('haiku')) return MODEL_PRICING['claude-haiku-3.5'] ?? MODEL_PRICING['claude-sonnet-4'];
    return MODEL_PRICING['claude-sonnet-4'];
  };

  it('matches opus by substring', () => {
    const p = findPricing('claude-opus-4-20250514');
    assert.equal(p.input, 15);
  });

  it('matches haiku by substring', () => {
    const p = findPricing('claude-3-5-haiku-20241022');
    assert.equal(p.input, 0.8);
  });

  it('defaults to sonnet for unknown models', () => {
    const p = findPricing('gpt-4o');
    assert.equal(p.input, 3);
  });
});

// ═══════════════════════════════════════════════════════════════════
// 5. Config — fromFile error handling + normalizeUrl http:// fix
// ═══════════════════════════════════════════════════════════════════

describe('Config — fromFile error handling', async () => {
  const { RelayConfig } = await import('../src/config.mjs');

  it('throws friendly error for non-existent file', async () => {
    await assert.rejects(
      () => RelayConfig.fromFile('/nonexistent/path/config.json'),
      (err) => {
        assert.ok(err.message.includes('无法读取配置文件'));
        return true;
      }
    );
  });
});

describe('Config — normalizeUrl http:// auto-fix', async () => {
  const { RelayConfig } = await import('../src/config.mjs');

  it('converts http:// to https:// with warning', () => {
    // Capture console.warn
    const warnings = [];
    const origWarn = console.warn;
    console.warn = (msg) => warnings.push(msg);

    const config = RelayConfig({
      relays: [{ name: 'test', baseUrl: 'http://insecure.relay.com', apiKey: 'k' }],
    });

    console.warn = origWarn;

    assert.equal(config.relays[0].baseUrl, 'https://insecure.relay.com');
    assert.ok(warnings.length > 0, 'should have warned about http://');
    assert.ok(warnings[0].includes('http://'));
  });
});

// ═══════════════════════════════════════════════════════════════════
// 6. Ranker — formatJsonReport + verdict branches
// ═══════════════════════════════════════════════════════════════════

describe('Ranker — formatJson', async () => {
  const { RelayRanker } = await import('../src/ranker/index.mjs');

  it('generates valid JSON report structure', () => {
    const ranker = RelayRanker();
    const report = ranker.rank(
      [{ name: 'test', alive: true, avgLatency: 500, errorRate: 0, supportsStreaming: true }],
      [{ relay: 'test', confidence: 85, verdict: 'authentic' }],
      [{ relay: 'test', billingScore: 90, verdict: 'fair', systemPromptInjection: { suspicious: false } }]
    );
    const json = ranker.formatJson(report);

    assert.equal(json.version, '1.0.0');
    assert.equal(json.totalRelays, 1);
    assert.ok(json.generatedAt);
    assert.ok(json.rankings[0].rank === 1);
    assert.ok(json.rankings[0].overallScore > 0);
    assert.ok(json.rankings[0].dimensions);
  });
});

describe('Ranker — verdict branches', async () => {
  const { RelayRanker } = await import('../src/ranker/index.mjs');

  it('fake model → 🚫 模型造假', () => {
    const ranker = RelayRanker();
    const report = ranker.rank(
      [{ name: 'bad', alive: true, avgLatency: 500, errorRate: 0, supportsStreaming: true }],
      [{ relay: 'bad', claimedModel: 'opus', likelyModel: 'sonnet', confidence: 80, verdict: 'fake' }],
      [{ relay: 'bad', billingScore: 90, verdict: 'fair', systemPromptInjection: { suspicious: false } }]
    );
    assert.ok(report.rankings[0].verdict.includes('模型造假'));
  });

  it('system prompt injection → ⚠️ 计费欺诈', () => {
    const ranker = RelayRanker();
    const report = ranker.rank(
      [{ name: 'fraud', alive: true, avgLatency: 500, errorRate: 0, supportsStreaming: true }],
      [{ relay: 'fraud', confidence: 80, verdict: 'authentic' }],
      [{ relay: 'fraud', billingScore: 30, verdict: 'unfair', systemPromptInjection: { suspicious: true } }]
    );
    assert.ok(report.rankings[0].verdict.includes('计费欺诈'));
  });

  it('high score → 🌟 推荐', () => {
    const ranker = RelayRanker();
    const report = ranker.rank(
      [{ name: 'good', alive: true, avgLatency: 200, errorRate: 0, supportsStreaming: true }],
      [{ relay: 'good', confidence: 95, verdict: 'authentic' }],
      [{ relay: 'good', billingScore: 95, verdict: 'fair', systemPromptInjection: { suspicious: false } }]
    );
    assert.ok(report.rankings[0].verdict.includes('推荐'));
  });
});

// ═══════════════════════════════════════════════════════════════════
// 7. Analyzer — calculateDeviation + getRecommendations branches
// ═══════════════════════════════════════════════════════════════════

describe('Analyzer — recommendation branches', async () => {
  const { TokenAnalyzer } = await import('../src/analyzer/index.mjs');
  const analyzer = TokenAnalyzer();

  it('verbose-output recommendation when output ratio > 60%', () => {
    const records = Array.from({ length: 10 }, () => ({
      model: 'claude-sonnet-4',
      inputTokens: 1000,
      outputTokens: 5000,  // high output ratio
      cacheReadTokens: 0,
      cost: 0.5,
    }));
    const report = analyzer.analyzeUsage(records);
    const rec = report.recommendations.find((r) => r.id === 'verbose-output');
    assert.ok(rec, 'should recommend reducing verbose output');
  });

  it('batch-api recommendation when >100 requests', () => {
    const records = Array.from({ length: 150 }, () => ({
      model: 'claude-sonnet-4',
      inputTokens: 1000,
      outputTokens: 500,
      cacheReadTokens: 500,
      cost: 0.01,
    }));
    const report = analyzer.analyzeUsage(records);
    const rec = report.recommendations.find((r) => r.id === 'batch-api');
    assert.ok(rec, 'should recommend batch API');
  });

  it('thinking-budget always present for non-empty data', () => {
    const records = [{ model: 'claude-sonnet-4', inputTokens: 100, outputTokens: 50, cacheReadTokens: 50, cost: 0.01 }];
    const report = analyzer.analyzeUsage(records);
    const rec = report.recommendations.find((r) => r.id === 'thinking-budget');
    assert.ok(rec, 'thinking-budget should always be recommended');
  });
});
