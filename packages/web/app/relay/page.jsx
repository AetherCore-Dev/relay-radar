'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import rankingsData from '../../data/rankings.json';

function getScoreColor(score) {
  if (score >= 75) return 'var(--green)';
  if (score >= 50) return 'var(--yellow)';
  return 'var(--red)';
}

function StatCard({ icon, label, value, sub }) {
  return (
    <div className="stat-card">
      <h3>{icon} {label}</h3>
      <div className="value">{value}</div>
      {sub && <div style={{ fontSize: 13, color: 'var(--text-dim)', marginTop: 4 }}>{sub}</div>}
    </div>
  );
}

function DimensionBar({ label, score }) {
  const color = getScoreColor(score);
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 4 }}>
        <span>{label}</span>
        <span style={{ color, fontWeight: 700 }}>{score}</span>
      </div>
      <div style={{ width: '100%', height: 8, background: 'var(--border)', borderRadius: 4 }}>
        <div style={{ width: `${score}%`, height: '100%', background: color, borderRadius: 4, transition: 'width 0.3s' }} />
      </div>
    </div>
  );
}

function TrendChart({ history }) {
  if (!history || history.length < 2) return null;
  const maxScore = 100;
  const width = 100;
  const height = 40;
  const points = history.map((h, i) => {
    const x = (i / (history.length - 1)) * width;
    const y = height - (h.score / maxScore) * height;
    return `${x},${y}`;
  }).join(' ');

  return (
    <svg viewBox={`0 0 ${width} ${height}`} style={{ width: '100%', height: 80 }}>
      <polyline fill="none" stroke="var(--accent)" strokeWidth="1.5" points={points} />
      {history.map((h, i) => {
        const x = (i / (history.length - 1)) * width;
        const y = height - (h.score / maxScore) * height;
        return <circle key={i} cx={x} cy={y} r="1.5" fill="var(--accent)" />;
      })}
    </svg>
  );
}

