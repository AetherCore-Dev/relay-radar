import './globals.css';

export const metadata = {
  metadataBase: new URL('https://aethercore-dev.github.io/relay-radar'),
  title: 'RelayRadar — AI中转站质量排名 | 模型验真准确度98%',
  description: 'Claude Code 中转站质量监控、模型验真（98%准确度）、成本优化。独立第三方评测，帮你避开模型造假、计费欺诈的中转站。',
  keywords: 'AI中转站,Claude Code,API中转,模型验真,中转站排名,中转站评测,API proxy',
  openGraph: {
    title: 'RelayRadar — AI中转站质量排名',
    description: '独立第三方评测，98%准确度模型验真。5维评分体系帮你选择靠谱的Claude中转站。',
    url: 'https://aethercore-dev.github.io/relay-radar/',
    siteName: 'RelayRadar',
    type: 'website',
    locale: 'zh_CN',
    images: [{ url: '/og-image.svg', width: 1200, height: 630, alt: 'RelayRadar AI中转站评测' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'RelayRadar — AI中转站质量排名',
    description: '独立第三方评测，98%准确度模型验真',
    images: ['/og-image.svg'],
  },
  robots: { index: true, follow: true },
};

export default function RootLayout({ children }) {
  return (
    <html lang="zh-CN">
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'WebApplication',
              name: 'RelayRadar',
              description: 'AI中转站质量监控、模型验真、成本优化工具',
              url: 'https://aethercore-dev.github.io/relay-radar/',
              applicationCategory: 'DeveloperApplication',
              operatingSystem: 'Any',
              offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
            }),
          }}
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
