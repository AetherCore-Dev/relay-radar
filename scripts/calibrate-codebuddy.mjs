#!/usr/bin/env node
/**
 * Calibrate Behavioral Fingerprints via CodeBuddy API.
 *
 * Collects real model responses and computes 15-dimension behavioral profiles.
 * Uses streaming mode (required by CodeBuddy).
 *
 * Usage:
 *   CODEBUDDY_API_KEY=ck_xxx node scripts/calibrate-codebuddy.mjs
 *   CODEBUDDY_API_KEY=ck_xxx node scripts/calibrate-codebuddy.mjs --models claude-opus-4.6,gpt-5.4
 *   CODEBUDDY_API_KEY=ck_xxx node scripts/calibrate-codebuddy.mjs --prompts 10 --rounds 1
 *
 * Output: packages/web/data/profiles.json
 *         packages/core/src/verifier/behavioral/profiles.mjs (updated)
 */

import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { writeFile, mkdir } from 'node:fs/promises';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

// Dynamic import of core
async function importCore() {
  try {
    return await import('@relay-radar/core');
  } catch {
    const corePath = join(ROOT, 'packages', 'core', 'src', 'index.mjs');
    const { pathToFileURL } = await import('node:url');
    return import(pathToFileURL(corePath).href);
  }
}

// ─── Configuration ──────────────────────────────────────────────────────────

const API_KEY = process.env.CODEBUDDY_API_KEY || 'ck_fihh84bamfwg.ehWZ2Xy6mEbVfkdiCznbESzPl0SDeXWAmKTn0b0gAaI';
const API_URL = 'https://www.codebuddy.cn/v2/chat/completions';

const MODEL_CONFIGS = Object.freeze({
  'claude-opus-4.6': { id: 'claude-opus-4.6', profileKey: 'claude-opus-4.6', family: 'claude' },
  'claude-opus-4.5': { id: 'claude-opus-4.5', profileKey: 'claude-opus-4.5', family: 'claude' },
  'claude-sonnet-4.6': { id: 'claude-sonnet-4.6', profileKey: 'claude-sonnet-4.6', family: 'claude' },
  'claude-sonnet-4.5': { id: 'claude-4.5', profileKey: 'claude-sonnet-4.5', family: 'claude' },
  'claude-haiku-4.5': { id: 'claude-haiku-4.5', profileKey: 'claude-haiku-4.5', family: 'claude' },
  'gpt-5.4': { id: 'gpt-5.4', profileKey: 'gpt-5.4', family: 'gpt' },
  'gpt-5.3-codex': { id: 'gpt-5.3-codex', profileKey: 'gpt-5.3-codex', family: 'gpt' },
  'gemini-3.1-pro': { id: 'gemini-3.1-pro', profileKey: 'gemini-3.1-pro', family: 'gemini' },
});

const TIMEOUT = 90000;
const MAX_TOKENS = 800;

// ─── 50 diverse coding prompts ──────────────────────────────────────────────

const PROMPTS = Object.freeze([
  'Write a function to validate email addresses in JavaScript.',
  'Explain the difference between let and const in ES6.',
  'Refactor this: function f(x) { if (x > 0) { return true; } else { return false; } }',
  'What are the pros and cons of using TypeScript over JavaScript?',
  'Write a simple Express.js middleware that logs request duration.',
  'How do I handle errors properly in async/await code?',
  'Write unit tests for a function that calculates Fibonacci numbers.',
  'Explain how closures work in JavaScript with an example.',
  'What is the best way to deep clone an object in JavaScript?',
  'Write a debounce function from scratch.',
  'How should I structure a Node.js project with multiple modules?',
  'Explain the event loop in Node.js and why it matters.',
  'Write a function that flattens a nested array.',
  'What are the security best practices for handling user input?',
  'How do I implement pagination in a REST API?',
  'Write a simple LRU cache class in JavaScript.',
  'Explain the difference between SQL and NoSQL databases.',
  'How do I optimize a slow SQL query with proper indexing?',
  'Write a function to convert a CSV string to JSON.',
  'What is the difference between authentication and authorization?',
  'Implement a rate limiter using the token bucket algorithm.',
  'Explain how WebSockets work vs HTTP long polling.',
  'Write a function to check if a binary tree is balanced.',
  'How do I implement retry logic with exponential backoff?',
  'Write a simple pub/sub event system in JavaScript.',
  'Explain the CAP theorem in distributed systems.',
  'Write a function that merges two sorted arrays in O(n).',
  'How do I prevent SQL injection in Node.js applications?',
  'Implement a basic Promise.all from scratch.',
  'Explain the difference between process and thread.',
  'Write a middleware that validates JWT tokens.',
  'How do I implement a circuit breaker pattern?',
  'Write a function to find the longest common subsequence.',
  'Explain garbage collection in V8 JavaScript engine.',
  'Write a simple state machine for a traffic light.',
  'How do I implement optimistic locking in a database?',
  'Write a function that converts Roman numerals to integers.',
  'Explain CORS and how to configure it properly.',
  'Write a function to detect cycles in a linked list.',
  'How do I design a RESTful API for a blog platform?',
  'Write a function that implements binary search.',
  'Explain the difference between TCP and UDP protocols.',
  'Write a simple dependency injection container.',
  'How do I implement server-sent events (SSE)?',
  'Write a function to validate an IPv4 address.',
  'Explain the Observer pattern with a practical example.',
  'Write a function that generates all permutations of a string.',
  'How do I handle database migrations safely?',
  'Write a throttle function from scratch.',
  'Explain the difference between Docker containers and VMs.',
]);

