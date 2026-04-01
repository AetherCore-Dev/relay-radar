import './globals.css';

export const metadata = {
  title: 'RelayRadar — AI中转站质量排名',
  description: 'Claude Code 中转站质量监控、模型验真、成本优化。独立第三方评测，数据每日更新。',
};

export default function RootLayout({ children }) {
  return (
    <html lang="zh-CN">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </head>
      <body>{children}</body>
    </html>
  );
}
