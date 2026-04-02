/**
 * ModelVerifier — Verify model authenticity through fingerprinting
 *
 * Two verification engines:
 *   1. LLMmap (primary) — Based on USENIX Security 2025 paper, >95% accuracy
 *   2. Heuristic (fallback) — Custom reasoning/code/latency checks
 *
 * LLMmap sends 8 standardized probe queries and analyzes response patterns.
 * Heuristic uses reasoning puzzles, code generation, and timing analysis.
 * Both results are combined for the final verdict.
 */

import { FINGERPRINT_QUESTIONS, SUPPORTED_MODELS } from '../constants.mjs';
import { sendRequest, sanitize } from '../shared/http-client.mjs';
import { LLMmapVerifier } from './llmmap/index.mjs';

export function ModelVerifier(options = {}) {
  const timeout = options.timeout ?? 60000;
  const questionSubset = options.questions ?? FINGERPRINT_QUESTIONS;
  const llmmapMode = options.llmmapMode ?? 'lite';
  const llmmapOpts = {
    mode: llmmapMode,
    pythonPath: options.pythonPath,
    llmmapDir: options.llmmapDir,
    timeout,
  };

  return Object.freeze({
    /**
     * Full verification: LLMmap probes + heuristic checks.
     * LLMmap result takes priority; heuristic provides supporting evidence.
     */
    verify: (relay) => combinedVerify(relay, questionSubset, timeout, llmmapOpts),

    /** LLMmap-only verification (8 probes, fastest) */
    verifyLLMmap: (relay) => {
      const v = LLMmapVerifier(llmmapOpts);
      return v.verify(relay);
    },

    /** Heuristic-only verification (legacy, 8 custom questions) */
    verifyHeuristic: (relay) => verifyModel(relay, questionSubset, timeout),

    /** Quick check — LLMmap lite only */
    quickVerify: (relay) => {
      const v = LLMmapVerifier({ ...llmmapOpts, mode: 'lite' });
      return v.verify(relay);
    },

    /** Get the probe queries for inspection */
    getQuestions: () => Object.freeze([...questionSubset]),

    /** Get LLMmap probes */
    getLLMmapProbes: () => {
      const v = LLMmapVerifier(llmmapOpts);
      return v.getProbes();
    },
  });
}

/**
 * Combined verification: run LLMmap + heuristic, merge results.
 */
async function combinedVerify(relay, questions, timeout, llmmapOpts) {
  // Run LLMmap and heuristic in parallel
  const [llmmapResult, heuristicResult] = await Promise.allSettled([
    LLMmapVerifier(llmmapOpts).verify(relay),
    verifyModel(relay, questions, timeout),
  ]);

  const llmmap = llmmapResult.status === 'fulfilled' ? llmmapResult.value : null;
  const heuristic = heuristicResult.status === 'fulfilled' ? heuristicResult.value : null;

  // Merge: LLMmap is primary, heuristic is supporting
  if (llmmap && heuristic) {
    const agreed = (llmmap.verdict === heuristic.verdict) ||
      (llmmap.matchesClaim === (heuristic.verdict === 'authentic' || heuristic.verdict === 'likely_authentic'));

    const finalVerdict = agreed
      ? llmmap.verdict
      : llmmap.confidence > heuristic.confidence ? llmmap.verdict : 'inconclusive';

    const finalConfidence = agreed
      ? Math.min(99, Math.round((llmmap.confidence + heuristic.confidence) / 2 * 1.2))
      : Math.round((llmmap.confidence + heuristic.confidence) / 2 * 0.8);

    return Object.freeze({
      relay: relay.name ?? relay.baseUrl,
      claimedModel: relay.model ?? 'unknown',
      predictedModel: llmmap.predictedModel,
      confidence: finalConfidence,
      verdict: finalVerdict,
      method: 'combined',
      agreement: agreed,
      llmmap: Object.freeze(llmmap),
      heuristic: Object.freeze(heuristic),
      summary: buildCombinedSummary(relay.model, llmmap, heuristic, finalVerdict, finalConfidence, agreed),
      verifiedAt: new Date().toISOString(),
    });
  }

  // Fallback: only one succeeded
  if (llmmap) {
    return Object.freeze({
      ...llmmap,
      relay: relay.name ?? relay.baseUrl,
      method: 'llmmap-only',
      heuristic: null,
      summary: `LLMmap验证: ${llmmap.verdict} (${llmmap.predictedModel}, 置信度${llmmap.confidence}%)`,
    });
  }

  if (heuristic) {
    return Object.freeze({
      ...heuristic,
      predictedModel: heuristic.likelyModel ?? 'unknown',
      method: 'heuristic-only',
      llmmap: null,
      summary: heuristic.summary ?? '仅启发式验证',
    });
  }

  return Object.freeze({
    relay: relay.name ?? relay.baseUrl,
    claimedModel: relay.model ?? 'unknown',
    predictedModel: 'unknown',
    confidence: 0,
    verdict: 'inconclusive',
    method: 'failed',
    summary: '❓ 两种验证方法均失败',
    verifiedAt: new Date().toISOString(),
  });
}

