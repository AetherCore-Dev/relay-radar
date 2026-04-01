/**
 * RelayConfig — Configuration management for relay stations
 */

import { DEFAULT_PROBE_CONFIG } from './constants.mjs';

/**
 * @typedef {Object} RelayEndpoint
 * @property {string} name - Display name
 * @property {string} baseUrl - API base URL
 * @property {string} apiKey - API key (from env or config)
 * @property {string} [model] - Model to test (default: claude-sonnet-4)
 * @property {Object} [headers] - Custom headers
 * @property {string} [notes] - User notes about this relay
 */

/**
 * Create a frozen config object from user input
 * @param {Object} input
 * @returns {Readonly<Object>}
 */
export function RelayConfig(input = {}) {
  const relays = (input.relays ?? []).map((r) =>
    Object.freeze({
      name: r.name ?? 'Unknown',
      baseUrl: normalizeUrl(r.baseUrl ?? r.base_url ?? ''),
      apiKey: resolveApiKey(r.apiKey ?? r.api_key ?? ''),
      model: r.model ?? 'claude-sonnet-4',
      headers: Object.freeze({ ...(r.headers ?? {}) }),
      notes: r.notes ?? '',
    })
  );

  return Object.freeze({
    relays: Object.freeze(relays),
    probe: Object.freeze({
      ...DEFAULT_PROBE_CONFIG,
      ...(input.probe ?? {}),
    }),
    output: Object.freeze({
      format: input.output?.format ?? 'table',
      file: input.output?.file ?? null,
      verbose: input.output?.verbose ?? false,
    }),
  });
}

/**
 * Load config from a JSON file path
 * @param {string} filePath
 * @returns {Promise<Readonly<Object>>}
 */
RelayConfig.fromFile = async function fromFile(filePath) {
  const { readFile } = await import('node:fs/promises');
  let raw;
  try {
    raw = await readFile(filePath, 'utf-8');
  } catch (err) {
    throw new Error(`无法读取配置文件 ${filePath}: ${err.code ?? err.message}`);
  }
  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error(`配置文件 ${filePath} 不是有效的JSON格式`);
  }
  return RelayConfig(parsed);
};

/**
 * Load config from environment variables
 * Supports RELAY_RADAR_ENDPOINTS as JSON array
 * @returns {Readonly<Object>}
 */
RelayConfig.fromEnv = function fromEnv() {
  const endpointsJson = process.env.RELAY_RADAR_ENDPOINTS;
  if (!endpointsJson) {
    return RelayConfig({ relays: [] });
  }
  try {
    const relays = JSON.parse(endpointsJson);
    return RelayConfig({ relays: Array.isArray(relays) ? relays : [relays] });
  } catch {
    console.error('Failed to parse RELAY_RADAR_ENDPOINTS env var');
    return RelayConfig({ relays: [] });
  }
};

/** Normalize URL: ensure https, warn on http, remove trailing slash */
function normalizeUrl(url) {
  if (!url) return '';
  let normalized = url.trim();
  if (!normalized.startsWith('http')) {
    normalized = `https://${normalized}`;
  }
  // Reject plaintext http — API keys would be exposed
  if (normalized.startsWith('http://')) {
    console.warn(`⚠️ 中转站URL使用了http://（不安全），已自动替换为https://`);
    normalized = normalized.replace(/^http:\/\//, 'https://');
  }
  return normalized.replace(/\/+$/, '');
}

/** Resolve API key from env var reference or literal */
function resolveApiKey(key) {
  if (!key) return '';
  // Support ${ENV_VAR} or $ENV_VAR syntax
  const envMatch = key.match(/^\$\{?(\w+)\}?$/);
  if (envMatch) {
    return process.env[envMatch[1]] ?? '';
  }
  return key;
}
