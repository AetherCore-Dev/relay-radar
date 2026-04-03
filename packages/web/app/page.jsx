'use client';

import Link from 'next/link';
import { useState } from 'react';
import Header from './components/Header';
import Footer from './components/Footer';
import rankingsData from '../data/rankings.json';

function getScoreClass(score) {
  if (score >= 75) return 'score-high';
  if (score >= 50) return 'score-mid';
  return 'score-low';
}

function getVerdictClass(verdict) {
  if (verdict.includes('推荐')) return 'verdict-recommend';
  if (verdict.includes('可用')) return 'verdict-ok';
  if (verdict.includes('造假') || verdict.includes('欺诈')) return 'verdict-fake';
  return 'verdict-warn';
}

function getBarClass(score) {
  if (score >= 75) return 'fill-green';
  if (score >= 50) return 'fill-yellow';
  return 'fill-red';
}

function ScoreCell({ label, value }) {
  return (
    <td>
      <div className="dim-label">{label}</div>
      <div className="dim-value">{value}</div>
      <div className="score-bar">
        <div className={`score-bar-fill ${getBarClass(value)}`} style={{ width: `${value}%` }} />
      </div>
    </td>
  );
}

export default function HomePage() {
  const [sortKey, setSortKey] = useState('overallScore');
  const [sortDir, setSortDir] = useState('desc');

  const handleSort = (key) => {
    if (sortKey === key) {
      setSortDir(prev => prev === 'desc' ? 'asc' : 'desc');
    } else {
      setSortKey(key);
      setSortDir('desc');
    }
  };

  const relays = [...rankingsData.relays].sort((a, b) => {
    const dimensionKeys = ['latency', 'stability', 'authenticity', 'pricing', 'transparency'];
    let aVal, bVal;
    if (sortKey === 'overallScore') {
      aVal = a.overallScore;
      bVal = b.overallScore;
    } else if (sortKey === 'pricingMultiplier') {
      aVal = a.details.pricingMultiplier;
      bVal = b.details.pricingMultiplier;
    } else if (dimensionKeys.includes(sortKey)) {
      aVal = a.dimensions[sortKey];
      bVal = b.dimensions[sortKey];
    } else {
      aVal = a.overallScore;
      bVal = b.overallScore;
    }
    return sortDir === 'desc' ? bVal - aVal : aVal - bVal;
  });

  const updatedAt = new Date(rankingsData.generatedAt).toLocaleDateString('zh-CN', {
    year: 'numeric', month: 'long', day: 'numeric',
  });

  const total = relays.length;
  const fakeCount = relays.filter(r => r.details.verificationVerdict === 'fake' || r.details.verificationVerdict === 'suspicious').length;
  const avgMultiplier = Math.round(relays.reduce((s, r) => s + r.details.pricingMultiplier, 0) / total * 100);
  const bestRelay = [...relays].sort((a, b) => (b.dimensions.pricing + b.dimensions.authenticity) - (a.dimensions.pricing + a.dimensions.authenticity))[0];

  const sortArrow = (key) => {
    if (sortKey !== key) return '';
    return sortDir === 'desc' ? ' ↓' : ' ↑';
  };

  return (
    <>
      <Header />

      <main className="container">
        <div className="demo-banner">
          <strong>🚧 演示数据</strong> — 下面的排名是示例，不是真实测试结果。真实数据即将发布。
        </div>

        <section className="hero">
          <h1>你买的Opus，真的是Opus吗？</h1>
          <div className="explainer-card">💡 中转站 = 帮你转发 AI 模型请求的第三方服务。国内用户常通过中转站访问 Claude 和 GPT。</div>
          <p className="hero-subtitle">帮你验模型真假 · 揪出偷偷多收的钱 · 独立第三方</p>
          <span className="update-badge">📅 {updatedAt} 更新 · {rankingsData.testServer}</span>
        </section>

        <section className="value-prop">
          <div className="value-prop-two">
            <div className="vp-card">
              <div className="vp-card-icon">🔬</div>
              <div className="vp-card-title">模型是真的吗？</div>
              <div className="vp-card-desc">付了Opus的钱，收到的却是Sonnet。行为指纹一测便知。</div>
              <div className="vp-card-detail">
                <span className="vp-badge vp-badge-green">盲测准确率 98%</span>
                <span className="vp-badge">参考 <a href="https://www.usenix.org/conference/usenixsecurity25" target="_blank" rel="noopener">USENIX Security 2025</a></span>
              </div>
            </div>
            <div className="vp-card">
              <div className="vp-card-icon">💰</div>
              <div className="vp-card-title">有没有多收钱？</div>
              <div className="vp-card-desc">偷注Prompt虚增Token、缓存按原价收费？逐笔审计，一笔不漏。</div>
              <div className="vp-card-detail">
                <span className="vp-badge vp-badge-yellow">逐笔审计</span>
                <span className="vp-badge">参考 <a href="https://arxiv.org/abs/2410.19406" target="_blank" rel="noopener">ICLR 2025</a></span>
              </div>
            </div>
          </div>
          <p style={{ fontSize: 12, color: 'var(--text-dim)', marginTop: 16, textAlign: 'center' }}>
            支持检测：Claude Opus 4.6/4.5 · Sonnet 4.6/4.5 · Haiku 4.5/3.5 · GPT-4o（更多持续添加）
          </p>
        </section>

        <section style={{ padding: '20px 0' }}>
          <div className="findings-grid">
            <div className="finding-card finding-red">
              <div className="finding-icon">🚨</div>
              <div className="finding-title">{fakeCount}/{total}家 模型造假</div>
              <div className="finding-desc">付了Opus的钱，给的是Sonnet</div>
            </div>
            <div className="finding-card finding-yellow">
              <div className="finding-icon">💸</div>
              <div className="finding-title">平均多收 {avgMultiplier}%</div>
              <div className="finding-desc">偷偷注入Prompt、虚增Token</div>
            </div>
            <div className="finding-card finding-green">
              <div className="finding-icon">🏆</div>
              <div className="finding-title">最靠谱的</div>
              <div className="finding-desc">{bestRelay.name}</div>
            </div>
          </div>
        </section>

        <div className="ranking-table-wrap">
          <table className="ranking-table">
            <thead>
              <tr>
                <th>#</th>
                <th>中转站</th>
                <th onClick={() => handleSort('overallScore')} style={{ cursor: 'pointer' }}>
                  总分{sortArrow('overallScore')}
                </th>
                <th onClick={() => handleSort('latency')} style={{ cursor: 'pointer' }}>
                  延迟{sortArrow('latency')}
                </th>
                <th onClick={() => handleSort('stability')} style={{ cursor: 'pointer' }}>
                  稳定{sortArrow('stability')}
                </th>
                <th onClick={() => handleSort('authenticity')} style={{ cursor: 'pointer' }}>
                  真实{sortArrow('authenticity')}
                </th>
                <th onClick={() => handleSort('pricing')} style={{ cursor: 'pointer' }}>
                  计费{sortArrow('pricing')}
                </th>
                <th onClick={() => handleSort('pricingMultiplier')} style={{ cursor: 'pointer' }}>
                  价格倍率{sortArrow('pricingMultiplier')}
                </th>
              </tr>
            </thead>
            <tbody>
              {relays.map((relay, idx) => {
                const rank = idx + 1;
                const rankClass = rank <= 3 ? `rank-num top${rank}` : 'rank-num';
                return (
                  <tr key={relay.id} className="ranking-row">
                    <td><div className={rankClass}>{rank}</div></td>
                    <td>
                      <Link href={`/relay/?id=${relay.id}`}>
                        <div className="relay-name">{relay.name}</div>
                      </Link>
                      <span className={`relay-verdict ${getVerdictClass(relay.verdict)}`}>
                        {relay.verdict}
                      </span>
                      <div style={{ marginTop: 6 }}>
                        {relay.tags?.map((tag, i) => (
                          <span key={i} className={`tag ${tag.includes('❌') || tag.includes('⚠️') ? 'tag-warn' : ''}`}>
                            {tag}
                          </span>
                        ))}
                      </div>
                      <div style={{ marginTop: 4 }}>
                        {relay.details.modelsAvailable?.map(m => (
                          <span key={m} className="model-tag">
                            {m.replace('claude-', '').replace('3.5-', '')}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td>
                      <div className={`score-overall ${getScoreClass(relay.overallScore)}`}>
                        {relay.overallScore}
                      </div>
                    </td>
                    <ScoreCell label="延迟" value={relay.dimensions.latency} />
                    <ScoreCell label="稳定" value={relay.dimensions.stability} />
                    <ScoreCell label="真实" value={relay.dimensions.authenticity} />
                    <ScoreCell label="计费" value={relay.dimensions.pricing} />
                    <td>
                      <div className="dim-value" title={relay.details.pricingMultiplier <= 1 ? '低于官方定价，可能存在模型替换风险' : ''}>
                        {relay.details.pricingMultiplier <= 1 ? '⚠️ ' : ''}
                        {Math.round(relay.details.pricingMultiplier * 100)}%
                      </div>
                      <div className="dim-label">官方价</div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <section style={{ padding: '20px 0' }}>
          <h2 style={{ fontSize: 18, marginBottom: 12 }}>📖 我们怎么打分</h2>
          <div className="radar-grid">
            <div className="stat-card">
              <h3>🔬 模型真假 (30%)</h3>
              <p style={{ fontSize: 13, color: 'var(--text-dim)' }}>付了Opus，给的真是Opus？</p>
            </div>
            <div className="stat-card">
              <h3>💰 计费准确度 (25%)</h3>
              <p style={{ fontSize: 13, color: 'var(--text-dim)' }}>Token计数有没有虚增？</p>
            </div>
            <div className="stat-card">
              <h3>🛡️ 服务稳定性 (20%)</h3>
              <p style={{ fontSize: 13, color: 'var(--text-dim)' }}>7天可用率实测</p>
            </div>
            <div className="stat-card">
              <h3>⚡ 响应速度 (15%)</h3>
              <p style={{ fontSize: 13, color: 'var(--text-dim)' }}>首字延迟 + 吞吐量</p>
            </div>
            <div className="stat-card">
              <h3>🔍 运营透明度 (10%)</h3>
              <p style={{ fontSize: 13, color: 'var(--text-dim)' }}>公开定价、状态页、退款政策</p>
            </div>
          </div>
        </section>

        <section style={{ padding: '20px 0' }}>
          <h2 style={{ fontSize: 18, marginBottom: 16 }}>🏅 单项排名</h2>
          <div className="mini-rankings-grid">
            {['authenticity', 'pricing', 'stability', 'latency', 'transparency'].map(dim => {
              const labels = {
                authenticity: '🔬 最真',
                pricing: '💰 最省',
                stability: '🛡️ 最稳',
                latency: '⚡ 最快',
                transparency: '🔍 最透明',
              };
              const sorted = [...relays].sort((a, b) => b.dimensions[dim] - a.dimensions[dim]);
              return (
                <div key={dim} className="mini-ranking-card">
                  <h4>{labels[dim]}</h4>
                  <ol className="mini-ranking-list">
                    {sorted.map((r, i) => (
                      <li key={r.id}>
                        <span className="mini-rank">#{i + 1}</span>
                        <span>{r.name}</span>
                        <span className={getScoreClass(r.dimensions[dim])}>{r.dimensions[dim]}</span>
                      </li>
                    ))}
                  </ol>
                </div>
              );
            })}
          </div>
        </section>

        <section className="cta-section">
          <h2 style={{ fontSize: 22, marginBottom: 8 }}>现在就验你的中转站</h2>
          <p style={{ color: 'var(--text-dim)', marginBottom: 20, fontSize: 14 }}>一行命令，零注册</p>
          <div className="cta-methods">
            <div className="cta-method">
              <div className="cta-method-badge" style={{ color: 'var(--green)' }}>⭐ 推荐</div>
              <div style={{ fontFamily: 'monospace', fontSize: 14, background: 'var(--bg)', padding: '8px 14px', borderRadius: 6, margin: '8px 0' }}>npx relay-radar monitor</div>
              <div style={{ fontSize: 12, color: 'var(--text-dim)' }}>在你正常使用Claude Code的过程中完成检测</div>
              <div style={{ fontSize: 12, color: 'var(--text-dim)' }}>不影响工作流 · 约6,000 tokens ≈ ¥0.2</div>
            </div>
            <div className="cta-method">
              <div className="cta-method-badge">快速检测</div>
              <div style={{ fontFamily: 'monospace', fontSize: 14, background: 'var(--bg)', padding: '8px 14px', borderRadius: 6, margin: '8px 0' }}>npx relay-radar verify</div>
              <div style={{ fontSize: 12, color: 'var(--text-dim)' }}>发送8个专业检测题，几分钟出结果</div>
              <div style={{ fontSize: 12, color: 'var(--text-dim)' }}>约4,000 tokens ≈ ¥0.15</div>
            </div>
          </div>
          <div style={{ marginTop: 20, display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
            <a href="https://github.com/AetherCore-Dev/relay-radar" target="_blank" rel="noopener" className="cta-btn cta-primary">GitHub →</a>
            <Link href="/tools/" className="cta-btn cta-secondary">算一笔账</Link>
          </div>
        </section>
      </main>

      <Footer />
    </>
  );
}
