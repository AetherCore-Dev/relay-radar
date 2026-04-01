/**
 * LocalScanner — Scan local Claude Code usage without any API key.
 *
 * Reads local JSONL logs (ccusage format, Claude Desktop, Claude Code)
 * to analyze spending patterns and find optimization opportunities.
 *
 * ZERO network calls. ZERO credentials required.
 */

import { readdir, readFile, stat } from 'node:fs/promises';
import { join, basename } from 'node:path';
import { homedir } from 'node:os';
import { MODEL_PRICING, USD_TO_CNY_APPROX } from '../constants.mjs';

/**
 * Create a LocalScanner instance
 */
export function LocalScanner() {
  return Object.freeze({
    /** Find local Claude usage data directories */
    findDataSources: () => findDataSources(),

    /** Scan and analyze local usage logs */
    scan: (opts) => scanLocalUsage(opts),

    /** Quick summary — one-liner for first-run experience */
    quickSummary: () => quickSummary(),
  });
}

/** Known locations for Claude usage data */
const DATA_LOCATIONS = [
  // ccusage JSONL logs
  { path: '.ccusage', type: 'ccusage', name: 'ccusage' },
  // Claude Desktop (macOS)
  { path: 'Library/Application Support/Claude/usage', type: 'claude-desktop', name: 'Claude Desktop' },
  // Claude Desktop (Windows)
  { path: 'AppData/Roaming/Claude/usage', type: 'claude-desktop', name: 'Claude Desktop' },
  // Claude Code session data
  { path: '.claude', type: 'claude-code', name: 'Claude Code' },
  // Claude Code cost tracking
  { path: '.claude/costs', type: 'claude-costs', name: 'Claude Code Costs' },
];

async function findDataSources() {
  const home = homedir();
  const found = [];

  for (const loc of DATA_LOCATIONS) {
    const fullPath = join(home, loc.path);
    try {
      const info = await stat(fullPath);
      if (info.isDirectory() || info.isFile()) {
        found.push(Object.freeze({
          path: fullPath,
          type: loc.type,
          name: loc.name,
          size: info.size,
          lastModified: info.mtime.toISOString(),
        }));
      }
    } catch {
      // Directory doesn't exist — that's fine
    }
  }

  return Object.freeze(found);
}

async function scanLocalUsage(opts = {}) {
  const sources = await findDataSources();

  if (sources.length === 0) {
    return Object.freeze({
      found: false,
      message: '未找到本地 Claude 使用数据。\n' +
        '支持的数据源：ccusage (~/.ccusage), Claude Desktop, Claude Code (~/.claude)\n' +
        '提示：安装 ccusage 可自动记录用量 → pip install ccusage',
      sources: [],
      analysis: null,
    });
  }

  // Try to read usage records from each source
  const allRecords = [];

  for (const source of sources) {
    try {
      const records = await readSource(source);
      allRecords.push(...records);
    } catch {
      // Source unreadable — skip silently
    }
  }

  if (allRecords.length === 0) {
    return Object.freeze({
      found: true,
      message: `找到 ${sources.length} 个数据源，但无法读取有效记录。`,
      sources,
      analysis: null,
    });
  }

  // Analyze
  const analysis = analyzeRecords(allRecords);

  return Object.freeze({
    found: true,
    message: `✅ 扫描完成：${sources.length} 个数据源，${allRecords.length} 条记录`,
    sources,
    analysis,
  });
}

