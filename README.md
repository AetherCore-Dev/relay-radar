<p align="center">
  <h1 align="center">🛰️ RelayRadar</h1>
  <p align="center"><b>你买的Opus，真的是Opus吗？</b></p>
  <p align="center">
    <img src="https://img.shields.io/badge/tests-146%2F146-brightgreen" alt="tests" />
    <img src="https://img.shields.io/badge/zero_dependencies-blue" alt="zero deps" />
    <img src="https://img.shields.io/badge/license-MIT-green" alt="MIT" />
  </p>
</p>

<p align="center">
  <img src="./assets/demo-scan.svg" alt="relay-radar" width="720" />
</p>

## 两件事

**1. 鉴别模型真假** — 你付了Opus的钱，中转站可能偷偷给你Sonnet。我们检测准确率98%。

**2. 揪出多收的钱** — 偷偷注入System Prompt虚增Token、缓存按原价收费。我们逐笔审计。

> 独立第三方，不收集数据，不需要注册，[源码公开](https://github.com/AetherCore-Dev/relay-radar)。

**支持检测**：Claude Opus 4 · Sonnet 4 · Haiku 3.5 · GPT-4o · 国产模型

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

## 检测你的中转站

```bash
# 1. 测一下能不能连上（免费，不消耗Token）
npx relay-radar ping api.你的中转站.com

# 2. 设置Key（只存在内存里，不写文件）
export RELAY_KEY="sk-..."
npx relay-radar init

# 3. 开始检测
npx relay-radar monitor
```

### 两种检测方式

| | `monitor`（⭐推荐） | `verify`（快速） |
|---|---|---|
| **原理** | 在你正常使用Claude Code的过程中，分析每次响应的"写作风格" | 发8个专业检测题，直接判断模型身份 |
| **体验** | **不影响你工作**，后台自动完成 | 需要单独跑，几分钟出结果 |
| **花费** | ~6,000 tokens ≈ **¥0.2** | ~4,000 tokens ≈ **¥0.15** |
| **学术依据** | [ICLR 2025](https://arxiv.org/abs/2410.19406) 序贯检验 + [行为指纹](https://arxiv.org/abs/2501.18712) | [USENIX Security 2025](https://www.usenix.org/conference/usenixsecurity25) LLMmap |

> 所有需要Key的命令，执行前会告诉你大概花多少钱，确认了才跑。

<p align="center">
  <img src="./assets/demo-tips.svg" alt="relay-radar monitor" width="720" />
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

我们自己掏钱买各家中转站来测，按5个维度打分：

- 🔬 **模型真不真**（30%）— 付了Opus的钱，给的真是Opus吗？
- 💰 **有没有多收钱**（25%）— Token计数准不准？有没有偷加Prompt？
- 🛡️ **稳不稳**（20%）— 会不会动不动就挂？
- ⚡ **快不快**（15%）— 延迟高不高？
- 🔍 **透不透明**（10%）— 定价公开吗？有退款吗？

> 独立第三方测试。不收集用户数据，不接受付费排名。

## 安全

- **Key不落盘** — 只从环境变量读，不写文件
- **强制HTTPS** — http自动转https
- **不联网** — scan/tips/cost完全离线
- **开源** — 每一行代码都能看到

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

## 免责声明

本工具仅提供技术评测，不提供API中转服务。使用第三方中转可能违反服务商条款，请自行评估。不收集用户Key或个人信息。

## License

MIT
