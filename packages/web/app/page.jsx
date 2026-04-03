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
        <section className="hero">
          <h1>你的中转站，用的是真模型吗？</h1>
          <p className="hero-subtitle">我们自己掏钱买、自己测、帮你排雷</p>
          <span className="update-badge">📅 {updatedAt} 更新 · {rankingsData.testServer}</span>
        </section>

        <section className="value-prop">
          <h2>自测鉴别真伪，准确度98%</h2>
          <p className="value-prop-sub">发正常请求就能验 · 中转站检测不到 · 数据公开透明</p>
          <div className="value-prop-stats">
            <div className="vp-stat">
              <div className="vp-num">98%</div>
              <div className="vp-label">验真准确率</div>
            </div>
            <div className="vp-stat">
              <div className="vp-num">隐蔽</div>
              <div className="vp-label">中转站无法检测</div>
            </div>
            <div className="vp-stat">
              <div className="vp-num">免费</div>
              <div className="vp-label">开源MIT协议</div>
            </div>
          </div>
        </section>

        <section style={{ padding: '20px 0' }}>
          <div className="findings-grid">
            <div className="finding-card finding-red">
              <div className="finding-icon">🚨</div>
              <div className="finding-title">{fakeCount}/{total}家 有问题</div>
              <div className="finding-desc">模型不是你买的那个</div>
            </div>
            <div className="finding-card finding-yellow">
              <div className="finding-icon">💰</div>
              <div className="finding-title">平均贵 {avgMultiplier}%</div>
              <div className="finding-desc">相比官方价</div>
            </div>
            <div className="finding-card finding-green">
              <div className="finding-icon">🏆</div>
              <div className="finding-title">最靠谱的</div>
              <div className="finding-desc">{bestRelay.name}</div>
            </div>
          </div>
        </section>

        <div className="demo-banner">
          <strong>📋 演示数据</strong> — 以下为系统功能演示，非真实中转站排名。
          真实评测数据即将上线，您也可以运行 <code>npx relay-radar rank</code> 评测自己的中转站。
        </div>

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
                      <div className="dim-value">
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
              <h3>🔬 模型真不真 (30%)</h3>
              <p style={{ fontSize: 13, color: 'var(--text-dim)' }}>你买的Opus，给的真是Opus吗？</p>
            </div>
            <div className="stat-card">
              <h3>💰 收费准不准 (25%)</h3>
              <p style={{ fontSize: 13, color: 'var(--text-dim)' }}>有没有偷偷多算Token？</p>
            </div>
            <div className="stat-card">
              <h3>🛡️ 稳不稳 (20%)</h3>
              <p style={{ fontSize: 13, color: 'var(--text-dim)' }}>会不会动不动就挂？</p>
            </div>
            <div className="stat-card">
              <h3>⚡ 快不快 (15%)</h3>
              <p style={{ fontSize: 13, color: 'var(--text-dim)' }}>响应速度怎么样？</p>
            </div>
            <div className="stat-card">
              <h3>🔍 透不透明 (10%)</h3>
              <p style={{ fontSize: 13, color: 'var(--text-dim)' }}>定价公开吗？有退款吗？</p>
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
      </main>

      <Footer />
    </>
  );
}
