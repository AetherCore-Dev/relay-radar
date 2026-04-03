<p align="center">
  <h1 align="center">🛰️ RelayRadar</h1>
  <p align="center"><b>你买的Opus，真的是Opus吗？</b></p>
  <p align="center">
    <a href="https://github.com/AetherCore-Dev/relay-radar/actions"><img src="https://github.com/AetherCore-Dev/relay-radar/actions/workflows/ci.yml/badge.svg" alt="CI" /></a>
    <img src="https://img.shields.io/badge/zero_dependencies-blue" alt="zero deps" />
    <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-green" alt="MIT" /></a>
  </p>
  <p align="center">
    <a href="#english">🇬🇧 English</a> ·
    <a href="#中文">🇨🇳 中文</a>
  </p>
</p>

<p align="center">
  <img src="./assets/demo-tips.svg" alt="relay-radar monitor" width="720" />
</p>

---

<a id="中文"></a>

## 问题

国内开发者大量使用中转站访问 Claude / GPT API。但我们发现：

- 部分中转站**偷偷用便宜模型替换**你买的贵模型
- 部分中转站通过**注入隐藏Prompt多收你的钱**
- 你完全无法察觉，因为回复"看起来差不多"

## 两个坑，我们帮你查

**1. 模型是真的吗？** — 你付了Opus的钱，中转站偷偷给你Sonnet。RelayRadar 一查便知——盲测准确率 98%（100组 Opus vs Sonnet 替换测试）。

**2. 有没有多收钱？** — 偷注Prompt虚增Token、缓存按原价收费？逐笔审计，一笔不漏。

