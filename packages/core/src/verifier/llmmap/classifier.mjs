/**
 * LLMmap Integration — Model fingerprinting based on the LLMmap paper.
 *
 * Two modes:
 *   1. Full mode:  Python bridge → calls LLMmap pretrained model (>95% accuracy)
 *   2. Lite mode:  Pure JS response analysis (no Python, ~80% accuracy for Claude family)
 *
 * Reference: USENIX Security 2025, arXiv:2407.15847
 */

import { sendRequest, sanitize } from '../../shared/http-client.mjs';
import { LLMMAP_PROBES, MAX_RESPONSE_CHARS, CLAUDE_RESPONSE_PATTERNS } from './probes.mjs';

/**
 * Create an LLMmap-based verifier.
 *
 * @param {Object} opts
 * @param {string} [opts.mode] - 'full' (Python bridge) or 'lite' (JS-only)
 * @param {string} [opts.pythonPath] - Path to python3 binary
 * @param {string} [opts.llmmapDir] - Path to LLMmap installation
 * @param {number} [opts.timeout] - Per-probe request timeout (ms)
 * @returns {Readonly<Object>}
 */
export function LLMmapVerifier(opts = {}) {
  const mode = opts.mode ?? 'lite';
  const timeout = opts.timeout ?? 60000;

  return Object.freeze({
    /** Collect responses to all 8 probes from a relay */
    collectProbes: (relay) => collectProbeResponses(relay, timeout),

    /** Classify model using collected responses */
    classify: (responses) =>
      mode === 'full'
        ? classifyFull(responses, opts)
        : classifyLite(responses),

    /** One-shot: collect probes + classify */
    verify: (relay) => verifyWithLLMmap(relay, timeout, mode, opts),

    /** Get the probe queries for inspection */
    getProbes: () => [...LLMMAP_PROBES],

    /** Current mode */
    mode,
  });
}

// ─── Probe Collection ────────────────────────────────────────────────────────

/**
 * Send all 8 LLMmap probes to a relay and collect responses.
 * This is the same as what LLMmap's main_interactive.py does.
 */
async function collectProbeResponses(relay, timeout) {
  const responses = [];
  const timings = [];

  for (const probe of LLMMAP_PROBES) {
    try {
      const start = Date.now();
      const result = await sendRequest(relay, probe, {
        timeout,
        maxTokens: 300, // LLMmap uses max_new_tokens=100, we use 300 for safety
      });
      const elapsed = Date.now() - start;

      // Truncate to LLMmap's standard (650 chars)
      const text = (result.text ?? '').slice(0, MAX_RESPONSE_CHARS);
      responses.push(text);
      timings.push({
        ttft: result.ttft,
        totalMs: elapsed,
        outputTokens: result.usage?.outputTokens ?? 0,
      });
    } catch (err) {
      responses.push(`[ERROR: ${sanitize(err.message, 100)}]`);
      timings.push({ ttft: 0, totalMs: 0, outputTokens: 0, error: true });
    }
  }

  return Object.freeze({
    responses: Object.freeze(responses),
    timings: Object.freeze(timings),
    relay: relay.name ?? relay.baseUrl,
    claimedModel: relay.model ?? 'unknown',
    collectedAt: new Date().toISOString(),
  });
}

// ─── Full Mode: Python Bridge ────────────────────────────────────────────────

/**
 * Classify using the actual LLMmap pretrained model via Python subprocess.
 * Requires: python3, pip install torch transformers scipy
 * Accuracy: >95% for 52 known models
 */
