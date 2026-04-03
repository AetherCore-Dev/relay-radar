'use client';

import Link from 'next/link';
import { useState } from 'react';
import Header from '../components/Header';
import Footer from '../components/Footer';

const MODELS = {
  'claude-opus-4.6': { name: 'Claude Opus 4.6 (最新)', input: 5, output: 25, cacheRead: 0.5, cacheWrite: 6.25 },
  'claude-opus-4.5': { name: 'Claude Opus 4.5', input: 5, output: 25, cacheRead: 0.5, cacheWrite: 6.25 },
  'claude-opus-4': { name: 'Claude Opus 4 (旧版)', input: 15, output: 75, cacheRead: 1.5, cacheWrite: 18.75 },
  'claude-sonnet-4.6': { name: 'Claude Sonnet 4.6 (最新)', input: 3, output: 15, cacheRead: 0.3, cacheWrite: 3.75 },
  'claude-sonnet-4.5': { name: 'Claude Sonnet 4.5', input: 3, output: 15, cacheRead: 0.3, cacheWrite: 3.75 },
  'claude-sonnet-4': { name: 'Claude Sonnet 4', input: 3, output: 15, cacheRead: 0.3, cacheWrite: 3.75 },
  'claude-haiku-4.5': { name: 'Claude Haiku 4.5', input: 1, output: 5, cacheRead: 0.1, cacheWrite: 1.25 },
  'claude-haiku-3.5': { name: 'Claude 3.5 Haiku', input: 0.8, output: 4, cacheRead: 0.08, cacheWrite: 1.0 },
};

const CNY_RATE = 7.25;

