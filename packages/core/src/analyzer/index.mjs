/**
 * TokenAnalyzer — Token cost analysis and optimization recommendations
 *
 * Analyzes:
 * 1. Actual vs. claimed token pricing
 * 2. Cache token billing correctness
 * 3. Hidden cost detection (system prompt injection, inflated counts)
 * 4. Cost optimization recommendations
 * 5. Usage pattern analysis
 */

import { MODEL_PRICING, SUPPORTED_MODELS, USD_TO_CNY_APPROX } from '../constants.mjs';
import { sendRequest, sanitize } from '../shared/http-client.mjs';

/**
 * Create a TokenAnalyzer instance
 * @param {Object} options
 * @returns {Readonly<Object>}
 */
export function TokenAnalyzer(options = {}) {
  return Object.freeze({
    /**
     * Analyze a relay's token billing accuracy
     * @param {Object} relay - { baseUrl, apiKey, model }
     * @param {Object} [opts]
     * @returns {Promise<BillingAnalysis>}
     */
    analyzeBilling: (relay, opts) => analyzeBilling(relay, opts),

    /**
     * Analyze usage data and provide optimization tips
     * @param {Object[]} usageRecords - Array of usage data
     * @returns {OptimizationReport}
     */
    analyzeUsage: (usageRecords) => analyzeUsage(usageRecords),

    /**
     * Calculate cost for given token counts
     * @param {string} model
     * @param {Object} tokens - { input, output, cacheRead, cacheWrite }
     * @returns {CostBreakdown}
     */
    calculateCost: (model, tokens) => calculateCost(model, tokens),

    /**
     * Generate optimization recommendations
     * @param {Object[]} usageRecords
     * @returns {Recommendation[]}
     */
    getRecommendations: (usageRecords) => getRecommendations(usageRecords),
  });
}

/**
 * Analyze billing accuracy by sending known prompts and comparing
 * reported token counts vs expected
 */
async function analyzeBilling(relay, opts = {}) {
  const testCases = [
    {
      name: 'known_input',
      // Known input: exactly these words, predictable token count
      message: 'Repeat the word "hello" exactly 5 times, separated by spaces. Nothing else.',
      expectedOutputTokenRange: { min: 5, max: 15 },
    },
    {
      name: 'empty_response',
      message: 'Reply with only the single character "X" and absolutely nothing else.',
      expectedOutputTokenRange: { min: 1, max: 5 },
    },
    {
      name: 'medium_response',
      message: 'List the first 10 prime numbers, one per line. Numbers only, no text.',
      expectedOutputTokenRange: { min: 15, max: 40 },
    },
  ];

  const results = [];

  for (const testCase of testCases) {
    try {
      const result = await sendTestRequest(relay, testCase.message, opts.timeout ?? 30000);
      const deviation = calculateDeviation(result.reportedTokens, testCase.expectedOutputTokenRange);

      results.push(Object.freeze({
        testName: testCase.name,
        reportedInputTokens: result.reportedInputTokens,
        reportedOutputTokens: result.reportedOutputTokens,
        expectedOutputRange: testCase.expectedOutputTokenRange,
        actualResponseLength: result.responseText.length,
        deviation,
        suspicious: deviation > 0.5, // >50% deviation is suspicious
        details: result,
      }));
    } catch (err) {
      results.push(Object.freeze({
        testName: testCase.name,
        error: sanitize(err.message),
        suspicious: true,
      }));
    }
  }

  // Check for system prompt injection
  const injectionCheck = await checkSystemPromptInjection(relay, opts.timeout ?? 30000);

  // Overall billing score
  const suspiciousCount = results.filter((r) => r.suspicious).length;
  const billingScore = Math.round(((testCases.length - suspiciousCount) / testCases.length) * 100);

  return Object.freeze({
    relay: relay.name ?? relay.baseUrl,
    model: relay.model,
    billingScore,
    verdict: billingScore >= 80 ? 'fair' : billingScore >= 50 ? 'suspicious' : 'unfair',
    testResults: Object.freeze(results),
    systemPromptInjection: injectionCheck,
    analyzedAt: new Date().toISOString(),
  });
}

/** Check if the relay injects hidden system prompts (inflating input tokens) */
async function checkSystemPromptInjection(relay, timeout) {
  try {
    // Send a minimal request and check if input tokens are suspiciously high
    const result = await sendTestRequest(relay, 'Hi', timeout);

    // "Hi" should be ~2-5 input tokens with a minimal system prompt
    // If >50, there's likely a hidden system prompt
    const inputTokens = result.reportedInputTokens;
    const suspicious = inputTokens > 50;

    return Object.freeze({
      checked: true,
      reportedInputTokens: inputTokens,
      suspicious,
      estimatedInjectedTokens: suspicious ? inputTokens - 5 : 0,
      note: suspicious
        ? `⚠️ 检测到可能的隐藏System Prompt注入: 报告输入${inputTokens}tokens，预期约5tokens`
        : '✅ 未检测到System Prompt注入',
    });
  } catch (err) {
    return Object.freeze({
      checked: false,
      error: err.message,
    });
  }
}

