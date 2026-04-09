#!/usr/bin/env node
/**
 * Probe CodeBuddy API — discover working base URLs and model IDs.
 * Tries multiple auth methods: X-Api-Key, Bearer, x-api-key
 * Tries multiple URL patterns: /v1, /v2, /v3
 */

const API_KEY = process.env.CODEBUDDY_API_KEY || 'ck_fihh84bamfwg.ehWZ2Xy6mEbVfkdiCznbESzPl0SDeXWAmKTn0b0gAaI';
const TIMEOUT = 15000;

// ─── All candidate endpoints ──────────────────────────────────────────────
const ENDPOINTS = [
  // CodeBuddy official
  { url: 'https://www.codebuddy.ai/v2/chat/completions', label: 'codebuddy.ai /v2' },
  { url: 'https://www.codebuddy.ai/v1/chat/completions', label: 'codebuddy.ai /v1' },
  { url: 'https://www.codebuddy.ai/api/v1/chat/completions', label: 'codebuddy.ai /api/v1' },
  { url: 'https://api.codebuddy.ai/v1/chat/completions', label: 'api.codebuddy.ai /v1' },
  { url: 'https://api.codebuddy.ai/v2/chat/completions', label: 'api.codebuddy.ai /v2' },
  // CodeBuddy CN
  { url: 'https://www.codebuddy.cn/v2/chat/completions', label: 'codebuddy.cn /v2' },
  { url: 'https://www.codebuddy.cn/v1/chat/completions', label: 'codebuddy.cn /v1' },
  { url: 'https://api.codebuddy.cn/v2/chat/completions', label: 'api.codebuddy.cn /v2' },
  // Tencent Copilot
  { url: 'https://copilot.tencent.com/v2/chat/completions', label: 'copilot.tencent /v2' },
  { url: 'https://copilot.tencent.com/v1/chat/completions', label: 'copilot.tencent /v1' },
  { url: 'https://copilot.tencent.com/api/v1/chat/completions', label: 'copilot.tencent /api/v1' },
  // Tencent LKEAP
  { url: 'https://api.lkeap.cloud.tencent.com/coding/v3/chat/completions', label: 'lkeap /coding/v3' },
  { url: 'https://api.lkeap.cloud.tencent.com/v1/chat/completions', label: 'lkeap /v1' },
];

// ─── Auth methods to try ──────────────────────────────────────────────────
const AUTH_METHODS = [
  { name: 'X-Api-Key', headers: { 'X-Api-Key': API_KEY } },
  { name: 'Bearer', headers: { 'Authorization': `Bearer ${API_KEY}` } },
  { name: 'x-api-key', headers: { 'x-api-key': API_KEY } },
];

// ─── Model IDs ────────────────────────────────────────────────────────────
const MODEL_IDS = [
  'claude-opus-4.6', 'claude-opus-4-6', 'claude-4-opus',
  'claude-opus-4.5', 'claude-opus-4-5',
  'claude-sonnet-4.6', 'claude-sonnet-4-6',
  'claude-sonnet-4.5', 'claude-sonnet-4-5',
  'claude-haiku-4.5', 'claude-haiku-4-5',
  'gpt-5.4', 'gpt-5-4',
  'gpt-5.3-codex', 'gpt-5-3-codex',
  'gemini-3.1-pro', 'gemini-3-1-pro',
  // Common fallback names
  'claude-3-5-sonnet-20241022', 'claude-3-5-haiku-20241022',
  'claude-sonnet-4-20250514', 'claude-opus-4-20250514',
  'gpt-4o', 'gpt-4o-mini',
];

async function tryRequest(url, auth, modelId) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT);

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...auth.headers },
      body: JSON.stringify({
        model: modelId,
        max_tokens: 10,
        messages: [{ role: 'user', content: 'Say "hello" and nothing else.' }],
      }),
      signal: controller.signal,
    });

    clearTimeout(timer);
    const text = await res.text();
    let parsed;
    try { parsed = JSON.parse(text); } catch { parsed = null; }

    const content = parsed?.choices?.[0]?.message?.content ?? parsed?.content?.[0]?.text ?? null;

    return { status: res.status, ok: res.ok, content, raw: text.slice(0, 400) };
  } catch (err) {
    clearTimeout(timer);
    return { status: 0, ok: false, content: null, raw: err.message?.slice(0, 100) };
  }
}

