#!/usr/bin/env node

/**
 * relay-radar CLI — AI中转站质量监控工具
 *
 * 信任优先设计：
 *   零Key命令（入口）: tips, cost, scan, ping — 不需要任何API Key
 *   有Key命令（深度）: probe, verify, rank     — Key纯本地，用前确认
 *
 * Usage:
 *   relay-radar                     — 首次运行：自动扫描本地用量
 *   relay-radar tips                — 省钱妙招（无需Key）
 *   relay-radar cost <model> <in> <out>  — 计算成本（无需Key）
 *   relay-radar scan                — 扫描本地Claude用量日志（无需Key）
 *   relay-radar ping <url>          — 测试连接性（无需Key，不发API请求）
 *   relay-radar probe   [config]    — 探测延迟（需要Key，本地运行）
 *   relay-radar verify  [config]    — 验证模型（需要Key，本地运行）
 *   relay-radar rank    [config]    — 综合排名（需要Key，本地运行）
 *   relay-radar init                — 生成配置文件
 */

import { readFile, writeFile } from 'node:fs/promises';
import { resolve, dirname, join } from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { createInterface } from 'node:readline';

const __dirname = dirname(fileURLToPath(import.meta.url));
const CORE_URL = pathToFileURL(join(__dirname, '..', '..', 'core', 'src', 'index.mjs')).href;

/** Dynamic import — try workspace package first, fall back to relative path */
async function importCore() {
  try {
    return await import('@relay-radar/core');
  } catch {
    return import(CORE_URL);
  }
}

// ─── Command registry ────────────────────────────────────────────────────────

const COMMANDS = {
  // Zero-key commands (entry point)
  '':      runDefault,
  tips:    runTips,
  cost:    runCost,
  scan:    runScan,
  ping:    runPing,
  // Key-required commands (local only)
  probe:   runProbe,
  verify:  runVerify,
  rank:    runRank,
  // Utility
  init:    runInit,
  help:    runHelp,
};

async function main() {
  const args = process.argv.slice(2);
  const command = args[0] ?? '';
  const handler = COMMANDS[command] ?? COMMANDS[''];

  if (command && !COMMANDS[command]) {
    console.error(`未知命令: ${command}\n`);
    runHelp();
    process.exit(1);
  }

  try {
    await handler(command ? args.slice(1) : args);
  } catch (err) {
    console.error(`\n❌ ${err.message}\n`);
    if (process.env.DEBUG) console.error(err.stack);
    process.exit(1);
  }
}

// ─── Zero-Key Commands ───────────────────────────────────────────────────────

/** Default: first-run experience — scan local data, show value immediately */
async function runDefault() {
  console.log('\n🛰️  RelayRadar — AI中转站质量监控工具 v0.2.0');
  console.log('   本工具完全在本地运行，不上传任何数据。\n');

  const { LocalScanner } = await importCore();
  const scanner = LocalScanner();
  const summary = await scanner.quickSummary();
  console.log(summary);

  console.log('常用命令:');
  console.log('  relay-radar tips          省钱妙招（无需API Key）');
  console.log('  relay-radar cost opus 100000 50000  计算成本');
  console.log('  relay-radar scan          扫描本地用量');
  console.log('  relay-radar ping <url>    测试中转站连接');
  console.log('  relay-radar help          查看所有命令');
  console.log('');
}

async function runScan() {
  const { LocalScanner } = await importCore();
  const scanner = LocalScanner();

  console.log('\n🔍 扫描本地 Claude 使用数据...');
  console.log('   （纯本地操作，不联网，不需要API Key）\n');

  const result = await scanner.scan();

  if (!result.found || !result.analysis) {
    console.log(result.message);
    return;
  }

  console.log(result.message);
  console.log('');

  const a = result.analysis;
  console.log(`  📊 数据源: ${result.sources.map((s) => s.name).join(', ')}`);
  console.log(`  📝 总请求数:     ${a.totalRequests.toLocaleString()}`);
  console.log(`  📥 总输入tokens: ${a.totalInput.toLocaleString()}`);
  console.log(`  📤 总输出tokens: ${a.totalOutput.toLocaleString()}`);
  console.log(`  📦 缓存命中率:   ${a.cacheHitRate}%`);
  console.log(`  💰 估算总花费:   $${a.estimatedCost} (≈ ¥${a.estimatedCostCNY})`);
  console.log('');

  if (Object.keys(a.modelBreakdown).length > 0) {
    console.log('  模型使用分布:');
    for (const [model, info] of Object.entries(a.modelBreakdown)) {
      console.log(`    ${model}: ${info.requests}次 → $${info.estimatedCost}`);
    }
    console.log('');
  }

  if (a.savings.length > 0) {
    console.log('  💡 发现的省钱机会:');
    for (const saving of a.savings) {
      console.log(`    ${saving.icon} ${saving.title}`);
      console.log(`       预计每月节省: ${saving.monthlySaving}`);
    }
    console.log('');
  }

  console.log('  运行 relay-radar tips 查看详细优化攻略');
}

