/**
 * Shared HTTP client — single source of truth for relay API communication.
 *
 * Replaces the 3x duplicated request logic in prober, verifier, and analyzer.
 * Handles: format detection, URL building, header construction, response parsing,
 *          security (SSRF, HTTPS, size limits, ANSI stripping).
 */

import { URL } from 'node:url';

// ─── Security constants ──────────────────────────────────────────────────────

const PRIVATE_IP_RANGES = [
  /^127\./,
  /^10\./,
  /^172\.(1[6-9]|2\d|3[0-1])\./,
  /^192\.168\./,
  /^169\.254\./,
  /^0\./,
  /^::1$/,
  /^fc00:/i,
  /^fe80:/i,
  /^localhost$/i,
];

const ANSI_PATTERN = /[\x1b\x9b][[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><~]/g;

const MAX_RESPONSE_BYTES = 1_048_576; // 1 MB

const FORBIDDEN_CUSTOM_HEADERS = new Set([
  'host', 'content-length', 'transfer-encoding', 'connection',
  'x-api-key', 'authorization', 'anthropic-version',
]);

// ─── Format detection ────────────────────────────────────────────────────────

/**
 * Detect API format from relay configuration.
 * Returns 'anthropic' or 'openai'.
 *
 * Priority:
 *   1. Explicit relay.format field
 *   2. URL path heuristics
 *   3. Default to 'anthropic'
 */
export function detectFormat(relay) {
  // Explicit format wins
  if (relay.format === 'openai') return 'openai';
  if (relay.format === 'anthropic') return 'anthropic';

  const path = safeUrlPath(relay.baseUrl);

  // If URL explicitly ends with /messages or /v1/messages → Anthropic
  if (/\/v1\/messages\/?$/.test(path) || /\/messages\/?$/.test(path)) {
    return 'anthropic';
  }
  // If URL contains /chat/completions → OpenAI
  if (/\/v1\/chat\/completions\/?$/.test(path)) {
    return 'openai';
  }
  // If URL contains /v1 but not /messages → likely OpenAI-compatible relay
  if (/\/v1\/?$/.test(path)) {
    return 'openai';
  }

  // Default: Anthropic
  return 'anthropic';
}

// ─── URL building ────────────────────────────────────────────────────────────

/**
 * Build the correct API endpoint URL.
 * Uses the URL constructor — never string concatenation.
 */
export function buildApiUrl(baseUrl, format) {
  const parsed = new URL(baseUrl);

  if (format === 'openai') {
    // If path already ends with /chat/completions, use as-is
    if (/\/chat\/completions\/?$/.test(parsed.pathname)) {
      return parsed.toString();
    }
    // If path ends with /v1, append /chat/completions
    if (/\/v1\/?$/.test(parsed.pathname)) {
      parsed.pathname = parsed.pathname.replace(/\/?$/, '/chat/completions');
      return parsed.toString();
    }
    // Otherwise add /v1/chat/completions
    parsed.pathname = parsed.pathname.replace(/\/?$/, '/v1/chat/completions');
    return parsed.toString();
  }

  // Anthropic format
  if (/\/v1\/messages\/?$/.test(parsed.pathname) || /\/messages\/?$/.test(parsed.pathname)) {
    return parsed.toString();
  }
  parsed.pathname = parsed.pathname.replace(/\/?$/, '/v1/messages');
  return parsed.toString();
}

// ─── Header construction ─────────────────────────────────────────────────────

/**
 * Build request headers for the given format.
 */
export function buildHeaders(relay, format) {
  const headers = { 'Content-Type': 'application/json' };

  if (format === 'openai') {
    headers['Authorization'] = `Bearer ${relay.apiKey}`;
  } else {
    headers['x-api-key'] = relay.apiKey;
    headers['anthropic-version'] = '2023-06-01';
  }

  // Merge validated custom headers
  if (relay.headers) {
    for (const [key, value] of Object.entries(relay.headers)) {
      const lower = key.toLowerCase();
      if (FORBIDDEN_CUSTOM_HEADERS.has(lower)) continue;
      if (typeof value !== 'string') continue;
      if (value.includes('\r') || value.includes('\n')) continue;
      headers[key] = value;
    }
  }

  return headers;
}

// ─── Request body construction ───────────────────────────────────────────────

/**
 * Build request body. Same shape for both formats currently,
 * but centralised here for future divergence.
 */
export function buildBody(relay, message, maxTokens = 50, stream = false) {
  return JSON.stringify({
    model: relay.model ?? 'claude-sonnet-4',
    max_tokens: maxTokens,
    ...(stream ? { stream: true } : {}),
    messages: [{ role: 'user', content: message }],
  });
}

// ─── Response parsing ────────────────────────────────────────────────────────

/**
 * Parse a non-streaming response body into a normalised shape.
 */
export function parseResponse(data, format) {
  if (format === 'openai') {
    return {
      text: data.choices?.[0]?.message?.content ?? '',
      usage: {
        inputTokens: data.usage?.prompt_tokens ?? 0,
        outputTokens: data.usage?.completion_tokens ?? 0,
        cacheRead: 0,
        cacheWrite: 0,
      },
    };
  }

  // Anthropic
  return {
    text: data.content?.[0]?.text ?? '',
    usage: {
      inputTokens: data.usage?.input_tokens ?? 0,
      outputTokens: data.usage?.output_tokens ?? 0,
      cacheRead: data.usage?.cache_read_input_tokens ?? 0,
      cacheWrite: data.usage?.cache_creation_input_tokens ?? 0,
    },
  };
}

// ─── Complete request helper ─────────────────────────────────────────────────

/**
 * Send a single non-streaming request and return parsed result.
 * The one-stop-shop that prober, verifier, and analyzer should all use.
 *
 * @param {Object} relay - { baseUrl, apiKey, model, headers, format }
 * @param {string} message - User message
 * @param {Object} opts - { timeout, maxTokens, stream }
 * @returns {Promise<{ text, usage, ttft, totalLatency }>}
 */
export async function sendRequest(relay, message, opts = {}) {
  const timeout = opts.timeout ?? 30000;
  const maxTokens = opts.maxTokens ?? 100;
  const stream = opts.stream ?? false;

  // Security: validate URL
  validateUrl(relay.baseUrl);

  const format = detectFormat(relay);
  const url = buildApiUrl(relay.baseUrl, format);
  const headers = buildHeaders(relay, format);
  const body = buildBody(relay, message, maxTokens, stream);

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);
  const requestStart = Date.now();

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers,
      body,
      signal: controller.signal,
    });

    if (!response.ok) {
      const errorBody = await readLimitedBody(response, 4096);
      throw new Error(`HTTP ${response.status}: ${sanitize(errorBody)}`);
    }

    if (stream) {
      return readStreamingResponse(response, requestStart, format);
    }

    const ttft = Date.now() - requestStart;
    const raw = await readLimitedBody(response, MAX_RESPONSE_BYTES);
    const data = JSON.parse(raw);
    const totalLatency = Date.now() - requestStart;
    const parsed = parseResponse(data, format);

    return {
      ...parsed,
      ttft,
      totalLatency,
      streaming: false,
    };
  } finally {
    clearTimeout(timer);
  }
}

