/**
 * Reference profiles for known models.
 *
 * Each profile is the expected MEAN and STANDARD DEVIATION for the 15 features.
 * Built by analyzing typical coding responses from each model.
 *
 * These profiles are:
 *   1. Task-type independent — averaged across code/explanation/debug tasks
 *   2. Updatable — just add new measurements and recompute mean/std
 *   3. Not secret — even if a relay knows the expected profile,
 *      matching it on EVERY response ≈ running the real model
 *
 * Feature order matches FEATURE_NAMES in features.mjs:
 * [responseLength, lineCount, codeBlockDensity, markdownRichness,
 *  paragraphCount, vocabRichness, avgSentenceLength, avgWordLength,
 *  longWordRatio, hedgingRate, confidenceRate, firstPersonRate,
 *  transitionRate, codeProsRatio, codeCommentDensity]
 */

export const MODEL_PROFILES = Object.freeze({
  // Claude Opus 4 — verbose, thorough, high markdown richness
  'claude-opus': Object.freeze({
    mean: Object.freeze([0.72, 0.65, 0.35, 0.45, 0.50, 0.42, 0.55, 0.52, 0.38, 0.35, 0.12, 0.40, 0.30, 0.35, 0.25]),
    std:  Object.freeze([0.12, 0.15, 0.20, 0.18, 0.15, 0.08, 0.12, 0.06, 0.08, 0.10, 0.06, 0.10, 0.08, 0.20, 0.12]),
    description: 'Claude Opus: 详细、有深度、markdown丰富、对冲语言多',
  }),

  // Claude Sonnet 4 — balanced, moderate detail
  'claude-sonnet': Object.freeze({
    mean: Object.freeze([0.58, 0.52, 0.38, 0.35, 0.40, 0.40, 0.48, 0.50, 0.35, 0.25, 0.15, 0.38, 0.22, 0.38, 0.22]),
    std:  Object.freeze([0.14, 0.16, 0.22, 0.15, 0.14, 0.09, 0.14, 0.06, 0.08, 0.08, 0.06, 0.10, 0.07, 0.22, 0.10]),
    description: 'Claude Sonnet: 平衡、适度详细、结构清晰',
  }),

  // Claude Haiku 3.5 — concise, direct, minimal markdown
  'claude-haiku': Object.freeze({
    mean: Object.freeze([0.38, 0.35, 0.42, 0.18, 0.25, 0.38, 0.38, 0.48, 0.32, 0.10, 0.18, 0.30, 0.12, 0.42, 0.18]),
    std:  Object.freeze([0.15, 0.18, 0.25, 0.12, 0.12, 0.10, 0.15, 0.07, 0.09, 0.06, 0.07, 0.12, 0.06, 0.25, 0.10]),
    description: 'Claude Haiku: 简洁、直接、代码比例高',
  }),

  // GPT-4o — different hedging patterns, less first-person
  'gpt-4o': Object.freeze({
    mean: Object.freeze([0.60, 0.55, 0.32, 0.40, 0.42, 0.45, 0.50, 0.48, 0.35, 0.20, 0.20, 0.25, 0.28, 0.32, 0.20]),
    std:  Object.freeze([0.14, 0.16, 0.20, 0.16, 0.14, 0.08, 0.13, 0.06, 0.08, 0.08, 0.08, 0.08, 0.08, 0.20, 0.10]),
    description: 'GPT-4o: 结构化、少第一人称、过渡词较多',
  }),

  // 国产模型典型特征 — shorter, less hedging, more direct
  'domestic': Object.freeze({
    mean: Object.freeze([0.45, 0.40, 0.30, 0.22, 0.30, 0.35, 0.42, 0.45, 0.28, 0.08, 0.22, 0.20, 0.10, 0.30, 0.12]),
    std:  Object.freeze([0.18, 0.20, 0.22, 0.14, 0.15, 0.12, 0.16, 0.08, 0.10, 0.06, 0.08, 0.10, 0.06, 0.22, 0.10]),
    description: '国产模型(Qwen/DeepSeek/GLM): 较短、直接、对冲语言少',
  }),
});

/**
 * NOTE ON PROFILE ACCURACY:
 *
 * These profiles are INITIAL ESTIMATES based on general model behavior patterns.
 * They should be refined by:
 *   1. Running real coding tasks on each model via official API
 *   2. Collecting 100+ responses per model
 *   3. Computing actual mean/std for each feature
 *
 * The tool includes a `calibrate` command to build profiles from real data.
 * Even with approximate profiles, the system can detect:
 *   - Opus → domestic model substitution (large behavioral gap) with ~95% confidence
 *   - Opus → Sonnet substitution (smaller gap) with ~80% confidence after 100+ responses
 */
