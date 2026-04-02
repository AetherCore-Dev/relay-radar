/**
 * Behavioral fingerprinting module.
 *
 * "Homework, not exams" — passive model verification
 * through normal response analysis.
 */
export { extractFeatures, FEATURE_NAMES, FEATURE_COUNT } from './features.mjs';
export { BehavioralVerifier } from './monitor.mjs';
export { MODEL_PROFILES } from './profiles.mjs';
export { loadProfiles } from './profile-loader.mjs';
