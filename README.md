# 🛰️ RelayRadar — AI中转站质量监控工具

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Tests](https://img.shields.io/badge/tests-107%2F107-brightgreen)]()
[![Next.js](https://img.shields.io/badge/web-Next.js%2016-black)]()

> AI中转站质量监控、模型验真、Token成本优化 — 中国开发者的瑞士军刀
>
> **本工具完全在本地运行，不上传任何数据，不收集API Key。**
>
> **排名网站数据由我们自行购买测试，用户只看不传。**

---

## 为什么需要这个工具

中国开发者使用 Claude Code 面临严峻问题：

| 痛点 | 现象 |
|------|------|
| 🎭 模型掺假 | 部分中转站被测试发现用低端模型冒充高端模型（[来源](https://juejin.cn/post/7616765969831411718)） |
| 💸 计费不透明 | 偷偷注入System Prompt虚增Token、缓存token按非缓存价收费 |
| 📉 服务不稳定 | 频繁掉线、限流、封号 |
| 🔒 密钥泄露 | 中转站安全事件时有发生（[安全预警](https://zone.ci/)） |
| 💰 成本失控 | 每天开发成本上百元，不知道钱花在哪 |

RelayRadar 帮你解决这些问题：**验真模型、审计计费、优化成本、排名中转站**。

---

## 产品矩阵

```
┌───────────────────────────────────────────────────────┐
│                                                       │
│   📦 开源CLI工具              🌐 排名网站              │
│   (获客入口, 本地运行)        (变现核心, 只看不传)      │
│                                                       │
│   ▸ scan — 扫描本地用量       ▸ 排名首页 (五维评分)    │
│   ▸ tips — 省钱妙招           ▸ 详情页 (趋势图+定价)   │
│   ▸ cost — 成本计算           ▸ 成本计算器 (交互式)    │
│   ▸ ping — 连接测试           ▸ 测试方法论+免责声明    │
│   ▸ probe* — 延迟探测                                  │
│   ▸ verify* — 模型验真        🤖 Claude Code Skills    │
│   ▸ rank* — 综合排名          ▸ /relay-probe           │
│                               ▸ /relay-verify          │
│   * 需要Key, 纯本地           ▸ /relay-rank            │
│                               ▸ /relay-tips            │
│                                                       │
└───────────────────────────────────────────────────────┘
```

---

## 快速开始

### 不需要API Key（立即可用）

```bash
# 看看你花了多少钱（扫描本地Claude日志，不联网）
npx relay-radar scan

# 了解如何省钱
npx relay-radar tips

# 计算Token成本
npx relay-radar cost claude-opus-4 100000 50000
# → 💰 总计: $5.25 (≈ ¥38.06)

# 测试中转站连接（只测TCP/TLS，不发API请求，不消耗Token）
npx relay-radar ping api.relay-a.com api.relay-b.com
```

### 需要API Key（纯本地运行）

```bash
# 设置环境变量（Key不会写入任何文件）
export RELAY_KEY_A="sk-..."

# 生成配置文件
npx relay-radar init

# 编辑 relay-radar.json，填入中转站信息
# apiKey 字段使用 ${RELAY_KEY_A} 引用环境变量

# 综合排名（执行前会显示成本预估，需要你确认）
npx relay-radar rank
```

每个消耗Key的命令执行前会显示安全提示：

```
╔═══════════════════════════════════════════════╗
║  🔒 安全提示                                  ║
║  • API Key 只在你的机器上使用                 ║
║  • 不会上传到任何服务器                       ║
║  • 所有请求直接发往你配置的中转站             ║
║  • 源码开源可审计                             ║
╚═══════════════════════════════════════════════╝

  🏆 综合排名: 3 个中转站
  预计消耗: ~16,800 tokens (≈ $0.050 / ¥0.36)

  继续？(y/n)
```

---

## 排名网站

在线查看中转站排名（数据由我们自行测试，不收集用户数据）：

**👉 https://你的域名.github.io/relay-radar/**

| 页面 | 功能 |
|------|------|
| 首页 | 排名表格 — 五维评分、评级标签、价格倍率 |
| 详情页 | 统计卡片、五维条形图、7天趋势图、定价表、警告 |
| 工具页 | 交互式成本计算器 — 实时对比直连 vs 中转站价格 |
| 关于页 | 测试方法论、评分体系、隐私声明、免责声明 |

---

## 所有CLI命令

### 无需API Key
| 命令 | 功能 | 示例 |
|------|------|------|
| `relay-radar` | 自动扫描本地用量 | `relay-radar` |
| `relay-radar scan` | 扫描本地Claude日志 | `relay-radar scan` |
| `relay-radar tips` | 省钱妙招 | `relay-radar tips` |
| `relay-radar cost` | 计算Token成本 | `relay-radar cost claude-opus-4 100000 50000` |
| `relay-radar ping` | 测试TCP/TLS连接 | `relay-radar ping api.relay.com` |

### 需要API Key（纯本地运行）
| 命令 | 功能 | Token消耗 |
|------|------|-----------|
| `relay-radar probe` | 探测延迟和吞吐量 | ~350 tokens/中转站 |
| `relay-radar verify` | 验证模型真实性 | ~4,000 tokens/中转站 |
| `relay-radar rank` | 综合排名 | ~5,600 tokens/中转站 |

### 工具
| 命令 | 功能 |
|------|------|
| `relay-radar init` | 生成配置文件（Key用环境变量引用） |
| `relay-radar help` | 查看帮助 |

---

## 排名体系

### 五维评分

| 维度 | 权重 | 说明 | 数据来源 |
|------|------|------|----------|
| ⚡ 延迟 | 20% | TTFT + P50/P95总延迟 | 自动化探测，多时段采样 |
| 🛡️ 稳定性 | 20% | 7天错误率 + 可用时间 | 连续7天监测 |
| 🔬 真实性 | **25%** | 模型指纹验真（最高权重） | 8维交叉验证 |
| 💰 计费 | 20% | Token准确性 + 注入检测 | 发送已知输入比对 |
| 🔍 透明度 | 15% | 公开定价 + 状态页 + 退款 | 人工核查 |

### 评级标准

| 总分 | 评级 | 说明 |
|------|------|------|
| 80+ | 🌟 推荐 | 各方面表现优秀 |
| 60-79 | 👍 可用 | 基本可靠，有小问题 |
| 40-59 | 🟡 一般 | 有明显短板 |
| <40 | 👎 不推荐 | 问题严重 |
| — | 🚫 模型造假 | 验证发现模型与声称不符 |
| — | ⚠️ 计费欺诈 | 检测到Token虚增或隐藏收费 |

---

## 模型验真原理

通过 8 维指纹题库交叉验证，区分 Opus / Sonnet / Haiku：

| 维度 | 方法 | 区分原理 |
|------|------|----------|
| 推理深度 | 12球称重问题 | Opus完整覆盖所有情况，Haiku可能遗漏 |
| 思维陷阱 | "$1.10球拍球"题 | Opus几乎100%正确，Haiku容易掉入直觉陷阱 |
| 延迟画像 | TTFT测量 | Opus天然慢(800-5000ms)，Haiku快(100-800ms) |
| 代码质量 | IPv6验证函数 | Opus处理所有边界情况，代码更完整 |
| 中文能力 | 量子纠缠解释 | 不同模型的中文表达精准度有差异 |
| 响应长度 | 统一问题的回答字数 | Opus倾向详尽，Haiku倾向简洁 |
| Token计数 | 已知输出验证 | 检查API返回的token数是否合理 |
| 自我认知 | 直接询问身份 | 低权重——模型可被指示说谎 |

**置信度 ≥ 70% + 分数差 ≥ 10% 才判定为 authentic/fake，避免误判。**

---

## 已知的中转站欺诈手段

RelayRadar 可以检测以下常见欺诈：

| 欺诈手段 | 检测方法 |
|----------|----------|
| Sonnet冒充Opus | 指纹验真：推理深度+延迟画像不符 |
| 国产模型冒充Claude | 指纹验真：中文表达模式+代码风格差异 |
| 蒸馏模型冒充原版 | 指纹验真：综合能力下降 |
| 偷偷注入System Prompt | 发送"Hi"检查input tokens是否异常高 |
| 缓存token按非缓存价收费 | 对比official pricing计算偏差 |
| Token计数虚增 | 发送已知输出长度的请求比对 |

---

## 安全设计

| 防护 | 说明 |
|------|------|
| 🔑 Key不落盘 | API Key只从环境变量读取，永不写入配置文件 |
| 🔒 强制HTTPS | 拒绝HTTP明文传输，`http://`自动替换为`https://` |
| 🛡️ SSRF防护 | 阻止对127.0.0.1/10.x/192.168.x等内网地址的请求 |
| 📦 响应限制 | 响应体上限1MB，防止恶意中转站消耗内存 |
| 🚫 注入防护 | 过滤ANSI终端控制符 + 验证自定义HTTP头 |
| 🧊 不可变 | 所有导出常量和返回值 Object.freeze |
| ✅ 确认机制 | 有Key命令执行前显示成本预估，需用户确认 |
| 📖 开源审计 | 全部源码公开，任何人可以审查网络请求 |

---

## 项目结构

```
relay-radar/
├── .github/workflows/       CI/CD
│   ├── test.yml              每次push运行107个测试
│   └── deploy.yml            自动部署到GitHub Pages
├── packages/
│   ├── core/                 核心引擎（零外部依赖）
│   │   ├── src/
│   │   │   ├── shared/       统一HTTP客户端（安全层）
│   │   │   ├── prober/       延迟探测（并发+重试）
│   │   │   ├── verifier/     模型验真（8维指纹，7个scorer）
│   │   │   ├── analyzer/     成本分析（计费审计+省钱建议）
│   │   │   ├── ranker/       综合排名（5维加权+表格输出）
│   │   │   ├── scanner/      本地日志扫描（零Key）
│   │   │   ├── pinger/       TCP/TLS连接测试（零Key）
│   │   │   ├── config.mjs    配置管理
│   │   │   └── constants.mjs 模型定价+指纹题库
│   │   └── test/             107个单元测试
│   ├── cli/                  命令行工具（10个命令）
│   ├── web/                  排名网站（Next.js静态站）
│   │   ├── app/              4个页面
│   │   ├── data/             排名数据（JSON）
│   │   └── out/              构建产物（gitignored，运行 next build 生成）
│   └── skills/               Claude Code Skills（4个）
├── scripts/                  部署脚本
└── docs/                     文档
    ├── ROADMAP.md            开发路线图
    └── PUBLISH-GUIDE.md      发布指南（小白版）
```

---

## 技术栈

| 层 | 技术 | 理由 |
|----|------|------|
| 核心引擎 | Node.js ESM, **零依赖** | 最小化信任面，无供应链风险 |
| CLI | Node.js 手动 argv 解析 | 零依赖，不需要commander/yargs |
| 测试 | Node.js `node:test` | 内置test runner，不需要jest |
| 网站 | Next.js 16 + React 19 | 静态导出，可部署到任何CDN |
| 部署 | GitHub Pages / 阿里云HK | 免费起步，按需升级 |
| CI/CD | GitHub Actions | push自动测试+部署 |

**核心引擎零依赖**：`packages/core` 不依赖任何npm包，只使用Node.js内置模块（`node:url`, `node:fs/promises`等）。这意味着：
- 没有供应链攻击风险
- 没有版本兼容问题
- 安装瞬间完成

---

## 开发状态

### ✅ Phase 1：核心引擎（已完成）
- [x] 10个核心模块（shared/prober/verifier/analyzer/ranker/scanner/pinger/config/constants/index）
- [x] 共享HTTP客户端（统一安全防护）
- [x] CLI工具（10个命令，渐进信任阶梯）
- [x] 4个Claude Code Skills
- [x] 107个单元测试，覆盖率~65%
- [x] 3轮安全审计：6个CRITICAL + 8个HIGH已修复

### ✅ Phase 2：排名网站（已完成）
- [x] Next.js 16静态站，4个页面
- [x] 排名首页（五维评分表格+评级标签）
- [x] 详情页（统计卡片+趋势图+定价表+警告）
- [x] 工具页（交互式成本计算器）
- [x] 关于页（方法论+免责声明）
- [x] 5个模拟中转站数据
- [x] 暗色主题+响应式设计
- [x] 构建验证通过

### ✅ Phase 3：CI/CD（已完成）
- [x] GitHub Actions测试工作流（push自动跑107个测试）
- [x] GitHub Actions部署工作流（自动发布到GitHub Pages）
- [x] 部署脚本 + basePath配置
- [x] 发布指南文档

### 🔲 Phase 4：增长（待开发）
- [ ] 用真实中转站数据替换模拟数据
- [ ] Claude Code Session Hook（自动提醒花费）
- [ ] `relay-radar switch` 一键切换中转站
- [ ] 联盟佣金接入
- [ ] GitHub Actions定时任务（每日自动测试）
- [ ] 掘金/V2EX推广文章

---

## Claude Code Skills

将skills目录复制到Claude Code配置即可使用：

```bash
cp -r packages/skills/* ~/.claude/skills/
```

| Skill | 功能 | 需要Key |
|-------|------|---------|
| `/relay-tips` | 省钱妙招 | ❌ |
| `/relay-probe` | 探测中转站延迟 | ✅ |
| `/relay-verify` | 验证模型真假 | ✅ |
| `/relay-rank` | 综合排名 | ✅ |

---

## 配置文件示例

```json
{
  "relays": [
    {
      "name": "中转站A",
      "baseUrl": "https://api.relay-a.com",
      "apiKey": "${RELAY_KEY_A}",
      "model": "claude-opus-4"
    },
    {
      "name": "中转站B",
      "baseUrl": "https://relay-b.com/v1",
      "apiKey": "${RELAY_KEY_B}",
      "model": "claude-sonnet-4"
    }
  ],
  "probe": {
    "timeout": 30000,
    "testRounds": 5,
    "warmupRounds": 2,
    "retries": 3
  }
}
```

**安全提示**：
- `apiKey` 使用 `${ENV_VAR}` 语法引用环境变量
- 不要把真实Key直接写在JSON文件里
- `relay-radar init` 自动将配置文件加入 `.gitignore`

---

## 贡献

欢迎PR！特别欢迎：
- 🧪 更多指纹测试题（提高验真准确度）
- 🌐 更多中转站API格式支持（Azure、Bedrock等）
- 📊 排名网站改进（更多图表、筛选功能）
- 🌍 英文文档/国际化
- 🐛 Bug报告和修复

### 本地开发

```bash
# 克隆项目
git clone https://github.com/anthropic-fans/relay-radar.git
cd relay-radar

# 运行核心引擎测试（零依赖，直接运行）
cd packages/core
node --test test/*.test.mjs

# 运行网站开发服务器
cd packages/web
npm install
npx next dev

# CLI开发
cd packages/cli
node bin/relay-radar.mjs tips
node bin/relay-radar.mjs cost claude-opus-4 100000 50000
```

---

## 免责声明

1. 本工具仅提供技术评测信息，不提供任何API中转服务
2. 使用第三方API中转服务可能违反Anthropic等厂商的服务条款，请自行了解相关风险
3. 评测数据基于自动化测试，可能与实际体验有差异
4. 本工具不收集用户的API Key或任何个人身份信息
5. 排名网站数据由我们自行购买各家服务测试，不收集用户数据

---

## License

MIT © 2026
