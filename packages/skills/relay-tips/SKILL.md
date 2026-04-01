---
name: relay-tips
version: 1.0.0
description: |
  Claude Code 省钱妙招和Token成本优化指南。分析当前使用模式，
  提供针对性的节省建议。Use when: "省钱", "save tokens", "cost tips",
  "怎么省钱", "太贵了", "优化成本", "token花费".
allowed-tools:
  - Bash
  - Read
  - AskUserQuestion
---

# /relay-tips — 省钱妙招

## 💰 Claude Code 成本优化完全指南

### Tier 1: 立即生效（节省30-50%）

#### 1. Prompt Cache（节省30-50%输入成本）
缓存读取价格仅为正常价的 **1/10**：
- Opus: $15/M → 缓存$1.5/M
- Sonnet: $3/M → 缓存$0.30/M

**操作方法：**
- 将CLAUDE.md、system prompt等放在对话开头
- 使用 `cache_control` API参数标记不变内容
- Claude Code 自动使用cache，确保system prompt稳定

#### 2. 模型路由（节省40-60%）
不是所有任务都需要 Opus：

| 任务类型 | 推荐模型 | 成本对比 |
|----------|---------|----------|
| 复杂架构设计 | Opus | $15+$75/M |
| 日常编码 | Sonnet | $3+$15/M (省5x) |
| 代码补全/简单问答 | Haiku | $0.8+$4/M (省19x) |

```bash
# 切换模型
export CLAUDE_MODEL=claude-sonnet-4
# 或在Claude Code中使用 /model 命令
```

#### 3. 控制Extended Thinking（节省10-20%）
Thinking tokens按**输出价格**计费（Opus: $75/M！）

```bash
export MAX_THINKING_TOKENS=10000  # 限制thinking预算
# Alt+T 快速切换thinking开关
```

### Tier 2: 习惯养成（长期节省20-30%）

#### 4. 精简输出
在prompt中添加：
- "简洁回复，不需要解释过程"
- "只输出代码，不需要注释"
- 使用 `max_tokens` 限制
- 要求JSON格式（结构化=更少废话）

#### 5. 上下文管理
```bash
# 定期压缩上下文
/compact

# 排除大文件
echo "node_modules/" >> .claudeignore
echo "*.lock" >> .claudeignore
echo "dist/" >> .claudeignore
```

#### 6. 批量处理
非实时任务用 Batch API，**半价**：
- 代码审查 → Batch
- 文档生成 → Batch
- 测试生成 → Batch

### Tier 3: 工具辅助

#### 7. ccusage 监控
```bash
pip install ccusage
ccusage total        # 查看总花费
ccusage breakdown    # 按项目分析
ccusage daily        # 每日趋势
```

#### 8. relay-radar 分析
```bash
npx relay-radar analyze usage.json  # 分析Token花费
npx relay-radar cost claude-opus-4 100000 50000  # 计算成本
npx relay-radar verify              # 验证模型真假（防止多花冤枉钱）
```

### Tier 4: 中转站选择策略

#### 价格对比（2025年参考）
| 渠道 | Opus价格 | 信任度 |
|------|----------|--------|
| 官方API | $15+$75/M | ⭐⭐⭐⭐⭐ |
| Claude Max拼车(6人) | ~¥398/月 | ⭐⭐⭐ |
| 知名中转站 | 官方价70-90% | ⭐⭐⭐ |
| 淘宝/闲鱼 | 官方价30-50% | ⭐⭐ |

#### 选择原则
1. **先验真再付费** — 用 `relay-radar verify` 确认模型
2. **小额试用** — 先充小金额测试
3. **关注错误率** — 便宜但不稳定=更贵
4. **留意隐藏收费** — System Prompt注入、Token虚增

## 📊 成本计算公式

```
月成本 = (输入tokens × 输入单价 + 输出tokens × 输出单价) × 工作日
       - (缓存tokens × 节省额)
       + thinking_tokens × 输出单价

以 Opus 为例，每天100K输入 + 50K输出：
= (100K × $15/M + 50K × $75/M) × 22天
= ($1.5 + $3.75) × 22
= $115.5/月 ≈ ¥838/月

使用缓存后（50%命中）：
= (50K × $15/M + 50K × $1.5/M + 50K × $75/M) × 22
= ($0.75 + $0.075 + $3.75) × 22
= $100.65/月 ≈ ¥730/月 (节省¥108)

改用 Sonnet 做简单任务（60%任务）：
≈ $50/月 ≈ ¥363/月 (节省57%)
```
