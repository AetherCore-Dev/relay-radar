# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build & Development Commands

```bash
# Install dependencies (Yarn workspaces + Turbo monorepo)
npm install

# Build all packages
npm run build

# Run all tests (107 tests across 6 suites)
npm test

# Run tests for core package only
cd packages/core && npm test

# Run a single test file
node --test packages/core/test/core.test.mjs

# Dev mode (Next.js watch for web package)
npm run dev

# Lint (currently placeholder - runs `echo 'lint ok'`)
npm run lint

# Manual CLI testing (zero-key commands need no API key)
node packages/cli/bin/relay-radar.mjs scan
node packages/cli/bin/relay-radar.mjs tips
node packages/cli/bin/relay-radar.mjs ping <url>
```

## Architecture

**Monorepo** with 4 packages under `packages/`:

- **`core`** — Zero-dependency engine (ESM). All verification, probing, ranking, and analysis logic. This is the heart of the project. Objects are frozen with `Object.freeze()` for immutability.
- **`cli`** — CLI entry point (`bin/relay-radar.mjs`). 10 commands split into zero-key (scan, tips, cost, ping, optimize) and key-required (probe, verify, monitor, rank).
- **`web`** — Next.js 16 + React 19 static site. Rankings dashboard with 5D scoring visualization. Uses CSS Modules (no UI library). Deployed to GitHub Pages via static export.
- **`skills`** — Claude Code Skills definitions.

### Core Engine Modules (`packages/core/src/`)

Two-tier command model following a "Progressive Trust Ladder":
- **Zero-key modules** (no API key needed): `scanner/` (local log analysis), `pinger/` (TCP/TLS test), `analyzer/` (token cost), `optimizer/` (CLAUDE.md generation)
- **Key-required modules**: `prober/` (latency/throughput), `verifier/` (model fingerprinting), `ranker/` (multi-dimensional scoring)

### Model Verification: Dual-Engine

`verifier/` uses two complementary approaches:
1. **LLMmap** (`verifier/llmmap/`) — Primary engine based on USENIX Security 2025 method. 8 standardized probes with pattern-based classification.
2. **Behavioral** (`verifier/behavioral/`) — "Homework not exams" passive fingerprinting. Extracts features from normal usage and compares against calibrated model profiles.

Results merge with LLMmap as primary signal, producing verdicts: authentic / likely_authentic / suspicious / fake / inconclusive.

### Ranking: 5-Dimension Weighted Scoring

Defined in `constants.mjs` — Authenticity (30%), Pricing (25%), Stability (20%), Latency (15%), Transparency (10%).

### HTTP Security Layer (`shared/http-client.mjs`)

All outbound requests go through a unified client with: SSRF protection (blocks private IPs), HTTPS enforcement for API keys, 1MB response limit, ANSI/header injection prevention.

## Key Design Constraints

- **Core has ZERO external dependencies** — this is intentional for security/trust. Do not add npm dependencies to `@relay-radar/core`.
- **All ESM** — no CommonJS. Use `.mjs` extensions and `import`/`export`.
- **Tests use `node:test`** — Node.js built-in test runner, no test framework dependencies.
- **API keys are never stored on disk** — loaded from environment variables only, sanitized from error messages.
- **Web is static export** — `output: 'export'` in next.config.mjs. No server-side runtime. Data comes from JSON files in `packages/web/data/`.

## CI/CD

- **test.yml** — Runs on push/PR: executes all 107 tests, then builds the web package.
- **deploy.yml** — Push to main: test → build → deploy to GitHub Pages (with `PAGES_BASE_PATH=/relay-radar`).
- **calibrate.yml** — Scheduled profile calibration using real model responses.

## Constants & Configuration

`packages/core/src/constants.mjs` defines: supported models (Claude family + GPT-4o), pricing tables, fingerprint questions with weights/scorers, ranking weights, probe defaults, and currency conversion rate.

`packages/core/src/config.mjs` handles relay configuration with auto URL normalization (http→https), env var resolution (`${VAR_NAME}`), and object freezing.