function buildCombinedSummary(claimed, llmmap, heuristic, verdict, confidence, agreed) {
  const emoji = { authentic: '✅', suspicious: '⚠️', fake: '❌', inconclusive: '❓' }[verdict] ?? '❓';
  const agree = agreed ? '两种方法结论一致' : '两种方法结论不一致';
  return `${emoji} ${verdict}: 声称${claimed}, LLMmap判定${llmmap.predictedModel} (${agree}, 综合置信度${confidence}%)`;
}

async function verifyModel(relay, questions, timeout) {
  const claimedModel = relay.model ?? 'unknown';
  const relayName = relay.name ?? relay.baseUrl ?? 'unknown';
  const checks = [];
  const scores = { opus: 0, sonnet: 0, haiku: 0 };
  let totalWeight = 0;
  let successfulChecks = 0;

  for (const question of questions) {
    try {
      const result = await executeCheck(relay, question, timeout);
      checks.push(result);
      successfulChecks++;

      const checkScore = scoreCheck(result, question);
      for (const [model, score] of Object.entries(checkScore.modelScores)) {
        scores[model] = (scores[model] ?? 0) + score * question.weight;
      }
      totalWeight += question.weight;
    } catch (err) {
      checks.push({
        questionId: question.id,
        category: question.category,
        error: sanitize(err.message),
        passed: false,
      });
    }
  }

  // If no checks succeeded, return inconclusive — never false-positive "fake"
  if (successfulChecks === 0) {
    return Object.freeze({
      relay: relayName,
      claimedModel,
      likelyModel: 'unknown',
      likelyTier: 'unknown',
      confidence: 0,
      verdict: 'inconclusive',
      scores: Object.freeze({ opus: 0, sonnet: 0, haiku: 0 }),
      checks: Object.freeze(checks),
      summary: `❓ 所有验证请求均失败，无法判断模型真实性（${checks.length}题全部超时或报错）`,
      verifiedAt: new Date().toISOString(),
    });
  }

  // Normalize scores to 0-100
  const normalizedScores = {};
  for (const [model, score] of Object.entries(scores)) {
    normalizedScores[model] = totalWeight > 0 ? Math.round((score / totalWeight) * 100) : 0;
  }

  // Determine likely model — only from opus/sonnet/haiku (not unknown)
  const sorted = Object.entries(normalizedScores)
    .filter(([k]) => k !== 'unknown')
    .sort(([, a], [, b]) => b - a);
  const likelyTier = sorted[0]?.[0] ?? 'unknown';
  const secondTier = sorted[1]?.[0] ?? 'unknown';
  const likelyModelFull = mapToModelName(likelyTier);

  const claimedTier = getModelTier(claimedModel);
  const confidence = normalizedScores[likelyTier] ?? 0;

  // Require meaningful score gap for confident verdict
  const gap = (normalizedScores[likelyTier] ?? 0) - (normalizedScores[secondTier] ?? 0);
  const matchesClaim = claimedTier === likelyTier;
  const verdict = determineVerdict(matchesClaim, confidence, gap);

  return Object.freeze({
    relay: relayName,
    claimedModel,
    likelyModel: likelyModelFull,
    likelyTier,
    confidence,
    verdict,
    scores: Object.freeze(normalizedScores),
    checks: Object.freeze(checks),
    summary: buildSummary(claimedModel, likelyModelFull, verdict, confidence),
    verifiedAt: new Date().toISOString(),
  });
}

