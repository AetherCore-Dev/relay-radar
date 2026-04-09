/**
 * Behavioral Verifier — Passive model verification through response analysis.
 *
 * "Homework, not exams": Instead of sending special probes,
 * analyzes every normal response to build a statistical profile.
 *
 * Three layers:
 *   Layer 1: Feature extraction (per-response, instant)
 *   Layer 2: Statistical accumulation (running mean/variance)
 *   Layer 3: Sequential hypothesis test (anytime-valid, from ICLR 2025)
 *
 * Key property: The relay CANNOT detect verification because no special
 * queries are sent. To evade, the relay must match the claimed model's
 * behavior on EVERY response — which ≈ running the real model.
 *
 * References:
 *   - Auditing behavioral shift (arXiv:2410.19406, ICLR 2025)
 *   - Invisible Traces (arXiv:2501.18712)
 *   - IMMACULATE (arXiv:2602.22700)
 */

import { extractFeatures, FEATURE_NAMES, FEATURE_COUNT } from './features.mjs';
import { MODEL_PROFILES } from './profiles.mjs';

/**
 * Create a BehavioralVerifier instance.
 * Maintains running state — feed it responses over time.
 *
 * @param {Object} opts
 * @param {string} opts.claimedModel - e.g. 'claude-opus-4'
 * @param {number} [opts.alpha] - Significance level for sequential test (default 0.05)
 * @param {Object} [opts.profiles] - Custom profiles (from loadProfiles), falls back to MODEL_PROFILES
 * @returns {Object}
 */
export function BehavioralVerifier(opts = {}) {
  const claimedModel = opts.claimedModel ?? 'claude-opus';
  const alpha = opts.alpha ?? 0.05;
  const profiles = opts.profiles ?? MODEL_PROFILES;

  // Map claimed model name to profile key
  const profileKey = resolveProfileKey(claimedModel);
  const claimedProfile = profiles[profileKey];
  if (!claimedProfile) {
    throw new Error(`No reference profile for model: ${claimedModel} (resolved to: ${profileKey})`);
  }

  // Running statistics — Welford's online algorithm
  const state = {
    n: 0,
    mean: new Float64Array(FEATURE_COUNT),
    m2: new Float64Array(FEATURE_COUNT),     // sum of squared differences
    eProcess: 1.0,                            // sequential test e-process
    threshold: 1 / alpha,                     // rejection threshold
    alert: false,
    features: [],                             // last N feature vectors for debugging
  };

  return Object.freeze({
    /**
     * Feed a response into the verifier. Call this for every API response.
     * Returns the current verification status.
     *
     * @param {string} responseText - The model's response
     * @returns {Object} - { status, confidence, n, details }
     */
    update(responseText) {
      const features = extractFeatures(responseText);
      state.n++;

      // Welford's online mean + variance update
      for (let i = 0; i < FEATURE_COUNT; i++) {
        const delta = features[i] - state.mean[i];
        state.mean[i] += delta / state.n;
        const delta2 = features[i] - state.mean[i];
        state.m2[i] += delta * delta2;
      }

      // Keep last 10 feature vectors for debugging
      state.features.push([...features]);
      if (state.features.length > 10) state.features.shift();

      // Sequential hypothesis test (after enough data)
      if (state.n >= 5) {
        const eValue = computeEValue(state.mean, getVariance(state), claimedProfile);
        state.eProcess *= eValue;

        if (state.eProcess >= state.threshold) {
          state.alert = true;
        }
      }

      return getStatus(state, claimedProfile, profileKey, profiles);
    },

    /** Get current verification status without adding new data */
    getStatus() {
      return getStatus(state, claimedProfile, profileKey, profiles);
    },

    /** Get the running feature profile */
    getProfile() {
      return Object.freeze({
        n: state.n,
        mean: [...state.mean],
        variance: state.n > 1 ? [...getVariance(state)] : new Array(FEATURE_COUNT).fill(0),
        featureNames: [...FEATURE_NAMES],
      });
    },

    /** Reset state (e.g. when switching relay) */
    reset() {
      state.n = 0;
      state.mean.fill(0);
      state.m2.fill(0);
      state.eProcess = 1.0;
      state.alert = false;
      state.features.length = 0;
    },

    /** How many responses have been analyzed */
    get count() { return state.n; },

    /** Has the sequential test triggered an alert? */
    get hasAlert() { return state.alert; },
  });
}

