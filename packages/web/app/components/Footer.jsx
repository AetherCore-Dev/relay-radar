import Link from 'next/link';

export default function Footer() {
  return (
    <footer className="footer">
      <div className="container">
        <p>RelayRadar — 帮你验中转站靠不靠谱</p>
        <p style={{ marginTop: 8 }}>
          本站不提供API中转服务 · 评测数据基于自动化测试 · <Link href="/about/">免责声明</Link>
        </p>
        <p style={{ marginTop: 8 }}>
          <a href="https://github.com/AetherCore-Dev/relay-radar">GitHub</a> · 开源 MIT 协议
        </p>
      </div>
    </footer>
  );
}
