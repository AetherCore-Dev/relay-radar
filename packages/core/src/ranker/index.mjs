/**
 * RelayRanker — Multi-dimensional ranking and scoring system
 *
 * Combines probe results, verification results, and billing analysis
 * into a final ranking score for each relay station.
 */

import { RANKING_WEIGHTS } from '../constants.mjs';

/**
 * Create a RelayRanker instance
 * @param {Object} options - { weights: custom weight overrides }
 * @returns {Readonly<Object>}
 */
export function RelayRanker(options = {}) {
  const weights = { ...RANKING_WEIGHTS, ...(options.weights ?? {}) };

  return Object.freeze({
    /**
     * Rank relay stations based on all collected data
     * @param {Object[]} probeResults - From RelayProber
     * @param {Object[]} verifyResults - From ModelVerifier
     * @param {Object[]} billingResults - From TokenAnalyzer
     * @param {Object} [relayMeta] - Additional metadata (pricing claims, etc.)
     * @returns {RankingReport}
     */
    rank: (probeResults, verifyResults, billingResults, relayMeta) =>
      rankRelays(probeResults, verifyResults, billingResults, relayMeta, weights),

    /**
     * Generate a formatted ranking table
     * @param {RankingReport} report
     * @returns {string}
     */
    formatTable: (report) => formatRankingTable(report),

    /**
     * Generate JSON report for web dashboard
     * @param {RankingReport} report
     * @returns {Object}
     */
    formatJson: (report) => formatJsonReport(report),
  });
}

/**
 * @typedef {Object} RankingEntry
 * @property {number} rank
 * @property {string} name
 * @property {number} overallScore - 0-100
 * @property {Object} dimensionScores
 * @property {string} verdict
 * @property {string[]} warnings
 */

function rankRelays(probeResults, verifyResults, billingResults, relayMeta, weights) {
  // Index results by relay name for cross-referencing
  // All modules must use the relay 'name' as the consistent key
  const probeMap = indexBy(probeResults, 'name');
  const verifyMap = indexBy(verifyResults, 'relay');
  const billingMap = indexBy(billingResults, 'relay');

  // Get unique relay names
  const relayNames = new Set([
    ...probeResults.map((r) => r.name),
    ...verifyResults.map((r) => r.relay ?? r.name ?? 'unknown'),
    ...billingResults.map((r) => r.relay),
  ]);

  const entries = [];

  for (const name of relayNames) {
    const probe = probeMap[name];
    const verify = verifyMap[name];
    const billing = billingMap[name];
    const meta = relayMeta?.[name] ?? {};

    const dimensions = {};
    const warnings = [];

    // 1. Latency score (0-100, lower latency = higher score)
    if (probe) {
      const maxAcceptableLatency = 10000; // 10s
      const latencyScore = Math.max(0, 100 - (probe.avgLatency / maxAcceptableLatency) * 100);
      dimensions.latency = Math.round(latencyScore);

      if (probe.avgLatency > 5000) {
        warnings.push(`⚠️ 平均延迟 ${probe.avgLatency}ms，较高`);
      }
    } else {
      dimensions.latency = 0;
      warnings.push('❌ 无延迟数据');
    }

    // 2. Stability score
    if (probe) {
      const errorScore = (1 - probe.errorRate) * 100;
      const streamingBonus = probe.supportsStreaming ? 10 : 0;
      dimensions.stability = Math.min(100, Math.round(errorScore + streamingBonus));

      if (probe.errorRate > 0.2) {
        warnings.push(`⚠️ 错误率 ${Math.round(probe.errorRate * 100)}%`);
      }
      if (!probe.supportsStreaming) {
        warnings.push('⚠️ 不支持流式输出');
      }
    } else {
      dimensions.stability = 0;
      warnings.push('❌ 无稳定性数据');
    }

    // 3. Authenticity score
    if (verify) {
      dimensions.authenticity = verify.confidence;

      if (verify.verdict === 'fake') {
        warnings.push(`❌ 模型验假：声称 ${verify.claimedModel}，实为 ${verify.likelyModel}`);
      } else if (verify.verdict === 'suspicious') {
        warnings.push(`⚠️ 模型可疑：${verify.summary}`);
      }
    } else {
      dimensions.authenticity = 50; // Neutral if untested
    }

    // 4. Pricing score
    if (billing) {
      dimensions.pricing = billing.billingScore;

      if (billing.systemPromptInjection?.suspicious) {
        warnings.push('❌ 检测到隐藏System Prompt注入（虚增Token）');
      }
      if (billing.verdict === 'unfair') {
        warnings.push('❌ 计费不合理：Token数量与预期偏差过大');
      }
    } else {
      dimensions.pricing = 50; // Neutral if untested
    }

    // 5. Transparency score
    const transparencyFactors = [];
    if (meta.publishesPricing) transparencyFactors.push(25);
    if (meta.hasStatusPage) transparencyFactors.push(25);
    if (meta.opensourceClient) transparencyFactors.push(25);
    if (meta.hasRefundPolicy) transparencyFactors.push(25);
    dimensions.transparency = transparencyFactors.length > 0
      ? transparencyFactors.reduce((a, b) => a + b, 0)
      : 50; // Neutral if no metadata

    // Calculate overall score
    const overallScore = Math.round(
      Object.entries(weights).reduce((total, [dim, weight]) => {
        return total + (dimensions[dim] ?? 50) * weight;
      }, 0)
    );

    // Determine verdict
    const verdict = determineRelayVerdict(overallScore, dimensions, warnings);

    entries.push(Object.freeze({
      name,
      overallScore,
      dimensions: Object.freeze(dimensions),
      verdict,
      warnings: Object.freeze(warnings),
      probeData: probe ?? null,
      verifyData: verify ?? null,
      billingData: billing ?? null,
    }));
  }

  // Sort by overall score descending
  entries.sort((a, b) => b.overallScore - a.overallScore);

  // Assign ranks
  const ranked = entries.map((entry, idx) =>
    Object.freeze({ ...entry, rank: idx + 1 })
  );

  return Object.freeze({
    rankings: Object.freeze(ranked),
    weights: Object.freeze(weights),
    rankedAt: new Date().toISOString(),
    totalRelays: ranked.length,
  });
}