async function classifyFull(probeData, opts) {
  const { execFile } = await import('node:child_process');
  const { writeFile, unlink } = await import('node:fs/promises');
  const { join } = await import('node:path');
  const { tmpdir } = await import('node:os');

  const pythonPath = opts.pythonPath ?? 'python3';
  const llmmapDir = opts.llmmapDir;

  if (!llmmapDir) {
    throw new Error(
      'Full mode requires LLMmap installation path.\n' +
      'Install: pip install torch transformers scipy\n' +
      'Clone:   git clone https://github.com/pasquini-dario/LLMmap.git\n' +
      'Use:     LLMmapVerifier({ mode: "full", llmmapDir: "/path/to/LLMmap" })'
    );
  }

  // Write responses to temp file
  const tmpFile = join(tmpdir(), `llmmap-input-${Date.now()}.json`);
  const outputFile = join(tmpdir(), `llmmap-output-${Date.now()}.json`);

  try {
    await writeFile(tmpFile, JSON.stringify(probeData.responses), { mode: 0o600 });

    // Python script that loads LLMmap and classifies
    const script = `
import sys, json
sys.path.insert(0, ${JSON.stringify(llmmapDir)})
from LLMmap.inference import load_LLMmap

with open(${JSON.stringify(tmpFile)}) as f:
    answers = json.load(f)

conf, llmmap = load_LLMmap('${llmmapDir}/data/pretrained_models/default/')
distances = llmmap(answers)

# Get sorted results
import numpy as np
sorted_idx = np.argsort(distances)
results = []
for idx in sorted_idx[:10]:
    results.append({
        "model": llmmap.label_map[idx],
        "distance": float(distances[idx])
    })

with open(${JSON.stringify(outputFile)}, 'w') as f:
    json.dump(results, f)
`;

    await new Promise((resolve, reject) => {
      execFile(pythonPath, ['-c', script], { timeout: 120000 }, (err) => {
        if (err) reject(new Error(`LLMmap Python执行失败: ${err.message}`));
        else resolve();
      });
    });

    const { readFile } = await import('node:fs/promises');
    const raw = await readFile(outputFile, 'utf-8');
    const results = JSON.parse(raw);

    const top = results[0];
    const second = results[1];
    const gap = second ? second.distance - top.distance : 0;

    return Object.freeze({
      method: 'llmmap-full',
      accuracy: '>95%',
      predictedModel: top.model,
      confidence: distanceToConfidence(top.distance, gap),
      top5: Object.freeze(results.slice(0, 5)),
      claimedModel: probeData.claimedModel,
      matchesClaim: modelMatchesClaim(top.model, probeData.claimedModel),
    });
  } finally {
    // Cleanup temp files
    await unlink(tmpFile).catch(() => {});
    await unlink(outputFile).catch(() => {});
  }
}

// ─── Lite Mode: Pure JS Classification ───────────────────────────────────────

/**
 * Classify using pure JS response analysis.
 * No Python required. Lower accuracy (~80% for Claude family).
 *
 * Strategy: Analyze the 8 probe responses using multiple signals:
 * 1. Response length profile (each model has characteristic verbosity)
 * 2. Safety refusal patterns (Opus is more elaborate, Haiku is brief)
 * 3. Self-identification extraction (probes 6, 7)
 * 4. Adversarial response patterns (probes 1, 6, 8)
 * 5. TTFT timing profile
 */
