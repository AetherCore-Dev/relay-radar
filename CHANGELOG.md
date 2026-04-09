# Changelog

All notable changes to this project will be documented in this file.

## [0.3.1] - 2026-04-09

### 🔬 真实模型行为指纹校准

#### 新增
- **CodeBuddy 校准脚本** (`scripts/calibrate-codebuddy.mjs`) — 通过 CodeBuddy API 采集真实模型响应
  - 支持 streaming 模式（CodeBuddy 要求）
  - Welford 在线统计算法计算 15 维行为特征的 mean/std
  - 自动计算模型间距离验证区分度
  - 支持 `--models`, `--prompts`, `--rounds` 参数
- **API 探测脚本** (`scripts/probe-codebuddy.mjs`) — 自动发现可用端点和模型 ID
- **CLAUDE.md** — Claude Code 开发指南

#### 真实指纹数据（8 个模型，780 个真实 API 响应）
- **Claude Opus 4.6** — 88 个有效样本
- **Claude Opus 4.5** — 100 个有效样本
- **Claude Sonnet 4.6** — 100 个有效样本
- **Claude Sonnet 4.5** — 100 个有效样本
- **Claude Haiku 4.5** — 100 个有效样本
- **GPT 5.4** — 94 个有效样本
- **GPT 5.3 Codex** — 99 个有效样本
- **Gemini 3.1 Pro** — 99 个有效样本

#### 变更
- `profiles.mjs` — 用真实校准数据替换手动估算值，新增 8 个模型 profile + 5 个向后兼容别名
- `profiles.json` — 写入完整 version 2 校准数据
- `constants.mjs` — 新增 GPT 5.4、GPT 5.3 Codex、Gemini 3.1 Pro 模型定义
- `monitor.mjs` — `resolveProfileKey()` 支持版本号精确匹配（如 opus-4.6 vs opus-4.5）
- `behavioral.test.mjs` — 适配真实数据阈值，新增跨家族距离测试和新模型解析测试

#### 跨家族区分度
- Claude ↔ GPT: **0.61–0.92** ✅
- Claude ↔ Gemini: **3.12–3.47** ✅
- GPT ↔ Gemini: **1.76–2.02** ✅
- 同家族内（Claude 各版本）: 0.07–0.28（天然相似）

## [0.3.0] - 2026-04-02

### 🌐 Phase 2 + Phase 3 — 排名网站 + CI/CD

#### 排名网站 (Phase 2)
- **首页** — 排名表格：五维评分条、评级标签（推荐/可用/可疑/造假）、价格倍率
- **详情页** — 统计卡片、五维条形图、SVG趋势图、定价表、功能清单、安全警告
- **工具页** — 交互式成本计算器：模型切换、日/月估算、直连 vs 中转站价格对比
- **关于页** — 测试方法论、评分体系、隐私声明、免责声明、CLI工具说明
- **数据** — 5个模拟中转站（推荐/可用/可疑/造假），7天历史数据
- **技术** — Next.js 16 静态导出，暗色主题，零外部UI依赖，响应式设计

#### CI/CD (Phase 3)
- **test.yml** — push/PR 自动运行 107 个核心测试 + 网站构建
- **deploy.yml** — push 到 main 自动部署到 GitHub Pages
- **basePath** — 支持 `github.io/relay-radar/` 子路径部署
- **deploy.sh** — 一键测试+构建+部署准备脚本

#### 文档
- **PUBLISH-GUIDE.md** — 从零发布的小白操作指南
- **README.md** — 全面重写，包含产品矩阵、排名体系、安全设计、技术栈说明

#### 修复
- `page.jsx` 删除 Server Component 中的 onClick（Next.js 16 不允许）
- 详情页改为 Client Component + useSearchParams + Suspense（静态导出兼容）

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
