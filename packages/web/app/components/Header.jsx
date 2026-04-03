import Link from 'next/link';

export default function Header() {
  return (
    <header className="header">
      <div className="container">
        <Link href="/" className="header-logo">🛰️ RelayRadar</Link>
        <nav className="header-nav">
          <Link href="/">排名</Link>
          <Link href="/tools/">工具</Link>
          <Link href="/about/">关于</Link>
          <a href="https://github.com/AetherCore-Dev/relay-radar" target="_blank" rel="noopener">GitHub</a>
        </nav>
      </div>
    </header>
  );
}