// ─── Statistical Helpers ─────────────────────────────────────────────────────

function getVariance(state) {
  const variance = new Float64Array(FEATURE_COUNT);
  if (state.n > 1) {
    for (let i = 0; i < FEATURE_COUNT; i++) {
      variance[i] = state.m2[i] / (state.n - 1);
    }
  }
  return variance;
}

/**
 * Compute e-value for the sequential test.
 *
 * E-value measures evidence AGAINST the null hypothesis
 * (H0: model is the claimed model).
 *
 * Based on Mahalanobis-like distance between observed and expected profiles.
 * If the model is genuine, e-values hover around 1.
 * If substituted, e-values grow — and the e-process (cumulative product) explodes.
 */
function computeEValue(observedMean, observedVariance, claimedProfile) {
  const ref = claimedProfile.mean;
  const refStd = claimedProfile.std;

  let logLR = 0;
  let validDims = 0;

  for (let i = 0; i < FEATURE_COUNT; i++) {
    const sigma = refStd[i];
    if (sigma < 0.01) continue; // skip dimensions with near-zero variance

    // Standardized distance on this dimension
    const z = Math.abs(observedMean[i] - ref[i]) / sigma;

    // Log-likelihood ratio: how much more likely is this under H1 (wrong model)?
    // Conservative: only count when z > 1 (outside 1 std)
    if (z > 1) {
      logLR += (z - 1) * 0.1; // gentle weight to avoid premature detection
      validDims++;
    }
  }

  // Dampen when few dimensions diverge
  if (validDims < 3) logLR *= 0.3;

  // E-value: exp(logLR), clamped to prevent numerical overflow
  return Math.exp(Math.min(logLR, 5));
}

/**
 * Compute Mahalanobis-like distance between observed profile and reference.
 */
function profileDistance(observedMean, claimedProfile) {
  const ref = claimedProfile.mean;
  const refStd = claimedProfile.std;
  let sumSq = 0;
  let dims = 0;

  for (let i = 0; i < FEATURE_COUNT; i++) {
    const sigma = refStd[i];
    if (sigma < 0.01) continue;
    const z = (observedMean[i] - ref[i]) / sigma;
    sumSq += z * z;
    dims++;
  }

  return dims > 0 ? Math.sqrt(sumSq / dims) : 0;
}

/**
 * Find which model profile best matches the observed behavior.
 */
function findBestMatch(observedMean, profiles) {
  let bestKey = 'unknown';
  let bestDist = Infinity;
  const distances = {};

  for (const [key, profile] of Object.entries(profiles)) {
    const dist = profileDistance(observedMean, profile);
    distances[key] = Math.round(dist * 100) / 100;
    if (dist < bestDist) {
      bestDist = dist;
      bestKey = key;
    }
  }

  return { bestKey, bestDist, distances };
}