> 独立第三方，不收集数据，不需要注册，[源码公开](https://github.com/AetherCore-Dev/relay-radar)。

**支持检测**：Claude Opus 4 · Sonnet 4 · Haiku 3.5 · GPT-4o（更多模型持续添加中）

## 30秒上手

```bash
# 看看你花了多少钱（扫描本地日志，不联网）
npx relay-radar scan

# 省钱技巧
npx relay-radar tips

# 算一笔账：10万输入 + 5万输出，Opus要多少钱？
npx relay-radar cost claude-opus-4 100000 50000
```

以上命令**不需要API Key**，复制粘贴就能跑。

> `scan` 会读取本地 Claude Code 的使用日志。如果你还没用过 Claude Code，先试试 `tips` 或 `cost`。

## 检测你的中转站

```bash
# 1. 测一下能不能连上（免费，不消耗Token）
npx relay-radar ping api.你的中转站.com

# 2. 配置中转站地址和Key
# macOS / Linux:
export RELAY_KEY="sk-你从中转站复制的key"
# Windows PowerShell:
$env:RELAY_KEY="sk-你从中转站复制的key"

npx relay-radar init
# 然后编辑生成的 relay-radar.json，填入中转站地址：
# {
#   "relays": [{
#     "name": "我的中转站",
#     "baseUrl": "https://api.你的中转站.com",
#     "apiKey": "${RELAY_KEY}",
#     "model": "claude-opus-4"
#   }]
# }

# 3. 开始检测
npx relay-radar monitor
```

### 两种检测方式

| | `monitor`（⭐推荐） | `verify`（快速） |
|---|---|---|
| **原理** | 在你正常写代码时，自动分析AI回复的用词习惯、代码风格，判断是不是真模型 | 发8个精心设计的问题，不同模型的回答方式会暴露真实身份 |
| **体验** | **不影响你工作**，后台自动完成 | 需要单独跑，几分钟出结果 |
| **花费** | ~6,000 tokens ≈ **¥0.2** | ~4,000 tokens ≈ **¥0.15** |
| **学术基础** | 灵感来源于 [ICLR 2025 序贯检验](https://arxiv.org/abs/2410.19406) + [行为指纹](https://arxiv.org/abs/2501.18712)，适配中转站场景 | 复现 [USENIX Security 2025 LLMmap](https://www.usenix.org/conference/usenixsecurity25) 方法 |

> 所有需要Key的命令，执行前会告诉你大概花多少钱，确认了才跑。

<p align="center">
  <img src="./assets/demo-scan.svg" alt="relay-radar tips" width="720" />
</p>

## 它能发现什么问题？

| 你遇到的问题 | RelayRadar怎么检测 |
|---|---|
| 买的Opus，给的是Sonnet | 分析响应的行为特征——不同模型"写作风格"不同 |
| 偷偷注入System Prompt多收钱 | 发个"Hi"，看input tokens是不是异常高 |
| 有时快有时慢，怀疑随机降级 | 持续监控，统计学方法检测行为漂移 |
| 不知道哪家中转站靠谱 | 五维评分排名，数据公开透明 |

## 所有命令

| 命令 | 做什么 | 要Key吗 |
|------|--------|:-------:|
| `scan` | 看你花了多少 | 不要 |
| `tips` | 省钱技巧 | 不要 |
| `cost` | 算Token多少钱 | 不要 |
| `ping` | 测能不能连上 | 不要 |
| `monitor` ⭐ | 检测模型真假（不影响工作流） | 要 |
| `verify` | 快速检测（几分钟出结果） | 要 |
| `probe` | 测延迟 | 要 |
| `rank` | 综合排名 | 要 |

## 排名网站

**👉 [在线查看中转站排名](https://aethercore-dev.github.io/relay-radar/)**

我们自费购买各家中转站来测，按5个维度打分：

- 🔬 **模型真假**（30%）— 付了Opus，给的真是Opus？
- 💰 **计费准确度**（25%）— Token计数有没有虚增？
- 🛡️ **服务稳定性**（20%）— 7天可用率实测
- ⚡ **响应速度**（15%）— 首字延迟 + 吞吐量
- 🔍 **运营透明度**（10%）— 公开定价、状态页、退款政策

> 独立第三方测试。不收集用户数据，不接受付费排名。

## 安全

- **Key不落盘** — 只从环境变量读，不写文件
- **强制HTTPS** — 连中转站时自动升级为加密连接
- **离线优先** — scan/tips/cost 不碰网络
- **全量开源** — 零混淆，可审计每一行

## 本地开发

```bash
git clone https://github.com/AetherCore-Dev/relay-radar.git
cd relay-radar

# 跑测试（核心引擎零外部依赖）
cd packages/core && node --test test/*.test.mjs

# 跑网站
cd packages/web && npm install && npx next dev
```

## 贡献

欢迎PR！[提Issue](https://github.com/AetherCore-Dev/relay-radar/issues) · [参与讨论](https://github.com/AetherCore-Dev/relay-radar/discussions)

---

<a id="english"></a>

## 🇬🇧 English

**RelayRadar** detects whether your AI API relay station (proxy) is secretly swapping your expensive model for a cheaper one, or overcharging you by injecting hidden prompts.

### The Problem

Chinese developers access Claude/GPT APIs through third-party relay stations. We found that some relays:
- **Swap models** — you pay for Opus, they serve Sonnet
- **Overcharge** — inject hidden system prompts to inflate token counts

### Quick Start

```bash
# No API key needed
npx relay-radar scan    # Check your local usage
npx relay-radar tips    # Money-saving tips
npx relay-radar cost claude-opus-4 100000 50000

# With API key (runs locally, never uploaded)
export RELAY_KEY="sk-..."
npx relay-radar init
npx relay-radar monitor  # Recommended: passive detection
npx relay-radar verify   # Quick: active probe detection
```

### How It Works

- **Behavioral fingerprinting** — analyzes response style during normal usage (inspired by [ICLR 2025](https://arxiv.org/abs/2410.19406))
- **LLMmap probes** — 8 standardized queries from [USENIX Security 2025](https://www.usenix.org/conference/usenixsecurity25)
- **Billing audit** — detects hidden prompt injection and token inflation

### Ranking Website

**👉 [aethercore-dev.github.io/relay-radar](https://aethercore-dev.github.io/relay-radar/)**

---

## 免责声明

本工具仅提供技术评测，不提供API中转服务。使用第三方中转可能违反服务商条款，请自行评估。不收集用户Key或个人信息。

## License

MIT