// ─── Welford's Online Statistics ────────────────────────────────────────────

function createWelford(dims) {
  return { n: 0, mean: new Float64Array(dims), m2: new Float64Array(dims) };
}

function welfordUpdate(state, values) {
  state.n++;
  for (let i = 0; i < values.length; i++) {
    const delta = values[i] - state.mean[i];
    state.mean[i] += delta / state.n;
    const delta2 = values[i] - state.mean[i];
    state.m2[i] += delta * delta2;
  }
}

function welfordFinalize(state) {
  const mean = [...state.mean];
  const std = state.n > 1
    ? [...state.m2].map(v => Math.sqrt(v / (state.n - 1)))
    : new Array(state.mean.length).fill(0);
  return { mean, std, n: state.n };
}

// ─── Streaming request to CodeBuddy ─────────────────────────────────────────

async function sendStreamingRequest(modelId, prompt, maxTokens = MAX_TOKENS) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT);

  try {
    const res = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Api-Key': API_KEY,
      },
      body: JSON.stringify({
        model: modelId,
        max_tokens: maxTokens,
        stream: true,
        messages: [{ role: 'user', content: prompt }],
      }),
      signal: controller.signal,
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`HTTP ${res.status}: ${errText.slice(0, 200)}`);
    }

    // Read SSE stream and reconstruct full response
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let content = '';
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop(); // keep incomplete line

      for (const line of lines) {
        if (!line.startsWith('data: ')) continue;
        const payload = line.slice(6).trim();
        if (payload === '[DONE]') continue;
        try {
          const d = JSON.parse(payload);
          const c = d.choices?.[0]?.delta?.content;
          if (c) content += c;
        } catch {}
      }
    }

    return content;
  } finally {
    clearTimeout(timer);
  }
}

// ─── Main Calibration Logic ─────────────────────────────────────────────────

