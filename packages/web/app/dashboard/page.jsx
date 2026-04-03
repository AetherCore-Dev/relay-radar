'use client';

import Link from 'next/link';
import { useState, useCallback } from 'react';
import Header from '../components/Header';
import Footer from '../components/Footer';

const MODEL_PRICING = {
  'claude-opus-4': { name: 'Opus 4', input: 15, output: 75, color: '#6c63ff' },
  'claude-sonnet-4': { name: 'Sonnet 4', input: 3, output: 15, color: '#48c6ef' },
  'claude-3.5-haiku': { name: 'Haiku 3.5', input: 0.8, output: 4, color: '#22c55e' },
};

const CNY_RATE = 7.25;

function parseCcusageLine(line) {
  // Format: "2026-04-01,claude-opus-4,12345,6789"
  // or: "date,model,input_tokens,output_tokens,cost_usd"
  const parts = line.trim().split(',');
  if (parts.length < 4) return null;
  return {
    date: parts[0],
    model: parts[1],
    inputTokens: parseInt(parts[2]) || 0,
    outputTokens: parseInt(parts[3]) || 0,
    costUsd: parts[4] ? parseFloat(parts[4]) : null,
  };
}

function calculateCost(model, inputTokens, outputTokens) {
  const pricing = MODEL_PRICING[model];
  if (!pricing) return 0;
  return (inputTokens / 1_000_000) * pricing.input + (outputTokens / 1_000_000) * pricing.output;
}

function groupByDate(records) {
  const grouped = {};
  for (const r of records) {
    if (!grouped[r.date]) grouped[r.date] = { date: r.date, totalUsd: 0, models: {}, inputTokens: 0, outputTokens: 0 };
    const cost = r.costUsd ?? calculateCost(r.model, r.inputTokens, r.outputTokens);
    grouped[r.date].totalUsd += cost;
    grouped[r.date].inputTokens += r.inputTokens;
    grouped[r.date].outputTokens += r.outputTokens;
    if (!grouped[r.date].models[r.model]) grouped[r.date].models[r.model] = 0;
    grouped[r.date].models[r.model] += cost;
  }
  return Object.values(grouped).sort((a, b) => a.date.localeCompare(b.date));
}

function groupByModel(records) {
  const grouped = {};
  for (const r of records) {
    if (!grouped[r.model]) grouped[r.model] = { model: r.model, totalUsd: 0, inputTokens: 0, outputTokens: 0, count: 0 };
    grouped[r.model].totalUsd += r.costUsd ?? calculateCost(r.model, r.inputTokens, r.outputTokens);
    grouped[r.model].inputTokens += r.inputTokens;
    grouped[r.model].outputTokens += r.outputTokens;
    grouped[r.model].count += 1;
  }
  return Object.values(grouped).sort((a, b) => b.totalUsd - a.totalUsd);
}

// Demo data for preview
function generateDemoData() {
  const days = [];
  const now = new Date();
  for (let i = 29; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split('T')[0];
    const opusCount = Math.floor(Math.random() * 15) + 5;
    const sonnetCount = Math.floor(Math.random() * 25) + 10;
    const haikuCount = Math.floor(Math.random() * 10);
    for (let j = 0; j < opusCount; j++) {
      days.push({ date: dateStr, model: 'claude-opus-4', inputTokens: Math.floor(Math.random() * 8000) + 2000, outputTokens: Math.floor(Math.random() * 4000) + 500 });
    }
    for (let j = 0; j < sonnetCount; j++) {
      days.push({ date: dateStr, model: 'claude-sonnet-4', inputTokens: Math.floor(Math.random() * 6000) + 1000, outputTokens: Math.floor(Math.random() * 3000) + 300 });
    }
    for (let j = 0; j < haikuCount; j++) {
      days.push({ date: dateStr, model: 'claude-3.5-haiku', inputTokens: Math.floor(Math.random() * 3000) + 500, outputTokens: Math.floor(Math.random() * 1500) + 200 });
    }
  }
  return days;
}

function BarChart({ data, maxValue }) {
  const barMax = maxValue || Math.max(...data.map(d => d.totalUsd), 1);
  return (
    <div className="bar-chart">
      {data.map((d, i) => {
        const pct = Math.max(2, (d.totalUsd / barMax) * 100);
        const dayLabel = d.date.slice(5); // MM-DD
        const isWeekend = [0, 6].includes(new Date(d.date).getDay());
        return (
          <div key={i} className="bar-col" title={`${d.date}: $${d.totalUsd.toFixed(2)} (¥${(d.totalUsd * CNY_RATE).toFixed(0)})`}>
            <div className="bar-value" style={{ height: `${pct}%`, background: d.totalUsd > barMax * 0.8 ? 'var(--red)' : 'var(--accent)' }} />
            <div className={`bar-label ${isWeekend ? 'bar-label-dim' : ''}`}>{dayLabel}</div>
          </div>
        );
      })}
    </div>
  );
}