async function runPing(args) {
  if (args.length === 0) {
    console.log('用法: relay-radar ping <url> [url2] [url3] ...');
    console.log('示例: relay-radar ping api.relay-a.com api.relay-b.com');
    console.log('');
    console.log('只测试网络连接，不发送API请求，不需要API Key。');
    return;
  }

  const { RelayPinger } = await importCore();
  const pinger = RelayPinger();

  console.log('\n🏓 测试中转站连接...');
  console.log('   （只测TCP/TLS连接，不发API请求，不消耗Token）\n');

  for (const url of args) {
    process.stdout.write(`  ${url} ... `);
    const result = await pinger.ping(url);

    if (result.reachable) {
      const tls = result.tls ? '🔒' : '⚠️ 无TLS';
      const api = result.looksLikeApi ? '📡 API端点' : '🌐 Web';
      console.log(`✅ ${result.latencyMs}ms ${tls} ${api} (HTTP ${result.httpStatus})`);
    } else {
      console.log(`❌ 不可达: ${result.error}`);
    }
  }
  console.log('');
}

async function runCost(args) {
  if (args.length < 3) {
    console.log('用法: relay-radar cost <model> <input-tokens> <output-tokens> [cache-read] [cache-write]');
    console.log('');
    console.log('示例:');
    console.log('  relay-radar cost claude-opus-4 100000 50000');
    console.log('  relay-radar cost claude-sonnet-4 500000 200000 300000');
    console.log('');
    console.log('不需要API Key，纯本地计算。');
    return;
  }

  const { TokenAnalyzer } = await importCore();
  const analyzer = TokenAnalyzer();

  const parseNum = (s) => {
    const n = parseInt(s, 10);
    if (Number.isNaN(n) || n < 0) throw new Error(`无效的数字: "${s}"`);
    return n;
  };

  const result = analyzer.calculateCost(args[0], {
    input: parseNum(args[1]),
    output: parseNum(args[2]),
    cacheRead: parseNum(args[3] ?? '0'),
    cacheWrite: parseNum(args[4] ?? '0'),
  });

  console.log(`\n💰 ${args[0]} 成本计算:`);
  console.log(`  输入: ${parseInt(args[1]).toLocaleString()} tokens → $${result.inputCost}`);
  console.log(`  输出: ${parseInt(args[2]).toLocaleString()} tokens → $${result.outputCost}`);
  if (result.cacheReadCost > 0) console.log(`  缓存读: $${result.cacheReadCost}`);
  if (result.cacheWriteCost > 0) console.log(`  缓存写: $${result.cacheWriteCost}`);
  console.log(`  ────────────────`);
  console.log(`  总计: $${result.total} (≈ ¥${result.totalCNY})`);
  console.log('');
}

async function runTips() {
  console.log(`
🧙 Claude Code 省钱秘籍（不需要API Key即可查看）
════════════════════════════════════════

1. 🔄 模型路由 (节省40-60%)
   简单任务用 Sonnet, 只在复杂推理时用 Opus
   设置: 在Claude Code中使用 /model 命令切换

2. 📦 Prompt Cache (节省30-50%)
   把不变的内容放在 system prompt 开头
   缓存读取价格仅为正常价的 1/10
   Opus: $15/M → 缓存$1.5/M

3. ✂️ 精简输出 (节省15-30%)
   prompt中加 "简洁回复，不需要解释"
   设置 max_tokens 限制输出长度

4. 🧠 控制 Thinking (节省10-20%)
   export MAX_THINKING_TOKENS=10000
   简单任务关闭 Extended Thinking (Alt+T)

5. 📦 Batch API (节省50%)
   非实时任务用 Batch API，价格减半
   代码审查、文档生成等可批量处理

6. 🔍 上下文管理 (节省20-30%)
   使用 /compact 压缩上下文
   用 .claudeignore 排除大文件

7. 💾 监控用量
   relay-radar scan  — 分析本地用量（无需Key）
   pip install ccusage && ccusage total

════════════════════════════════════════
  运行 relay-radar scan 分析你的实际使用数据
  运行 relay-radar cost <model> <in> <out> 计算成本
  `);
}

// ─── Key-Required Commands ───────────────────────────────────────────────────

/** Shared: load config with trust messaging */
async function loadConfig(configPath) {
  const { RelayConfig } = await importCore();

  if (configPath) {
    return RelayConfig.fromFile(resolve(configPath));
  }

  for (const path of ['relay-radar.json', '.relay-radar.json']) {
    try {
      return await RelayConfig.fromFile(resolve(path));
    } catch { /* try next */ }
  }

  const envConfig = RelayConfig.fromEnv();
  if (envConfig.relays.length > 0) return envConfig;

  throw new Error(
    '找不到配置文件。\n\n' +
    '运行 relay-radar init 生成示例配置，或设置 RELAY_RADAR_ENDPOINTS 环境变量。\n' +
    '提示: API Key 推荐用环境变量引用 ${ENV_VAR}，避免明文写入文件。'
  );
}