async function quickSummary() {
  const result = await scanLocalUsage();

  if (!result.found || !result.analysis) {
    return result.message;
  }

  const a = result.analysis;
  const lines = [];
  lines.push('');
  lines.push('📊 你的 Claude 使用概况');
  lines.push('═══════════════════════════════════');
  lines.push(`  总请求数:     ${a.totalRequests.toLocaleString()}`);
  lines.push(`  总输入tokens: ${a.totalInput.toLocaleString()}`);
  lines.push(`  总输出tokens: ${a.totalOutput.toLocaleString()}`);
  lines.push(`  估算总花费:   $${a.estimatedCost.toFixed(2)} (≈ ¥${a.estimatedCostCNY.toFixed(0)})`);
  lines.push('');

  if (a.modelBreakdown && Object.keys(a.modelBreakdown).length > 0) {
    lines.push('  模型使用分布:');
    for (const [model, info] of Object.entries(a.modelBreakdown)) {
      const pct = Math.round((info.requests / a.totalRequests) * 100);
      lines.push(`    ${model}: ${info.requests}次 (${pct}%) → $${info.estimatedCost.toFixed(2)}`);
    }
    lines.push('');
  }

  if (a.savings.length > 0) {
    lines.push('  💡 省钱机会:');
    for (const saving of a.savings.slice(0, 3)) {
      lines.push(`    ${saving.icon} ${saving.title}: 预计每月省 ${saving.monthlySaving}`);
    }
    lines.push('');
  }

  lines.push('  运行 relay-radar tips 查看详细省钱攻略');
  lines.push('═══════════════════════════════════');
  lines.push('');

  return lines.join('\n');
}

/** Read records from a specific source */
async function readSource(source) {
  const records = [];

  if (source.type === 'ccusage') {
    // ccusage stores JSONL files
    try {
      const files = await readdir(source.path);
      const jsonlFiles = files.filter((f) => f.endsWith('.jsonl') || f.endsWith('.json'));

      for (const file of jsonlFiles.slice(-30)) { // Last 30 files
        try {
          const content = await readFile(join(source.path, file), 'utf-8');
          const lines = content.trim().split('\n').filter(Boolean);
          for (const line of lines) {
            try {
              const record = JSON.parse(line);
              if (record.model || record.inputTokens || record.input_tokens) {
                records.push(normalizeRecord(record));
              }
            } catch {
              // Invalid JSON line — skip
            }
          }
        } catch {
          // File unreadable — skip
        }
      }
    } catch {
      // Directory unreadable
    }
  }

  if (source.type === 'claude-code' || source.type === 'claude-costs') {
    // Claude Code may store session data in various formats
    try {
      const files = await readdir(source.path).catch(() => []);
      const jsonFiles = (Array.isArray(files) ? files : [])
        .filter((f) => f.endsWith('.json') || f.endsWith('.jsonl'));

      for (const file of jsonFiles.slice(-20)) {
        try {
          const content = await readFile(join(source.path, file), 'utf-8');
          // Try JSONL first
          if (content.includes('\n')) {
            for (const line of content.trim().split('\n')) {
              try {
                const record = JSON.parse(line);
                if (record.model || record.usage) {
                  records.push(normalizeRecord(record));
                }
              } catch { /* skip */ }
            }
          } else {
            // Single JSON
            const data = JSON.parse(content);
            if (Array.isArray(data)) {
              for (const record of data) {
                records.push(normalizeRecord(record));
              }
            }
          }
        } catch { /* skip */ }
      }
    } catch { /* skip */ }
  }

  return records;
}

/** Normalize different record formats into a consistent shape */
function normalizeRecord(raw) {
  return {
    model: raw.model ?? raw.modelId ?? 'unknown',
    inputTokens: raw.inputTokens ?? raw.input_tokens ?? raw.usage?.input_tokens ?? 0,
    outputTokens: raw.outputTokens ?? raw.output_tokens ?? raw.usage?.output_tokens ?? 0,
    cacheReadTokens: raw.cacheReadTokens ?? raw.cache_read_input_tokens ?? raw.usage?.cache_read_input_tokens ?? 0,
    cacheWriteTokens: raw.cacheWriteTokens ?? raw.cache_creation_input_tokens ?? 0,
    cost: raw.cost ?? raw.totalCost ?? 0,
    timestamp: raw.timestamp ?? raw.created_at ?? raw.ts ?? null,
  };
}

