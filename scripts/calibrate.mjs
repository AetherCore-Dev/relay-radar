#!/usr/bin/env node
/**
 * Profile Calibrator — Collect real model responses and compute behavioral fingerprints.
 *
 * Usage:
 *   node scripts/calibrate.mjs                     # Full calibration (requires API keys)
 *   node scripts/calibrate.mjs --dry-run            # Dry-run with synthetic responses
 *   node scripts/calibrate.mjs --models opus,sonnet # Calibrate specific models only
 *
 * Environment variables (per model):
 *   CALIBRATE_OPUS_URL    + CALIBRATE_OPUS_KEY
 *   CALIBRATE_SONNET_URL  + CALIBRATE_SONNET_KEY
 *   CALIBRATE_HAIKU_URL   + CALIBRATE_HAIKU_KEY
 *   CALIBRATE_GPT4O_URL   + CALIBRATE_GPT4O_KEY
 *   CALIBRATE_DOMESTIC_URL + CALIBRATE_DOMESTIC_KEY
 *
 * Output: packages/web/data/profiles.json
 */

import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { writeFile, mkdir } from 'node:fs/promises';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

// Dynamic import of core (supports workspace + fallback)
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

const MODEL_CONFIGS = Object.freeze({
  'claude-opus': {
    envUrl: 'CALIBRATE_OPUS_URL',
    envKey: 'CALIBRATE_OPUS_KEY',
    model: 'claude-opus-4',
  },
  'claude-sonnet': {
    envUrl: 'CALIBRATE_SONNET_URL',
    envKey: 'CALIBRATE_SONNET_KEY',
    model: 'claude-sonnet-4',
  },
  'claude-haiku': {
    envUrl: 'CALIBRATE_HAIKU_URL',
    envKey: 'CALIBRATE_HAIKU_KEY',
    model: 'claude-haiku-3.5',
  },
  'gpt-4o': {
    envUrl: 'CALIBRATE_GPT4O_URL',
    envKey: 'CALIBRATE_GPT4O_KEY',
    model: 'gpt-4o',
  },
  'domestic': {
    envUrl: 'CALIBRATE_DOMESTIC_URL',
    envKey: 'CALIBRATE_DOMESTIC_KEY',
    model: 'deepseek-chat',
  },
});

const ROUNDS = 2; // Each prompt sent this many times
const MAX_TOKENS = 800;
const TIMEOUT = 60000;

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

// ─── Dry-run Synthetic Responses ────────────────────────────────────────────

function syntheticResponse(modelKey, prompt) {
  // Generate responses that approximate each model's style
  const styles = {
    'claude-opus': () => {
      return `## Analysis\n\nHere is my detailed analysis of this problem. ` +
        `Perhaps it's worth noting that there are several approaches. ` +
        `However, I'd suggest the following strategy:\n\n` +
        `### Approach\nFirst, we need to consider the requirements carefully. ` +
        `Additionally, there are edge cases to handle.\n\n` +
        '```javascript\n// Implementation\nfunction solve(input) {\n' +
        '  // Handle edge cases\n  if (!input) return null;\n' +
        '  // Core logic\n  const result = process(input);\n' +
        '  return result;\n}\n```\n\n' +
        `This approach might be most effective because it balances performance and readability. ` +
        `I'll explain the reasoning in more detail. The key insight is that we can ` +
        `leverage the built-in data structures to achieve O(n) complexity. ` +
        `Note: There are edge cases to consider, specifically when the input is null or empty. ` +
        `Furthermore, we should also think about error handling and validation. ` +
        `It seems like a comprehensive solution would need to address all these concerns.`;
    },
    'claude-sonnet': () => {
      return `Here's how to approach this:\n\n` +
        '```javascript\nfunction solve(input) {\n  if (!input) return null;\n  return process(input);\n}\n```\n\n' +
        `This works by processing the input directly. The key points are:\n\n` +
        `- Handle null/undefined inputs\n- Process the core logic\n- Return the result\n\n` +
        `I'd recommend adding error handling for production use. ` +
        `The time complexity is O(n) which should be efficient for most use cases.`;
    },
    'claude-haiku': () => {
      return '```javascript\nfunction solve(input) {\n  if (!input) return null;\n  return process(input);\n}\n```\n\n' +
        `This handles the basic case. Add error handling as needed.`;
    },
    'gpt-4o': () => {
      return `To solve this, you can use the following approach:\n\n` +
        '```javascript\nfunction solve(input) {\n  if (!input) return null;\n  const result = process(input);\n  return result;\n}\n```\n\n' +
        `**Explanation:**\n\n` +
        `1. **Input Validation**: Check for null or undefined values.\n` +
        `2. **Core Processing**: Apply the main logic.\n` +
        `3. **Return**: Output the processed result.\n\n` +
        `This pattern is commonly used in production applications. ` +
        `The time complexity is O(n), and space complexity is O(1).`;
    },
    'domestic': () => {
      return '```javascript\nfunction solve(input) {\n  if (!input) return null;\n  return process(input);\n}\n```\n\n' +
        `OK. This is the solution.`;
    },
  };

  const generator = styles[modelKey] ?? styles['claude-sonnet'];
  // Add some variation based on prompt
  const base = generator();
  const variation = prompt.length % 3 === 0 ? ' Consider edge cases.' :
                    prompt.length % 3 === 1 ? ' This is a common pattern.' : '';
  return base + variation;
}

