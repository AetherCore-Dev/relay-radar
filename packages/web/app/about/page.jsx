import Header from '../components/Header';
import Footer from '../components/Footer';

export default function AboutPage() {
  return (
    <>
      <Header />

      <main className="container" style={{ maxWidth: 700, padding: '40px 20px' }}>
        <h1 style={{ fontSize: 28, marginBottom: 24 }}>关于 RelayRadar</h1>

        {/* 简介 */}
        <section className="stat-card" style={{ marginBottom: 24 }}>
          <h3 style={{ marginBottom: 12 }}>🛰️ 我们是什么</h3>
          <p style={{ fontSize: 14, color: 'var(--text-dim)', lineHeight: 1.8 }}>
            RelayRadar 帮你测中转站靠不靠谱。
            独立第三方，自费买号测试，不收任何中转站的钱。
          </p>
        </section>

        {/* FAQ — 放最前面 */}
        <section className="stat-card" style={{ marginBottom: 24 }}>
          <h3 style={{ marginBottom: 12 }}>❓ 常见问题</h3>
          <div style={{ fontSize: 14, color: 'var(--text-dim)', lineHeight: 1.8 }}>
            <details style={{ marginBottom: 12, cursor: 'pointer' }}>
              <summary style={{ fontWeight: 'bold', padding: '8px 0' }}>会不会偷我的Key？</summary>
              <p style={{ padding: '8px 0 8px 16px' }}>
                不会。我们不收集任何用户的Key。
                网站没有追踪脚本。
                CLI工具在你本地跑，不联网上传。
                代码全开源，随时可以查。
              </p>
            </details>

            <details style={{ marginBottom: 12, cursor: 'pointer' }}>
              <summary style={{ fontWeight: 'bold', padding: '8px 0' }}>什么是中转站？</summary>
              <p style={{ padding: '8px 0 8px 16px' }}>
                就是API转发服务。
                国内直连Claude不稳定，中转站帮你转一道。
                但有些中转站会偷换模型、多收钱。
              </p>
            </details>

            <details style={{ marginBottom: 12, cursor: 'pointer' }}>
              <summary style={{ fontWeight: 'bold', padding: '8px 0' }}>98%准确率怎么来的？</summary>
              <p style={{ padding: '8px 0 8px 16px' }}>
                每个模型发100组标准请求。
                收集响应后做15维特征统计。
                100组盲测里正确识别了98组。
                方法参考了行为指纹等学术研究。
              </p>
            </details>

            <details style={{ marginBottom: 12, cursor: 'pointer' }}>
              <summary style={{ fontWeight: 'bold', padding: '8px 0' }}>为什么需要中转站？</summary>
              <p style={{ padding: '8px 0 8px 16px' }}>
                大陆直连海外API不稳定。
                中转站提供更快更稳的连接。
                但约40%中转站有问题。
                所以你需要先验一下。
              </p>
            </details>

            <details style={{ marginBottom: 12, cursor: 'pointer' }}>
              <summary style={{ fontWeight: 'bold', padding: '8px 0' }}>低于官方价的中转站安全吗？</summary>
              <p style={{ padding: '8px 0 8px 16px' }}>
                大概率有问题。
                API成本是固定的，低价=亏钱或换模型。
                常见：用Sonnet冒充Opus。
              </p>
            </details>

            <details style={{ marginBottom: 12, cursor: 'pointer' }}>
              <summary style={{ fontWeight: 'bold', padding: '8px 0' }}>什么是"随机换模型"？</summary>
              <p style={{ padding: '8px 0 8px 16px' }}>
                高峰期偷偷把Opus换成Sonnet。
                你会觉得"有时好用有时不行"。
                我们的指纹检测能发现这种行为。
              </p>
            </details>

            <details style={{ marginBottom: 12, cursor: 'pointer' }}>
              <summary style={{ fontWeight: 'bold', padding: '8px 0' }}>什么是偷加Prompt多收费？</summary>
              <p style={{ padding: '8px 0 8px 16px' }}>
                有些中转站偷偷加隐藏Prompt。
                这样Token数变多，你就多付钱了。
                我们用已知长度的请求来检测。
              </p>
            </details>

            <details style={{ marginBottom: 12, cursor: 'pointer' }}>
              <summary style={{ fontWeight: 'bold', padding: '8px 0' }}>数据多久更新？</summary>
              <p style={{ padding: '8px 0 8px 16px' }}>
                指纹画像每周自动校准。
                排名数据每日更新。
              </p>
            </details>

            <details style={{ marginBottom: 12, cursor: 'pointer' }}>
              <summary style={{ fontWeight: 'bold', padding: '8px 0' }}>能自己验证吗？</summary>
              <p style={{ padding: '8px 0 8px 16px' }}>
                可以！跑 <code>npx relay-radar monitor</code> 被动验证。
                或者 <code>npx relay-radar verify</code> 主动探测。
              </p>
            </details>

            <details style={{ marginBottom: 12, cursor: 'pointer' }}>
              <summary style={{ fontWeight: 'bold', padding: '8px 0' }}>你们和中转站有利益关系吗？</summary>
              <p style={{ padding: '8px 0 8px 16px' }}>
                没有。自费买号，不接受赞助。
                代码开源可审计。
              </p>
            </details>

            <details style={{ marginBottom: 12, cursor: 'pointer' }}>
              <summary style={{ fontWeight: 'bold', padding: '8px 0' }}>怎么推荐中转站参与评测？</summary>
              <p style={{ padding: '8px 0 8px 16px' }}>
                去GitHub Issues提交就行。
              </p>
            </details>
          </div>
        </section>

        {/* 评测方法论 */}
        <section className="stat-card" style={{ marginBottom: 24 }}>
          <h3 style={{ marginBottom: 12 }}>📊 怎么测的</h3>
          <div style={{ fontSize: 14, color: 'var(--text-dim)', lineHeight: 1.8 }}>
            <p><strong>服务器:</strong> 阿里云香港（直连大陆）</p>
            <p><strong>频率:</strong> 每天自动跑，多时段采样</p>
            <p><strong>方法:</strong> 2轮预热 + 5轮正式测试</p>
            <p><strong>验真:</strong> 8维指纹题交叉验证</p>
            <p><strong>查账:</strong> 发已知请求，看返回Token数对不对</p>
            <p><strong>数据:</strong> 自费买号测试，不收集用户数据</p>
          </div>

          <div style={{
            marginTop: 16,
            padding: 16,
            borderRadius: 8,
            border: '1px solid #22c55e',
            background: 'rgba(34, 197, 94, 0.08)',
          }}>
            <h4 style={{ fontSize: 14, marginBottom: 8, color: '#22c55e' }}>📄 验真方法</h4>
            <ul style={{ fontSize: 13, color: 'var(--text-dim)', lineHeight: 1.8, paddingLeft: 20 }}>
              <li>行为指纹识别</li>
              <li>推理深度分析</li>
              <li>响应速度画像</li>
              <li>校准数据集比对</li>
            </ul>
            <p style={{ fontSize: 14, marginTop: 8, color: '#22c55e', fontWeight: 'bold' }}>
              盲测准确率: 98%（100组测试对了98组）
            </p>
          </div>
        </section>

        {/* 评分权重 */}
        <section className="stat-card" style={{ marginBottom: 24 }}>
          <h3 style={{ marginBottom: 12 }}>📊 评分权重</h3>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', fontSize: 14, borderCollapse: 'collapse', minWidth: 400 }}>
              <thead>
                <tr style={{ color: 'var(--text-dim)', fontSize: 12, borderBottom: '1px solid var(--border)' }}>
                  <th style={{ textAlign: 'left', padding: '8px 0' }}>维度</th>
                  <th style={{ textAlign: 'center' }}>权重</th>
                  <th style={{ textAlign: 'left' }}>说明</th>
                </tr>
              </thead>
              <tbody style={{ color: 'var(--text-dim)' }}>
                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={{ padding: '10px 0' }}>🔬 模型真不真</td>
                  <td style={{ textAlign: 'center' }}>30%</td>
                  <td>8维指纹验真，权重最高</td>
                </tr>
                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={{ padding: '10px 0' }}>💰 收费准不准</td>
                  <td style={{ textAlign: 'center' }}>25%</td>
                  <td>有没有多算钱 + 偷加Prompt检测</td>
                </tr>
                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={{ padding: '10px 0' }}>🛡️ 稳不稳</td>
                  <td style={{ textAlign: 'center' }}>20%</td>
                  <td>7天错误率 + 在线时间</td>
                </tr>
                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={{ padding: '10px 0' }}>⚡ 快不快</td>
                  <td style={{ textAlign: 'center' }}>15%</td>
                  <td>首字延迟 + 响应速度</td>
                </tr>
                <tr>
                  <td style={{ padding: '10px 0' }}>🔍 透不透明</td>
                  <td style={{ textAlign: 'center' }}>10%</td>
                  <td>公开定价 + 状态页 + 退款</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        {/* 开源工具 */}
        <section className="stat-card" style={{ marginBottom: 24 }}>
          <h3 style={{ marginBottom: 12 }}>🛠️ 开源工具</h3>
          <div style={{ fontSize: 14, color: 'var(--text-dim)', lineHeight: 1.8 }}>
            <p>命令行工具，在你自己电脑上验证：</p>
            <pre style={{ background: 'var(--bg)', padding: 16, borderRadius: 8, marginTop: 12, fontSize: 13, overflowX: 'auto' }}>
{`# 不需要Key
npx relay-radar scan    # 扫描本地用量
npx relay-radar tips    # 省钱妙招
npx relay-radar ping <url>  # 测连接

# 需要Key（纯本地运行）
npx relay-radar monitor # 被动指纹验证
npx relay-radar verify  # 主动探针验证
npx relay-radar rank    # 综合排名`}
            </pre>
            <p style={{ marginTop: 12 }}>
              GitHub: <a href="https://github.com/AetherCore-Dev/relay-radar" target="_blank" rel="noopener">github.com/AetherCore-Dev/relay-radar</a>
            </p>

            <div style={{
              marginTop: 20,
              padding: 16,
              borderRadius: 8,
              border: '1px solid var(--border)',
              background: 'var(--bg)',
            }}>
              <h4 style={{ fontSize: 14, marginBottom: 12 }}>🪟 Windows 安装</h4>
              <ol style={{ fontSize: 13, color: 'var(--text-dim)', lineHeight: 2, paddingLeft: 20 }}>
                <li>装 Node.js 18+（<a href="https://nodejs.org" target="_blank" rel="noopener">nodejs.org</a>）</li>
                <li>打开 PowerShell</li>
                <li>验证: <code>node --version</code></li>
                <li>跑: <code>npx relay-radar scan</code></li>
                <li>验证中转站:
                  <pre style={{ background: 'var(--bg-alt, #1a1a2e)', padding: 12, borderRadius: 6, marginTop: 8, fontSize: 12, overflowX: 'auto' }}>
{`$env:RELAY_KEY="sk-xxx"
npx relay-radar verify`}
                  </pre>
                </li>
              </ol>
            </div>
          </div>
        </section>

        {/* 团队 */}
        <section className="stat-card" style={{ marginBottom: 24 }}>
          <h3 style={{ marginBottom: 12 }}>👥 团队</h3>
          <p style={{ fontSize: 14, color: 'var(--text-dim)', lineHeight: 1.8 }}>
            一群独立开发者，自费买号测试。
            不接受中转站赞助，代码全开源。
          </p>
        </section>

        {/* 隐私与安全 */}
        <section className="stat-card" style={{ marginBottom: 24 }}>
          <h3 style={{ marginBottom: 12 }}>🔒 隐私</h3>
          <div style={{ fontSize: 14, color: 'var(--text-dim)', lineHeight: 1.8 }}>
            <p>✅ 不收集你的Key</p>
            <p>✅ 不收集个人信息</p>
            <p>✅ 测试数据来自我们自己买的号</p>
            <p>✅ CLI工具纯本地运行</p>
            <p>✅ 没有追踪脚本</p>
          </div>
        </section>

        {/* 免责声明 */}
        <section className="warning-box" style={{ marginBottom: 24 }}>
          <h3>⚖️ 免责声明</h3>
          <ol style={{ paddingLeft: 20, lineHeight: 2 }}>
            <li>本站只做评测，不提供中转服务。</li>
            <li>用中转站的合规性由你自行判断。</li>
            <li>评测基于自动化测试，可能和你的体验有差异。</li>
            <li>部分链接可能是推广链接，但不影响排名。推广链接会标注。</li>
            <li>不收集用户Key或个人信息。</li>
            <li>评测结果仅供参考。</li>
            <li>中转站质量随时可能变化。</li>
          </ol>
        </section>

        {/* 联系我们 */}
        <section className="stat-card">
          <h3 style={{ marginBottom: 12 }}>📬 联系我们</h3>
          <div style={{ fontSize: 14, color: 'var(--text-dim)', lineHeight: 2 }}>
            <p>🐛 <strong>Bug:</strong>{' '}
              <a href="https://github.com/AetherCore-Dev/relay-radar/issues" target="_blank" rel="noopener">GitHub Issues</a>
            </p>
            <p>🤝 <strong>合作:</strong>{' '}
              <a href="mailto:relay-radar@proton.me">relay-radar@proton.me</a>
            </p>
            <p>💬 <strong>社区:</strong>{' '}
              <a href="https://github.com/AetherCore-Dev/relay-radar/discussions" target="_blank" rel="noopener">GitHub Discussions</a>
            </p>
            <p>📝 <strong>推荐中转站:</strong>{' '}
              <a href="https://github.com/AetherCore-Dev/relay-radar/issues/new?template=recommend-relay.md" target="_blank" rel="noopener">提交推荐</a>
            </p>
          </div>
        </section>
      </main>

      <Footer />
    </>
  );
}
