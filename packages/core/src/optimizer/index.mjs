/**
 * Project Optimizer — 扫描项目，生成省Token配置
 *
 * 原理很简单：
 *   AI工具（Claude Code / Cursor / GitHub Copilot）每次对话都会扫描你的项目文件。
 *   node_modules有几万个文件、package-lock.json有几万行——AI全都会读进去，白花钱。
 *   .claudeignore 告诉AI"这些文件不用看"，效果和.gitignore一样，但是给AI用的。
 *   CLAUDE.md 告诉AI"项目长这样"，AI不用自己慢慢摸索，直接开干。
 *
 * 兼容：Claude Code / Cursor(.cursorignore) / GitHub Copilot(.github/copilot-instructions.md)
 *
 * 零依赖，纯Node.js。
 */

import { readdir, readFile, writeFile, stat, access } from 'node:fs/promises';
import { join, extname, basename } from 'node:path';

// ─── 扫描项目结构 ────────────────────────────────────────────────────────────

/** 快速统计项目文件 */
async function scanProject(rootDir) {
  const result = {
    rootDir,
    totalFiles: 0,
    totalDirs: 0,
    languages: {},     // { 'js': 142, 'ts': 89, ... }
    bigFiles: [],      // files > 100KB
    hasNodeModules: false,
    hasPythonVenv: false,
    hasGitIgnore: false,
    hasClaudeIgnore: false,
    hasClaudeMd: false,
    hasCursorIgnore: false,
    hasPackageLock: false,
    hasYarnLock: false,
    hasPnpmLock: false,
    framework: null,   // 'nextjs' | 'react' | 'vue' | 'python' | 'go' | 'rust' | null
    packageJson: null,
    estimatedTokensBefore: 0,
    estimatedTokensAfter: 0,
  };

  // Check top-level indicators
  const topEntries = await readdir(rootDir).catch(() => []);

  for (const entry of topEntries) {
    if (entry === 'node_modules') result.hasNodeModules = true;
    if (entry === 'venv' || entry === '.venv' || entry === 'env') result.hasPythonVenv = true;
    if (entry === '.gitignore') result.hasGitIgnore = true;
    if (entry === '.claudeignore') result.hasClaudeIgnore = true;
    if (entry === 'CLAUDE.md') result.hasClaudeMd = true;
    if (entry === '.cursorignore') result.hasCursorIgnore = true;
    if (entry === 'package-lock.json') result.hasPackageLock = true;
    if (entry === 'yarn.lock') result.hasYarnLock = true;
    if (entry === 'pnpm-lock.yaml') result.hasPnpmLock = true;
  }

  // Read package.json for framework detection
  try {
    const pkgRaw = await readFile(join(rootDir, 'package.json'), 'utf-8');
    result.packageJson = JSON.parse(pkgRaw);
    const deps = { ...result.packageJson.dependencies, ...result.packageJson.devDependencies };
    if (deps['next']) result.framework = 'nextjs';
    else if (deps['nuxt']) result.framework = 'nuxt';
    else if (deps['vue']) result.framework = 'vue';
    else if (deps['react']) result.framework = 'react';
    else if (deps['express']) result.framework = 'express';
    else if (deps['fastify']) result.framework = 'fastify';
  } catch { /* no package.json */ }

  // Detect Python/Go/Rust
  if (!result.framework) {
    for (const f of topEntries) {
      if (f === 'requirements.txt' || f === 'pyproject.toml' || f === 'setup.py') result.framework = 'python';
      if (f === 'go.mod') result.framework = 'go';
      if (f === 'Cargo.toml') result.framework = 'rust';
    }
  }

  // Count source files (shallow scan, skip ignored dirs)
  const skipDirs = new Set(['node_modules', '.git', 'dist', 'build', '.next', 'out', 'coverage', 'venv', '.venv', 'target', '__pycache__', '.cache']);
  const extMap = {};

  async function walk(dir, depth) {
    if (depth > 5) return; // don't go too deep
    let entries;
    try { entries = await readdir(dir, { withFileTypes: true }); } catch { return; }
    for (const e of entries) {
      if (e.isDirectory()) {
        if (!skipDirs.has(e.name) && !e.name.startsWith('.')) {
          result.totalDirs++;
          await walk(join(dir, e.name), depth + 1);
        }
      } else {
        result.totalFiles++;
        const ext = extname(e.name).slice(1).toLowerCase();
        if (ext) extMap[ext] = (extMap[ext] || 0) + 1;
        // Check big files
        try {
          const s = await stat(join(dir, e.name));
          if (s.size > 100_000) {
            result.bigFiles.push({ name: join(dir, e.name).replace(rootDir, '.'), size: s.size });
          }
        } catch { /* skip */ }
      }
    }
  }

  await walk(rootDir, 0);
  result.languages = extMap;

  // Estimate tokens (rough: 1 source file ≈ 500 tokens avg, lock files ≈ 50K tokens)
  result.estimatedTokensBefore = result.totalFiles * 500
    + (result.hasPackageLock ? 50000 : 0)
    + (result.hasYarnLock ? 40000 : 0)
    + (result.hasNodeModules ? 200000 : 0); // node_modules scanning overhead

  result.estimatedTokensAfter = result.totalFiles * 500; // after ignore, no overhead

  return result;
}