/** Send a test request using shared HTTP client */
async function sendTestRequest(relay, message, timeout) {
  const result = await sendRequest(relay, message, { timeout, maxTokens: 100 });

  return {
    responseText: result.text,
    reportedInputTokens: result.usage.inputTokens,
    reportedOutputTokens: result.usage.outputTokens,
    reportedTokens: {
      input: result.usage.inputTokens,
      output: result.usage.outputTokens,
      cacheRead: result.usage.cacheRead,
      cacheWrite: result.usage.cacheWrite,
    },
  };
}

/** Calculate deviation from expected range */
function calculateDeviation(reportedTokens, expectedRange) {
  const output = reportedTokens.output;
  if (output >= expectedRange.min && output <= expectedRange.max) return 0;
  if (output < expectedRange.min) {
    return (expectedRange.min - output) / expectedRange.min;
  }
  return (output - expectedRange.max) / expectedRange.max;
}

/**
 * Analyze usage records and provide insights
 * @param {Object[]} records - [{ model, inputTokens, outputTokens, cacheReadTokens, cost, timestamp }]
 */
function analyzeUsage(records) {
  if (!records || records.length === 0) {
    return Object.freeze({
      totalCost: 0,
      totalTokens: 0,
      summary: '没有使用数据可分析',
      recommendations: [],
    });
  }

  const totalInput = records.reduce((sum, r) => sum + (r.inputTokens ?? 0), 0);
  const totalOutput = records.reduce((sum, r) => sum + (r.outputTokens ?? 0), 0);
  const totalCacheRead = records.reduce((sum, r) => sum + (r.cacheReadTokens ?? 0), 0);
  const totalCost = records.reduce((sum, r) => sum + (r.cost ?? 0), 0);

  const cacheHitRate = totalInput > 0 ? totalCacheRead / totalInput : 0;

  // Calculate expected cost based on official pricing
  const modelGroups = groupBy(records, 'model');
  let expectedCost = 0;
  for (const [model, group] of Object.entries(modelGroups)) {
    const pricing = MODEL_PRICING[model] ?? MODEL_PRICING['claude-sonnet-4'];
    for (const r of group) {
      expectedCost += calculateSingleCost(pricing, r);
    }
  }

  const costRatio = expectedCost > 0 ? totalCost / expectedCost : 1;

  return Object.freeze({
    totalInput,
    totalOutput,
    totalCacheRead,
    totalTokens: totalInput + totalOutput,
    totalCost: Math.round(totalCost * 100) / 100,
    expectedCost: Math.round(expectedCost * 100) / 100,
    costRatio: Math.round(costRatio * 100) / 100,
    cacheHitRate: Math.round(cacheHitRate * 100),
    modelBreakdown: Object.freeze(
      Object.fromEntries(
        Object.entries(modelGroups).map(([model, group]) => [
          model,
          {
            requests: group.length,
            totalInput: group.reduce((s, r) => s + (r.inputTokens ?? 0), 0),
            totalOutput: group.reduce((s, r) => s + (r.outputTokens ?? 0), 0),
            totalCost: Math.round(group.reduce((s, r) => s + (r.cost ?? 0), 0) * 100) / 100,
          },
        ])
      )
    ),
    recommendations: getRecommendations(records),
    analyzedAt: new Date().toISOString(),
  });
}

/** Calculate cost for given token counts */
function calculateCost(model, tokens) {
  const pricing = MODEL_PRICING[model] ?? MODEL_PRICING['claude-sonnet-4'];
  const inputCost = ((tokens.input ?? 0) / 1_000_000) * pricing.input;
  const outputCost = ((tokens.output ?? 0) / 1_000_000) * pricing.output;
  const cacheReadCost = ((tokens.cacheRead ?? 0) / 1_000_000) * pricing.cacheRead;
  const cacheWriteCost = ((tokens.cacheWrite ?? 0) / 1_000_000) * pricing.cacheWrite;
  const total = inputCost + outputCost + cacheReadCost + cacheWriteCost;

  return Object.freeze({
    model,
    inputCost: round(inputCost),
    outputCost: round(outputCost),
    cacheReadCost: round(cacheReadCost),
    cacheWriteCost: round(cacheWriteCost),
    total: round(total),
    totalCNY: round(total * USD_TO_CNY_APPROX),
  });
}

