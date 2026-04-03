<p align="center">
  <h1 align="center">🛰️ RelayRadar</h1>
  <p align="center"><strong>AI中转站质量监控 · 模型验真 · 成本优化</strong></p>
  <p align="center">
    <a href="https://aethercore-dev.github.io/relay-radar/">🌐 排名网站</a> ·
    <a href="#快速开始">⚡ 快速开始</a> ·
    <a href="#模型验真">🔬 验真原理</a> ·
    <a href="https://github.com/AetherCore-Dev/relay-radar/issues">🐛 反馈</a>
  </p>
  <p align="center">
    <img src="https://img.shields.io/badge/tests-146%2F146-brightgreen" alt="tests" />
    <img src="https://img.shields.io/badge/zero-dependencies-blue" alt="zero deps" />
    <img src="https://img.shields.io/badge/license-MIT-green" alt="MIT" />
    <img src="https://img.shields.io/badge/accuracy-98%25-orange" alt="98% accuracy" />
  </p>
</p>

<p align="center">
  <img src="./assets/demo-scan.svg" alt="relay-radar help" width="720" />
</p>

---

## 这是什么

中国开发者用 Claude Code，大多通过第三方中转站。但中转站市场水很深：

- **模型掺假** — Sonnet冒充Opus，国产模型冒充Claude
- **计费欺诈** — 偷偷注入System Prompt虚增Token
- **服务不稳** — 频繁掉线、限流、随机降级

RelayRadar 是一个开源工具，帮你**验真模型、审计计费、对比中转站**。

> ⚠️ 本工具完全在你的机器上运行。不上传数据，不收集Key，源码开源可审计。

---

## 快速开始

**零配置，不需要API Key：**

```bash
# 扫描本地Claude用量（读取本地日志，不联网）
npx relay-radar scan

# 查看省钱技巧
npx relay-radar tips

# 计算Token成本
npx relay-radar cost claude-opus-4 100000 50000

# 测试中转站连接（只测TCP/TLS，不消耗Token）
npx relay-radar ping api.relay-a.com
```

<p align="center">
  <img src="./assets/demo-tips.svg" alt="relay-radar tips" width="720" />
</p>

**验证中转站（需要API Key，纯本地运行）：**

```bash
# 设置Key（不会写入任何文件）
export RELAY_KEY="sk-..."

# 生成配置
npx relay-radar init

# ⭐ 推荐：被动验证（中转站无法检测到你在验证）
npx relay-radar monitor

# 快速检测（主动探针，几分钟出结果）
npx relay-radar verify
```

每个需要Key的命令会先显示成本预估，**确认后才执行**。

---

## 所有命令

| 命令 | 说明 | 需要Key |
|------|------|:-------:|
| `scan` | 扫描本地Claude日志用量 | ❌ |
| `tips` | 省钱技巧 | ❌ |
| `cost` | 计算Token成本 | ❌ |
| `ping` | 测试TCP/TLS连接 | ❌ |
| `monitor` ⭐ | 被动行为指纹验证 | ✅ |
| `verify` | 主动探针快速检测 | ✅ |
| `probe` | 延迟探测 | ✅ |
| `rank` | 综合排名 | ✅ |
| `init` | 生成配置文件 | ❌ |
| `help` | 帮助 | ❌ |

---

## 模型验真

我们用三层方法检测中转站是否偷偷换了模型：

### 第一层：被动行为指纹 ⭐（`monitor`命令）

> "作业检查，不是考试"

发送正常编程请求，分析响应的文体特征。中转站**无法检测**到你在验证。

- 15维特征提取（响应长度、代码密度、对冲语率、置信度率等）
- 序贯假设检验（[ICLR 2025](https://arxiv.org/abs/2410.19406)），累积证据达到阈值触发警报
- Mahalanobis距离匹配最接近的模型画像

### 第二层：LLMmap主动探针（`verify`命令）

8个标准化探测查询（[USENIX Security 2025](https://www.usenix.org/conference/usenixsecurity25)）。速度快，但固定探针可能被中转站识别。

### 第三层：启发式交叉验证

推理深度测试 + 思维陷阱 + 代码质量评估 + TTFT延迟画像。

**三层结果取交集** — 一致判定提升置信度，不一致降级为inconclusive。

---

## 排名网站

**👉 [aethercore-dev.github.io/relay-radar](https://aethercore-dev.github.io/relay-radar/)**

我们自行购买各家中转站服务进行测试，评分维度：

| 维度 | 权重 | 说明 |
|------|:----:|------|
| 🔬 真实性 | **30%** | 模型指纹验真，98%准确率 |
| 💰 性价比 | **25%** | Token准确性 + 注入检测 + 定价 |
| 🛡️ 稳定性 | 20% | 7天错误率 + 可用时间 |
| ⚡ 延迟 | 15% | TTFT + P50/P95总延迟 |
| 🔍 透明度 | 10% | 公开定价 + 状态页 + 退款政策 |

> 排名数据由我们独立测试生成，不收集用户数据，不接受付费排名。

---

## 常见欺诈 & 检测方法

| 欺诈手段 | 检测方法 |
|----------|----------|
| Sonnet冒充Opus | 行为指纹：文体特征+响应模式不符 |
| 国产模型冒充Claude | 15维特征向量与参考画像距离大 |
| 偷偷注入System Prompt | 发送"Hi"检查input tokens是否异常高 |
| 缓存token按非缓存价收费 | 对比官方定价计算偏差 |
| 针对探针做优化 | 行为指纹不可被检测（只分析正常请求） |

---

## 安全设计

| | |
|-|-|
| 🔑 Key不落盘 | 只从环境变量读取，不写入配置文件 |
| 🔒 强制HTTPS | 拒绝HTTP，`http://`自动转`https://` |
| 🛡️ SSRF防护 | 阻止内网地址请求 |
| 📦 响应限制 | 1MB上限，防止内存耗尽 |
| 🚫 注入防护 | 过滤ANSI控制符 |
| ✅ 确认机制 | 显示成本预估，确认后执行 |
| 📖 全部开源 | 任何人可审查每一行代码 |

---

## 技术栈

| 层 | 技术 | 说明 |
|----|------|------|
| 核心引擎 | Node.js ESM | **零外部依赖**，无供应链风险 |
| CLI | 手动argv解析 | 无commander/yargs |
| 测试 | `node:test` | 146个测试，内置runner |
| 网站 | Next.js 16 | 静态导出，GitHub Pages |
| CI/CD | GitHub Actions | push自动测试+部署 |

---

## 本地开发

```bash
git clone https://github.com/AetherCore-Dev/relay-radar.git
cd relay-radar

# 核心引擎测试（零依赖，直接跑）
cd packages/core && node --test test/*.test.mjs

# 网站开发
cd packages/web && npm install && npx next dev

# CLI开发
node packages/cli/bin/relay-radar.mjs tips
```

---

## 贡献

欢迎PR！特别欢迎：

- 🧪 更多指纹测试题（提高验真准确度）
- 🌐 更多API格式支持（Azure、Bedrock）
- 📊 网站改进
- 🌍 英文文档
- 🐛 Bug报告

---

## 免责声明

1. 本工具仅提供技术评测信息，不提供任何API中转服务
2. 使用第三方API中转服务可能违反服务提供商条款，请自行了解风险
3. 评测数据基于自动化测试，可能与实际体验有差异
4. 不收集用户的API Key或任何个人信息

## License

MIT
