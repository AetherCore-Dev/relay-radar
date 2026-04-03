'use client';

import Link from 'next/link';
import { useState } from 'react';
import Header from '../components/Header';
import Footer from '../components/Footer';

const MODELS = {
  'claude-opus-4': { name: 'Claude Opus 4', input: 15, output: 75, cacheRead: 1.5, cacheWrite: 18.75 },
  'claude-sonnet-4': { name: 'Claude Sonnet 4', input: 3, output: 15, cacheRead: 0.3, cacheWrite: 3.75 },
  'claude-haiku-3.5': { name: 'Claude 3.5 Haiku', input: 0.8, output: 4, cacheRead: 0.08, cacheWrite: 1.0 },
};

const CNY_RATE = 7.25;

const labelStyle = { fontSize: 12, color: 'var(--text-dim)', display: 'block', marginBottom: 4 };
const inputStyle = { width: '100%', padding: '12px 14px', minHeight: '44px', background: 'var(--bg)', color: 'var(--text)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 14 };

export default function ToolsPage() {
  const [model, setModel] = useState('claude-opus-4');
  const [inputTokens, setInputTokens] = useState(100000);
  const [outputTokens, setOutputTokens] = useState(50000);
  const [daysPerMonth, setDaysPerMonth] = useState(22);
  const [relayMultiplier, setRelayMultiplier] = useState(1.3);
  const [cacheReadTokens, setCacheReadTokens] = useState(0);
  const [cacheWriteTokens, setCacheWriteTokens] = useState(0);
  const [compareMode, setCompareMode] = useState(false);

  const pricing = MODELS[model];
  const dailyInputCost = (inputTokens / 1_000_000) * pricing.input;
  const dailyOutputCost = (outputTokens / 1_000_000) * pricing.output;
  const dailyCacheReadCost = (cacheReadTokens / 1_000_000) * pricing.cacheRead;
  const dailyCacheWriteCost = (cacheWriteTokens / 1_000_000) * pricing.cacheWrite;
  const dailyDirect = dailyInputCost + dailyOutputCost + dailyCacheReadCost + dailyCacheWriteCost;
  const dailyRelay = dailyDirect * relayMultiplier;
  const monthlyDirect = dailyDirect * daysPerMonth;
  const monthlyRelay = dailyRelay * daysPerMonth;

  return (
    <>
      <Header />

      <main className="container" style={{ maxWidth: 700, padding: '40px 20px' }}>
        <h1 style={{ fontSize: 28, marginBottom: 8 }}>💰 成本计算器</h1>
        <p style={{ color: 'var(--text-dim)', marginBottom: 32 }}>
          计算你每天/每月的 Claude API 成本，对比直连和中转站价格差异。
        </p>

        <div className="stat-card" style={{ marginBottom: 24 }}>
          <div style={{ display: 'grid', gap: 16 }}>
            <div>
              <label style={labelStyle}>模型</label>
              <select value={model} onChange={(e) => setModel(e.target.value)}
                style={{ width: '100%', padding: '12px 14px', minHeight: '44px', background: 'var(--bg)', color: 'var(--text)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 14 }}>
                {Object.entries(MODELS).map(([k, v]) => (
                  <option key={k} value={k}>{v.name} (${v.input}/${v.output} per M)</option>
                ))}
              </select>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label style={labelStyle}>每日输入 tokens</label>
                <input type="number" min="0" value={inputTokens} onChange={(e) => setInputTokens(Math.max(0, Number(e.target.value)))}
                  style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>每日输出 tokens</label>
                <input type="number" min="0" value={outputTokens} onChange={(e) => setOutputTokens(Math.max(0, Number(e.target.value)))}
                  style={inputStyle} />
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
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label style={labelStyle}>每月工作天数</label>
                <input type="number" min="1" max="31" value={daysPerMonth} onChange={(e) => setDaysPerMonth(Math.max(1, Math.min(31, Number(e.target.value))))}
                  style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>中转站加价倍率</label>
                <input type="number" step="0.05" min="0.1" value={relayMultiplier} onChange={(e) => setRelayMultiplier(Math.max(0.1, Number(e.target.value)))}
                  style={inputStyle} />
              </div>
            </div>
          </div>
        </div>

        <div className="radar-grid">
          <div className="stat-card">
            <h3>官方直连价</h3>
            <div className="value" style={{ color: 'var(--green)' }}>${monthlyDirect.toFixed(2)}</div>
            <div style={{ fontSize: 13, color: 'var(--text-dim)' }}>≈ ¥{(monthlyDirect * CNY_RATE).toFixed(0)} / 月</div>
            <div style={{ fontSize: 12, color: 'var(--text-dim)', marginTop: 8 }}>${dailyDirect.toFixed(2)} / 天</div>
          </div>
          <div className="stat-card">
            <h3>中转站价 ({Math.round(relayMultiplier * 100)}%)</h3>
            <div className="value" style={{ color: 'var(--yellow)' }}>${monthlyRelay.toFixed(2)}</div>
            <div style={{ fontSize: 13, color: 'var(--text-dim)' }}>≈ ¥{(monthlyRelay * CNY_RATE).toFixed(0)} / 月</div>
            <div style={{ fontSize: 12, color: 'var(--text-dim)', marginTop: 8 }}>${dailyRelay.toFixed(2)} / 天</div>
          </div>
          <div className="stat-card">
            <h3>中转站溢价</h3>
            <div className="value" style={{ color: 'var(--red)' }}>+¥{((monthlyRelay - monthlyDirect) * CNY_RATE).toFixed(0)}</div>
            <div style={{ fontSize: 13, color: 'var(--text-dim)' }}>每月多花 {Math.round((relayMultiplier - 1) * 100)}%</div>
          </div>
        </div>

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
            {compareMode ? '收起对比' : '📊 对比所有模型'}
          </button>
        </div>

        {compareMode && (
          <div className="radar-grid" style={{ marginTop: 16 }}>
            {Object.entries(MODELS).map(([key, m]) => {
              const total = ((inputTokens / 1_000_000) * m.input + (outputTokens / 1_000_000) * m.output) * daysPerMonth;
              const totalRelay = total * relayMultiplier;
              return (
                <div key={key} className="stat-card">
                  <h3>{m.name}</h3>
                  <div className="value" style={{ color: key === model ? 'var(--accent)' : 'var(--text)' }}>${totalRelay.toFixed(2)}</div>
                  <div style={{ fontSize: 13, color: 'var(--text-dim)' }}>≈ ¥{(totalRelay * CNY_RATE).toFixed(0)}/月</div>
                  <div style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 4 }}>直连: ${total.toFixed(2)}</div>
                </div>
              );
            })}
          </div>
        )}

        <div className="stat-card" style={{ marginTop: 32 }}>
          <h3 style={{ marginBottom: 16 }}>🧙 省钱妙招</h3>
          <div style={{ fontSize: 14, lineHeight: 2, color: 'var(--text-dim)' }}>
            <p>🔄 <strong>模型路由</strong> — 简单任务用 Sonnet（便宜5x），复杂任务才用 Opus</p>
            <p>📦 <strong>Prompt Cache</strong> — 缓存读取仅 1/10 价格，确保system prompt稳定</p>
            <p>✂️ <strong>精简输出</strong> — 加 "简洁回复" 指令，设置 max_tokens 限制</p>
            <p>🧠 <strong>控制Thinking</strong> — export MAX_THINKING_TOKENS=10000</p>
            <p>📦 <strong>Batch API</strong> — 非实时任务用Batch，价格减半</p>
            <p>📥 <strong>使用CLI工具</strong> — <code>npx relay-radar scan</code> 分析你的花费</p>
          </div>
        </div>

        {cacheReadTokens === 0 && inputTokens > 0 && (
          <div className="stat-card" style={{ marginTop: 24 }}>
            <h3 style={{ marginBottom: 12 }}>📦 缓存省钱潜力</h3>
            <p style={{ fontSize: 13, color: 'var(--text-dim)' }}>
              如果你将 {Math.round(inputTokens * 0.6).toLocaleString()} 输入tokens (60%) 改为缓存读取：
            </p>
            <div className="value" style={{ color: 'var(--green)', marginTop: 8 }}>
              每月可省 ${((inputTokens * 0.6 / 1_000_000) * (pricing.input - pricing.cacheRead) * daysPerMonth).toFixed(2)}
            </div>
            <p style={{ fontSize: 12, color: 'var(--text-dim)', marginTop: 8 }}>
              💡 将固定的 system prompt 放在消息开头即可自动缓存
            </p>
          </div>
        )}
      </main>

      <Footer />
    </>
  );
}