export default function DashboardPage() {
  const [records, setRecords] = useState(null);
  const [budget, setBudget] = useState(1500);
  const [dragOver, setDragOver] = useState(false);

  const isDemo = records === null;
  const data = isDemo ? generateDemoData() : records;
  const daily = groupByDate(data);
  const byModel = groupByModel(data);

  const last7 = daily.slice(-7);
  const last30 = daily;
  const todayData = daily[daily.length - 1];
  const todayCny = todayData ? todayData.totalUsd * CNY_RATE : 0;
  const monthTotal = last30.reduce((s, d) => s + d.totalUsd, 0);
  const monthCny = monthTotal * CNY_RATE;
  const avgDaily = monthTotal / Math.max(last30.length, 1);
  const projected = avgDaily * 30;
  const projectedCny = projected * CNY_RATE;
  const budgetPct = Math.round((monthCny / budget) * 100);

  // Find potential savings: Opus requests that could use Sonnet
  const opusData = byModel.find(m => m.model === 'claude-opus-4');
  const potentialSavings = opusData
    ? (opusData.inputTokens / 1_000_000) * (15 - 3) + (opusData.outputTokens / 1_000_000) * (75 - 15)
    : 0;
  const savingsPercent = monthTotal > 0 ? Math.round((potentialSavings / monthTotal) * 100) : 0;

  const handleFile = useCallback((file) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target.result;
      let parsed;
      // Try JSON first (ccusage format)
      try {
        const json = JSON.parse(text);
        if (Array.isArray(json)) {
          parsed = json.map(r => ({
            date: r.date || r.timestamp?.split('T')[0] || '',
            model: r.model || r.model_id || '',
            inputTokens: r.input_tokens || r.inputTokens || 0,
            outputTokens: r.output_tokens || r.outputTokens || 0,
            costUsd: r.cost_usd || r.cost || null,
          })).filter(r => r.date && r.model);
        }
      } catch {
        // Try CSV
        const lines = text.split('\n').filter(l => l.trim() && !l.startsWith('#') && !l.startsWith('date'));
        parsed = lines.map(parseCcusageLine).filter(Boolean);
      }
      if (parsed && parsed.length > 0) {
        setRecords(parsed);
      } else {
        alert('无法解析文件。支持格式：JSON数组 或 CSV（date,model,input_tokens,output_tokens）');
      }
    };
    reader.readAsText(file);
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setDragOver(false);
    handleFile(e.dataTransfer.files[0]);
  }, [handleFile]);

  return (
    <>
      <Header />
      <main className="container" style={{ paddingTop: 24, paddingBottom: 60 }}>
        <h1 style={{ fontSize: 28, marginBottom: 8 }}>📊 我的用量</h1>
        <p style={{ color: 'var(--text-dim)', fontSize: 14, marginBottom: 24 }}>
          分析你的Claude Code花费，找到省钱机会
        </p>

        {isDemo && (
          <div className="demo-banner" style={{ marginBottom: 24 }}>
            <strong>📋 演示数据</strong> — 下面是模拟的30天用量数据。导入你自己的数据看真实花费。
          </div>
        )}

        {/* Upload area */}
        <div
          className={`upload-area ${dragOver ? 'upload-area-active' : ''}`}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
        >
          <div style={{ fontSize: 14, marginBottom: 8 }}>
            📁 拖拽文件到这里，或
            <label className="upload-btn">
              选择文件
              <input type="file" accept=".json,.csv,.txt" style={{ display: 'none' }} onChange={(e) => handleFile(e.target.files[0])} />
            </label>
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-dim)' }}>
            支持：ccusage导出的JSON · CSV格式（date,model,input_tokens,output_tokens）
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-dim)', marginTop: 4 }}>
            也可以在终端运行 <code style={{ background: 'rgba(255,255,255,0.08)', padding: '1px 6px', borderRadius: 3 }}>npx relay-radar scan --export</code> 生成文件
          </div>
          {!isDemo && (
            <button onClick={() => setRecords(null)} style={{ marginTop: 8, background: 'none', border: '1px solid var(--border)', color: 'var(--text-dim)', padding: '4px 12px', borderRadius: 6, cursor: 'pointer', fontSize: 12 }}>
              清除数据，用回演示
            </button>
          )}
        </div>

        {/* Budget setting */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '20px 0', fontSize: 14 }}>
          <span style={{ color: 'var(--text-dim)' }}>月预算：</span>
          <span style={{ color: 'var(--text-dim)' }}>¥</span>
          <input
            type="number"
            value={budget}
            onChange={(e) => setBudget(Math.max(0, parseInt(e.target.value) || 0))}
            style={{ width: 100, padding: '6px 10px', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 6, color: 'var(--text)', fontSize: 14 }}
          />
        </div>

        {/* Stats cards */}
        <div className="dashboard-stats">
          <div className="stat-card">
            <h3>今日花费</h3>
            <div className="value" style={{ color: todayCny > (budget / 30) * 1.5 ? 'var(--red)' : 'var(--green)' }}>
              ¥{todayCny.toFixed(0)}
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-dim)' }}>${todayData?.totalUsd.toFixed(2) ?? '0'}</div>
          </div>
          <div className="stat-card">
            <h3>本月累计</h3>
            <div className="value">¥{monthCny.toFixed(0)}</div>
            <div style={{ fontSize: 12, color: budgetPct > 80 ? 'var(--red)' : 'var(--text-dim)' }}>
              预算用了 {budgetPct}%
            </div>
          </div>
          <div className="stat-card">
            <h3>本月预计</h3>
            <div className="value" style={{ color: projectedCny > budget ? 'var(--red)' : 'var(--green)' }}>
              ¥{projectedCny.toFixed(0)}
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-dim)' }}>
              {projectedCny > budget ? `⚠️ 超预算 ¥${(projectedCny - budget).toFixed(0)}` : `✅ 预算内，剩余 ¥${(budget - projectedCny).toFixed(0)}`}
            </div>
          </div>
          <div className="stat-card">
            <h3>💡 省钱空间</h3>
            <div className="value" style={{ color: 'var(--green)' }}>
              {savingsPercent > 0 ? `${savingsPercent}%` : '—'}
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-dim)' }}>
              {opusData ? `Opus简单任务换Sonnet，月省 ¥${(potentialSavings * CNY_RATE * 0.4).toFixed(0)}` : '暂无数据'}
            </div>
          </div>
        </div>

        {/* 30-day chart */}
        <div className="stat-card" style={{ margin: '24px 0' }}>
          <h3 style={{ marginBottom: 16 }}>📈 过去30天花费趋势</h3>
          <BarChart data={last30} />
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--text-dim)', marginTop: 8 }}>
            <span>日均：¥{(avgDaily * CNY_RATE).toFixed(0)}</span>
            <span style={{ color: 'var(--red)' }}>红色 = 超日均80%</span>
          </div>
        </div>

        {/* Model breakdown */}
        <div className="stat-card" style={{ margin: '24px 0' }}>
          <h3 style={{ marginBottom: 16 }}>🤖 模型用量分布</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {byModel.map(m => {
              const info = MODEL_PRICING[m.model] || { name: m.model, color: '#888' };
              const pct = monthTotal > 0 ? Math.round((m.totalUsd / monthTotal) * 100) : 0;
              return (
                <div key={m.model}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, marginBottom: 4 }}>
                    <span style={{ fontWeight: 600 }}>{info.name}</span>
                    <span>¥{(m.totalUsd * CNY_RATE).toFixed(0)} ({pct}%)</span>
                  </div>
                  <div style={{ height: 8, background: 'var(--border)', borderRadius: 4, overflow: 'hidden' }}>
                    <div style={{ width: `${pct}%`, height: '100%', background: info.color, borderRadius: 4 }} />
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 2 }}>
                    {m.count}次请求 · 输入{(m.inputTokens / 1000).toFixed(0)}K · 输出{(m.outputTokens / 1000).toFixed(0)}K
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Savings tips based on data */}
        {opusData && (
          <div className="stat-card" style={{ margin: '24px 0', background: 'rgba(34,197,94,0.06)', border: '1px solid rgba(34,197,94,0.2)' }}>
            <h3 style={{ color: 'var(--green)', marginBottom: 12 }}>💡 基于你的数据的省钱建议</h3>
            <div style={{ fontSize: 14, lineHeight: 2 }}>
              <p>1. 你有 <strong>{opusData.count}</strong> 次Opus请求。如果其中40%是简单任务（代码补全、文档等），换成Sonnet可以<strong>每月省 ¥{(potentialSavings * CNY_RATE * 0.4).toFixed(0)}</strong>。</p>
              <p>2. 在Claude Code中按 <code style={{ background: 'rgba(255,255,255,0.08)', padding: '1px 6px', borderRadius: 3 }}>/model</code> 可以随时切换模型。</p>
              <p>3. 运行 <code style={{ background: 'rgba(255,255,255,0.08)', padding: '1px 6px', borderRadius: 3 }}>npx relay-radar tips</code> 查看更多省钱技巧。</p>
            </div>
          </div>
        )}

        {/* CTA */}
        <div style={{ textAlign: 'center', padding: '32px 0', borderTop: '1px solid var(--border)', marginTop: 32 }}>
          <p style={{ color: 'var(--text-dim)', fontSize: 14, marginBottom: 16 }}>
            数据完全在你的浏览器里处理，不上传到任何服务器。
          </p>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link href="/" className="cta-btn cta-secondary">← 中转站排名</Link>
            <Link href="/tools/" className="cta-btn cta-secondary">算一笔账</Link>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