async function main() {
  console.log('\n  ╔══════════════════════════════════════════════╗');
  console.log('  ║  🔍 CodeBuddy API Probe (Extended)           ║');
  console.log('  ╚══════════════════════════════════════════════╝\n');
  console.log(`  Key: ${API_KEY.slice(0, 12)}...${API_KEY.slice(-4)}`);

  // Phase 1: Find working URL + auth combination
  console.log('\n  ── Phase 1: URL + Auth Discovery ──────────────\n');

  const testModel = 'claude-sonnet-4.5';
  let bestCombo = null;

  for (const ep of ENDPOINTS) {
    for (const auth of AUTH_METHODS) {
      process.stdout.write(`    ${ep.label.padEnd(28)} [${auth.name.padEnd(10)}] `);
      const r = await tryRequest(ep.url, auth, testModel);

      if (r.ok && r.content) {
        console.log(`✅ 200 — "${r.content.slice(0, 40)}"`);
        if (!bestCombo) bestCombo = { url: ep.url, auth, label: ep.label };
      } else if (r.status === 200) {
        console.log(`⚠️ 200 no content — ${r.raw.slice(0, 60)}`);
        if (!bestCombo) bestCombo = { url: ep.url, auth, label: ep.label };
      } else if (r.status >= 400 && r.status < 404) {
        console.log(`🔑 ${r.status} — ${r.raw.slice(0, 60)}`);
      } else {
        console.log(`❌ ${r.status || 'timeout'}`);
      }
    }
  }

  if (!bestCombo) {
    console.log('\n  ❌ No working URL+auth found.\n');
    // Print all non-timeout responses for debugging
    console.log('  Trying bare GET to find docs...');
    for (const base of ['https://www.codebuddy.ai', 'https://api.codebuddy.cn', 'https://copilot.tencent.com']) {
      try {
        const r = await fetch(base + '/v1/models', {
          headers: { 'Authorization': `Bearer ${API_KEY}`, 'X-Api-Key': API_KEY },
          signal: AbortSignal.timeout(10000),
        });
        console.log(`    ${base}/v1/models → ${r.status}: ${(await r.text()).slice(0, 200)}`);
      } catch (e) {
        console.log(`    ${base}/v1/models → ${e.message?.slice(0, 80)}`);
      }
    }
    process.exit(1);
  }

  console.log(`\n  ✅ Best: ${bestCombo.label} with ${bestCombo.auth.name}\n`);

  // Phase 2: Find all working model IDs
  console.log('  ── Phase 2: Model ID Discovery ────────────────\n');

  const workingModels = [];

  for (const modelId of MODEL_IDS) {
    process.stdout.write(`    ${modelId.padEnd(40)} `);
    const r = await tryRequest(bestCombo.url, bestCombo.auth, modelId);

    if (r.ok && r.content) {
      console.log(`✅ "${r.content.slice(0, 50)}"`);
      workingModels.push(modelId);
    } else {
      console.log(`❌ ${r.status} — ${r.raw.slice(0, 60)}`);
    }
  }

  // Summary
  console.log('\n  ── Summary ────────────────────────────────────\n');
  console.log(`  URL: ${bestCombo.url}`);
  console.log(`  Auth: ${bestCombo.auth.name}: ${API_KEY.slice(0, 12)}...`);
  console.log(`  Working models (${workingModels.length}):`);
  for (const m of workingModels) console.log(`    ✅ ${m}`);

  const { writeFile } = await import('node:fs/promises');
  const { join, dirname } = await import('node:path');
  const { fileURLToPath } = await import('node:url');
  const __dirname = dirname(fileURLToPath(import.meta.url));
  const outPath = join(__dirname, 'probe-results.json');
  await writeFile(outPath, JSON.stringify({
    baseUrl: bestCombo.url,
    authMethod: bestCombo.auth.name,
    authHeaders: bestCombo.auth.headers,
    workingModels,
    probedAt: new Date().toISOString(),
  }, null, 2) + '\n');
  console.log(`\n  📁 Saved: ${outPath}\n`);
}

main().catch(err => { console.error('Fatal:', err); process.exit(1); });
