/**
 * Constants — Model definitions, pricing, and fingerprint data
 * All exports are frozen to prevent accidental mutation.
 */

/** Approximate USD to CNY rate — clearly marked as approximate */
export const USD_TO_CNY_APPROX = 7.25;

/** Supported models for verification and cost calculation
 *  Source: https://docs.anthropic.com/en/docs/about-claude/pricing (2026-04)
 *  Prices in USD per 1M tokens
 */
export const SUPPORTED_MODELS = Object.freeze({
  // ─── Claude Opus ───────────────────────────────
  'claude-opus-4.6': {
    name: 'Claude Opus 4.6',
    aliases: ['opus-4.6', 'claude-opus-4-6'],
    tier: 'flagship',
    inputPrice: 5.0,
    outputPrice: 25.0,
    cacheReadPrice: 0.50,
    cacheWrite5m: 6.25,
    cacheWrite1h: 10.0,
  },
  'claude-opus-4.5': {
    name: 'Claude Opus 4.5',
    aliases: ['opus-4.5', 'claude-opus-4-5'],
    tier: 'flagship',
    inputPrice: 5.0,
    outputPrice: 25.0,
    cacheReadPrice: 0.50,
    cacheWrite5m: 6.25,
    cacheWrite1h: 10.0,
  },
  'claude-opus-4': {
    name: 'Claude Opus 4',
    aliases: ['opus-4', 'claude-opus-4-20250514'],
    tier: 'flagship-legacy',
    inputPrice: 15.0,
    outputPrice: 75.0,
    cacheReadPrice: 1.50,
    cacheWrite5m: 18.75,
    cacheWrite1h: 30.0,
  },
  // ─── Claude Sonnet ─────────────────────────────
  'claude-sonnet-4.6': {
    name: 'Claude Sonnet 4.6',
    aliases: ['sonnet-4.6', 'claude-sonnet-4-6'],
    tier: 'mid',
    inputPrice: 3.0,
    outputPrice: 15.0,
    cacheReadPrice: 0.30,
    cacheWrite5m: 3.75,
    cacheWrite1h: 6.0,
  },
  'claude-sonnet-4.5': {
    name: 'Claude Sonnet 4.5',
    aliases: ['sonnet-4.5', 'claude-sonnet-4-5'],
    tier: 'mid',
    inputPrice: 3.0,
    outputPrice: 15.0,
    cacheReadPrice: 0.30,
    cacheWrite5m: 3.75,
    cacheWrite1h: 6.0,
  },
  'claude-sonnet-4': {
    name: 'Claude Sonnet 4',
    aliases: ['sonnet-4', 'claude-sonnet-4-20250514'],
    tier: 'mid',
    inputPrice: 3.0,
    outputPrice: 15.0,
    cacheReadPrice: 0.30,
    cacheWrite5m: 3.75,
    cacheWrite1h: 6.0,
  },
  // ─── Claude Haiku ──────────────────────────────
  'claude-haiku-4.5': {
    name: 'Claude Haiku 4.5',
    aliases: ['haiku-4.5', 'claude-haiku-4-5'],
    tier: 'fast',
    inputPrice: 1.0,
    outputPrice: 5.0,
    cacheReadPrice: 0.10,
    cacheWrite5m: 1.25,
    cacheWrite1h: 2.0,
  },
  'claude-haiku-3.5': {
    name: 'Claude 3.5 Haiku',
    aliases: ['haiku-3.5', 'claude-3-5-haiku-20241022'],
    tier: 'fast',
    inputPrice: 0.80,
    outputPrice: 4.0,
    cacheReadPrice: 0.08,
    cacheWrite5m: 1.0,
    cacheWrite1h: 1.6,
  },
  // ─── GPT (OpenAI) ───────────────────────────────
  'gpt-5.4': {
    name: 'GPT 5.4',
    aliases: ['gpt-5-4', 'gpt5.4'],
    tier: 'flagship',
    inputPrice: 2.50,     // Approximate pricing
    outputPrice: 10.0,
    cacheReadPrice: 0,
    cacheWrite5m: 0,
    cacheWrite1h: 0,
  },
  'gpt-5.3-codex': {
    name: 'GPT 5.3 Codex',
    aliases: ['gpt-5-3-codex', 'codex-5.3'],
    tier: 'mid',
    inputPrice: 2.50,     // Approximate pricing
    outputPrice: 10.0,
    cacheReadPrice: 0,
    cacheWrite5m: 0,
    cacheWrite1h: 0,
  },
  // ─── Gemini (Google) ─────────────────────────────
  'gemini-3.1-pro': {
    name: 'Gemini 3.1 Pro',
    aliases: ['gemini-3-1-pro', 'gemini-3.1-pro-latest'],
    tier: 'flagship',
    inputPrice: 1.25,     // Approximate pricing
    outputPrice: 5.0,
    cacheReadPrice: 0,
    cacheWrite5m: 0,
    cacheWrite1h: 0,
  },
});

/** Official Anthropic pricing (USD per 1M tokens) — convenience accessor */
export const MODEL_PRICING = Object.freeze(Object.fromEntries(
  Object.entries(SUPPORTED_MODELS).map(([key, model]) => [
    key,
    {
      input: model.inputPrice,
      output: model.outputPrice,
      cacheRead: model.cacheReadPrice,
      cacheWrite: model.cacheWrite5m,  // default to 5-min cache
      cacheWrite1h: model.cacheWrite1h,
    },
  ])
));

