/**
 * RelayProber — Test relay station connectivity, latency, throughput, and reliability
 */

import { DEFAULT_PROBE_CONFIG } from '../constants.mjs';
import { sendRequest, sanitize } from '../shared/http-client.mjs';

export function RelayProber(options = {}) {
  const config = { ...DEFAULT_PROBE_CONFIG, ...options };

  return Object.freeze({
    probeOne: (relay) => probeEndpoint(relay, config),
    probeAll: (relays) => probeAllEndpoints(relays, config),
    healthCheck: (relay) => quickHealthCheck(relay, config),
  });
}

async function probeEndpoint(relay, config) {
  const results = [];
  let errors = 0;

  // Warmup rounds (discarded)
  for (let i = 0; i < config.warmupRounds; i++) {
    try {
      await singleProbe(relay, config);
    } catch {
      // Warmup errors are ignored
    }
  }

  // Scored rounds with retry support
  for (let i = 0; i < config.testRounds; i++) {
    let lastErr = null;
    let result = null;

    for (let attempt = 0; attempt <= config.retries; attempt++) {
      try {
        result = await singleProbe(relay, config);
        break;
      } catch (err) {
        lastErr = err;
        if (attempt < config.retries) {
          // Brief pause before retry
          await delay(500 * (attempt + 1));
        }
      }
    }

    if (result) {
      results.push(result);
    } else {
      errors++;
      results.push({
        ttft: null,
        totalLatency: null,
        tokensPerSecond: null,
        error: sanitize(lastErr?.message ?? 'Unknown error'),
        streaming: false,
      });
    }
  }

  const successful = results.filter((r) => r.error == null);
  const latencies = successful.map((r) => r.totalLatency).sort((a, b) => a - b);

  return Object.freeze({
    name: relay.name ?? 'Unknown',
    baseUrl: relay.baseUrl,
    model: relay.model,
    alive: successful.length > 0,
    avgTTFT: avg(successful.map((r) => r.ttft)),
    avgLatency: avg(latencies),
    avgThroughput: avg(successful.map((r) => r.tokensPerSecond)),
    errorRate: errors / config.testRounds,
    p50Latency: percentile(latencies, 0.5),
    p95Latency: percentile(latencies, 0.95),
    supportsStreaming: successful.some((r) => r.streaming),
    roundCount: config.testRounds,
    successCount: successful.length,
    rawResults: Object.freeze(results.map((r) => {
      // Strip error details from persisted results for security
      if (r.error) return { ...r, error: sanitize(r.error, 200) };
      return r;
    })),
    probedAt: new Date().toISOString(),
  });
}

async function probeAllEndpoints(relays, config) {
  const results = [];
  const chunks = chunk(relays, config.concurrency);

  for (const batch of chunks) {
    const batchResults = await Promise.all(
      batch.map((relay) => probeEndpoint(relay, config))
    );
    results.push(...batchResults);
  }

  return Object.freeze(results);
}

async function quickHealthCheck(relay, config) {
  const start = Date.now();
  try {
    await singleProbe(relay, config);
    return Object.freeze({ alive: true, latencyMs: Date.now() - start });
  } catch (err) {
    return Object.freeze({
      alive: false,
      latencyMs: Date.now() - start,
      error: sanitize(err.message),
    });
  }
}

/** Single probe using the shared HTTP client */
async function singleProbe(relay, config) {
  const result = await sendRequest(relay, 'Say "hi" and nothing else.', {
    timeout: config.timeout,
    maxTokens: 50,
    stream: true,
  });

  return {
    ttft: result.ttft,
    totalLatency: result.totalLatency,
    tokensPerSecond: result.tokensPerSecond ?? (
      result.usage.outputTokens > 0
        ? result.usage.outputTokens / (result.totalLatency / 1000)
        : 0
    ),
    outputTokens: result.usage.outputTokens ?? result.outputTokens ?? 0,
    streaming: result.streaming,
    error: null,
  };
}

function chunk(arr, size) {
  const chunks = [];
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size));
  }
  return chunks;
}

function avg(nums) {
  if (nums.length === 0) return 0;
  return Math.round(nums.reduce((a, b) => a + b, 0) / nums.length);
}

function percentile(sorted, p) {
  if (sorted.length === 0) return 0;
  const idx = Math.ceil(p * sorted.length) - 1;
  return sorted[Math.max(0, idx)];
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