function PricingTable({ pricing }) {
  if (!pricing) return null;
  return (
    <table style={{ width: '100%', fontSize: 13, borderCollapse: 'collapse' }}>
      <thead>
        <tr style={{ color: 'var(--text-dim)', fontSize: 11, textTransform: 'uppercase' }}>
          <th style={{ textAlign: 'left', padding: '8px 0' }}>模型</th>
          <th style={{ textAlign: 'right' }}>输入 $/M</th>
          <th style={{ textAlign: 'right' }}>输出 $/M</th>
          <th style={{ textAlign: 'right' }}>备注</th>
        </tr>
      </thead>
      <tbody>
        {Object.entries(pricing).map(([model, p]) => (
          <tr key={model} style={{ borderTop: '1px solid var(--border)' }}>
            <td style={{ padding: '8px 0', fontWeight: 600 }}>{model}</td>
            <td style={{ textAlign: 'right' }}>${p.input}</td>
            <td style={{ textAlign: 'right' }}>${p.output}</td>
            <td style={{ textAlign: 'right', fontSize: 11, color: 'var(--text-dim)' }}>{p.note}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function RelayDetailContent() {
  const searchParams = useSearchParams();
  const id = searchParams.get('id');
  const relay = rankingsData.relays.find(r => r.id === id);

  if (!relay) {
    return (
      <div className="container" style={{ padding: '80px 0', textAlign: 'center' }}>
        <h1>中转站未找到</h1>
        <p style={{ color: 'var(--text-dim)', marginTop: 12 }}>
          <Link href="/">← 返回排名</Link>
        </p>
      </div>
    );
  }

  const rank = [...rankingsData.relays]
    .sort((a, b) => b.overallScore - a.overallScore)
    .findIndex(r => r.id === id) + 1;
  const d = relay.details;

  return (
    <>
      <Header />

      <main className="container">
        <div className="detail-header">
          <Link href="/" style={{ fontSize: 13, color: 'var(--text-dim)' }}>← 返回排名</Link>
          <h1 style={{ marginTop: 12 }}>#{rank} {relay.name}</h1>
          <span className={`relay-verdict ${relay.verdict.includes('推荐') ? 'verdict-recommend' : relay.verdict.includes('造假') ? 'verdict-fake' : 'verdict-ok'}`}>
            {relay.verdict}
          </span>
          <span className="update-badge" style={{ marginLeft: 12 }}>
            更新于 {new Date(relay.updatedAt).toLocaleDateString('zh-CN')}
          </span>
        </div>

        {/* Warnings */}
        {relay.warnings && relay.warnings.length > 0 && (
          <div className="warning-box">
            <h3>⚠️ 警告</h3>
            <ul>
              {relay.warnings.map((w, i) => <li key={i}>{w}</li>)}
            </ul>
          </div>
        )}

        {/* Score Overview */}
        <div className="radar-grid">
          <StatCard icon="🏆" label="综合评分" value={relay.overallScore} sub={`排名 #${rank} / ${rankingsData.relays.length}`} />
          <StatCard icon="⚡" label="平均延迟" value={`${d.avgLatencyMs}ms`} sub={`P50: ${d.p50LatencyMs}ms · P95: ${d.p95LatencyMs}ms`} />
          <StatCard icon="🎯" label="TTFT" value={`${d.ttftMs}ms`} sub={`吞吐量: ${d.throughputTps} tokens/s`} />
          <StatCard icon="🛡️" label="7日可用率" value={`${d.uptimePercent}%`} sub={`错误率: ${d.errorRate7d}%`} />
          <StatCard icon="🔬" label="模型验真" value={d.verificationVerdict} sub={`置信度: ${d.verificationConfidence}%`} />
          <StatCard icon="💰" label="价格倍率" value={`${Math.round(d.pricingMultiplier * 100)}%`} sub={d.pricingNote} />
        </div>

        {/* Dimensions */}
        <div className="detail-2col">
          <div className="stat-card">
            <h3 style={{ marginBottom: 16 }}>📊 五维评分</h3>
            <DimensionBar label="⚡ 延迟" score={relay.dimensions.latency} />
            <DimensionBar label="🛡️ 稳定性" score={relay.dimensions.stability} />
            <DimensionBar label="🔬 真实性" score={relay.dimensions.authenticity} />
            <DimensionBar label="💰 计费" score={relay.dimensions.pricing} />
            <DimensionBar label="🔍 透明度" score={relay.dimensions.transparency} />
          </div>
          <div className="stat-card">
            <h3 style={{ marginBottom: 16 }}>📈 7日趋势</h3>
            <TrendChart history={relay.history} />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--text-dim)', marginTop: 8 }}>
              {relay.history && (
                <>
                  <span>{relay.history[0]?.date}</span>
                  <span>{relay.history[relay.history.length - 1]?.date}</span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Pricing */}
        <div className="stat-card" style={{ margin: '24px 0' }}>
          <h3 style={{ marginBottom: 12 }}>💵 定价详情 (USD per 1M tokens)</h3>
          <PricingTable pricing={relay.pricing} />
        </div>

        {/* 支持模型 */}
        <div className="stat-card" style={{ margin: '24px 0' }}>
          <h3 style={{ marginBottom: 16 }}>🤖 支持模型</h3>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {d.modelsAvailable?.map((modelId, i) => (
              <div key={i} style={{
                background: 'var(--bg)',
                border: '1px solid var(--border)',
                borderRadius: 8,
                padding: '10px 16px',
                fontSize: 13,
              }}>
                <div style={{ fontWeight: 700, marginBottom: 4 }}>{modelId}</div>
                {relay.pricing?.[modelId] && (
                  <div style={{ fontSize: 11, color: 'var(--text-dim)' }}>
                    输入 ${relay.pricing[modelId].input}/M · 输出 ${relay.pricing[modelId].output}/M
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Features */}
        <div className="stat-card" style={{ margin: '24px 0' }}>
          <h3 style={{ marginBottom: 12 }}>📋 功能与透明度</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12, fontSize: 13 }}>
            <div>{d.supportsStreaming ? '✅' : '❌'} 流式输出</div>
            <div>{d.hasStatusPage ? '✅' : '❌'} 状态页面</div>
            <div>{d.hasRefundPolicy ? '✅' : '❌'} 退款政策</div>
            <div>{d.publishesPricing ? '✅' : '❌'} 公开定价</div>
            <div>{d.systemPromptInjection ? '❌ 检测到注入' : '✅ 无注入'} System Prompt</div>
            <div>📦 支持模型: {d.modelsAvailable?.join(', ')}</div>
          </div>
        </div>

        {/* Tags */}
        <div style={{ margin: '24px 0' }}>
          {relay.tags?.map((tag, i) => (
            <span key={i} className={`tag ${tag.includes('❌') || tag.includes('⚠️') ? 'tag-warn' : ''}`} style={{ marginRight: 6, fontSize: 13 }}>
              {tag}
            </span>
          ))}
        </div>
      </main>

      <Footer />
    </>
  );
}

export default function RelayDetailPage() {
  return (
    <Suspense fallback={
      <div style={{ textAlign: 'center', padding: '80px 20px', color: 'var(--text-dim)' }}>
        <p style={{ fontSize: 16 }}>⏳ 加载中...</p>
      </div>
    }>
      <RelayDetailContent />
    </Suspense>
  );
}