// ─── Main Calibration Logic ─────────────────────────────────────────────────

async function calibrate(opts = {}) {
  const isDryRun = opts.dryRun ?? false;
  const targetModels = opts.models ?? Object.keys(MODEL_CONFIGS);

  const { extractFeatures, FEATURE_NAMES, FEATURE_COUNT } = await importCore();

  console.log('');
  console.log('  ╔══════════════════════════════════════════════╗');
  console.log('  ║  🔬 RelayRadar Profile Calibrator            ║');
  console.log(`  ║  Mode: ${isDryRun ? 'DRY RUN (synthetic data)' : 'LIVE (real API calls)'}${isDryRun ? '     ' : '       '}║`);
  console.log(`  ║  Models: ${targetModels.length}  |  Prompts: ${PROMPTS.length}  |  Rounds: ${ROUNDS}   ║`);
  console.log('  ╚══════════════════════════════════════════════╝');
  console.log('');

  const results = {};
  let sendRequest;

  if (!isDryRun) {
    const core = await importCore();
    sendRequest = core.sendRequest;
  }

  for (const modelKey of targetModels) {
    const config = MODEL_CONFIGS[modelKey];
    if (!config) {
      console.log(`  ⚠️  Unknown model: ${modelKey}, skipping`);
      continue;
    }

    const url = process.env[config.envUrl];
    const key = process.env[config.envKey];

    if (!isDryRun && (!url || !key)) {
      console.log(`  ⚠️  ${modelKey}: missing ${config.envUrl} or ${config.envKey}, skipping`);
      continue;
    }

    console.log(`  📡 Calibrating: ${modelKey} (${PROMPTS.length * ROUNDS} requests)`);

    const stats = createWelford(FEATURE_COUNT);
    let errors = 0;

    for (let round = 0; round < ROUNDS; round++) {
      for (let i = 0; i < PROMPTS.length; i++) {
        const prompt = PROMPTS[i];
        const idx = round * PROMPTS.length + i + 1;
        const total = PROMPTS.length * ROUNDS;

        process.stdout.write(`\r    [${idx}/${total}] `);

        try {
          let responseText;

          if (isDryRun) {
            responseText = syntheticResponse(modelKey, prompt);
          } else {
            const relay = {
              name: modelKey,
              baseUrl: url,
              apiKey: key,
              model: config.model,
            };
            const result = await sendRequest(relay, prompt, {
              timeout: TIMEOUT,
              maxTokens: MAX_TOKENS,
            });
            responseText = result.text;
          }

          const features = extractFeatures(responseText);
          welfordUpdate(stats, features);
        } catch (err) {
          errors++;
          process.stdout.write(`❌ ${err.message?.slice(0, 40)}`);
        }
      }
    }

    const { mean, std, n } = welfordFinalize(stats);

    // Round to 4 decimal places for readability
    const roundedMean = mean.map(v => Math.round(v * 10000) / 10000);
    const roundedStd = std.map(v => Math.round(v * 10000) / 10000);

    results[modelKey] = {
      mean: roundedMean,
      std: roundedStd,
      n,
      errors,
      description: MODEL_CONFIGS[modelKey] ?
        `Calibrated from ${n} real responses` :
        'Unknown model',
    };

    console.log(`\n    ✅ ${modelKey}: n=${n}, errors=${errors}`);
    console.log(`    mean: [${roundedMean.slice(0, 5).join(', ')}, ...]`);
    console.log(`    std:  [${roundedStd.slice(0, 5).join(', ')}, ...]`);
    console.log('');
  }

  // ─── Validate: check inter-model distances ──────────────────────────────

  console.log('  📊 Inter-model distances:');
  const modelKeys = Object.keys(results);
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
      console.log(`    ${modelKeys[i]} ↔ ${modelKeys[j]}: ${dist.toFixed(2)} ${ok}`);
    }
  }

  // ─── Write output ─────────────────────────────────────────────────────────

  const output = {
    version: 2,
    calibratedAt: new Date().toISOString(),
    tool: 'relay-radar/calibrate',
    sampleSize: PROMPTS.length * ROUNDS,
    dryRun: isDryRun,
    featureNames: [...FEATURE_NAMES],
    models: results,
  };

  const outDir = join(ROOT, 'packages', 'web', 'data');
  const outPath = join(outDir, 'profiles.json');

  await mkdir(outDir, { recursive: true });
  await writeFile(outPath, JSON.stringify(output, null, 2) + '\n', 'utf-8');

  console.log('');
  console.log(`  📁 Written to: ${outPath}`);
  console.log(`  📊 Models calibrated: ${Object.keys(results).length}`);
  console.log(`  🕐 Timestamp: ${output.calibratedAt}`);

  if (isDryRun) {
    console.log('');
    console.log('  ⚠️  DRY RUN — profiles are from synthetic data, NOT real API responses.');
    console.log('  Set environment variables and run without --dry-run for real calibration.');
  }

  console.log('');
  return output;
}

// ─── CLI Entry ──────────────────────────────────────────────────────────────

const args = process.argv.slice(2);
const isDryRun = args.includes('--dry-run');
const modelsArg = args.find(a => a.startsWith('--models='));
const models = modelsArg ? modelsArg.split('=')[1].split(',') : undefined;

calibrate({ dryRun: isDryRun, models }).catch(err => {
  console.error('❌ Calibration failed:', err.message);
  process.exit(1);
});