/**
 * Fingerprint questions — designed to distinguish between models.
 * Each question has expected behavior patterns that differ between Opus, Sonnet, Haiku.
 * Categories: reasoning depth, knowledge cutoff, self-identification, capability limits
 */
export const FINGERPRINT_QUESTIONS = Object.freeze([
  // Category: Self-identification
  {
    id: 'self-id-1',
    category: 'self_identification',
    prompt: 'What model are you? Reply with only your model name, nothing else.',
    weight: 0.5, // Models can be instructed to lie, so low weight
    expectedPatterns: {
      'claude-opus-4': /opus/i,
      'claude-sonnet-4': /sonnet/i,
      'claude-haiku-3.5': /haiku/i,
    },
  },
  // Category: Reasoning depth (Opus excels here)
  {
    id: 'reason-1',
    category: 'reasoning_depth',
    prompt: `A farmer has 17 sheep. All but 9 die. How many sheep are left? Explain your reasoning step by step, then give the final answer on the last line as just a number.`,
    weight: 1.0,
    expectedPatterns: {
      'claude-opus-4': null, // Check reasoning quality
      'claude-sonnet-4': null,
      'claude-haiku-3.5': null,
    },
    scorer: 'reasoning_quality', // Use specialized scorer
  },
  {
    id: 'reason-2',
    category: 'reasoning_depth',
    prompt: `If it takes 5 machines 5 minutes to make 5 widgets, how long would it take 100 machines to make 100 widgets? Think carefully. Give your final answer as a number of minutes on the last line.`,
    weight: 1.5,
    expectedAnswer: '5',
    scorer: 'exact_match_last_line',
  },
  {
    id: 'reason-3',
    category: 'reasoning_depth',
    prompt: `A bat and a ball cost $1.10 in total. The bat costs $1.00 more than the ball. How much does the ball cost? Show your work. Final answer on last line as a dollar amount.`,
    weight: 1.5,
    expectedAnswer: '$0.05',
    scorer: 'exact_match_last_line',
  },
  // Category: Complex reasoning (separates Opus from Sonnet)
  {
    id: 'complex-1',
    category: 'complex_reasoning',
    prompt: `You have 12 balls. 11 are identical, 1 is either heavier or lighter. You have a balance scale and can use it exactly 3 times. Describe a complete strategy to identify the odd ball AND determine if it's heavier or lighter. Be thorough.`,
    weight: 2.0,
    scorer: 'response_length_and_depth',
    thresholds: {
      'claude-opus-4': { minLength: 800, minSteps: 3 },
      'claude-sonnet-4': { minLength: 400, minSteps: 2 },
      'claude-haiku-3.5': { minLength: 150, minSteps: 1 },
    },
  },
  // Category: Code generation quality
  {
    id: 'code-1',
    category: 'code_quality',
    prompt: `Write a JavaScript function that checks if a string is a valid IPv6 address. Include edge cases. No comments needed, just the function.`,
    weight: 1.5,
    scorer: 'code_quality',
    thresholds: {
      'claude-opus-4': { minLength: 300, hasEdgeCases: true },
      'claude-sonnet-4': { minLength: 200, hasEdgeCases: true },
      'claude-haiku-3.5': { minLength: 100, hasEdgeCases: false },
    },
  },
  // Category: Response latency fingerprint (inherent to model)
  {
    id: 'latency-1',
    category: 'latency_profile',
    prompt: 'Say "hello" and nothing else.',
    weight: 1.0,
    scorer: 'latency_profile',
    // Opus TTFT is typically 1-3s, Sonnet 0.5-1.5s, Haiku 0.2-0.5s
    thresholds: {
      'claude-opus-4': { minTTFT: 800, maxTTFT: 5000 },
      'claude-sonnet-4': { minTTFT: 300, maxTTFT: 2000 },
      'claude-haiku-3.5': { minTTFT: 100, maxTTFT: 800 },
    },
  },
  // Category: Token counting verification
  {
    id: 'token-1',
    category: 'token_verification',
    prompt: 'Repeat exactly: "The quick brown fox jumps over the lazy dog." Say nothing else.',
    weight: 1.0,
    scorer: 'token_count',
    expectedTokenRange: { min: 8, max: 15 }, // Approximate output tokens
  },
  // Category: Multilingual capability (separates tiers)
  {
    id: 'multilingual-1',
    category: 'multilingual',
    prompt: '请用中文解释量子纠缠的原理，用一个日常生活中的比喻来说明。回答控制在100字以内。',
    weight: 1.0,
    scorer: 'chinese_quality',
  },
]);

/** Scoring weights for final ranking */
export const RANKING_WEIGHTS = Object.freeze({
  latency: 0.15,        // Average response time
  stability: 0.20,      // Uptime, error rate
  authenticity: 0.30,   // Model verification score
  pricing: 0.25,        // Cost competitiveness
  transparency: 0.10,   // Honest billing, no hidden charges
});

/** Probe config defaults */
export const DEFAULT_PROBE_CONFIG = Object.freeze({
  timeout: 30000,       // 30s per request
  retries: 3,
  concurrency: 5,       // Parallel probes
  interval: 3600000,    // 1 hour between probe cycles
  warmupRounds: 2,      // Discard first N results
  testRounds: 5,        // Number of scored rounds
});