function determineRelayVerdict(score, dimensions, warnings) {
  const hasFakeModel = warnings.some((w) => w.includes('模型验假'));
  const hasInjection = warnings.some((w) => w.includes('System Prompt注入'));

  if (hasFakeModel) return '🚫 模型造假';
  if (hasInjection) return '⚠️ 计费欺诈';
  if (score >= 80) return '🌟 推荐';
  if (score >= 60) return '👍 可用';
  if (score >= 40) return '🟡 一般';
  return '👎 不推荐';
}

function formatRankingTable(report) {
  const lines = [];
  lines.push('');
  lines.push('╔══════╦══════════════════════╦═══════╦═══════╦═══════╦═══════╦═══════╦════════════════╗');
  lines.push('║ 排名 ║ 中转站               ║ 总分  ║ 延迟  ║ 稳定  ║ 真实  ║ 计费  ║ 评价           ║');
  lines.push('╠══════╬══════════════════════╬═══════╬═══════╬═══════╬═══════╬═══════╬════════════════╣');

  for (const entry of report.rankings) {
    const name = entry.name.padEnd(18).slice(0, 18);
    const score = String(entry.overallScore).padStart(3);
    const latency = String(entry.dimensions.latency ?? '-').padStart(3);
    const stability = String(entry.dimensions.stability ?? '-').padStart(3);
    const auth = String(entry.dimensions.authenticity ?? '-').padStart(3);
    const pricing = String(entry.dimensions.pricing ?? '-').padStart(3);
    const verdict = entry.verdict.padEnd(12).slice(0, 12);

    lines.push(
      `║  ${String(entry.rank).padStart(2)}  ║ ${name} ║  ${score}  ║  ${latency}  ║  ${stability}  ║  ${auth}  ║  ${pricing}  ║ ${verdict} ║`
    );
  }

  lines.push('╚══════╩══════════════════════╩═══════╩═══════╩═══════╩═══════╩═══════╩════════════════╝');
  lines.push('');

  // Warnings
  for (const entry of report.rankings) {
    if (entry.warnings.length > 0) {
      lines.push(`  ${entry.name}:`);
      for (const w of entry.warnings) {
        lines.push(`    ${w}`);
      }
    }
  }

  return lines.join('\n');
}

function formatJsonReport(report) {
  return {
    version: '1.0.0',
    generatedAt: report.rankedAt,
    weights: report.weights,
    totalRelays: report.totalRelays,
    rankings: report.rankings.map((entry) => ({
      rank: entry.rank,
      name: entry.name,
      overallScore: entry.overallScore,
      dimensions: entry.dimensions,
      verdict: entry.verdict,
      warnings: entry.warnings,
    })),
  };
}

function indexBy(arr, keyFn) {
  const map = {};
  for (const item of arr) {
    const key = typeof keyFn === 'function' ? keyFn(item) : item[keyFn];
    if (key) map[key] = item;
  }
  return map;
}
