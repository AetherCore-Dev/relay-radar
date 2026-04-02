import Link from 'next/link';

export default function AboutPage() {
  return (
    <>
      <header className="header">
        <div className="container">
          <Link href="/" className="header-logo">🛰️ RelayRadar</Link>
          <nav className="header-nav">
            <Link href="/">排名</Link>
            <Link href="/tools/">工具</Link>
            <Link href="/about/">关于</Link>
          </nav>
        </div>
      </header>

      <main className="container" style={{ maxWidth: 700, padding: '40px 20px' }}>
        <h1 style={{ fontSize: 28, marginBottom: 24 }}>关于 RelayRadar</h1>

        <section className="stat-card" style={{ marginBottom: 24 }}>
          <h3 style={{ marginBottom: 12 }}>🛰️ 我们是什么</h3>
          <p style={{ fontSize: 14, color: 'var(--text-dim)', lineHeight: 1.8 }}>
            RelayRadar 是一个独立的第三方 AI API 中转站质量评测平台。
            我们通过自动化测试工具，从延迟、稳定性、模型真实性、计费准确性、透明度五个维度，
            对各家中转站进行持续监测和评分，帮助开发者做出更明智的选择。
          </p>
        </section>

        <section className="stat-card" style={{ marginBottom: 24 }}>
          <h3 style={{ marginBottom: 12 }}>🔬 测试方法论</h3>
          <div style={{ fontSize: 14, color: 'var(--text-dim)', lineHeight: 1.8 }}>
            <p><strong>测试服务器:</strong> 阿里云香港（CN2直连大陆）</p>
            <p><strong>测试频率:</strong> 每日自动运行，多时段采样</p>
            <p><strong>探测方法:</strong> 每家中转站进行 2轮预热 + 5轮正式测试</p>
            <p><strong>模型验真:</strong> 8维指纹题库交叉验证（推理深度、延迟画像、代码质量、思维陷阱、中文能力、Token计数、响应长度、自我认知）</p>
            <p><strong>计费审计:</strong> 发送已知输入，比对API返回的Token数量是否准确；检测隐藏System Prompt注入</p>
            <p><strong>数据来源:</strong> 全部由我们自行购买各家中转站服务并测试，不收集任何用户数据</p>
          </div>
        </section>

        <section className="stat-card" style={{ marginBottom: 24 }}>
          <h3 style={{ marginBottom: 12 }}>📊 评分体系</h3>
          <table style={{ width: '100%', fontSize: 14, borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ color: 'var(--text-dim)', fontSize: 12, borderBottom: '1px solid var(--border)' }}>
                <th style={{ textAlign: 'left', padding: '8px 0' }}>维度</th>
                <th style={{ textAlign: 'center' }}>权重</th>
                <th style={{ textAlign: 'left' }}>说明</th>
              </tr>
            </thead>
            <tbody style={{ color: 'var(--text-dim)' }}>
              <tr style={{ borderBottom: '1px solid var(--border)' }}>
                <td style={{ padding: '10px 0' }}>⚡ 延迟</td>
                <td style={{ textAlign: 'center' }}>20%</td>
                <td>TTFT + P50/P95总延迟</td>
              </tr>
              <tr style={{ borderBottom: '1px solid var(--border)' }}>
                <td style={{ padding: '10px 0' }}>🛡️ 稳定性</td>
                <td style={{ textAlign: 'center' }}>20%</td>
                <td>7天错误率 + 可用时间</td>
              </tr>
              <tr style={{ borderBottom: '1px solid var(--border)' }}>
                <td style={{ padding: '10px 0' }}>🔬 真实性</td>
                <td style={{ textAlign: 'center' }}>25%</td>
                <td>8维指纹验真，最高权重</td>
              </tr>
              <tr style={{ borderBottom: '1px solid var(--border)' }}>
                <td style={{ padding: '10px 0' }}>💰 计费</td>
                <td style={{ textAlign: 'center' }}>20%</td>
                <td>Token准确性 + 注入检测</td>
              </tr>
              <tr>
                <td style={{ padding: '10px 0' }}>🔍 透明度</td>
                <td style={{ textAlign: 'center' }}>15%</td>
                <td>公开定价 + 状态页 + 退款</td>
              </tr>
            </tbody>
          </table>
        </section>

        <section className="stat-card" style={{ marginBottom: 24 }}>
          <h3 style={{ marginBottom: 12 }}>🔒 隐私与安全</h3>
          <div style={{ fontSize: 14, color: 'var(--text-dim)', lineHeight: 1.8 }}>
            <p>✅ 本站不收集任何用户的API Key</p>
            <p>✅ 本站不收集任何用户的个人信息</p>
            <p>✅ 所有评测数据来自我们自己购买的测试账户</p>
            <p>✅ 开源CLI工具完全在用户本地运行，不联网上传</p>
            <p>✅ 网站不使用任何追踪脚本（无Google Analytics等）</p>
          </div>
        </section>

        <section className="warning-box" style={{ marginBottom: 24 }}>
          <h3>⚖️ 免责声明</h3>
          <ol style={{ paddingLeft: 20, lineHeight: 2 }}>
            <li>本站仅提供技术评测信息，不提供任何API中转服务。</li>
            <li>使用第三方API中转服务的合规性由用户自行判断和承担。</li>
            <li>评测数据基于自动化测试，可能与您的实际体验有差异。</li>
            <li>部分链接可能为推广链接，但不影响评分排名结果。推广链接会明确标注。</li>
            <li>本站不收集用户的API Key或任何个人身份信息。</li>
            <li>评测结果仅供参考，不构成任何投资或购买建议。</li>
            <li>中转站服务质量可能随时变化，排名反映的是测试时的状态。</li>
          </ol>
        </section>

        <section className="stat-card" style={{ marginBottom: 24 }}>
          <h3 style={{ marginBottom: 12 }}>🛠️ 开源工具</h3>
          <div style={{ fontSize: 14, color: 'var(--text-dim)', lineHeight: 1.8 }}>
            <p>我们同时提供开源的命令行工具，让你在自己的机器上验证中转站质量：</p>
            <pre style={{ background: 'var(--bg)', padding: 16, borderRadius: 8, marginTop: 12, fontSize: 13, overflowX: 'auto' }}>
{`# 不需要API Key的命令
npx relay-radar scan    # 扫描本地用量
npx relay-radar tips    # 省钱妙招
npx relay-radar ping <url>  # 测试连接

# 需要API Key的命令（纯本地运行）
npx relay-radar monitor # ⭐推荐 被动行为指纹验证
npx relay-radar verify  # 主动探针验证
npx relay-radar rank    # 综合排名`}
            </pre>
            <p style={{ marginTop: 12 }}>
              GitHub: <a href="https://github.com/AetherCore-Dev/relay-radar" target="_blank" rel="noopener">github.com/AetherCore-Dev/relay-radar</a>
            </p>
          </div>
        </section>

        <section className="stat-card">
          <h3 style={{ marginBottom: 12 }}>📬 联系</h3>
          <p style={{ fontSize: 14, color: 'var(--text-dim)' }}>
            如有问题、建议或合作意向，请通过 GitHub Issues 联系我们。
          </p>
        </section>
      </main>

      <footer className="footer">
        <div className="container">
          <p>RelayRadar — 独立第三方AI中转站质量评测</p>
        </div>
      </footer>
    </>
  );
}
