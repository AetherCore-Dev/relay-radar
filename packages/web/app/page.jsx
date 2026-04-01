import Link from 'next/link';
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
    <td className="hide-mobile">
      <div className="dim-label">{label}</div>
      <div className="dim-value">{value}</div>
      <div className="score-bar">
        <div className={`score-bar-fill ${getBarClass(value)}`} style={{ width: `${value}%` }} />
      </div>
    </td>
  );
}

export default function HomePage() {
  const relays = rankingsData.relays.sort((a, b) => b.overallScore - a.overallScore);
  const updatedAt = new Date(rankingsData.generatedAt).toLocaleDateString('zh-CN', {
    year: 'numeric', month: 'long', day: 'numeric',
  });

  return (
    <>
      <header className="header">
        <div className="container">
          <Link href="/" className="header-logo">🛰️ RelayRadar</Link>
          <nav className="header-nav">
            <Link href="/">排名</Link>
            <Link href="/tools/">工具</Link>
            <Link href="/about/">关于</Link>
            <a href="https://github.com/xxx/relay-radar" target="_blank" rel="noopener">GitHub</a>
          </nav>
        </div>
      </header>

      <main className="container">
        <section className="hero">
          <h1>AI中转站质量排名</h1>
          <p>独立第三方评测 · 数据每日自动更新 · 多维度综合评分</p>
          <span className="update-badge">📅 最近更新: {updatedAt} · 来自: {rankingsData.testServer}</span>
        </section>

        <table className="ranking-table">
          <thead>
            <tr>
              <th>#</th>
              <th>中转站</th>
              <th>总分</th>
              <th className="hide-mobile">延迟</th>
              <th className="hide-mobile">稳定</th>
              <th className="hide-mobile">真实</th>
              <th className="hide-mobile">计费</th>
              <th>价格倍率</th>
            </tr>
          </thead>
          <tbody>
            {relays.map((relay, idx) => {
              const rank = idx + 1;
              const rankClass = rank <= 3 ? `rank-num top${rank}` : 'rank-num';
              return (
                <tr key={relay.id} className="ranking-row" onClick={() => {}}>
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

        <section style={{ padding: '20px 0' }}>
          <h2 style={{ fontSize: 18, marginBottom: 12 }}>📖 评分说明</h2>
          <div className="radar-grid">
            <div className="stat-card">
              <h3>⚡ 延迟 (20%)</h3>
              <p style={{ fontSize: 13, color: 'var(--text-dim)' }}>TTFT + P50/P95总延迟。从香港测试服务器测量，每日多时段采样。</p>
            </div>
            <div className="stat-card">
              <h3>🛡️ 稳定性 (20%)</h3>
              <p style={{ fontSize: 13, color: 'var(--text-dim)' }}>7天错误率 + 可用时间。包含流式传输支持加分。</p>
            </div>
            <div className="stat-card">
              <h3>🔬 真实性 (25%)</h3>
              <p style={{ fontSize: 13, color: 'var(--text-dim)' }}>8维指纹验真。通过推理深度、延迟画像、代码质量等交叉验证模型是否为声称的型号。权重最高。</p>
            </div>
            <div className="stat-card">
              <h3>💰 计费 (20%)</h3>
              <p style={{ fontSize: 13, color: 'var(--text-dim)' }}>Token计数准确性 + System Prompt注入检测。发送已知输入，比对返回的token数。</p>
            </div>
            <div className="stat-card">
              <h3>🔍 透明度 (15%)</h3>
              <p style={{ fontSize: 13, color: 'var(--text-dim)' }}>是否公开定价、是否有状态页、是否有退款政策、是否提供客户端源码。</p>
            </div>
          </div>
        </section>
      </main>

      <footer className="footer">
        <div className="container">
          <p>RelayRadar — 独立第三方AI中转站质量评测</p>
          <p style={{ marginTop: 8 }}>
            本站不提供API中转服务 · 评测数据基于自动化测试 · <Link href="/about/">免责声明</Link>
          </p>
          <p style={{ marginTop: 8 }}>
            <a href="https://github.com/xxx/relay-radar">GitHub</a> · 开源 MIT 协议
          </p>
        </div>
      </footer>
    </>
  );
}
