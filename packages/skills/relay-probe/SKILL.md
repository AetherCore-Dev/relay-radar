---
name: relay-probe
version: 1.0.0
description: |
  探测AI中转站连接性、延迟和吞吐量。支持Anthropic原生API和OpenAI兼容格式。
  发送多轮测试请求，统计TTFT、P50/P95延迟、吞吐量和错误率。
  Use when: "测试中转站", "probe relay", "test api", "延迟测试", "中转站速度".
allowed-tools:
  - Bash
  - Read
  - Write
  - AskUserQuestion
---

# /relay-probe — AI中转站探测

## 使用方法

探测中转站的连接质量，包括延迟、吞吐量、错误率。

### 快速探测（单个端点）

```bash
# 直接测试一个中转站
curl -w "\nTTFB: %{time_starttransfer}s\nTotal: %{time_total}s\n" \
  -X POST "$RELAY_URL/v1/messages" \
  -H "Content-Type: application/json" \
  -H "x-api-key: $RELAY_KEY" \
  -H "anthropic-version: 2023-06-01" \
  -d '{"model":"claude-sonnet-4","max_tokens":10,"messages":[{"role":"user","content":"hi"}]}'
```

### 多轮探测（使用relay-radar CLI）

```bash
# 1. 初始化配置
npx relay-radar init

# 2. 编辑 relay-radar.json 添加中转站信息

# 3. 运行探测
npx relay-radar probe
```

## 工作流程

1. **收集信息**: 询问用户要测试的中转站URL和API Key
2. **快速健康检查**: 发送单个请求确认端点可用
3. **多轮探测**: 2轮预热 + 5轮正式测试
4. **分析结果**: 计算统计指标
5. **输出报告**: 表格形式展示结果

## 关键指标

| 指标 | 优秀 | 良好 | 较差 |
|------|------|------|------|
| TTFT | <500ms | 500-2000ms | >2000ms |
| P95延迟 | <3s | 3-10s | >10s |
| 吞吐量 | >30 tok/s | 15-30 tok/s | <15 tok/s |
| 错误率 | 0% | <5% | >5% |
| 流式支持 | ✅ | - | ❌ |

## 注意事项

- API Key 通过环境变量传递，不要硬编码
- 如果是OpenAI兼容格式，URL应包含 `/v1/chat/completions`
- 测试会消耗少量token（约500 tokens/轮）
- 建议在不同时段多次测试以了解稳定性
