/**
 * Profile Loader — Three-tier loading for behavioral fingerprint profiles.
 *
 * Priority:
 *   1. Local cache (~/.relay-radar/profiles.json, valid for 24h)
 *   2. Remote fetch (GitHub Pages, 3s timeout)
 *   3. Built-in fallback (profiles.mjs hardcoded estimates)
 *
 * Design principles:
 *   - Never block: 3s fetch timeout, silent fallback
 *   - Never crash: all errors caught, always returns valid profiles
 *   - Never stale: 24h cache expiry, remote preferred
 *   - Zero dependencies: uses only node:fs, node:path, node:os
 */

import { readFile, writeFile, mkdir, stat } from 'node:fs/promises';
import { join } from 'node:path';
import { homedir } from 'node:os';
import { MODEL_PROFILES } from './profiles.mjs';

// Default remote URL — override via opts.remoteUrl or RELAY_RADAR_PROFILES_URL env
const DEFAULT_REMOTE_URL = 'https://anthropic-fans.github.io/relay-radar/data/profiles.json';

const CACHE_DIR = join(homedir(), '.relay-radar');
const CACHE_FILE = join(CACHE_DIR, 'profiles.json');
const CACHE_MAX_AGE_MS = 24 * 60 * 60 * 1000; // 24 hours
const FETCH_TIMEOUT_MS = 3000;

/**
 * Load the best available profiles.
 *
 * @param {Object} [opts]
 * @param {string} [opts.remoteUrl] - Override remote URL
 * @param {boolean} [opts.skipRemote] - Skip remote fetch (offline mode)
 * @param {boolean} [opts.skipCache] - Skip cache (force fresh fetch)
 * @returns {Promise<{ profiles: Object, source: string, age: number|null, version: number|null }>}
 */
export async function loadProfiles(opts = {}) {
  const remoteUrl = opts.remoteUrl
    ?? process.env.RELAY_RADAR_PROFILES_URL
    ?? DEFAULT_REMOTE_URL;

  // 1. Try local cache first (fast, no network)
  if (!opts.skipCache) {
    const cached = await tryLoadCache();
    if (cached) {
      return cached;
    }
  }

  // 2. Try remote fetch (3s timeout)
  if (!opts.skipRemote) {
    const remote = await tryFetchRemote(remoteUrl);
    if (remote) {
      // Save to cache for next time (fire-and-forget)
      trySaveCache(remote.raw).catch(() => {});
      return remote;
    }
  }

  // 3. Fall back to built-in profiles
  return Object.freeze({
    profiles: MODEL_PROFILES,
    source: 'builtin',
    age: null,
    version: null,
  });
}

// ─── Cache Layer ────────────────────────────────────────────────────────────

async function tryLoadCache() {
  try {
    const info = await stat(CACHE_FILE);
    const ageMs = Date.now() - info.mtimeMs;

    if (ageMs > CACHE_MAX_AGE_MS) {
      return null; // Cache expired
    }

    const raw = await readFile(CACHE_FILE, 'utf-8');
    const data = JSON.parse(raw);
    const profiles = parseRemoteProfiles(data);

    if (!profiles) return null;

    return Object.freeze({
      profiles,
      source: 'cache',
      age: Math.round(ageMs / 1000 / 60), // minutes
      version: data.version ?? null,
    });
  } catch {
    return null; // No cache or invalid
  }
}

async function trySaveCache(jsonString) {
  try {
    await mkdir(CACHE_DIR, { recursive: true });
    await writeFile(CACHE_FILE, jsonString, 'utf-8');
  } catch {
    // Silent — caching is best-effort
  }
}

// ─── Remote Fetch Layer ─────────────────────────────────────────────────────

async function tryFetchRemote(url) {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

    const response = await fetch(url, {
      signal: controller.signal,
      headers: { 'Accept': 'application/json' },
    });

    clearTimeout(timer);

    if (!response.ok) return null;

    const raw = await response.text();
    const data = JSON.parse(raw);
    const profiles = parseRemoteProfiles(data);

    if (!profiles) return null;

    return Object.freeze({
      profiles,
      source: 'remote',
      age: 0,
      version: data.version ?? null,
      raw, // For caching
    });
  } catch {
    return null; // Network error, timeout, parse error
  }
}

// ─── Profile Parsing ────────────────────────────────────────────────────────

/**
 * Parse remote profiles.json into MODEL_PROFILES-compatible format.
 * Validates structure and falls back to null if invalid.
 */
function parseRemoteProfiles(data) {
  if (!data || typeof data !== 'object') return null;
  if (data.version !== 2) return null;
  if (!data.models || typeof data.models !== 'object') return null;

  const profiles = {};

  for (const [key, value] of Object.entries(data.models)) {
    if (!value || !Array.isArray(value.mean) || !Array.isArray(value.std)) continue;
    if (value.mean.length !== 15 || value.std.length !== 15) continue;

    // Validate all values are numbers in [0, 1] for mean, >= 0 for std
    const validMean = value.mean.every(v => typeof v === 'number' && v >= 0 && v <= 1);
    const validStd = value.std.every(v => typeof v === 'number' && v >= 0);
    if (!validMean || !validStd) continue;

    profiles[key] = Object.freeze({
      mean: Object.freeze([...value.mean]),
      std: Object.freeze([...value.std]),
      description: value.description ?? `Remote profile: ${key}`,
    });
  }

  // Must have at least one valid profile
  if (Object.keys(profiles).length === 0) return null;

  // Merge: remote profiles override built-in, but keep built-in for missing models
  const merged = { ...MODEL_PROFILES };
  for (const [key, value] of Object.entries(profiles)) {
    merged[key] = value;
  }

  return Object.freeze(merged);
}