// ─── 生成 .claudeignore ─────────────────────────────────────────────────────

function generateClaudeIgnore(scan) {
  const lines = [
    '# ============================================================',
    '# .claudeignore — 告诉AI哪些文件不用看，节省Token',
    '# 原理：和.gitignore一样，但是给AI工具用的',
    '# 兼容：Claude Code / Cursor / GitHub Copilot',
    '# 生成：npx relay-radar optimize',
    '# ============================================================',
    '',
    '# ─── 依赖目录（最大的省钱项）───────────────────────',
    'node_modules/',
    'vendor/',
    'venv/',
    '.venv/',
    'env/',
    '.env/',
    '',
    '# ─── 构建产物（AI不需要看编译后的代码）──────────────',
    'dist/',
    'build/',
    'out/',
    '.next/',
    '.nuxt/',
    '.output/',
    'target/',
    '__pycache__/',
    '*.pyc',
    '',
    '# ─── 锁文件（几万行，AI读了也没用）────────────────',
    'package-lock.json',
    'yarn.lock',
    'pnpm-lock.yaml',
    'Gemfile.lock',
    'poetry.lock',
    'composer.lock',
    'go.sum',
    'Cargo.lock',
    '',
    '# ─── 测试覆盖率和报告 ─────────────────────────────',
    'coverage/',
    '.nyc_output/',
    'htmlcov/',
    '*.lcov',
    '',
    '# ─── 日志和临时文件 ───────────────────────────────',
    '*.log',
    '*.tmp',
    '.cache/',
    '.temp/',
    '.turbo/',
    '',
    '# ─── 图片和媒体（AI看不懂二进制文件）──────────────',
    '*.png',
    '*.jpg',
    '*.jpeg',
    '*.gif',
    '*.ico',
    '*.svg',
    '*.mp4',
    '*.mp3',
    '*.woff',
    '*.woff2',
    '*.ttf',
    '*.eot',
    '',
    '# ─── IDE和系统文件 ────────────────────────────────',
    '.idea/',
    '.vscode/',
    '.DS_Store',
    'Thumbs.db',
    '',
    '# ─── 数据文件（太大，AI读了也用不上）──────────────',
    '*.sql',
    '*.sqlite',
    '*.dump',
    '*.csv',
    '*.parquet',
  ];

  // Framework-specific additions
  if (scan.framework === 'nextjs') {
    lines.push('', '# ─── Next.js 特定 ─────────────────────────────────');
    lines.push('.vercel/', '.contentlayer/', 'public/images/');
  }
  if (scan.framework === 'python') {
    lines.push('', '# ─── Python 特定 ──────────────────────────────────');
    lines.push('.tox/', '.mypy_cache/', '.pytest_cache/', '*.egg-info/', 'dist/');
  }
  if (scan.framework === 'go') {
    lines.push('', '# ─── Go 特定 ──────────────────────────────────────');
    lines.push('bin/', '.air/');
  }
  if (scan.framework === 'rust') {
    lines.push('', '# ─── Rust 特定 ─────────────────────────────────────');
    lines.push('target/', '*.rlib');
  }

  return lines.join('\n') + '\n';
}

