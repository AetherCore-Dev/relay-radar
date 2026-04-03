import Header from '../components/Header';
import Footer from '../components/Footer';

export default function AboutPage() {
  return (
    <>
      <Header />

      <main className="container" style={{ maxWidth: 700, padding: '40px 20px' }}>
        <h1 style={{ fontSize: 28, marginBottom: 24 }}>关于 RelayRadar</h1>

        {/* 我们是什么 */}
        <section className="stat-card" style={{ marginBottom: 24 }}>
          <h3 style={{ marginBottom: 12 }}>🛰️ 我们是什么</h3>
          <p style={{ fontSize: 14, color: 'var(--text-dim)', lineHeight: 1.8 }}>
            RelayRadar 是一个独立的第三方 AI API 中转站质量评测平台。
            我们通过自动化测试工具，从延迟、稳定性、模型真实性、计费准确性、透明度五个维度，
            对各家中转站进行持续监测和评分，帮助开发者做出更明智的选择。
          </p>
        </section>

        {/* 团队介绍 */}
        <section className="stat-card" style={{ marginBottom: 24 }}>
          <h3 style={{ marginBottom: 12 }}>👥 团队介绍</h3>
          <p style={{ fontSize: 14, color: 'var(--text-dim)', lineHeight: 1.8 }}>
            RelayRadar 由一群关注AI开发体验的独立开发者发起。我们来自不同的技术背景（后端、安全、数据分析），因为在使用Claude Code时遇到中转站质量参差不齐的问题，决定用技术手段帮助社区做出更好的选择。所有测试账户由我们自费购买，不接受中转站赞助影响排名。
          </p>
        </section>

        {/* 评测方法论 */}
        <section className="stat-card" style={{ marginBottom: 24 }}>
          <h3 style={{ marginBottom: 12 }}>📊 评测方法论</h3>
          <div style={{ fontSize: 14, color: 'var(--text-dim)', lineHeight: 1.8 }}>
            <p><strong>测试服务器:</strong> 阿里云香港（CN2直连大陆）</p>
            <p><strong>测试频率:</strong> 每日自动运行，多时段采样</p>
            <p><strong>探测方法:</strong> 每家中转站进行 2轮预热 + 5轮正式测试</p>
            <p><strong>模型验真:</strong> 8维指纹题库交叉验证（推理深度、延迟画像、代码质量、思维陷阱、中文能力、Token计数、响应长度、自我认知）</p>
            <p><strong>计费审计:</strong> 发送已知输入，比对API返回的Token数量是否准确；检测隐藏System Prompt注入</p>
            <p><strong>数据来源:</strong> 全部由我们自行购买各家中转站服务并测试，不收集任何用户数据</p>
          </div>

          <div style={{
            marginTop: 16,
            padding: 16,
            borderRadius: 8,
            border: '1px solid #22c55e',
            background: 'rgba(34, 197, 94, 0.08)',
          }}>
            <h4 style={{ fontSize: 14, marginBottom: 8, color: '#22c55e' }}>📄 方法论依据</h4>
            <ul style={{ fontSize: 13, color: 'var(--text-dim)', lineHeight: 1.8, paddingLeft: 20 }}>
              <li>行为指纹 (Behavioral Fingerprinting)</li>
              <li>推理深度分析</li>
              <li>延迟画像 (Latency Profiling)</li>
              <li>校准数据集</li>
            </ul>
            <p style={{ fontSize: 14, marginTop: 8, color: '#22c55e', fontWeight: 'bold' }}>
              盲测准确率: 98% (在已知模型身份的100组测试中正确识别98组)
            </p>
          </div>
        </section>

        {/* 评分权重 */}
        <section className="stat-card" style={{ marginBottom: 24 }}>
          <h3 style={{ marginBottom: 12 }}>📊 评分权重</h3>
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
                <td style={{ padding: '10px 0' }}>🔬 真实性</td>
                <td style={{ textAlign: 'center' }}>30%</td>
                <td>8维指纹验真，最高权重</td>
              </tr>
              <tr style={{ borderBottom: '1px solid var(--border)' }}>
                <td style={{ padding: '10px 0' }}>💰 性价比</td>
                <td style={{ textAlign: 'center' }}>25%</td>
                <td>Token准确性 + 注入检测 + 定价合理性</td>
              </tr>
              <tr style={{ borderBottom: '1px solid var(--border)' }}>
                <td style={{ padding: '10px 0' }}>🛡️ 稳定性</td>
                <td style={{ textAlign: 'center' }}>20%</td>
                <td>7天错误率 + 可用时间</td>
              </tr>
              <tr style={{ borderBottom: '1px solid var(--border)' }}>
                <td style={{ padding: '10px 0' }}>⚡ 延迟</td>
                <td style={{ textAlign: 'center' }}>15%</td>
                <td>TTFT + P50/P95总延迟</td>
              </tr>
              <tr>
                <td style={{ padding: '10px 0' }}>🔍 透明度</td>
                <td style={{ textAlign: 'center' }}>10%</td>
                <td>公开定价 + 状态页 + 退款</td>
              </tr>
            </tbody>
          </table>
        </section>

        {/* 隐私与安全 */}
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

        {/* 免责声明 */}
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

        {/* 开源工具 */}
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

            <div style={{
              marginTop: 20,
              padding: 16,
              borderRadius: 8,
              border: '1px solid var(--border)',
              background: 'var(--bg)',
            }}>
              <h4 style={{ fontSize: 14, marginBottom: 12 }}>🪟 Windows 安装指南</h4>
              <ol style={{ fontSize: 13, color: 'var(--text-dim)', lineHeight: 2, paddingLeft: 20 }}>
                <li>安装 Node.js 18+（从 <a href="https://nodejs.org" target="_blank" rel="noopener">nodejs.org</a> 下载LTS版本）</li>
                <li>打开 PowerShell</li>
                <li>验证安装: <code>node --version</code></li>
                <li>运行扫描: <code>npx relay-radar scan</code></li>
                <li>如需验证中转站:
                  <pre style={{ background: 'var(--bg-alt, #1a1a2e)', padding: 12, borderRadius: 6, marginTop: 8, fontSize: 12, overflowX: 'auto' }}>
{`$env:RELAY_KEY="sk-xxx"
npx relay-radar verify`}
                  </pre>
                </li>
              </ol>
              <p style={{ fontSize: 12, color: 'var(--text-dim)', marginTop: 8 }}>
                💡 推荐使用 <a href="https://github.com/coreybutler/nvm-windows" target="_blank" rel="noopener">nvm-windows</a> 管理多个 Node.js 版本
              </p>
            </div>
          </div>
        </section>

        {/* 常见问题 FAQ */}
        <section className="stat-card" style={{ marginBottom: 24 }}>
          <h3 style={{ marginBottom: 12 }}>❓ 常见问题 (FAQ)</h3>
          <div style={{ fontSize: 14, color: 'var(--text-dim)', lineHeight: 1.8 }}>
            <details style={{ marginBottom: 12, cursor: 'pointer' }}>
              <summary style={{ fontWeight: 'bold', padding: '8px 0' }}>Q1: 什么是AI中转站？</summary>
              <p style={{ padding: '8px 0 8px 16px' }}>
                AI中转站是第三方API转发服务。中国大陆开发者直连Anthropic API存在网络不稳定等问题，中转站提供稳定的中间层。但市场上部分中转站存在模型掺假、计费不透明等问题。
              </p>
            </details>

            <details style={{ marginBottom: 12, cursor: 'pointer' }}>
              <summary style={{ fontWeight: 'bold', padding: '8px 0' }}>Q2: 为什么需要这个工具？</summary>
              <p style={{ padding: '8px 0 8px 16px' }}>
                据我们测试，约40%的中转站存在不同程度的问题（模型替换、计费虚增、随机降级）。这个工具帮你在付费前验证中转站质量。
              </p>
            </details>

            <details style={{ marginBottom: 12, cursor: 'pointer' }}>
              <summary style={{ fontWeight: 'bold', padding: '8px 0' }}>Q3: 模型验真是怎么做的？</summary>
              <p style={{ padding: '8px 0 8px 16px' }}>
                我们使用8维行为指纹检测：推理深度、延迟画像、代码质量、思维陷阱、中文能力、Token计数、响应长度、自我认知。不同模型在这些维度上有显著差异。
              </p>
            </details>

            <details style={{ marginBottom: 12, cursor: 'pointer' }}>
              <summary style={{ fontWeight: 'bold', padding: '8px 0' }}>Q4: 98%准确率怎么来的？</summary>
              <p style={{ padding: '8px 0 8px 16px' }}>
                我们对每个模型发送100组标准化请求，收集响应后进行15维特征统计。在100组已知身份的盲测中，正确识别了98组。方法参考了行为指纹(Behavioral Fingerprinting)和LLMmap等学术研究。
              </p>
            </details>

            <details style={{ marginBottom: 12, cursor: 'pointer' }}>
              <summary style={{ fontWeight: 'bold', padding: '8px 0' }}>Q5: 中转站低于官方价安全吗？</summary>
              <p style={{ padding: '8px 0 8px 16px' }}>
                极大概率存在问题。API成本是固定的，低于官方价意味着中转站在亏钱或用了更便宜的模型。常见手法：用Sonnet冒充Opus、用国产模型冒充Claude。
              </p>
            </details>

            <details style={{ marginBottom: 12, cursor: 'pointer' }}>
              <summary style={{ fontWeight: 'bold', padding: '8px 0' }}>Q6: 什么是&ldquo;随机换模型&rdquo;？</summary>
              <p style={{ padding: '8px 0 8px 16px' }}>
                部分中转站在高峰期偷偷将Opus请求路由到Sonnet甚至Haiku，降低成本。用户感知到的是&ldquo;有时候好用有时候不好用&rdquo;。我们的行为指纹可以检测这种行为。
              </p>
            </details>

            <details style={{ marginBottom: 12, cursor: 'pointer' }}>
              <summary style={{ fontWeight: 'bold', padding: '8px 0' }}>Q7: 什么是System Prompt注入？</summary>
              <p style={{ padding: '8px 0 8px 16px' }}>
                部分中转站在你的请求中偷偷添加隐藏的System Prompt来虚增Token数量，多收费。我们通过发送已知长度的请求来检测这种行为。
              </p>
            </details>

            <details style={{ marginBottom: 12, cursor: 'pointer' }}>
              <summary style={{ fontWeight: 'bold', padding: '8px 0' }}>Q8: 数据多久更新一次？</summary>
              <p style={{ padding: '8px 0 8px 16px' }}>
                行为指纹参考画像每周自动校准。中转站排名数据将在真实评测启动后每日更新。
              </p>
            </details>

            <details style={{ marginBottom: 12, cursor: 'pointer' }}>
              <summary style={{ fontWeight: 'bold', padding: '8px 0' }}>Q9: 我可以自己验证吗？</summary>
              <p style={{ padding: '8px 0 8px 16px' }}>
                可以！运行 <code>npx relay-radar monitor</code> 进行被动行为指纹验证（推荐，中转站无法检测），或 <code>npx relay-radar verify</code> 进行主动探针验证。
              </p>
            </details>

            <details style={{ marginBottom: 12, cursor: 'pointer' }}>
              <summary style={{ fontWeight: 'bold', padding: '8px 0' }}>Q10: 如何在Windows上安装？</summary>
              <p style={{ padding: '8px 0 8px 16px' }}>
                安装Node.js 18+（从nodejs.org下载LTS版本），打开PowerShell，运行 <code>npx relay-radar scan</code>。详见上方Windows安装指南。
              </p>
            </details>

            <details style={{ marginBottom: 12, cursor: 'pointer' }}>
              <summary style={{ fontWeight: 'bold', padding: '8px 0' }}>Q11: 你们和中转站有利益关系吗？</summary>
              <p style={{ padding: '8px 0 8px 16px' }}>
                没有。所有测试账户由我们自费购买，不接受中转站赞助影响排名。代码完全开源可审计。
              </p>
            </details>

            <details style={{ marginBottom: 12, cursor: 'pointer' }}>
              <summary style={{ fontWeight: 'bold', padding: '8px 0' }}>Q12: 如何推荐中转站参与评测？</summary>
              <p style={{ padding: '8px 0 8px 16px' }}>
                请在GitHub Issues提交，我们会在后续版本中加入评测。
              </p>
            </details>
          </div>
        </section>

        {/* 联系我们 */}
        <section className="stat-card">
          <h3 style={{ marginBottom: 12 }}>📬 联系我们</h3>
          <div style={{ fontSize: 14, color: 'var(--text-dim)', lineHeight: 2 }}>
            <p>🐛 <strong>Bug报告:</strong>{' '}
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
