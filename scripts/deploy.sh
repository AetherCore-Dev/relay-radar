#!/bin/bash
# RelayRadar 部署脚本
# 用法: ./scripts/deploy.sh

set -e

echo "🛰️  RelayRadar 部署"
echo "===================="

# 1. 跑测试
echo ""
echo "📋 Step 1/4: 运行测试..."
cd packages/core
node --test test/core.test.mjs test/http-client.test.mjs test/fixes.test.mjs test/phase1-complete.test.mjs
echo "✅ 107 tests passed"
cd ../..

# 2. 构建网站
echo ""
echo "🔨 Step 2/4: 构建网站..."
cd packages/web
npm install --silent
npx next build
echo "✅ 网站构建成功"
cd ../..

# 3. 显示构建结果
echo ""
echo "📦 Step 3/4: 构建产物..."
find packages/web/out -name "*.html" | while read f; do
  echo "  ✅ $f"
done

# 4. 提示下一步
echo ""
echo "🚀 Step 4/4: 准备部署"
echo ""
echo "  选项A: GitHub Pages (免费, 推荐先用这个)"
echo "    git push origin main"
echo "    → 自动触发 .github/workflows/deploy.yml"
echo ""
echo "  选项B: 手动上传到任何静态服务器"
echo "    将 packages/web/out/ 目录上传到你的服务器即可"
echo ""
echo "===================="
echo "✅ 部署准备完成"
