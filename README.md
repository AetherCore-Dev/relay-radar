# 🛰️ RelayRadar — AI中转站质量监控工具

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Tests](https://img.shields.io/badge/tests-107%2F107-brightgreen)]()

> AI中转站质量监控、模型验真、Token成本优化 — 开发者的瑞士军刀
>
> **本工具完全在本地运行，不上传任何数据，不收集API Key。**

## 痛点

中国开发者使用 Claude Code 面临：
- 🚫 官方API被封锁，依赖第三方中转站
- 💸 中转站价格不透明，计费猫腻多
- 🎭 模型掺假（用Sonnet冒充Opus，用国产模型冒充Claude）
- 📉 服务不稳定，频繁掉线限流
- 💰 每天开发成本上百元，不知道钱花在哪

## 快速开始（不需要API Key）

```bash
# 第一步：看看你花了多少钱（扫描本地日志，不联网）
npx relay-radar scan

# 第二步：了解如何省钱
npx relay-radar tips

# 第三步：计算成本
npx relay-radar cost claude-opus-4 100000 50000

# 第四步：测试中转站连接（只测TCP，不发API请求）
npx relay-radar ping api.relay-a.com api.relay-b.com
```

## 深度评估（需要API Key，纯本地运行）

```bash
# 配置中转站（Key用环境变量引用，不明文写入文件）
export RELAY_KEY_A="sk-..."
relay-radar init

# 综合排名（执行前会显示成本预估，需要你确认）
relay-radar rank
```

每个消耗Key的命令执行前都会显示：
```
╔═══════════════════════════════════════════════╗
║  🔒 安全提示                                  ║
║  • API Key 只在你的机器上使用                 ║
║  • 不会上传到任何服务器                       ║
║  • 所有请求直接发往你配置的中转站             ║
║  • 源码开源可审计                             ║
╚═══════════════════════════════════════════════╝

  预计消耗: ~16,800 tokens (≈ $0.050 / ¥0.36)
  继续？(y/n)
```

## 所有命令

### 无需API Key（立即可用）
| 命令 | 功能 |
|------|------|
| `relay-radar` | 自动扫描本地用量，首次使用推荐 |
| `relay-radar scan` | 扫描本地Claude使用日志，发现省钱机会 |
| `relay-radar tips` | 查看省钱妙招 |
| `relay-radar cost <model> <in> <out>` | 计算Token成本 |
| `relay-radar ping <url>` | 测试中转站连接（不发API请求） |

### 需要API Key（纯本地运行）
| 命令 | 功能 |
|------|------|
| `relay-radar probe [config]` | 探测中转站延迟和吞吐量 |
| `relay-radar verify [config]` | 验证模型真实性（防掺假） |
| `relay-radar rank [config]` | 综合排名（探测+验真+计费审计） |

### 工具命令
| 命令 | 功能 |
|------|------|
| `relay-radar init` | 生成配置文件 |
| `relay-radar help` | 查看帮助 |

## 排名体系

| 维度 | 权重 | 说明 |
|------|------|------|
| ⚡ 延迟 | 20% | TTFT + 总延迟 |
| 🛡️ 稳定性 | 20% | 错误率 + 流式支持 |
| 🔬 真实性 | 25% | 模型指纹验证（最高权重） |
| 💰 计费 | 20% | Token准确性 |
| 🔍 透明度 | 15% | 价格公示 + 退款政策 |

## 模型验真原理

通过 8+ 维度的指纹题库交叉验证：

1. **推理深度** — 复杂问题的解决完整度
2. **思维陷阱** — 经典逻辑题的正确率差异
3. **延迟画像** — 不同模型固有的TTFT模式
4. **代码质量** — 复杂编程任务的代码完整度
5. **中文能力** — 专业概念的中文表达质量
6. **响应长度** — 同一问题下的典型响应长度
7. **Token计数** — API返回的token数合理性
8. **自我认知** — 询问模型身份（低权重）

## 安全设计

- ✅ API Key只从环境变量读取，永不写入文件
- ✅ 所有HTTP请求强制HTTPS，拒绝明文传输
- ✅ SSRF防护：阻止对内网/localhost的请求
- ✅ 响应体大小限制（1MB），防止恶意中转站内存攻击
- ✅ ANSI注入防护：过滤恶意终端控制字符
- ✅ Header注入防护：验证自定义请求头
- ✅ 所有导出常量 Object.freeze，防止运行时污染
- ✅ 有Key命令执行前需用户确认

## 项目结构

```
relay-radar/
├── packages/
│   ├── core/                核心引擎
│   │   ├── src/
│   │   │   ├── shared/      统一HTTP客户端（安全层）
│   │   │   ├── prober/      延迟探测
│   │   │   ├── verifier/    模型验真
│   │   │   ├── analyzer/    成本分析
│   │   │   ├── ranker/      综合排名
│   │   │   ├── scanner/     本地日志扫描（零Key）
│   │   │   └── pinger/      TCP连接测试（零Key）
│   │   └── test/            107个测试
│   ├── cli/                 命令行工具
│   ├── web/                 排名网站（Phase 2）
│   └── skills/              Claude Code Skills
└── docs/                    文档
```

## 开发状态

### ✅ Phase 1：核心引擎（已完成）
- [x] 6个核心模块（prober/verifier/analyzer/ranker/scanner/pinger）
- [x] 共享HTTP客户端（统一安全防护）
- [x] CLI工具（渐进信任阶梯：零Key命令优先）
- [x] 4个Claude Code Skills
- [x] 107个测试，覆盖率~65%
- [x] 安全审计：6个CRITICAL已修复

### 🔲 Phase 2：排名网站（开发中）
- [ ] Next.js静态站 + 排名页面
- [ ] 中转站详情页（趋势图+评分）
- [ ] 在线成本计算器
- [ ] 部署到香港服务器

### 🔲 Phase 3：自动化测试
- [ ] GitHub Actions每日定时测试
- [ ] 结果自动更新网站
- [ ] 30天趋势图

### 🔲 Phase 4：增长
- [ ] Claude Code Session Hook（自动提醒花费）
- [ ] `relay-radar switch` 一键切换中转站
- [ ] 联盟佣金接入
- [ ] 用户评论系统

## 贡献

欢迎PR！特别欢迎：
- 🧪 更多指纹测试题
- 🌐 更多中转站API格式支持
- 📊 前端Dashboard改进
- 🌍 多语言支持

## License

MIT