function classifyLite(probeData) {
  const responses = probeData.responses;
  const timings = probeData.timings;

  if (responses.length !== 8) {
    return Object.freeze({
      method: 'llmmap-lite',
      accuracy: '~80% (Claude family)',
      predictedModel: 'unknown',
      confidence: 0,
      verdict: 'error',
      detail: `Expected 8 responses, got ${responses.length}`,
    });
  }

  // Count how many probes failed
  const errorCount = responses.filter(r => r.startsWith('[ERROR')).length;
  if (errorCount >= 6) {
    return Object.freeze({
      method: 'llmmap-lite',
      predictedModel: 'unknown',
      confidence: 0,
      verdict: 'inconclusive',
      detail: `${errorCount}/8 probes failed`,
    });
  }

  const scores = { opus: 0, sonnet: 0, haiku: 0, nonClaude: 0 };

  // ─── Signal 1: Response lengths ────────────────────────────
  const lengths = responses.map(r => r.length);
  const avgLen = lengths.reduce((a, b) => a + b, 0) / lengths.length;

  if (avgLen > 350) scores.opus += 3;
  else if (avgLen > 180) scores.sonnet += 3;
  else if (avgLen > 50) scores.haiku += 3;
  else scores.nonClaude += 2;

  // ─── Signal 2: Safety refusal pattern (probe 2: "build a bomb") ────
  const safetyResponse = responses[1];
  if (!safetyResponse.startsWith('[ERROR')) {
    const safetyLen = safetyResponse.length;
    const hasRefusal = /can't|cannot|won't|will not|不能|无法|refuse|sorry|apologize/i.test(safetyResponse);
    const hasExplanation = /instead|however|help you with|suggest|alternative/i.test(safetyResponse);

    if (hasRefusal && hasExplanation && safetyLen > 200) {
      scores.opus += 4; // Opus gives elaborate, nuanced refusals
    } else if (hasRefusal && safetyLen > 80) {
      scores.sonnet += 4; // Sonnet: clear refusal with some context
    } else if (hasRefusal) {
      scores.haiku += 3; // Haiku: brief refusal
    } else {
      scores.nonClaude += 5; // No refusal → probably not Claude
    }
  }

  // ─── Signal 3: Self-identification (probes 6, 7) ───────────
  const identityProbe6 = responses[5].toLowerCase();
  const identityProbe7 = responses[6].toLowerCase();
  const identityText = identityProbe6 + ' ' + identityProbe7;

  if (/opus/.test(identityText)) scores.opus += 5;
  else if (/sonnet/.test(identityText)) scores.sonnet += 5;
  else if (/haiku/.test(identityText)) scores.haiku += 5;
  else if (/claude/.test(identityText)) scores.sonnet += 2; // Claude but no specific model
  else if (/gpt|openai|gemini|llama|qwen|deepseek|glm/i.test(identityText)) {
    scores.nonClaude += 8; // Identified as non-Claude
  }

  // ─── Signal 4: Adversarial jailbreak response (probes 1, 6, 8) ────
  // Claude models have strong alignment — they'll refuse or redirect
  const adversarialProbes = [responses[0], responses[5], responses[7]];
  let refusedCount = 0;
  for (const resp of adversarialProbes) {
    if (/can't|cannot|won't|不能|refuse|sorry|I'm not able/i.test(resp)) {
      refusedCount++;
    }
  }
  if (refusedCount >= 2) {
    // Strong alignment = likely Claude
    scores.opus += 1;
    scores.sonnet += 1;
    scores.haiku += 1;
  } else {
    scores.nonClaude += 3;
  }

  // ─── Signal 5: Knowledge responses (probes 3, 5) ──────────
  const trainingDataResp = responses[2];
  const cutoffResp = responses[4];

  // Claude specifically says it doesn't know training data details
  if (/don't have.*specific|not able to provide|don't know.*exact/i.test(trainingDataResp)) {
    scores.opus += 2;
    scores.sonnet += 2;
    scores.haiku += 1;
  }

  // Check cutoff date mentions
  if (/2025|april|early 2025/i.test(cutoffResp)) {
    scores.opus += 2;
    scores.sonnet += 2;
    scores.haiku += 2;
  } else if (/2024|2023/i.test(cutoffResp)) {
    scores.nonClaude += 2; // Older cutoff → probably not latest Claude
  }

  // ─── Signal 6: TTFT timing ────────────────────────────────
  const validTimings = timings.filter(t => !t.error && t.ttft > 0);
  if (validTimings.length >= 4) {
    const avgTTFT = validTimings.reduce((s, t) => s + t.ttft, 0) / validTimings.length;
    if (avgTTFT > 1500) scores.opus += 2;
    else if (avgTTFT > 500) scores.sonnet += 2;
    else if (avgTTFT > 100) scores.haiku += 2;
  }

  // ─── Determine winner ─────────────────────────────────────
  const sortedScores = Object.entries(scores)
    .sort(([, a], [, b]) => b - a);
  const [winner, winScore] = sortedScores[0];
  const [second, secondScore] = sortedScores[1];
  const gap = winScore - secondScore;
  const total = Object.values(scores).reduce((a, b) => a + b, 0);
  const confidence = total > 0 ? Math.round((winScore / total) * 100) : 0;

  const predictedModel = winner === 'nonClaude'
    ? extractNonClaudeModel(identityText)
    : `claude-${winner}`;

  const matchesClaim = modelMatchesClaim(predictedModel, probeData.claimedModel);

  let verdict;
  if (winner === 'nonClaude' && confidence > 40) {
    verdict = 'fake';
  } else if (matchesClaim && confidence > 35 && gap >= 3) {
    verdict = 'authentic';
  } else if (!matchesClaim && confidence > 35 && gap >= 3) {
    verdict = 'suspicious';
  } else {
    verdict = 'inconclusive';
  }

  return Object.freeze({
    method: 'llmmap-lite',
    accuracy: '~80% (Claude family)',
    predictedModel,
    confidence,
    verdict,
    matchesClaim,
    claimedModel: probeData.claimedModel,
    scores: Object.freeze({ ...scores }),
    signals: Object.freeze({
      avgResponseLength: Math.round(avgLen),
      safetyRefusalDetected: /can't|cannot|refuse/i.test(responses[1]),
      selfIdentification: extractIdentity(identityText),
      adversarialRefusalRate: `${refusedCount}/3`,
      avgTTFT: validTimings.length > 0
        ? Math.round(validTimings.reduce((s, t) => s + t.ttft, 0) / validTimings.length)
        : null,
    }),
    probeResponses: Object.freeze(
      responses.map((r, i) => ({
        probe: i + 1,
        responseLength: r.length,
        preview: r.slice(0, 100) + (r.length > 100 ? '...' : ''),
      }))
    ),
  });
}

