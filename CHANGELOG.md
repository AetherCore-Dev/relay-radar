# Changelog

## [0.2.0] - 2026-04-01

### 🎉 Phase 1 Complete — Core Engine

#### 新增
- **共享HTTP客户端** (`shared/http-client.mjs`) — 统一API格式检测、URL构建、请求发送
  - 自动检测 Anthropic / OpenAI 兼容格式
  - SSRF防护：阻止私有IP和localhost
  - HTTPS强制：拒绝明文HTTP传输API Key
  - 响应体大小限制（1MB）
  - ANSI注入防护 + Header注入防护

- **本地日志扫描** (`scanner/`) — 零Key分析Claude使用数据
  - 读取 ccusage / Claude Desktop / Claude Code 本地日志
  - 自动检测数据源，支持多种日志格式
  - 计算花费、缓存命中率、模型分布
  - 识别省钱机会（模型降级、缓存优化、thinking控制）

- **TCP连接测试** (`pinger/`) — 零Key测试中转站可达性
  - HEAD/GET探测，不发送API请求
  - TLS验证 + API端点检测
  - SSRF防护（阻止内网探测）

- **CLI渐进信任阶梯** — 零Key命令优先
  - `relay-radar` 首次运行自动扫描
  - `relay-radar scan/tips/cost/ping` 不需要任何Key
  - `relay-radar probe/verify/rank` 执行前显示安全提示+成本预估+确认
  - API Key只从环境变量读取，永不落盘

- **107个单元测试** — 覆盖所有核心逻辑
  - scoreCheck 7个scorer全覆盖
  - determineVerdict 所有分支
  - 安全防护验证（SSRF/HTTPS/注入）
  - 纯函数测试（avg/percentile/normalizeRecord等）

#### 修复
- 🚨 格式检测bug — `/v1/messages` 不再被误判为OpenAI格式
- 🚨 URL构建bug — `https://` 不再被正则破坏
- 🚨 Ranker索引bug — Verifier结果不再丢失（加入relay字段）
- 🚨 cacheWrite成本遗漏 — `calculateSingleCost` 加入第四项
- ⚠️ 全部检测失败时返回 `inconclusive` 而非误判 `fake`
- ⚠️ `reasoning_quality` scorer 实现（之前只声明未实现）
- ⚠️ `quickVerify` 修复为使用自定义题库
- ⚠️ verify/billing 并行化（Promise.all）
- ⚠️ Config `fromFile` 加入JSON解析错误处理
- ⚠️ Config `normalizeUrl` 自动修复 `http://` 为 `https://`
- ⚠️ 所有导出常量 `Object.freeze()`
- 🔵 清理3处死变量 + 1处未使用import
- 🔵 统一CNY汇率为共享常量 `USD_TO_CNY_APPROX`
- 🔵 Analyzer错误消息统一 `sanitize()`

## [0.1.0] - 2026-04-01

### 初始版本
- 核心引擎骨架：RelayProber, ModelVerifier, TokenAnalyzer, RelayRanker
- 8道指纹验真题库
- 基础CLI工具
- 4个Claude Code Skills (gstack格式)
