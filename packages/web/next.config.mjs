/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  images: { unoptimized: true },
  trailingSlash: true,
  // GitHub Pages 部署时需要 basePath
  // 如果用自定义域名（如 relayradar.com），删掉 basePath
  // 如果用 username.github.io/relay-radar/，保留 basePath
  basePath: process.env.PAGES_BASE_PATH || '',
  assetPrefix: process.env.PAGES_BASE_PATH || '',
};

export default nextConfig;