const labelStyle = { fontSize: 12, color: 'var(--text-dim)', display: 'block', marginBottom: 4 };
const inputStyle = { width: '100%', padding: '12px 14px', minHeight: '44px', background: 'var(--bg)', color: 'var(--text)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 14 };
const helpStyle = { fontSize: 11, color: 'var(--text-dim)', marginTop: 4 };

export default function ToolsPage() {
  const [model, setModel] = useState('claude-sonnet-4.6');
  const [inputTokens, setInputTokens] = useState(100000);
  const [outputTokens, setOutputTokens] = useState(50000);
  const [daysPerMonth, setDaysPerMonth] = useState(22);
  const [cacheReadTokens, setCacheReadTokens] = useState(0);
  const [cacheWriteTokens, setCacheWriteTokens] = useState(0);

  // 中转站充值换算
  const [rechargeRmb, setRechargeRmb] = useState(10);
  const [rechargeUsd, setRechargeUsd] = useState(100);
  const [relayReportedUsd, setRelayReportedUsd] = useState(30);

  const [compareMode, setCompareMode] = useState(false);

  const pricing = MODELS[model];
  const dailyInputCost = (inputTokens / 1_000_000) * pricing.input;
  const dailyOutputCost = (outputTokens / 1_000_000) * pricing.output;
  const dailyCacheReadCost = (cacheReadTokens / 1_000_000) * pricing.cacheRead;
  const dailyCacheWriteCost = (cacheWriteTokens / 1_000_000) * pricing.cacheWrite;
  const dailyOfficial = dailyInputCost + dailyOutputCost + dailyCacheReadCost + dailyCacheWriteCost;
  const monthlyOfficial = dailyOfficial * daysPerMonth;

  // 中转站换算
  const rmbPerUsd = rechargeUsd > 0 ? rechargeRmb / rechargeUsd : 0;
  const officialRate = 1 / CNY_RATE; // 官方美元汇率
  const discount = officialRate > 0 ? (rmbPerUsd / officialRate * 100).toFixed(1) : 0;
  const realRmbSpent = relayReportedUsd * rmbPerUsd;
  const officialRmbValue = relayReportedUsd * (1 / CNY_RATE) * CNY_RATE; // = relayReportedUsd in USD terms

  return (
    <>
      <Header />

      <main className="container" style={{ maxWidth: 800, padding: '40px 20px' }}>
        <h1 style={{ fontSize: 28, marginBottom: 8 }}>💰 算一笔账</h1>
        <p style={{ color: 'var(--text-dim)', marginBottom: 32 }}>
          搞清楚你到底花了多少钱，中转站有没有多收
        </p>

        {/* ─── 第一部分：中转站充值换算 ─── */}
        <div className="stat-card" style={{ marginBottom: 24, border: '1px solid rgba(108,99,255,0.3)' }}>
          <h3 style={{ color: 'var(--accent)', fontSize: 14, textTransform: 'none', letterSpacing: 0 }}>🔄 你的中转站到底多贵？</h3>
          <p style={{ fontSize: 13, color: 'var(--text-dim)', marginBottom: 16 }}>填入你在中转站的充值信息，帮你算出真实汇率</p>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
            <div>
              <label style={labelStyle}>你付了多少人民币</label>
              <input type="number" min="0" step="1" value={rechargeRmb} onChange={(e) => setRechargeRmb(Math.max(0, Number(e.target.value)))} style={inputStyle} />
              <p style={helpStyle}>充值时实际付的钱</p>
            </div>
            <div>
              <label style={labelStyle}>中转站给了多少$额度</label>
              <input type="number" min="0" step="1" value={rechargeUsd} onChange={(e) => setRechargeUsd(Math.max(0, Number(e.target.value)))} style={inputStyle} />
              <p style={helpStyle}>中转站后台显示的余额</p>
            </div>
            <div>
              <label style={labelStyle}>中转站报的已用$</label>
              <input type="number" min="0" step="0.1" value={relayReportedUsd} onChange={(e) => setRelayReportedUsd(Math.max(0, Number(e.target.value)))} style={inputStyle} />
              <p style={helpStyle}>中转站后台显示的消费</p>
            </div>
          </div>

          <div className="radar-grid" style={{ marginTop: 20, gap: 12 }}>
            <div className="stat-card" style={{ background: 'var(--bg)' }}>
              <h3>你的实付汇率</h3>
              <div className="value">¥{rmbPerUsd.toFixed(2)} / $1</div>
              <div style={{ fontSize: 12, color: 'var(--text-dim)' }}>官方汇率 ¥{CNY_RATE} / $1</div>
              <div style={{ fontSize: 12, color: parseFloat(discount) < 20 ? 'var(--green)' : parseFloat(discount) < 5 ? 'var(--red)' : 'var(--yellow)', marginTop: 4, fontWeight: 600 }}>
                {parseFloat(discount) < 100 ? `相当于官方价的 ${discount}%` : `比官方贵 ${(parseFloat(discount) - 100).toFixed(0)}%`}
              </div>
            </div>
            <div className="stat-card" style={{ background: 'var(--bg)' }}>
              <h3>中转站报的 ${relayReportedUsd} 实际花了</h3>
              <div className="value">¥{realRmbSpent.toFixed(2)}</div>
              <div style={{ fontSize: 12, color: 'var(--text-dim)' }}>如果直连Anthropic: ¥{(relayReportedUsd / CNY_RATE * CNY_RATE).toFixed(2)}</div>
            </div>
            <div className="stat-card" style={{ background: 'var(--bg)' }}>
              <h3>余额还能用</h3>
              <div className="value">${Math.max(0, rechargeUsd - relayReportedUsd).toFixed(0)}</div>
              <div style={{ fontSize: 12, color: 'var(--text-dim)' }}>≈ ¥{(Math.max(0, rechargeUsd - relayReportedUsd) * rmbPerUsd).toFixed(2)} 人民币</div>
            </div>
          </div>

          {parseFloat(discount) < 5 && (
            <div style={{ marginTop: 16, padding: 12, background: 'rgba(239,68,68,0.08)', borderRadius: 8, fontSize: 13, color: 'var(--red)' }}>
              ⚠️ 你的实付价仅为官方价的 {discount}%。这么便宜不太正常——建议用 <code>npx relay-radar monitor</code> 检测一下模型是不是真的。
            </div>
          )}
        </div>

        {/* ─── 第二部分：成本计算器 ─── */}
        <div className="stat-card" style={{ marginBottom: 24 }}>
          <h3 style={{ fontSize: 14, textTransform: 'none', letterSpacing: 0 }}>📊 按Token精算（对比官方价格）</h3>
          <p style={{ fontSize: 13, color: 'var(--text-dim)', marginBottom: 16 }}>输入你的日均用量，算出按Anthropic官方价应该花多少。拿这个数和中转站对比。</p>

          <div style={{ display: 'grid', gap: 16 }}>
            <div>
              <label style={labelStyle}>模型</label>
              <select value={model} onChange={(e) => setModel(e.target.value)}
                style={{ ...inputStyle, cursor: 'pointer' }}>
                {Object.entries(MODELS).map(([k, v]) => (
                  <option key={k} value={k}>{v.name} — 输入${v.input} / 输出${v.output} per MTok</option>
                ))}
              </select>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label style={labelStyle}>每日输入 tokens</label>
                <input type="number" min="0" value={inputTokens} onChange={(e) => setInputTokens(Math.max(0, Number(e.target.value)))} style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>每日输出 tokens</label>
                <input type="number" min="0" value={outputTokens} onChange={(e) => setOutputTokens(Math.max(0, Number(e.target.value)))} style={inputStyle} />
              </div>
            </div>
            <div className="input-grid-2col">
              <div>
                <label style={labelStyle}>每日缓存读取 tokens</label>
                <input type="number" min="0" value={cacheReadTokens} onChange={(e) => setCacheReadTokens(Math.max(0, Number(e.target.value)))} style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>每日缓存写入 tokens</label>
                <input type="number" min="0" value={cacheWriteTokens} onChange={(e) => setCacheWriteTokens(Math.max(0, Number(e.target.value)))} style={inputStyle} />
              </div>
            </div>
            <div>
              <label style={labelStyle}>每月工作天数</label>
              <input type="number" min="1" max="31" value={daysPerMonth} onChange={(e) => setDaysPerMonth(Math.max(1, Math.min(31, Number(e.target.value))))} style={{ ...inputStyle, maxWidth: 120 }} />
            </div>
          </div>
        </div>

        <div className="radar-grid">
          <div className="stat-card">
            <h3>Anthropic官方价（每日）</h3>
            <div className="value" style={{ color: 'var(--green)' }}>${dailyOfficial.toFixed(2)}</div>
            <div style={{ fontSize: 13, color: 'var(--text-dim)' }}>≈ ¥{(dailyOfficial * CNY_RATE).toFixed(2)}</div>
          </div>
          <div className="stat-card">
            <h3>Anthropic官方价（每月）</h3>
            <div className="value" style={{ color: 'var(--green)' }}>${monthlyOfficial.toFixed(2)}</div>
            <div style={{ fontSize: 13, color: 'var(--text-dim)' }}>≈ ¥{(monthlyOfficial * CNY_RATE).toFixed(0)}</div>
          </div>
          <div className="stat-card">
            <h3>你的中转站实付（每月）</h3>
            <div className="value" style={{ color: 'var(--yellow)' }}>¥{(monthlyOfficial * rmbPerUsd).toFixed(0)}</div>
            <div style={{ fontSize: 13, color: 'var(--text-dim)' }}>按你的充值汇率 ¥{rmbPerUsd.toFixed(2)}/$1</div>
          </div>
        </div>

        <p style={{ fontSize: 12, color: 'var(--text-dim)', marginTop: 12, textAlign: 'center' }}>
          💡 把"Anthropic官方价"和你中转站后台显示的消费对比，如果差距大，可能被多收了。
        </p>

        {/* 模型对比 */}
        <div style={{ marginTop: 24, textAlign: 'center' }}>
          <button onClick={() => setCompareMode(!compareMode)} style={{
            background: compareMode ? 'var(--accent)' : 'var(--bg-card)',
            color: 'var(--text)',
            border: '1px solid var(--border)',
            borderRadius: 8,
            padding: '10px 24px',
            fontSize: 14,
            cursor: 'pointer',
          }}>
            {compareMode ? '收起对比' : '📊 对比所有模型月费'}
          </button>
        </div>

        {compareMode && (
          <div className="radar-grid" style={{ marginTop: 16 }}>
            {Object.entries(MODELS).map(([key, m]) => {
              const total = ((inputTokens / 1_000_000) * m.input + (outputTokens / 1_000_000) * m.output) * daysPerMonth;
              return (
                <div key={key} className="stat-card" style={key === model ? { border: '1px solid var(--accent)' } : {}}>
                  <h3>{m.name}</h3>
                  <div className="value" style={{ color: key === model ? 'var(--accent)' : 'var(--text)' }}>
                    ${total.toFixed(2)}
                  </div>
                  <div style={{ fontSize: 13, color: 'var(--text-dim)' }}>
                    官方 ¥{(total * CNY_RATE).toFixed(0)} · 你的中转站 ¥{(total * rmbPerUsd).toFixed(0)}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* 省钱建议 */}
        <div className="stat-card" style={{ marginTop: 32 }}>
          <h3 style={{ marginBottom: 16, textTransform: 'none', letterSpacing: 0, fontSize: 14 }}>🧙 省钱技巧</h3>
          <div style={{ fontSize: 14, lineHeight: 2, color: 'var(--text-dim)' }}>
            <p>🔄 <strong>模型路由</strong> — 简单任务用 Sonnet，复杂推理才用 Opus</p>
            <p>📦 <strong>Prompt Cache</strong> — 缓存读取仅输入价的 10%</p>
            <p>✂️ <strong>精简输出</strong> — "简洁回复" + max_tokens 限制</p>
            <p>🧠 <strong>控制Thinking</strong> — <code>export MAX_THINKING_TOKENS=10000</code></p>
            <p>📦 <strong>Batch API</strong> — 非实时任务打5折</p>
          </div>
        </div>

        {cacheReadTokens === 0 && inputTokens > 0 && (
          <div className="stat-card" style={{ marginTop: 24 }}>
            <h3 style={{ marginBottom: 12, textTransform: 'none', letterSpacing: 0, fontSize: 14 }}>📦 你还没用缓存，能省这么多</h3>
            <p style={{ fontSize: 13, color: 'var(--text-dim)' }}>
              如果将 {Math.round(inputTokens * 0.6).toLocaleString()} 输入tokens (60%) 改为缓存读取：
            </p>
            <div className="value" style={{ color: 'var(--green)', marginTop: 8 }}>
              每月可省 ${((inputTokens * 0.6 / 1_000_000) * (pricing.input - pricing.cacheRead) * daysPerMonth).toFixed(2)}
            </div>
          </div>
        )}

        {/* 官方价格参考表 */}
        <div className="stat-card" style={{ marginTop: 32 }}>
          <h3 style={{ marginBottom: 12, textTransform: 'none', letterSpacing: 0, fontSize: 14 }}>📋 Anthropic 官方价格参考（2026年4月）</h3>
          <p style={{ fontSize: 12, color: 'var(--text-dim)', marginBottom: 12 }}>
            数据来源：<a href="https://docs.anthropic.com/en/docs/about-claude/pricing" target="_blank" rel="noopener">Anthropic官方文档</a>，单位：美元/百万tokens
          </p>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', fontSize: 13, borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                  <th style={{ textAlign: 'left', padding: '8px 6px', color: 'var(--text-dim)', fontSize: 11 }}>模型</th>
                  <th style={{ textAlign: 'right', padding: '8px 6px', color: 'var(--text-dim)', fontSize: 11 }}>输入</th>
                  <th style={{ textAlign: 'right', padding: '8px 6px', color: 'var(--text-dim)', fontSize: 11 }}>输出</th>
                  <th style={{ textAlign: 'right', padding: '8px 6px', color: 'var(--text-dim)', fontSize: 11 }}>缓存读</th>
                  <th style={{ textAlign: 'right', padding: '8px 6px', color: 'var(--text-dim)', fontSize: 11 }}>缓存写(5m)</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(MODELS).map(([k, m]) => (
                  <tr key={k} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                    <td style={{ padding: '6px', fontWeight: 600 }}>{m.name}</td>
                    <td style={{ padding: '6px', textAlign: 'right' }}>${m.input}</td>
                    <td style={{ padding: '6px', textAlign: 'right' }}>${m.output}</td>
                    <td style={{ padding: '6px', textAlign: 'right', color: 'var(--green)' }}>${m.cacheRead}</td>
                    <td style={{ padding: '6px', textAlign: 'right' }}>${m.cacheWrite}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      <Footer />
    </>
  );
}