async function calibrate(opts = {}) {
  const numPrompts = opts.prompts ?? PROMPTS.length;
  const rounds = opts.rounds ?? 2;
  const targetModels = opts.models ?? Object.keys(MODEL_CONFIGS);

  const { extractFeatures, FEATURE_NAMES, FEATURE_COUNT } = await importCore();
  const promptsToUse = PROMPTS.slice(0, numPrompts);

  console.log('');
  console.log('  ╔══════════════════════════════════════════════╗');
  console.log('  ║  🔬 RelayRadar CodeBuddy Calibrator          ║');
  console.log('  ╚══════════════════════════════════════════════╝');
  console.log('');
  console.log(`  API: ${API_URL}`);
  console.log(`  Models: ${targetModels.length}  |  Prompts: ${promptsToUse.length}  |  Rounds: ${rounds}`);
  console.log(`  Total requests: ${targetModels.length * promptsToUse.length * rounds}`);
  console.log('');

  const results = {};

  for (const modelName of targetModels) {
    const config = MODEL_CONFIGS[modelName];
    if (!config) {
      console.log(`  ⚠️  Unknown model: ${modelName}, skipping`);
      continue;
    }

    const total = promptsToUse.length * rounds;
    console.log(`  📡 Calibrating: ${modelName} (${config.id}) — ${total} requests`);

    const stats = createWelford(FEATURE_COUNT);
    let errors = 0;
    const startTime = Date.now();

    for (let round = 0; round < rounds; round++) {
      for (let i = 0; i < promptsToUse.length; i++) {
        const prompt = promptsToUse[i];
        const idx = round * promptsToUse.length + i + 1;

        process.stdout.write(`\r    [${idx}/${total}] `);

        try {
          const responseText = await sendStreamingRequest(config.id, prompt);

          if (!responseText || responseText.length < 5) {
            errors++;
            process.stdout.write('⚠️ empty');
            continue;
          }

          const features = extractFeatures(responseText);
          welfordUpdate(stats, features);
        } catch (err) {
          errors++;
          process.stdout.write(`❌ ${err.message?.slice(0, 40)}`);
        }

        // Rate limiting: small delay between requests
        await new Promise(r => setTimeout(r, 200));
      }
    }

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    const { mean, std, n } = welfordFinalize(stats);

    // Round to 4 decimal places
    const roundedMean = mean.map(v => Math.round(v * 10000) / 10000);
    const roundedStd = std.map(v => Math.round(v * 10000) / 10000);

    results[config.profileKey] = {
      mean: roundedMean,
      std: roundedStd,
      n,
      errors,
      modelId: config.id,
      family: config.family,
      description: `Calibrated from ${n} real CodeBuddy responses (${modelName})`,
    };

    console.log(`\n    ✅ ${modelName}: n=${n}, errors=${errors}, time=${elapsed}s`);
    console.log(`    mean: [${roundedMean.slice(0, 5).join(', ')}, ...]`);
    console.log(`    std:  [${roundedStd.slice(0, 5).join(', ')}, ...]`);
    console.log('');
  }

  // ─── Validate: inter-model distances ──────────────────────────────────

  console.log('  📊 Inter-model distances:');
  const modelKeys = Object.keys(results);
  let allDistancesGood = true;
  for (let i = 0; i < modelKeys.length; i++) {
    for (let j = i + 1; j < modelKeys.length; j++) {
      const a = results[modelKeys[i]];
      const b = results[modelKeys[j]];
      let dist = 0;
      for (let k = 0; k < a.mean.length; k++) {
        const sigma = Math.max(a.std[k], b.std[k], 0.01);
        const z = (a.mean[k] - b.mean[k]) / sigma;
        dist += z * z;
      }
      dist = Math.sqrt(dist / a.mean.length);
      const ok = dist > 0.5 ? '✅' : '⚠️ LOW';
      if (dist <= 0.5) allDistancesGood = false;
      console.log(`    ${modelKeys[i].padEnd(22)} ↔ ${modelKeys[j].padEnd(22)}: ${dist.toFixed(2)} ${ok}`);
    }
  }

  // ─── Write profiles.json ──────────────────────────────────────────────

  const output = {
    version: 2,
    calibratedAt: new Date().toISOString(),
    tool: 'relay-radar/calibrate-codebuddy',
    source: 'CodeBuddy API (real model responses)',
    sampleSize: PROMPTS.length * 2,
    dryRun: false,
    featureNames: [...FEATURE_NAMES],
    models: results,
  };

  const outDir = join(ROOT, 'packages', 'web', 'data');
  const outPath = join(outDir, 'profiles.json');
  await mkdir(outDir, { recursive: true });
  await writeFile(outPath, JSON.stringify(output, null, 2) + '\n', 'utf-8');
  console.log(`\n  📁 profiles.json → ${outPath}`);

  // ─── Generate profiles.mjs content ────────────────────────────────────

  const profilesPath = join(ROOT, 'packages', 'core', 'src', 'verifier', 'behavioral', 'profiles.mjs');
  const mjsContent = generateProfilesMjs(results, FEATURE_NAMES);
  await writeFile(profilesPath, mjsContent, 'utf-8');
  console.log(`  📁 profiles.mjs → ${profilesPath}`);

  console.log(`\n  📊 Models calibrated: ${Object.keys(results).length}`);
  console.log(`  🕐 Timestamp: ${output.calibratedAt}`);
  if (!allDistancesGood) {
    console.log('  ⚠️  Some inter-model distances are low — fingerprints may overlap.');
  }
  console.log('');

  return output;
}

