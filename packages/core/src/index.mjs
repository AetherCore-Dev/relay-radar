/**
 * @relay-radar/core — Main Entry
 */

// Zero-key modules (no API key needed)
export { LocalScanner } from './scanner/index.mjs';
export { RelayPinger } from './pinger/index.mjs';
export { TokenAnalyzer } from './analyzer/index.mjs';

// Key-required modules (runs locally, key never leaves machine)
export { RelayProber } from './prober/index.mjs';
export { ModelVerifier } from './verifier/index.mjs';
export { LLMmapVerifier } from './verifier/llmmap/index.mjs';
export { BehavioralVerifier, extractFeatures, loadProfiles, FEATURE_NAMES, FEATURE_COUNT } from './verifier/behavioral/index.mjs';
export { RelayRanker } from './ranker/index.mjs';

// Configuration
export { RelayConfig } from './config.mjs';

// Optimizer (zero-key, scans local project)
export { scanProject, generateClaudeIgnore, generateClaudeMd, generateEnvRecommendations } from './optimizer/index.mjs';

// Shared utilities
export {
  detectFormat,
  buildApiUrl,
  buildHeaders,
  parseResponse,
  sendRequest,
  validateUrl,
  sanitize,
} from './shared/http-client.mjs';

// Constants
export { SUPPORTED_MODELS, MODEL_PRICING, FINGERPRINT_QUESTIONS, USD_TO_CNY_APPROX } from './constants.mjs';