/** Shared: show trust message + cost estimate + ask confirmation */
async function confirmKeyUsage(relayCount, action, estimatedTokens) {
  const costUsd = (estimatedTokens / 1_000_000) * 3; // Sonnet pricing as baseline
  const costCny = costUsd * 7.25;

  console.log('');
  console.log('  ╔═══════════════════════════════════════════════╗');
  console.log('  ║  🔒 安全提示                                  ║');
  console.log('  ║                                               ║');
  console.log('  ║  • API Key 只在你的机器上使用                 ║');
  console.log('  ║  • 不会上传到任何服务器                       ║');
  console.log('  ║  • 所有请求直接发往你配置的中转站             ║');
  console.log('  ║  • 源码开源可审计                             ║');
  console.log('  ╚═══════════════════════════════════════════════╝');
  console.log('');
  console.log(`  ${action}: ${relayCount} 个中转站`);
  console.log(`  预计消耗: ~${estimatedTokens.toLocaleString()} tokens (≈ $${costUsd.toFixed(3)} / ¥${costCny.toFixed(2)})`);
  console.log('');

  if (process.env.RELAY_RADAR_YES === '1') return true; // CI mode

  const answer = await askUser('  继续？(y/n) ');
  return answer.toLowerCase().startsWith('y');
}

function askUser(prompt) {
  return new Promise((resolve) => {
    const rl = createInterface({ input: process.stdin, output: process.stdout });
    rl.question(prompt, (answer) => {
      rl.close();
      resolve(answer);
    });
  });
}

async function runProbe(args) {
  const config = await loadConfig(args[0]);

  const tokensPerRelay = 50 * (config.probe.warmupRounds + config.probe.testRounds);
  const totalTokens = tokensPerRelay * config.relays.length;

  const confirmed = await confirmKeyUsage(
    config.relays.length,
    '📡 探测连接性和延迟',
    totalTokens
  );
  if (!confirmed) { console.log('  已取消。'); return; }

  const { RelayProber } = await importCore();
  console.log(`\n📡 正在探测 ${config.relays.length} 个中转站...\n`);

  const prober = RelayProber(config.probe);
  const results = await prober.probeAll(config.relays);

  for (const result of results) {
    const status = result.alive ? '✅' : '❌';
    console.log(`${status} ${result.name}`);
    if (result.alive) {
      console.log(`   延迟: avg=${result.avgLatency}ms, p50=${result.p50Latency}ms, p95=${result.p95Latency}ms`);
      console.log(`   TTFT: ${result.avgTTFT}ms | 吞吐: ${result.avgThroughput} tok/s | 错误率: ${Math.round(result.errorRate * 100)}%`);
    }
    console.log('');
  }
}

async function runVerify(args) {
  const config = await loadConfig(args[0]);

  const tokensPerRelay = 500 * 8; // ~8 questions × ~500 tokens each
  const totalTokens = tokensPerRelay * config.relays.length;

  const confirmed = await confirmKeyUsage(
    config.relays.length,
    '🔬 验证模型真实性',
    totalTokens
  );
  if (!confirmed) { console.log('  已取消。'); return; }

  const { ModelVerifier } = await importCore();
  console.log(`\n🔬 正在验证 ${config.relays.length} 个中转站...\n`);

  const verifier = ModelVerifier();
  for (const relay of config.relays) {
    console.log(`  验证: ${relay.name} (声称: ${relay.model})...`);
    try {
      const result = await verifier.verify(relay);
      console.log(`  ${result.summary}`);
      console.log(`  评分: opus=${result.scores.opus}% sonnet=${result.scores.sonnet}% haiku=${result.scores.haiku}%`);
    } catch (err) {
      console.log(`  ❌ 验证失败: ${err.message}`);
    }
    console.log('');
  }
}