// ─── Generate profiles.mjs source code ──────────────────────────────────────

function generateProfilesMjs(results, featureNames) {
  const lines = [];
  lines.push(`/**`);
  lines.push(` * Reference profiles for known models — REAL DATA from CodeBuddy API calibration.`);
  lines.push(` *`);
  lines.push(` * Auto-generated by scripts/calibrate-codebuddy.mjs`);
  lines.push(` * Generated at: ${new Date().toISOString()}`);
  lines.push(` *`);
  lines.push(` * Each profile is the expected MEAN and STANDARD DEVIATION for the 15 features.`);
  lines.push(` * Built by analyzing real coding responses from each model via CodeBuddy API.`);
  lines.push(` *`);
  lines.push(` * Feature order matches FEATURE_NAMES in features.mjs:`);
  lines.push(` * [${featureNames.join(', ')}]`);
  lines.push(` */`);
  lines.push('');
  lines.push('export const MODEL_PROFILES = Object.freeze({');

  for (const [key, data] of Object.entries(results)) {
    const meanStr = data.mean.map(v => v.toFixed(4)).join(', ');
    const stdStr = data.std.map(v => v.toFixed(4)).join(', ');
    lines.push(`  // ${data.description}`);
    lines.push(`  '${key}': Object.freeze({`);
    lines.push(`    mean: Object.freeze([${meanStr}]),`);
    lines.push(`    std:  Object.freeze([${stdStr}]),`);
    lines.push(`    description: '${data.description}',`);
    lines.push(`  }),`);
    lines.push('');
  }

  // Add backward-compatible aliases
  lines.push('  // ─── Backward-compatible aliases ─────────────────────────────────');
  const aliasMap = {
    'claude-opus': 'claude-opus-4.6',
    'claude-sonnet': 'claude-sonnet-4.6',
    'claude-haiku': 'claude-haiku-4.5',
    'gpt-4o': 'gpt-5.4',
    'domestic': null, // keep old domestic profile
  };
  for (const [alias, target] of Object.entries(aliasMap)) {
    if (target && results[target]) {
      lines.push(`  '${alias}': Object.freeze({`);
      lines.push(`    mean: Object.freeze([${results[target].mean.map(v => v.toFixed(4)).join(', ')}]),`);
      lines.push(`    std:  Object.freeze([${results[target].std.map(v => v.toFixed(4)).join(', ')}]),`);
      lines.push(`    description: 'Alias for ${target}',`);
      lines.push(`  }),`);
      lines.push('');
    }
  }

  // Keep a domestic profile (average of all non-Claude, non-GPT, non-Gemini if we had them)
  // For now, keep it as a copy of the old estimate
  lines.push(`  // 国产模型典型特征 — placeholder until calibrated with real data`);
  lines.push(`  'domestic': Object.freeze({`);
  lines.push(`    mean: Object.freeze([0.4500, 0.4000, 0.3000, 0.2200, 0.3000, 0.3500, 0.4200, 0.4500, 0.2800, 0.0800, 0.2200, 0.2000, 0.1000, 0.3000, 0.1200]),`);
  lines.push(`    std:  Object.freeze([0.1800, 0.2000, 0.2200, 0.1400, 0.1500, 0.1200, 0.1600, 0.0800, 0.1000, 0.0600, 0.0800, 0.1000, 0.0600, 0.2200, 0.1000]),`);
  lines.push(`    description: '国产模型(Qwen/DeepSeek/GLM): 估算值，待实际校准',`);
  lines.push(`  }),`);

  lines.push('});');
  lines.push('');
  return lines.join('\n');
}

// ─── CLI Entry ──────────────────────────────────────────────────────────────

const args = process.argv.slice(2);
const modelsArg = args.find(a => a.startsWith('--models='));
const promptsArg = args.find(a => a.startsWith('--prompts='));
const roundsArg = args.find(a => a.startsWith('--rounds='));

const models = modelsArg ? modelsArg.split('=')[1].split(',') : undefined;
const prompts = promptsArg ? parseInt(promptsArg.split('=')[1]) : undefined;
const rounds = roundsArg ? parseInt(roundsArg.split('=')[1]) : undefined;

calibrate({ models, prompts, rounds }).catch(err => {
  console.error('❌ Calibration failed:', err.message);
  console.error(err.stack);
  process.exit(1);
});