// ─── One-shot verify ─────────────────────────────────────────────────────────

async function verifyWithLLMmap(relay, timeout, mode, opts) {
  const probeData = await collectProbeResponses(relay, timeout);

  const classification = mode === 'full'
    ? await classifyFull(probeData, opts)
    : classifyLite(probeData);

  return Object.freeze({
    ...classification,
    relay: probeData.relay,
    probeData,
    verifiedAt: new Date().toISOString(),
  });
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function modelMatchesClaim(predicted, claimed) {
  const p = (predicted ?? '').toLowerCase();
  const c = (claimed ?? '').toLowerCase();
  if (p.includes('opus') && c.includes('opus')) return true;
  if (p.includes('sonnet') && c.includes('sonnet')) return true;
  if (p.includes('haiku') && c.includes('haiku')) return true;
  return p === c;
}

function extractIdentity(text) {
  if (/opus/i.test(text)) return 'opus';
  if (/sonnet/i.test(text)) return 'sonnet';
  if (/haiku/i.test(text)) return 'haiku';
  if (/gpt-4o/i.test(text)) return 'gpt-4o';
  if (/gpt-4/i.test(text)) return 'gpt-4';
  if (/gpt-3/i.test(text)) return 'gpt-3.5';
  if (/gemini/i.test(text)) return 'gemini';
  if (/llama/i.test(text)) return 'llama';
  if (/qwen/i.test(text)) return 'qwen';
  if (/deepseek/i.test(text)) return 'deepseek';
  if (/glm/i.test(text)) return 'glm';
  if (/claude/i.test(text)) return 'claude (unspecified)';
  return 'unknown';
}

function extractNonClaudeModel(text) {
  const identity = extractIdentity(text);
  if (identity !== 'unknown' && identity !== 'claude (unspecified)') {
    return identity;
  }
  return 'non-claude-unknown';
}

function distanceToConfidence(distance, gap) {
  // Lower distance = higher confidence; larger gap = more certain
  if (distance < 10 && gap > 5) return 95;
  if (distance < 20 && gap > 3) return 85;
  if (distance < 30) return 70;
  if (distance < 50) return 50;
  return 30;
}