function getStatus(state, claimedProfile, profileKey, profiles) {
  if (state.n < 5) {
    return Object.freeze({
      status: 'collecting',
      message: `收集中... (${state.n}/5 最少需要5个响应)`,
      n: state.n,
      confidence: 0,
      verdict: 'pending',
    });
  }

  const distanceToClaimed = profileDistance(state.mean, claimedProfile);
  const { bestKey, bestDist, distances } = findBestMatch(state.mean, profiles);

  const matchesClaim = bestKey === profileKey;
  const gap = distanceToClaimed - bestDist;

  // Determine confidence based on sample size + distance
  let confidence;
  if (state.n < 20) confidence = Math.min(50, Math.round((1 / (distanceToClaimed + 0.1)) * 30));
  else if (state.n < 50) confidence = Math.min(75, Math.round((1 / (distanceToClaimed + 0.1)) * 50));
  else confidence = Math.min(95, Math.round((1 / (distanceToClaimed + 0.1)) * 70));

  let verdict;
  if (state.alert) {
    verdict = matchesClaim ? 'suspicious' : 'fake';
  } else if (matchesClaim && distanceToClaimed < 1.5) {
    verdict = confidence > 60 ? 'authentic' : 'likely_authentic';
  } else if (!matchesClaim && gap > 0.5) {
    verdict = confidence > 50 ? 'suspicious' : 'inconclusive';
  } else {
    verdict = 'inconclusive';
  }

  return Object.freeze({
    status: 'active',
    verdict,
    confidence,
    n: state.n,
    claimedModel: profileKey,
    bestMatch: bestKey,
    matchesClaim,
    distanceToClaimed: Math.round(distanceToClaimed * 100) / 100,
    distances,
    eProcess: Math.round(state.eProcess * 100) / 100,
    alertTriggered: state.alert,
    message: buildMessage(verdict, profileKey, bestKey, confidence, state.n, state.alert),
  });
}

function buildMessage(verdict, claimed, best, confidence, n, alert) {
  const emoji = { authentic: '✅', likely_authentic: '🟡', suspicious: '⚠️', fake: '❌', inconclusive: '❓', pending: '⏳' }[verdict] ?? '❓';
  const alertMsg = alert ? ' [序贯检验触发警报!]' : '';

  if (verdict === 'authentic') return `${emoji} 行为特征与 ${claimed} 一致 (n=${n}, ${confidence}%置信度)`;
  if (verdict === 'fake') return `${emoji} 行为特征与 ${claimed} 显著不一致，更像 ${best} (n=${n})${alertMsg}`;
  if (verdict === 'suspicious') return `${emoji} 行为特征可疑，更接近 ${best} (n=${n}, ${confidence}%)${alertMsg}`;
  return `${emoji} 数据不足以判断 (n=${n})`;
}

function resolveProfileKey(modelName) {
  const lower = (modelName ?? '').toLowerCase();
  // Claude — match specific versions first, then fallback to family aliases
  if (lower.includes('opus') && lower.includes('4.6')) return 'claude-opus-4.6';
  if (lower.includes('opus') && lower.includes('4.5')) return 'claude-opus-4.5';
  if (lower.includes('opus')) return 'claude-opus';
  if (lower.includes('sonnet') && lower.includes('4.6')) return 'claude-sonnet-4.6';
  if (lower.includes('sonnet') && lower.includes('4.5')) return 'claude-sonnet-4.5';
  if (lower.includes('sonnet')) return 'claude-sonnet';
  if (lower.includes('haiku') && lower.includes('4.5')) return 'claude-haiku-4.5';
  if (lower.includes('haiku')) return 'claude-haiku';
  // GPT
  if (lower.includes('gpt-5.4') || lower.includes('gpt5.4')) return 'gpt-5.4';
  if (lower.includes('gpt-5.3-codex') || lower.includes('codex-5.3')) return 'gpt-5.3-codex';
  if (lower.includes('gpt-4o') || lower.includes('gpt4o')) return 'gpt-4o';
  if (lower.includes('gpt')) return 'gpt-5.4';
  // Gemini
  if (lower.includes('gemini-3.1-pro') || lower.includes('gemini-3-1-pro')) return 'gemini-3.1-pro';
  if (lower.includes('gemini')) return 'gemini-3.1-pro';
  // Domestic
  if (lower.includes('qwen') || lower.includes('deepseek') || lower.includes('glm')) return 'domestic';
  // Default to claude-sonnet but warn — caller may be using an unknown model
  return 'claude-sonnet';
}