/** Analyze aggregated records */
function analyzeRecords(records) {
  const totalRequests = records.length;
  const totalInput = records.reduce((s, r) => s + r.inputTokens, 0);
  const totalOutput = records.reduce((s, r) => s + r.outputTokens, 0);
  const totalCacheRead = records.reduce((s, r) => s + r.cacheReadTokens, 0);

  // Group by model
  const byModel = {};
  for (const r of records) {
    const model = r.model;
    if (!byModel[model]) {
      byModel[model] = { requests: 0, input: 0, output: 0, cacheRead: 0 };
    }
    byModel[model].requests++;
    byModel[model].input += r.inputTokens;
    byModel[model].output += r.outputTokens;
    byModel[model].cacheRead += r.cacheReadTokens;
  }

  // Estimate costs
  let totalEstCost = 0;
  const modelBreakdown = {};
  for (const [model, info] of Object.entries(byModel)) {
    const pricing = findPricing(model);
    const cost =
      (info.input / 1_000_000) * pricing.input +
      (info.output / 1_000_000) * pricing.output +
      (info.cacheRead / 1_000_000) * pricing.cacheRead;
    totalEstCost += cost;
    modelBreakdown[model] = {
      requests: info.requests,
      inputTokens: info.input,
      outputTokens: info.output,
      estimatedCost: Math.round(cost * 100) / 100,
    };
  }

  // Find savings opportunities
  const savings = findSavings(records, byModel, totalEstCost);

  return Object.freeze({
    totalRequests,
    totalInput,
    totalOutput,
    totalCacheRead,
    cacheHitRate: totalInput > 0 ? Math.round((totalCacheRead / totalInput) * 100) : 0,
    estimatedCost: Math.round(totalEstCost * 100) / 100,
    estimatedCostCNY: Math.round(totalEstCost * USD_TO_CNY_APPROX * 100) / 100,
    modelBreakdown: Object.freeze(modelBreakdown),
    savings: Object.freeze(savings),
  });
}

/** Find pricing for a model name (fuzzy match) */
function findPricing(modelName) {
  const lower = modelName.toLowerCase();
  if (lower.includes('opus')) return MODEL_PRICING['claude-opus-4'] ?? MODEL_PRICING['claude-sonnet-4'];
  if (lower.includes('haiku')) return MODEL_PRICING['claude-haiku-3.5'] ?? MODEL_PRICING['claude-sonnet-4'];
  return MODEL_PRICING['claude-sonnet-4']; // Default
}

/** Identify concrete savings opportunities */
function findSavings(records, byModel, totalCost) {
  const savings = [];

  // 1. Simple Opus tasks → Sonnet
  const opusModels = Object.entries(byModel).filter(([m]) => m.toLowerCase().includes('opus'));
  for (const [model, info] of opusModels) {
    const simpleCount = records
      .filter((r) => r.model === model && r.outputTokens < 100)
      .length;

    if (simpleCount > info.requests * 0.25) {
      const savePct = Math.round((simpleCount / info.requests) * 80); // 80% cheaper per task
      savings.push({
        icon: '🔄',
        title: `${simpleCount}个简单Opus请求改用Sonnet`,
        monthlySaving: `¥${Math.round(totalCost * (savePct / 100) * USD_TO_CNY_APPROX)}+`,
        priority: 1,
      });
    }
  }

  // 2. Low cache hit rate
  const totalInput = records.reduce((s, r) => s + r.inputTokens, 0);
  const totalCacheRead = records.reduce((s, r) => s + r.cacheReadTokens, 0);
  const cacheRate = totalInput > 0 ? totalCacheRead / totalInput : 0;

  if (cacheRate < 0.3 && totalInput > 10000) {
    savings.push({
      icon: '📦',
      title: `缓存命中率仅${Math.round(cacheRate * 100)}%，优化可省30-50%`,
      monthlySaving: `¥${Math.round(totalCost * 0.3 * USD_TO_CNY_APPROX)}+`,
      priority: 2,
    });
  }

  // 3. Extended thinking costs
  const highOutputRecords = records.filter((r) => r.outputTokens > 5000);
  if (highOutputRecords.length > records.length * 0.1) {
    savings.push({
      icon: '🧠',
      title: `${highOutputRecords.length}个请求输出>5000 tokens，可能是thinking未限制`,
      monthlySaving: `¥${Math.round(totalCost * 0.15 * USD_TO_CNY_APPROX)}+`,
      priority: 3,
    });
  }

  savings.sort((a, b) => a.priority - b.priority);
  return savings;
}