// ─── Streaming response reader ───────────────────────────────────────────────

async function readStreamingResponse(response, requestStart, format) {
  const isSSE = response.headers.get('content-type')?.includes('text/event-stream');

  if (!isSSE) {
    // Non-streaming despite stream=true; parse as normal JSON
    const raw = await readLimitedBody(response, MAX_RESPONSE_BYTES);
    const data = JSON.parse(raw);
    const parsed = parseResponse(data, format);
    return {
      ...parsed,
      ttft: Date.now() - requestStart,
      totalLatency: Date.now() - requestStart,
      streaming: false,
    };
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let ttft = null;
  let totalTokens = 0;
  let totalBytes = 0;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      totalBytes += value.byteLength;
      if (totalBytes > MAX_RESPONSE_BYTES) {
        throw new Error('Streaming response exceeded size limit');
      }

      if (ttft === null) {
        ttft = Date.now() - requestStart;
      }

      const text = decoder.decode(value, { stream: true });
      const dataLines = text.split('\n').filter((l) => l.startsWith('data: '));

      for (const line of dataLines) {
        const payload = line.slice(6).trim();
        if (payload === '[DONE]') continue;
        try {
          const parsed = JSON.parse(payload);
          // Anthropic format
          if (parsed.type === 'content_block_delta') totalTokens++;
          // OpenAI format
          if (parsed.choices?.[0]?.delta?.content) totalTokens++;
          // Final usage (Anthropic)
          if (parsed.usage?.output_tokens) totalTokens = parsed.usage.output_tokens;
          // Final usage (OpenAI)
          if (parsed.usage?.completion_tokens) totalTokens = parsed.usage.completion_tokens;
        } catch {
          // Not all data lines are valid JSON
        }
      }
    }
  } finally {
    reader.releaseLock();
  }

  const totalLatency = Date.now() - requestStart;
  return {
    text: '', // streaming doesn't reconstruct full text
    usage: { inputTokens: 0, outputTokens: totalTokens, cacheRead: 0, cacheWrite: 0 },
    ttft: ttft ?? totalLatency,
    totalLatency,
    outputTokens: totalTokens,
    streaming: true,
    tokensPerSecond: totalTokens > 0 ? totalTokens / (totalLatency / 1000) : 0,
  };
}

// ─── Security helpers ────────────────────────────────────────────────────────

/**
 * Validate a relay URL: must be HTTPS, must not target private IPs.
 */
export function validateUrl(urlStr) {
  let parsed;
  try {
    parsed = new URL(urlStr);
  } catch {
    throw new Error(`Invalid relay URL: ${urlStr}`);
  }

  if (parsed.protocol !== 'https:') {
    throw new Error(
      `Relay URL must use HTTPS (got ${parsed.protocol}). ` +
      `API keys would be sent in plaintext over HTTP.`
    );
  }

  const hostname = parsed.hostname;
  for (const range of PRIVATE_IP_RANGES) {
    if (range.test(hostname)) {
      throw new Error(`Relay URL must not target private/internal address: ${hostname}`);
    }
  }
}

/**
 * Read response body with a byte limit.
 */
async function readLimitedBody(response, maxBytes) {
  const reader = response.body.getReader();
  const chunks = [];
  let total = 0;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > maxBytes) {
        throw new Error(`Response body exceeded ${maxBytes} byte limit`);
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }

  const combined = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    combined.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return new TextDecoder().decode(combined);
}

/**
 * Sanitize relay-derived strings: strip ANSI, control chars, truncate.
 */
export function sanitize(str, maxLen = 500) {
  if (typeof str !== 'string') return '';
  return str
    .replace(ANSI_PATTERN, '')
    .replace(/[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/g, '')
    .slice(0, maxLen);
}

/** Extract URL path safely */
function safeUrlPath(urlStr) {
  try {
    return new URL(urlStr).pathname;
  } catch {
    return '';
  }
}