async function quickVerifyModel() {
  // REMOVED: was dead code, never called from any public method.
  // quickVerify on ModelVerifier uses LLMmapVerifier directly.
  throw new Error('quickVerifyModel removed — use ModelVerifier.quickVerify() instead');
}

/** Execute a single fingerprint check using shared HTTP client */
async function executeCheck(relay, question, timeout) {
  const result = await sendRequest(relay, question.prompt, {
    timeout,
    maxTokens: 500,
  });

  return {
    questionId: question.id,
    category: question.category,
    responseText: result.text,
    responseLength: result.text.length,
    ttft: result.ttft,
    totalLatency: result.totalLatency,
    inputTokens: result.usage.inputTokens,
    outputTokens: result.usage.outputTokens,
    passed: true,
  };
}

// Exported for testing — these are pure functions
export function scoreCheck(result, question) {
  const modelScores = { opus: 0, sonnet: 0, haiku: 0 };

  if (!result.passed) return { modelScores };

  switch (question.scorer) {
    case 'exact_match_last_line': {
      const lastLine = result.responseText.trim().split('\n').pop()?.trim() ?? '';
      const correct = lastLine.includes(question.expectedAnswer);
      if (correct) {
        // All tiers CAN get it right, but weight toward higher tiers
        modelScores.opus += 1.0;
        modelScores.sonnet += 0.8;
        modelScores.haiku += 0.4;
      } else {
        // Wrong answer: PENALISE the tier expected to get it right
        modelScores.opus -= 0.3;   // Opus should get this right
        modelScores.sonnet -= 0.1;
        modelScores.haiku += 0.3;  // Haiku plausibly gets tricked
      }
      break;
    }

    case 'reasoning_quality': {
      // Evaluate reasoning depth by multiple signals
      const text = result.responseText;
      const len = text.length;
      const hasSteps = /step\s*[123]|first|second|third|首先|其次|第[一二三]步/i.test(text);
      const hasConclusion = /therefore|so\s+the\s+answer|thus|所以|因此|答案/i.test(text);
      const sentenceCount = text.split(/[.!?。！？]/).filter(s => s.trim()).length;

      if (len > 500 && hasSteps && hasConclusion && sentenceCount > 5) {
        modelScores.opus += 1.0;
        modelScores.sonnet += 0.3;
      } else if (len > 200 && (hasSteps || hasConclusion)) {
        modelScores.sonnet += 1.0;
        modelScores.opus += 0.4;
        modelScores.haiku += 0.2;
      } else {
        modelScores.haiku += 1.0;
        modelScores.sonnet += 0.3;
      }
      break;
    }

    case 'response_length_and_depth': {
      const len = result.responseLength;
      const thresholds = question.thresholds;
      const opusMin = thresholds['claude-opus-4']?.minLength ?? 800;
      const sonnetMin = thresholds['claude-sonnet-4']?.minLength ?? 400;

      if (len >= opusMin) {
        modelScores.opus += 1.0;
        modelScores.sonnet += 0.2;
      } else if (len >= sonnetMin) {
        modelScores.sonnet += 1.0;
        modelScores.opus += 0.2;
      } else {
        modelScores.haiku += 1.0;
      }
      break;
    }

    case 'latency_profile': {
      const ttft = result.ttft;
      const thresholds = question.thresholds;
      // Score each tier independently — the one whose range matches gets full score
      for (const [modelKey, range] of Object.entries(thresholds)) {
        const tier = getModelTier(modelKey);
        if (ttft >= range.minTTFT && ttft <= range.maxTTFT) {
          modelScores[tier] += 1.0;
        }
        // Note: overlapping ranges are a known limitation; this scorer
        // carries lower effective weight in practice
      }
      break;
    }

    case 'code_quality': {
      const text = result.responseText;
      const len = text.length;
      const hasFunction = /function\s+\w+|const\s+\w+\s*=\s*(\(|function)/.test(text);
      // More precise regex detection: /pattern/flags within code context
      const hasRegex = /new RegExp\(|\/[^\/\n]{3,80}\/[gimsuy]{0,6}(?=[\s;,)\]])/.test(text);
      const hasEdgeCases = /edge|corner|special|boundary|empty|null|undefined/i.test(text) ||
                           /\b::\b|ffff|0000/.test(text); // IPv6 specific

      if (len > 300 && hasFunction && (hasRegex || hasEdgeCases)) {
        modelScores.opus += 1.0;
        modelScores.sonnet += 0.3;
      } else if (len > 150 && hasFunction) {
        modelScores.sonnet += 1.0;
        modelScores.opus += 0.3;
      } else {
        modelScores.haiku += 1.0;
      }
      break;
    }

    case 'chinese_quality': {
      const hasChinese = /[\u4e00-\u9fff]/.test(result.responseText);
      const len = result.responseText.length;
      // Chinese quality differs less between tiers, so lower weight effective
      if (hasChinese && len > 80) {
        modelScores.opus += 0.7;
        modelScores.sonnet += 0.6;
        modelScores.haiku += 0.3;
      } else if (hasChinese && len > 30) {
        modelScores.sonnet += 0.5;
        modelScores.haiku += 0.5;
      }
      break;
    }

    case 'token_count': {
      const range = question.expectedTokenRange;
      const tokens = result.outputTokens;
      if (tokens >= range.min && tokens <= range.max) {
        // Token count within expected range — doesn't discriminate tiers
        modelScores.opus += 0.3;
        modelScores.sonnet += 0.3;
        modelScores.haiku += 0.3;
      }
      break;
    }

    default: {
      // Pattern matching for self-id and other custom patterns
      if (question.expectedPatterns) {
        for (const [modelKey, pattern] of Object.entries(question.expectedPatterns)) {
          if (pattern && pattern.test(result.responseText)) {
            const tier = getModelTier(modelKey);
            modelScores[tier] += 1.0;
          }
        }
      }
    }
  }

  return { modelScores };
}

