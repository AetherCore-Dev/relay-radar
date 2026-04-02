# 🚀 发布指南 — 从零到上线

## 你需要做的事（按顺序）

### 第一步：创建GitHub仓库（5分钟）

1. 打开 https://github.com/new
2. 填写：
   - **Repository name**: `relay-radar`
   - **Description**: `AI中转站质量监控、模型验真、Token成本优化`
   - **Visibility**: 选 `Public`（开源项目）
   - ❌ 不要勾选 "Add a README file"（我们已经有了）
3. 点击 **Create repository**
4. 你会看到一个页面，上面有推送指令。在你的终端运行：

```bash
cd D:/relay-radar
git remote add origin https://github.com/你的用户名/relay-radar.git
git branch -M main
git push -u origin main
```

5. 刷新GitHub页面，你应该能看到所有代码了

### 第二步：启用GitHub Pages（2分钟）

1. 在GitHub仓库页面，点击 **Settings**（齿轮图标）
2. 左侧菜单找到 **Pages**
3. **Source** 选择 `GitHub Actions`
4. 不需要选分支，我们的deploy.yml会自动处理
5. 推送代码后，Actions会自动构建和部署

等1-2分钟后，你的网站就会在以下地址可用：
```
https://你的用户名.github.io/relay-radar/
```

### 第三步：验证网站（1分钟）

访问 `https://你的用户名.github.io/relay-radar/`，你应该看到：
- ✅ 排名首页，5个中转站的评分表格
- ✅ 点击中转站名称可以看到详情页
- ✅ 工具页有成本计算器
- ✅ 关于页有免责声明

### 第四步（可选）：绑定自定义域名

如果你注册了 `relayradar.com` 或类似域名：

1. 在你的域名注册商（如Cloudflare/Namecheap）添加DNS记录：
   ```
   类型: CNAME
   名称: @ 或 www
   值:   你的用户名.github.io
   ```

2. 在GitHub仓库 → Settings → Pages → Custom domain：
   - 填入 `relayradar.com`
   - 勾选 `Enforce HTTPS`

3. 在项目中创建文件 `packages/web/public/CNAME`：
   ```
   relayradar.com
   ```

4. 提交并推送：
   ```bash
   git add .
   git commit -m "chore: add custom domain"
   git push
   ```

---

## 后续：用真实数据替换模拟数据

现在网站用的是模拟数据（5个虚构中转站）。要换成真实数据：

### 方法A：手动测试（最简单）

1. 在淘宝/闲鱼购买2-3家中转站的测试额度（每家充¥50足够）
2. 获取每家的 API Key 和 Base URL
3. 运行测试：
   ```bash
   cd D:/relay-radar

   # 设置环境变量（不要写到文件里！）
   export RELAY_KEY_A="sk-xxx"
   export RELAY_KEY_B="sk-yyy"

   # 创建配置
   node packages/cli/bin/relay-radar.mjs init

   # 编辑 relay-radar.json，填入真实中转站信息
   # 然后运行综合排名
   node packages/cli/bin/relay-radar.mjs rank
   ```
4. 将 `ranking-report.json` 的内容整理到 `packages/web/data/rankings.json`
5. 重新构建并推送

### 方法B：自动化（Phase 3，后续开发）

GitHub Actions 每日自动测试并更新网站。这个我们后续再做。

---

## 后续：发掘金文章（推广）

网站上线后，在 https://juejin.cn 发文：

标题建议：
```
"花真钱买假模型？我做了一个AI中转站质量评测工具"
```

内容大纲：
1. 痛点：中转站模型掺假、计费不透明
2. 解决方案：开源验真工具 + 排名网站
3. 技术原理：8维指纹验真怎么区分Opus和Sonnet
4. 使用方法：`npx relay-radar scan`（不需要Key就能用）
5. 排名网站：截图展示
6. 开源地址：GitHub链接

---

## 时间线

| 步骤 | 预计时间 | 难度 |
|------|----------|------|
| 创建GitHub仓库 + 推送代码 | 5分钟 | ⭐ |
| 启用GitHub Pages | 2分钟 | ⭐ |
| 验证网站可访问 | 1分钟 | ⭐ |
| 绑定自定义域名（可选） | 10分钟 | ⭐⭐ |
| 购买中转站测试 + 替换真实数据 | 1-2小时 | ⭐⭐ |
| 发掘金文章 | 30分钟 | ⭐⭐ |