/** Generate optimization recommendations */
function getRecommendations(records) {
  const recommendations = [];

  if (!records || records.length === 0) return Object.freeze(recommendations);

  const totalInput = records.reduce((s, r) => s + (r.inputTokens ?? 0), 0);
  const totalOutput = records.reduce((s, r) => s + (r.outputTokens ?? 0), 0);
  const totalCacheRead = records.reduce((s, r) => s + (r.cacheReadTokens ?? 0), 0);
  const cacheHitRate = totalInput > 0 ? totalCacheRead / totalInput : 0;

  // 1. Low cache hit rate
  if (cacheHitRate < 0.3) {
    recommendations.push(Object.freeze({
      id: 'low-cache',
      priority: 'high',
      title: '📦 提高Prompt Cache命中率',
      description: `当前缓存命中率仅 ${Math.round(cacheHitRate * 100)}%。建议：
  - 将不变的系统提示放在messages开头
  - 使用 cache_control 标记静态内容
  - 避免频繁修改system prompt
  - 预计可节省 30-50% 输入成本`,
      estimatedSaving: '30-50%',
    }));
  }

  // 2. High output ratio (suggests verbose prompts)
  const outputRatio = totalOutput / (totalInput + totalOutput || 1);
  if (outputRatio > 0.6) {
    recommendations.push(Object.freeze({
      id: 'verbose-output',
      priority: 'medium',
      title: '✂️ 减少不必要的输出',
      description: `输出token占比 ${Math.round(outputRatio * 100)}%。建议：
  - 在prompt中明确要求简洁回复
  - 使用 max_tokens 限制输出长度
  - 指定输出格式（如JSON）减少废话
  - 使用 "直接给出答案，不需要解释" 类指令`,
      estimatedSaving: '15-30%',
    }));
  }

  // 3. Model downgrade suggestions
  const modelGroups = groupBy(records, 'model');
  if (modelGroups['claude-opus-4']?.length > 0) {
    const opusRecords = modelGroups['claude-opus-4'];
    const simpleRequests = opusRecords.filter((r) => (r.outputTokens ?? 0) < 100);
    if (simpleRequests.length > opusRecords.length * 0.3) {
      recommendations.push(Object.freeze({
        id: 'model-downgrade',
        priority: 'high',
        title: '🔄 部分任务可使用Sonnet替代Opus',
        description: `${Math.round((simpleRequests.length / opusRecords.length) * 100)}% 的Opus请求输出<100 tokens，可能是简单任务。建议：
  - 简单代码补全/格式化用 Sonnet (便宜5倍)
  - 简单问答用 Haiku (便宜19倍)
  - 仅在复杂推理/架构设计时使用 Opus
  - 使用 model routing 自动选择模型`,
        estimatedSaving: '40-60%',
      }));
    }
  }

  // 4. Batch API suggestion
  const totalRequests = records.length;
  if (totalRequests > 100) {
    recommendations.push(Object.freeze({
      id: 'batch-api',
      priority: 'medium',
      title: '📦 考虑使用Batch API',
      description: `检测到大量请求 (${totalRequests}次)。Anthropic Batch API 可享受 50% 折扣：
  - 非实时任务（代码审查、文档生成）使用Batch
  - 24小时内返回结果
  - 输入输出均半价`,
      estimatedSaving: '50%',
    }));
  }

  // 5. Extended thinking optimization
  recommendations.push(Object.freeze({
    id: 'thinking-budget',
    priority: 'low',
    title: '🧠 控制Extended Thinking预算',
    description: `Extended Thinking tokens按输出价计费。建议：
  - 设置 budget_tokens 上限（如10000）
  - 简单任务关闭thinking
  - 使用 MAX_THINKING_TOKENS 环境变量
  - 仅在复杂推理时启用`,
    estimatedSaving: '10-20%',
  }));

  return Object.freeze(recommendations);
}

function calculateSingleCost(pricing, record) {
  return (
    ((record.inputTokens ?? 0) / 1_000_000) * pricing.input +
    ((record.outputTokens ?? 0) / 1_000_000) * pricing.output +
    ((record.cacheReadTokens ?? 0) / 1_000_000) * pricing.cacheRead +
    ((record.cacheWriteTokens ?? 0) / 1_000_000) * (pricing.cacheWrite ?? 0)
  );
}

function groupBy(arr, key) {
  const groups = {};
  for (const item of arr) {
    const k = item[key] ?? 'unknown';
    if (!groups[k]) groups[k] = [];
    groups[k].push(item);
  }
  return groups;
}

function round(n) {
  return Math.round(n * 10000) / 10000;
}