export function getModelTier(modelName) {
  const lower = (modelName ?? '').toLowerCase();
  if (lower.includes('opus')) return 'opus';
  if (lower.includes('sonnet')) return 'sonnet';
  if (lower.includes('haiku')) return 'haiku';
  return 'unknown';
}

function mapToModelName(tier) {
  const map = {
    opus: 'claude-opus-4',
    sonnet: 'claude-sonnet-4',
    haiku: 'claude-haiku-3.5',
  };
  return map[tier] ?? 'unknown';
}

export function determineVerdict(matchesClaim, confidence, gap) {
  if (matchesClaim && confidence >= 70 && gap >= 10) return 'authentic';
  if (matchesClaim && confidence >= 40) return 'likely_authentic';
  if (!matchesClaim && confidence >= 60 && gap >= 15) return 'fake';
  if (!matchesClaim && confidence >= 40 && gap >= 10) return 'suspicious';
  return 'inconclusive';
}

export function buildSummary(claimed, likely, verdict, confidence) {
  const verdictEmoji = {
    authentic: '✅',
    likely_authentic: '🟡',
    suspicious: '⚠️',
    fake: '❌',
    inconclusive: '❓',
  };
  const emoji = verdictEmoji[verdict] ?? '❓';

  if (verdict === 'authentic') {
    return `${emoji} 模型验证通过: 声称 ${claimed}, 验证结果一致 (置信度 ${confidence}%)`;
  }
  if (verdict === 'fake') {
    return `${emoji} 模型验证失败: 声称 ${claimed}, 实际可能是 ${likely} (置信度 ${confidence}%)`;
  }
  if (verdict === 'suspicious') {
    return `${emoji} 模型可疑: 声称 ${claimed}, 表现更像 ${likely} (置信度 ${confidence}%)`;
  }
  return `${emoji} 模型验证结论不确定: 声称 ${claimed}, 需要更多数据 (置信度 ${confidence}%)`;
}