// ─── 生成 CLAUDE.md ─────────────────────────────────────────────────────────

function generateClaudeMd(scan) {
  const name = scan.packageJson?.name || basename(scan.rootDir);
  const desc = scan.packageJson?.description || '';

  // Top languages
  const topLangs = Object.entries(scan.languages)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([ext, count]) => `${ext} (${count})`);

  const frameworkNames = {
    nextjs: 'Next.js', react: 'React', vue: 'Vue.js', nuxt: 'Nuxt',
    express: 'Express', fastify: 'Fastify', python: 'Python', go: 'Go', rust: 'Rust',
  };

  const lines = [
    `# ${name}`,
    '',
  ];

  if (desc) lines.push(desc, '');

  lines.push('## 技术栈', '');
  if (scan.framework) lines.push(`- 框架: ${frameworkNames[scan.framework] || scan.framework}`);
  if (topLangs.length) lines.push(`- 主要语言: ${topLangs.join(', ')}`);
  lines.push(`- 文件数: ${scan.totalFiles}`, '');

  lines.push('## 项目结构', '', '```');
  // List top-level dirs
  const topDirs = [];
  const topFiles = [];
  try {
    // This will be populated by the CLI when generating
  } catch { /* */ }
  lines.push(`${name}/`);
  lines.push('├── (运行 tree -L 2 查看完整结构)');
  lines.push('```', '');

  lines.push('## 开发命令', '');
  if (scan.packageJson?.scripts) {
    const scripts = scan.packageJson.scripts;
    if (scripts.dev) lines.push(`- 开发: \`npm run dev\``);
    if (scripts.build) lines.push(`- 构建: \`npm run build\``);
    if (scripts.test) lines.push(`- 测试: \`npm run test\``);
    if (scripts.lint) lines.push(`- Lint: \`npm run lint\``);
  } else if (scan.framework === 'python') {
    lines.push('- 安装: `pip install -r requirements.txt`');
    lines.push('- 测试: `pytest`');
  } else if (scan.framework === 'go') {
    lines.push('- 运行: `go run .`');
    lines.push('- 测试: `go test ./...`');
  } else if (scan.framework === 'rust') {
    lines.push('- 构建: `cargo build`');
    lines.push('- 测试: `cargo test`');
  }

  lines.push('');
  lines.push('## 注意事项', '');
  lines.push('- 请遵循项目现有的代码风格');
  lines.push('- 修改后运行测试确保不破坏现有功能');

  return lines.join('\n') + '\n';
}

// ─── 生成推荐环境变量 ────────────────────────────────────────────────────────

function generateEnvRecommendations() {
  return [
    { key: 'MAX_THINKING_TOKENS', value: '10000', effect: '节省20-40% thinking费用', note: '复杂推理任务可临时调高到 30000' },
    { key: 'CLAUDE_CODE_DISABLE_FAST_MODE', value: '1', effect: '避免6倍价格的Fast Mode', note: 'Fast Mode速度快2.5x但贵6x' },
  ];
}

// ─── 导出 ────────────────────────────────────────────────────────────────────

export {
  scanProject,
  generateClaudeIgnore,
  generateClaudeMd,
  generateEnvRecommendations,
};
