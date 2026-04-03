'use client';

import Link from 'next/link';
import { useState } from 'react';
import Header from '../components/Header';
import Footer from '../components/Footer';

const MODELS = {
  'claude-opus-4.6': { name: 'Opus 4.6', input: 5, output: 25, cacheRead: 0.5, cacheWrite: 6.25 },
  'claude-opus-4.5': { name: 'Opus 4.5', input: 5, output: 25, cacheRead: 0.5, cacheWrite: 6.25 },
  'claude-sonnet-4.6': { name: 'Sonnet 4.6', input: 3, output: 15, cacheRead: 0.3, cacheWrite: 3.75 },
  'claude-sonnet-4.5': { name: 'Sonnet 4.5', input: 3, output: 15, cacheRead: 0.3, cacheWrite: 3.75 },
  'claude-haiku-4.5': { name: 'Haiku 4.5', input: 1, output: 5, cacheRead: 0.1, cacheWrite: 1.25 },
  'claude-haiku-3.5': { name: 'Haiku 3.5', input: 0.8, output: 4, cacheRead: 0.08, cacheWrite: 1.0 },
};

const labelStyle = { fontSize: 12, color: 'var(--text-dim)', display: 'block', marginBottom: 4 };
const inputStyle = { width: '100%', padding: '12px 14px', minHeight: '44px', background: 'var(--bg)', color: 'var(--text)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 14 };
const helpStyle = { fontSize: 11, color: 'var(--text-dim)', marginTop: 4 };

export default function ToolsPage() {
  const [model, setModel] = useState('claude-sonnet-4.6');
  // 余额审计
  const [balance, setBalance] = useState(100);
  const [dailySpend, setDailySpend] = useState(5);
  // 单次请求审计
  const [reqInputTokens, setReqInputTokens] = useState(2000);
  const [reqOutputTokens, setReqOutputTokens] = useState(1000);
  const [relayReported, setRelayReported] = useState(0.08);
  // 优化计算
  const [dailyRequests, setDailyRequests] = useState(50);
  const [opusPercent, setOpusPercent] = useState(60);
  const [cachePercent, setCachePercent] = useState(0);

  const pricing = MODELS[model];

  // 单次请求：按官方价应该多少钱
  const expectedCost = (reqInputTokens / 1_000_000) * pricing.input + (reqOutputTokens / 1_000_000) * pricing.output;
  const deviation = relayReported > 0 ? ((relayReported - expectedCost) / expectedCost * 100) : 0;

  // 余额预测
  const daysRemaining = dailySpend > 0 ? Math.floor(balance / dailySpend) : Infinity;

  // 优化空间计算
  const opusPricing = MODELS['claude-opus-4.6'] || MODELS['claude-opus-4.5'];
  const sonnetPricing = MODELS['claude-sonnet-4.6'] || MODELS['claude-sonnet-4.5'];
  const avgTokensPerReq = reqInputTokens + reqOutputTokens;
  // 当前花费（假设opusPercent用Opus，其余用当前模型）
  const currentDaily = dailyRequests * (
    (opusPercent / 100) * ((avgTokensPerReq * 0.6 / 1_000_000) * opusPricing.input + (avgTokensPerReq * 0.4 / 1_000_000) * opusPricing.output) +
    ((100 - opusPercent) / 100) * ((avgTokensPerReq * 0.6 / 1_000_000) * sonnetPricing.input + (avgTokensPerReq * 0.4 / 1_000_000) * sonnetPricing.output)
  );
  // 优化后（Opus降到30%，开启缓存）
  const optimizedOpusPercent = Math.max(20, opusPercent - 30);
  const cacheMultiplier = 1 - (cachePercent > 0 ? 0 : 0.4) * 0.9; // 40%输入可缓存，缓存省90%
  const optimizedDaily = dailyRequests * (
    (optimizedOpusPercent / 100) * ((avgTokensPerReq * 0.6 / 1_000_000) * opusPricing.input + (avgTokensPerReq * 0.4 / 1_000_000) * opusPricing.output) +
    ((100 - optimizedOpusPercent) / 100) * ((avgTokensPerReq * 0.6 / 1_000_000) * sonnetPricing.input + (avgTokensPerReq * 0.4 / 1_000_000) * sonnetPricing.output)
  ) * cacheMultiplier;
  const savedPerDay = currentDaily - optimizedDaily;
  const extraDays = dailySpend > 0 ? Math.floor(savedPerDay / dailySpend * daysRemaining) : 0;

  return (
    <>
      <Header />

      <main className="container" style={{ maxWidth: 800, padding: '40px 20px' }}>
        <h1 style={{ fontSize: 28, marginBottom: 8 }}>💰 算一笔账</h1>
        <p style={{ color: 'var(--text-dim)', marginBottom: 32 }}>
          你的$100余额花得合理吗？还能用多久？怎么延长？
        </p>

        {/* ─── 第一部分：余额寿命 ─── */}
        <div className="stat-card" style={{ marginBottom: 24, border: '1px solid rgba(34,197,94,0.3)' }}>
          <h3 style={{ color: 'var(--green)', fontSize: 14, textTransform: 'none', letterSpacing: 0 }}>⏳ 你的余额还能撑多久？</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 16 }}>
            <div>
              <label style={labelStyle}>当前余额（$）</label>
              <input type="number" min="0" step="1" value={balance} onChange={(e) => setBalance(Math.max(0, Number(e.target.value)))} style={inputStyle} />
              <p style={helpStyle}>中转站后台显示的剩余额度</p>
            </div>
            <div>
              <label style={labelStyle}>每天大约花多少（$）</label>
              <input type="number" min="0" step="0.5" value={dailySpend} onChange={(e) => setDailySpend(Math.max(0, Number(e.target.value)))} style={inputStyle} />
              <p style={helpStyle}>看中转站后台昨天的消费</p>
            </div>
          </div>

          <div className="radar-grid" style={{ marginTop: 20, gap: 12 }}>
            <div className="stat-card" style={{ background: 'var(--bg)', textAlign: 'center' }}>
              <h3>还能用</h3>
              <div className="value" style={{ color: daysRemaining > 14 ? 'var(--green)' : daysRemaining > 5 ? 'var(--yellow)' : 'var(--red)', fontSize: 36 }}>
                {daysRemaining === Infinity ? '∞' : daysRemaining} 天
              </div>
            </div>
            <div className="stat-card" style={{ background: 'var(--bg)', textAlign: 'center' }}>
              <h3>日均消费</h3>
              <div className="value">${dailySpend.toFixed(2)}</div>
              <div style={{ fontSize: 12, color: 'var(--text-dim)' }}>月均 ${(dailySpend * 22).toFixed(0)}</div>
            </div>
            <div className="stat-card" style={{ background: 'var(--bg)', textAlign: 'center' }}>
              <h3>消耗速度</h3>
              <div className="value" style={{ color: dailySpend > 10 ? 'var(--red)' : dailySpend > 5 ? 'var(--yellow)' : 'var(--green)' }}>
                {dailySpend > 10 ? '偏快' : dailySpend > 5 ? '中等' : '健康'}
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-dim)' }}>
                {dailySpend > 10 ? '考虑用Sonnet替代部分Opus' : dailySpend > 5 ? '有优化空间' : '消费合理'}
              </div>
            </div>
          </div>
        </div>

        {/* ─── 第二部分：单次请求审计 ─── */}
        <div className="stat-card" style={{ marginBottom: 24, border: '1px solid rgba(108,99,255,0.3)' }}>
          <h3 style={{ color: 'var(--accent)', fontSize: 14, textTransform: 'none', letterSpacing: 0 }}>🔍 单次请求：中转站扣的对不对？</h3>
          <p style={{ fontSize: 13, color: 'var(--text-dim)', marginBottom: 16 }}>
            输入一次请求的Token数，对比中转站实际扣费和官方应收价
          </p>

          <div style={{ display: 'grid', gap: 12 }}>
            <div>
              <label style={labelStyle}>这次请求用的模型</label>
              <select value={model} onChange={(e) => setModel(e.target.value)} style={{ ...inputStyle, cursor: 'pointer' }}>
                {Object.entries(MODELS).map(([k, v]) => (
                  <option key={k} value={k}>{v.name} — 输入${v.input} / 输出${v.output} per MTok</option>
                ))}
              </select>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
              <div>
                <label style={labelStyle}>输入 tokens</label>
                <input type="number" min="0" value={reqInputTokens} onChange={(e) => setReqInputTokens(Math.max(0, Number(e.target.value)))} style={inputStyle} />
                <p style={helpStyle}>API返回的 input_tokens</p>
              </div>
              <div>
                <label style={labelStyle}>输出 tokens</label>
                <input type="number" min="0" value={reqOutputTokens} onChange={(e) => setReqOutputTokens(Math.max(0, Number(e.target.value)))} style={inputStyle} />
                <p style={helpStyle}>API返回的 output_tokens</p>
              </div>
              <div>
                <label style={labelStyle}>中转站扣了多少$</label>
                <input type="number" min="0" step="0.001" value={relayReported} onChange={(e) => setRelayReported(Math.max(0, Number(e.target.value)))} style={inputStyle} />
                <p style={helpStyle}>余额变化（扣前-扣后）</p>
              </div>
            </div>
          </div>

          <div className="radar-grid" style={{ marginTop: 16, gap: 12 }}>
            <div className="stat-card" style={{ background: 'var(--bg)', textAlign: 'center' }}>
              <h3>官方应收</h3>
              <div className="value" style={{ color: 'var(--green)' }}>${expectedCost.toFixed(4)}</div>
              <div style={{ fontSize: 11, color: 'var(--text-dim)' }}>
                输入 ${(reqInputTokens / 1_000_000 * pricing.input).toFixed(4)} + 输出 ${(reqOutputTokens / 1_000_000 * pricing.output).toFixed(4)}
              </div>
            </div>
            <div className="stat-card" style={{ background: 'var(--bg)', textAlign: 'center' }}>
              <h3>中转站实扣</h3>
              <div className="value" style={{ color: Math.abs(deviation) > 20 ? 'var(--red)' : 'var(--text)' }}>${relayReported.toFixed(4)}</div>
            </div>
            <div className="stat-card" style={{ background: 'var(--bg)', textAlign: 'center' }}>
              <h3>偏差</h3>
              <div className="value" style={{ color: Math.abs(deviation) > 50 ? 'var(--red)' : Math.abs(deviation) > 20 ? 'var(--yellow)' : 'var(--green)' }}>
                {deviation > 0 ? '+' : ''}{deviation.toFixed(1)}%
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-dim)' }}>
                {Math.abs(deviation) <= 10 ? '✅ 正常' : Math.abs(deviation) <= 30 ? '🟡 偏差较大' : '🔴 明显异常'}
              </div>
            </div>
          </div>

          {Math.abs(deviation) > 30 && (
            <div style={{ marginTop: 12, padding: 12, background: 'rgba(239,68,68,0.08)', borderRadius: 8, fontSize: 13, color: 'var(--red)' }}>
              ⚠️ 偏差超过30%，可能原因：中转站注入了隐藏System Prompt（虚增input tokens）、
              加价倍率高、或Token计数方式不同。建议用 <code>npx relay-radar verify</code> 深入检测。
            </div>
          )}

          {reqInputTokens > 5000 && reqOutputTokens < 100 && (
            <div style={{ marginTop: 12, padding: 12, background: 'rgba(234,179,8,0.08)', borderRadius: 8, fontSize: 13, color: 'var(--yellow)' }}>
              💡 输入 {reqInputTokens.toLocaleString()} tokens 但输出只有 {reqOutputTokens} tokens？input异常偏高，
              可能中转站注入了隐藏 System Prompt。用 <code>npx relay-radar verify</code> 可以检测。
            </div>
          )}
        </div>

        {/* ─── 第三部分：优化建议 ─── */}
        <div className="stat-card" style={{ marginBottom: 24, border: '1px solid rgba(34,197,94,0.3)' }}>
          <h3 style={{ color: 'var(--green)', fontSize: 14, textTransform: 'none', letterSpacing: 0 }}>🚀 怎么让余额用更久？</h3>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginTop: 16 }}>
            <div>
              <label style={labelStyle}>每天约几次请求</label>
              <input type="number" min="1" value={dailyRequests} onChange={(e) => setDailyRequests(Math.max(1, Number(e.target.value)))} style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>其中Opus占比%</label>
              <input type="number" min="0" max="100" value={opusPercent} onChange={(e) => setOpusPercent(Math.min(100, Math.max(0, Number(e.target.value))))} style={inputStyle} />
              <p style={helpStyle}>剩余用Sonnet</p>
            </div>
            <div>
              <label style={labelStyle}>是否启用了缓存</label>
              <select value={cachePercent} onChange={(e) => setCachePercent(Number(e.target.value))} style={{ ...inputStyle, cursor: 'pointer' }}>
                <option value="0">没有</option>
                <option value="40">是（约40%命中）</option>
                <option value="70">是（约70%命中）</option>
              </select>
            </div>
          </div>

          <div style={{ marginTop: 20, padding: 20, background: 'rgba(34,197,94,0.06)', borderRadius: 10 }}>
            <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 12 }}>优化方案：</div>
            <div style={{ fontSize: 14, lineHeight: 2, color: 'var(--text-dim)' }}>
              <p>1. 🔄 把Opus占比从 <strong>{opusPercent}%</strong> 降到 <strong>{optimizedOpusPercent}%</strong>（简单任务用Sonnet）</p>
              {cachePercent === 0 && (
                <p>2. 📦 开启 Prompt Cache（约省40%输入费用）</p>
              )}
              <p>{cachePercent === 0 ? '3' : '2'}. 🧠 设置 <code style={{ background: 'rgba(255,255,255,0.08)', padding: '1px 6px', borderRadius: 3 }}>MAX_THINKING_TOKENS=10000</code></p>
            </div>
            <div style={{ marginTop: 16, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div className="stat-card" style={{ background: 'var(--bg)', textAlign: 'center' }}>
                <h3>优化前</h3>
                <div className="value">${currentDaily.toFixed(2)}/天</div>
                <div style={{ fontSize: 12, color: 'var(--text-dim)' }}>余额撑 {Math.floor(balance / Math.max(currentDaily, 0.01))} 天</div>
              </div>
              <div className="stat-card" style={{ background: 'var(--bg)', textAlign: 'center' }}>
                <h3>优化后</h3>
                <div className="value" style={{ color: 'var(--green)' }}>${optimizedDaily.toFixed(2)}/天</div>
                <div style={{ fontSize: 12, color: 'var(--green)' }}>余额撑 {Math.floor(balance / Math.max(optimizedDaily, 0.01))} 天</div>
              </div>
            </div>
            {savedPerDay > 0 && (
              <div style={{ textAlign: 'center', marginTop: 12, fontSize: 16, fontWeight: 700, color: 'var(--green)' }}>
                每天省 ${savedPerDay.toFixed(2)}，余额多撑 {Math.floor(balance / Math.max(optimizedDaily, 0.01)) - Math.floor(balance / Math.max(currentDaily, 0.01))} 天
              </div>
            )}
          </div>
        </div>

        {/* ─── 第四部分：官方价格参考 ─── */}
        <div className="stat-card" style={{ marginBottom: 24 }}>
          <h3 style={{ fontSize: 14, textTransform: 'none', letterSpacing: 0, marginBottom: 12 }}>📋 Anthropic 官方价格参考</h3>
          <p style={{ fontSize: 12, color: 'var(--text-dim)', marginBottom: 12 }}>
            数据来源：<a href="https://docs.anthropic.com/en/docs/about-claude/pricing" target="_blank" rel="noopener">Anthropic官方</a>（2026年4月），单位：$/百万tokens。用来和你中转站的单价对比。
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
                  <th style={{ textAlign: 'right', padding: '8px 6px', color: 'var(--text-dim)', fontSize: 11 }}>Batch(5折)</th>
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
                    <td style={{ padding: '6px', textAlign: 'right', color: 'var(--green)' }}>${(m.input / 2).toFixed(2)}/${(m.output / 2).toFixed(1)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 8 }}>
            💡 缓存读取仅输入价的10%——如果你的system prompt稳定，开启缓存是最大的省钱方法。
          </p>
        </div>

        {/* 快捷操作 */}
        <div style={{ textAlign: 'center', padding: '24px 0', borderTop: '1px solid var(--border)' }}>
          <p style={{ fontSize: 13, color: 'var(--text-dim)', marginBottom: 12 }}>想深入检测你的中转站？</p>
          <code style={{ background: 'var(--bg-card)', padding: '8px 16px', borderRadius: 6, fontSize: 14 }}>npx relay-radar verify</code>
          <div style={{ marginTop: 16, display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link href="/dashboard/" className="cta-btn cta-secondary">📊 我的用量</Link>
            <Link href="/" className="cta-btn cta-secondary">🏆 中转站排名</Link>
          </div>
        </div>
      </main>

      <Footer />
    </>
  );
}