async function runRank(args) {
  const config = await loadConfig(args[0]);

  const probeTokens = 50 * 7 * config.relays.length;
  const verifyTokens = 500 * 8 * config.relays.length;
  const billingTokens = 100 * 4 * config.relays.length;
  const totalTokens = probeTokens + verifyTokens + billingTokens;

  const confirmed = await confirmKeyUsage(
    config.relays.length,
    '🏆 综合排名（探测 + 验真 + 计费审计）',
    totalTokens
  );
  if (!confirmed) { console.log('  已取消。'); return; }

  const { RelayProber, ModelVerifier, TokenAnalyzer, RelayRanker } = await importCore();

  console.log(`\n🏆 正在评估 ${config.relays.length} 个中转站...\n`);

  // Phase 1: Probe (has its own concurrency)
  console.log('  📡 Phase 1/3: 探测连接性和延迟...');
  const prober = RelayProber(config.probe);
  const probeResults = await prober.probeAll(config.relays);

  // Phase 2: Verify (parallel)
  console.log('  🔬 Phase 2/3: 验证模型真实性...');
  const verifier = ModelVerifier();
  const verifyResults = await Promise.all(
    config.relays.map(async (relay) => {
      try {
        const result = await verifier.verify(relay);
        return { ...result, relay: relay.name };
      } catch (err) {
        return { relay: relay.name, error: err.message, confidence: 0 };
      }
    })
  );

  // Phase 3: Billing (parallel)
  console.log('  💰 Phase 3/3: 分析计费准确性...');
  const analyzer = TokenAnalyzer();
  const billingResults = await Promise.all(
    config.relays.map(async (relay) => {
      try {
        return await analyzer.analyzeBilling(relay);
      } catch (err) {
        return { relay: relay.name, error: err.message, billingScore: 0 };
      }
    })
  );

  // Rank
  const ranker = RelayRanker();
  const report = ranker.rank(probeResults, verifyResults, billingResults);
  console.log(ranker.formatTable(report));

  // Save
  const jsonReport = ranker.formatJson(report);
  const outputPath = resolve('ranking-report.json');
  await writeFile(outputPath, JSON.stringify(jsonReport, null, 2), { mode: 0o600 });
  console.log(`  📊 报告已保存到 ${outputPath} (仅本人可读)`);
}

// ─── Utility Commands ────────────────────────────────────────────────────────

async function runInit() {
  const sample = {
    relays: [
      {
        name: '示例-中转站A',
        baseUrl: 'https://api.example.com',
        apiKey: '${RELAY_KEY_A}',
        model: 'claude-sonnet-4',
        notes: '请将RELAY_KEY_A设为环境变量，避免明文存储Key',
      },
    ],
    probe: {
      timeout: 30000,
      testRounds: 5,
      warmupRounds: 2,
    },
  };

  const outputPath = resolve('relay-radar.json');
  await writeFile(outputPath, JSON.stringify(sample, null, 2), { mode: 0o600 });

  console.log(`\n✅ 配置已生成: ${outputPath} (权限: 仅本人可读)`);
  console.log('');
  console.log('⚠️  安全提示:');
  console.log('   1. API Key请用环境变量引用: "apiKey": "${YOUR_ENV_VAR}"');
  console.log('   2. 不要把relay-radar.json提交到git');
  console.log('   3. 设置环境变量: export RELAY_KEY_A="your-actual-key"');
  console.log('');
  console.log('准备好后运行: relay-radar rank');
  console.log('');

  // Auto-add to .gitignore
  try {
    const gitignorePath = resolve('.gitignore');
    const existing = await readFile(gitignorePath, 'utf-8').catch(() => '');
    if (!existing.includes('relay-radar.json')) {
      await writeFile(gitignorePath, existing + '\nrelay-radar.json\n');
      console.log('📝 已自动添加 relay-radar.json 到 .gitignore');
    }
  } catch { /* not in a git repo */ }
}

function runHelp() {
  console.log(`
🛰️  RelayRadar — AI中转站质量监控工具

  本工具完全在本地运行，API Key不会上传到任何地方。
  源码开源可审计: https://github.com/xxx/relay-radar

━━ 无需API Key的命令（立即可用）━━━━━━━━━━━━━━━━━━

  relay-radar              自动扫描本地用量，首次使用推荐
  relay-radar scan         扫描本地Claude使用日志，发现省钱机会
  relay-radar tips         查看省钱妙招
  relay-radar cost <model> <in> <out>   计算Token成本
  relay-radar ping <url>   测试中转站连接（不发API请求）

━━ 需要API Key的命令（纯本地运行）━━━━━━━━━━━━━━━━━

  relay-radar probe  [config.json]  探测中转站延迟和吞吐量
  relay-radar verify [config.json]  验证模型真实性（防掺假）
  relay-radar rank   [config.json]  综合排名（探测+验真+计费）

  ⚠️ Key通过环境变量传递，用前会提示确认和成本预估。

━━ 工具命令 ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  relay-radar init         生成配置文件
  relay-radar help         显示本帮助

━━ 使用示例 ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  # 第一步：看看你花了多少钱
  relay-radar scan

  # 第二步：了解如何省钱
  relay-radar tips

  # 第三步：测试中转站连接（无需Key）
  relay-radar ping api.relay-a.com api.relay-b.com

  # 第四步：深度评估（需要Key，纯本地）
  export RELAY_KEY_A="sk-..."
  relay-radar init
  relay-radar rank
  `);
}

main();
