#!/usr/bin/env node
// Owner-only usage report. Runs on your own machine, never on the website.
//
//   node scripts/owner-stats.mjs            print the totals and write data/owner-stats.html
//   node scripts/owner-stats.mjs --open     ...and open the report in the browser
//   node scripts/owner-stats.mjs --json     print the raw numbers as JSON
//
// It reads the production database with the service-role key from .env.stats.local (see
// .env.example), calls owner_stats() from supabase/schema.sql, and sends nothing anywhere else.
// The numbers are running totals per day: no names, addresses, or content.

import { execFile } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const METRICS = [
  ['events_created', 'นัดที่สร้าง'],
  ['responses', 'คนที่ลงเวลา'],
  ['events_with_questions', 'นัดที่ตั้งคำถาม'],
  ['events_with_limit', 'นัดที่จำกัดจำนวนคน'],
  ['files_attached', 'ไฟล์ที่แนบ'],
  ['feedback_received', 'ความคิดเห็นที่ได้รับ'],
];

function parseArgs(argv) {
  const args = { env: '.env.stats.local', out: 'data/owner-stats.html', json: false, open: false, from: null };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--json') args.json = true;
    else if (a === '--open') args.open = true;
    else if (a === '--env') args.env = argv[++i];
    else if (a === '--out') args.out = argv[++i];
    else if (a === '--from') args.from = argv[++i]; // a saved --json result, for looking at the report offline
    else throw new Error(`Unknown option: ${a}`);
  }
  return args;
}

/** KEY=VALUE lines; # comments and blank lines are skipped. */
export function parseEnv(text) {
  const env = {};
  for (const line of text.split(/\r?\n/)) {
    const match = /^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/.exec(line);
    if (match) env[match[1]] = match[2].replace(/^(['"])(.*)\1$/, '$2');
  }
  return env;
}

async function fetchStats(envFile) {
  let text;
  try {
    text = readFileSync(resolve(envFile), 'utf-8');
  } catch {
    throw new Error(
      `ไม่พบไฟล์ ${envFile}\n` +
        'สร้างไฟล์นี้ที่โฟลเดอร์โปรเจกต์ แล้วใส่ค่าของโปรเจกต์ production:\n' +
        '  SUPABASE_URL=https://xxxx.supabase.co\n' +
        '  SUPABASE_SERVICE_ROLE_KEY=...'
    );
  }
  const env = parseEnv(text);
  const url = env.SUPABASE_URL;
  const key = env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error(`${envFile} ต้องมี SUPABASE_URL และ SUPABASE_SERVICE_ROLE_KEY`);

  const res = await fetch(`${url.replace(/\/$/, '')}/rest/v1/rpc/owner_stats`, {
    method: 'POST',
    headers: { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: '{}',
  });
  if (res.status === 404) {
    throw new Error('ฐานข้อมูลนี้ยังไม่มี owner_stats(): รัน supabase/schema.sql ใน SQL Editor ของโปรเจกต์นี้ก่อน');
  }
  if (!res.ok) throw new Error(`อ่านสถิติไม่สำเร็จ (${res.status}): ${(await res.text()).slice(0, 300)}`);
  return res.json();
}

const num = n => Number(n ?? 0).toLocaleString('en-US');

/** Totals with the two ratios the raw counts do not show. */
export function summarize(stats) {
  const t = stats.totals ?? {};
  const events = Number(t.events_created ?? 0);
  const responses = Number(t.responses ?? 0);
  return {
    totals: Object.fromEntries(METRICS.map(([key]) => [key, Number(t[key] ?? 0)])),
    responsesPerEvent: events > 0 ? responses / events : null,
    firstDay: stats.first_day ?? null,
    days: new Set((stats.daily ?? []).map(d => d.day)).size,
  };
}

export function formatSummary(stats) {
  const s = summarize(stats);
  const now = stats.stored_now ?? {};
  const fb = stats.feedback ?? {};
  const pad = (label, value) => `  ${label.padEnd(26, ' ')} ${String(value).padStart(8, ' ')}`;
  const lines = [
    'สถิติการใช้งาน วันว่าง',
    s.firstDay ? `นับตั้งแต่ ${s.firstDay} (${s.days} วันที่มีการใช้งาน)` : 'ยังไม่มีข้อมูล',
    '',
    'ยอดรวมทั้งหมด (คงอยู่แม้นัดถูกลบ)',
    ...METRICS.map(([key, label]) => pad(label, num(s.totals[key]))),
    pad('คนลงเวลาเฉลี่ยต่อนัด', s.responsesPerEvent === null ? '-' : s.responsesPerEvent.toFixed(1)),
    '',
    'ที่เก็บอยู่ตอนนี้ (นัดเก่าถูกลบหลัง 90 วัน)',
    pad('นัด', num(now.events)),
    pad('คนที่ลงเวลา', num(now.responses)),
    pad('นัดที่ใหญ่ที่สุด (คน)', num(now.biggest_event)),
    '',
    'ความคิดเห็น',
    pad('จำนวน', num(fb.count)),
    pad('คะแนนเฉลี่ย (เต็ม 5)', fb.avg_rating == null ? '-' : `${Number(fb.avg_rating).toFixed(2)} จาก ${num(fb.rated)} คน`),
  ];
  return lines.join('\n');
}

/** A self-contained page: the numbers are embedded, and nothing is loaded from the network. */
export function buildHtml(stats) {
  // "<" is escaped so a value can never close the script element.
  const data = JSON.stringify(stats).replace(/</g, '\\u003c');
  return `<!doctype html>
<html lang="th">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>สถิติการใช้งาน วันว่าง</title>
<style>
  :root {
    color-scheme: light;
    --page: #f4f3f0; --surface-1: #fcfcfb; --line: #e3e2dd; --grid: #ebeae6;
    --text-primary: #0b0b0b; --text-secondary: #52514e; --text-muted: #7a7973;
    --series-1: #2a78d6; --series-1-hover: #1c5cab; --tip: #0b0b0b; --tip-text: #fcfcfb;
  }
  @media (prefers-color-scheme: dark) {
    :root {
      color-scheme: dark;
      --page: #111110; --surface-1: #1a1a19; --line: #33332f; --grid: #2a2a27;
      --text-primary: #f0efec; --text-secondary: #c3c2b7; --text-muted: #8f8e85;
      --series-1: #3987e5; --series-1-hover: #6da7ec; --tip: #f0efec; --tip-text: #1a1a19;
    }
  }
  * { box-sizing: border-box; }
  body { margin: 0; background: var(--page); color: var(--text-primary);
    font: 15px/1.5 "Leelawadee UI", "Noto Sans Thai", "Segoe UI", system-ui, sans-serif; }
  main { max-width: 1040px; margin: 0 auto; padding: 32px 16px 56px; }
  h1 { font-size: 22px; margin: 0; }
  h2 { font-size: 15px; margin: 0; font-weight: 600; }
  .sub { color: var(--text-secondary); margin: 2px 0 0; font-size: 13px; }
  .card { background: var(--surface-1); border: 1px solid var(--line); border-radius: 10px; padding: 18px 20px; }
  .hero { display: grid; grid-template-columns: minmax(220px, 1fr) 2fr; gap: 12px; margin-top: 20px; }
  .hero-figure { font-size: 56px; font-weight: 600; line-height: 1.05; margin-top: 6px; }
  .tiles { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; }
  .tile .value { font-size: 24px; font-weight: 600; line-height: 1.2; }
  .label { color: var(--text-secondary); font-size: 13px; }
  .note { color: var(--text-muted); font-size: 12px; margin-top: 2px; }
  section { margin-top: 28px; }
  .filters { display: flex; flex-wrap: wrap; align-items: center; gap: 6px; margin-top: 28px; }
  .filters button { font: inherit; font-size: 13px; padding: 5px 12px; border-radius: 999px; cursor: pointer;
    border: 1px solid var(--line); background: var(--surface-1); color: var(--text-primary); }
  .filters button[aria-pressed="true"] { background: var(--text-primary); color: var(--surface-1); border-color: var(--text-primary); }
  .filters .range { color: var(--text-secondary); font-size: 13px; margin-left: 6px; }
  .charts { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-top: 12px; }
  .chart-head { display: flex; justify-content: space-between; align-items: baseline; gap: 12px; }
  .chart-total { font-size: 20px; font-weight: 600; }
  svg { display: block; width: 100%; height: auto; margin-top: 10px; overflow: visible; }
  /* The bar is drawn over its hit area, so it must let the pointer through to it. */
  .bar { fill: var(--series-1); pointer-events: none; }
  .hit { fill: transparent; cursor: default; outline: none; }
  .hit:hover + .bar, .hit:focus-visible + .bar { fill: var(--series-1-hover); }
  .grid-line { stroke: var(--grid); stroke-width: 1; }
  .axis-line { stroke: var(--line); stroke-width: 1; }
  .tick { fill: var(--text-muted); font-size: 11px; font-variant-numeric: tabular-nums; }
  .peak { fill: var(--text-secondary); font-size: 11px; font-weight: 600; }
  .empty { color: var(--text-muted); font-size: 13px; padding: 40px 0; text-align: center; }
  #tip { position: fixed; pointer-events: none; background: var(--tip); color: var(--tip-text); border-radius: 6px;
    padding: 6px 9px; font-size: 12px; line-height: 1.35; opacity: 0; transition: opacity .08s; z-index: 10; white-space: nowrap; }
  #tip strong { font-size: 14px; display: block; }
  details { margin-top: 12px; }
  summary { cursor: pointer; color: var(--text-secondary); font-size: 13px; }
  .table-wrap { overflow-x: auto; margin-top: 8px; }
  table { border-collapse: collapse; width: 100%; font-size: 13px; }
  th, td { padding: 5px 10px; text-align: right; border-bottom: 1px solid var(--line); white-space: nowrap; font-variant-numeric: tabular-nums; }
  th { color: var(--text-secondary); font-weight: 600; }
  th:first-child, td:first-child { text-align: left; }
  footer { margin-top: 28px; color: var(--text-muted); font-size: 12px; }
  @media (max-width: 760px) {
    .hero, .charts { grid-template-columns: 1fr; }
    .tiles { grid-template-columns: repeat(2, 1fr); }
    .hero-figure { font-size: 48px; }
  }
</style>
</head>
<body>
<main>
  <h1>สถิติการใช้งาน วันว่าง</h1>
  <p class="sub" id="since"></p>

  <div class="hero">
    <div class="card">
      <div class="label">นัดที่สร้างทั้งหมด</div>
      <div class="hero-figure" id="hero"></div>
      <div class="note">ยอดสะสม คงอยู่แม้นัดถูกลบหลัง 90 วัน</div>
    </div>
    <div class="tiles" id="tiles"></div>
  </div>

  <div class="filters" role="group" aria-label="ช่วงเวลา">
    <button type="button" data-days="30">30 วัน</button>
    <button type="button" data-days="90">90 วัน</button>
    <button type="button" data-days="0">ทั้งหมด</button>
    <span class="range" id="range"></span>
  </div>

  <div class="charts">
    <div class="card">
      <div class="chart-head"><h2 id="t1">นัดที่สร้าง</h2><span class="chart-total" id="sum-events_created"></span></div>
      <div id="chart-events_created"></div>
    </div>
    <div class="card">
      <div class="chart-head"><h2 id="t2">คนที่ลงเวลา</h2><span class="chart-total" id="sum-responses"></span></div>
      <div id="chart-responses"></div>
    </div>
  </div>

  <details>
    <summary>ดูเป็นตาราง</summary>
    <div class="table-wrap"><table id="table"></table></div>
  </details>

  <section>
    <h2>ที่เก็บอยู่ตอนนี้</h2>
    <p class="sub">เฉพาะนัดที่ยังไม่ถูกลบ</p>
    <div class="tiles" id="now" style="margin-top:12px"></div>
  </section>

  <section>
    <h2>ความคิดเห็นจากผู้ใช้</h2>
    <div class="tiles" id="feedback" style="margin-top:12px"></div>
  </section>

  <footer id="footer"></footer>
</main>
<div id="tip" role="status"></div>

<script id="stats" type="application/json">${data}</script>
<script>
(() => {
  const stats = JSON.parse(document.getElementById('stats').textContent);
  const METRICS = ${JSON.stringify(METRICS)};
  const totals = stats.totals || {};
  const fmt = n => Number(n || 0).toLocaleString('en-US');
  const $ = id => document.getElementById(id);
  const el = (tag, cls, text) => {
    const node = document.createElement(tag);
    if (cls) node.className = cls;
    if (text !== undefined) node.textContent = text;
    return node;
  };
  const svgEl = (tag, attrs) => {
    const node = document.createElementNS('http://www.w3.org/2000/svg', tag);
    for (const k in attrs) node.setAttribute(k, attrs[k]);
    return node;
  };
  const tile = (label, value, note) => {
    const card = el('div', 'card tile');
    card.append(el('div', 'label', label), el('div', 'value', value));
    if (note) card.append(el('div', 'note', note));
    return card;
  };
  const thaiDate = iso => new Date(iso + 'T00:00:00').toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: '2-digit' });
  const shortDate = iso => new Date(iso + 'T00:00:00').toLocaleDateString('th-TH', { day: 'numeric', month: 'short' });
  const iso = d => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  const addDays = (isoDay, n) => { const d = new Date(isoDay + 'T00:00:00'); d.setDate(d.getDate() + n); return iso(d); };

  // ---- all-time figures
  const events = Number(totals.events_created || 0);
  const responses = Number(totals.responses || 0);
  $('since').textContent = stats.first_day ? 'นับตั้งแต่ ' + thaiDate(stats.first_day) : 'ยังไม่มีข้อมูล';
  $('hero').textContent = fmt(events);
  const share = n => (events > 0 ? Math.round((Number(n || 0) / events) * 100) + '% ของนัดทั้งหมด' : '');
  $('tiles').append(
    tile('คนที่ลงเวลา', fmt(responses)),
    tile('คนลงเวลาเฉลี่ยต่อนัด', events > 0 ? (responses / events).toFixed(1) : '-'),
    tile('ไฟล์ที่แนบ', fmt(totals.files_attached)),
    tile('นัดที่ตั้งคำถาม', fmt(totals.events_with_questions), share(totals.events_with_questions)),
    tile('นัดที่จำกัดจำนวนคน', fmt(totals.events_with_limit), share(totals.events_with_limit)),
    tile('ความคิดเห็นที่ได้รับ', fmt(totals.feedback_received))
  );

  const now = stats.stored_now || {};
  $('now').append(
    tile('นัด', fmt(now.events)),
    tile('คนที่ลงเวลา', fmt(now.responses)),
    tile('นัดที่ใหญ่ที่สุด', fmt(now.biggest_event) + ' คน')
  );

  const fb = stats.feedback || {};
  const TYPE_LABELS = { bug: 'แจ้งปัญหา', idea: 'เสนอไอเดีย', praise: 'ชมเชย', other: 'อื่นๆ' };
  $('feedback').append(
    tile('คะแนนเฉลี่ย', fb.avg_rating == null ? '-' : Number(fb.avg_rating).toFixed(2) + ' / 5', fb.rated ? 'จาก ' + fmt(fb.rated) + ' คนที่ให้คะแนน' : ''),
    tile('จำนวนความคิดเห็น', fmt(fb.count)),
    tile('แยกตามประเภท', Object.keys(fb.by_type || {}).length ? '' : '-',
      Object.entries(fb.by_type || {}).map(([k, n]) => (TYPE_LABELS[k] || k) + ' ' + fmt(n)).join(' · '))
  );
  $('footer').textContent = 'สร้างรายงานเมื่อ ' + new Date(stats.generated_at).toLocaleString('th-TH') + ' · เป็นยอดรวมรายวัน ไม่มีชื่อหรือข้อมูลของผู้ใช้รายบุคคล';

  // ---- daily series
  const byDay = {};
  for (const row of stats.daily || []) (byDay[row.day] = byDay[row.day] || {})[row.metric] = Number(row.count);
  const today = iso(new Date());
  const firstDay = stats.first_day || today;

  /** One point per day, or per week once there are too many days for a bar each. */
  function series(metric, days) {
    const lastDay = Object.keys(byDay).sort().pop();
    const end = lastDay && lastDay > today ? lastDay : today;
    let start = days > 0 ? addDays(end, -(days - 1)) : firstDay;
    if (start < firstDay && days === 0) start = firstDay;
    const points = [];
    for (let d = start; d <= end; d = addDays(d, 1)) points.push({ from: d, to: d, value: (byDay[d] || {})[metric] || 0 });
    if (points.length <= 92) return { points, weekly: false, start, end };
    const weeks = [];
    for (let i = 0; i < points.length; i += 7) {
      const chunk = points.slice(i, i + 7);
      weeks.push({ from: chunk[0].from, to: chunk[chunk.length - 1].to, value: chunk.reduce((s, p) => s + p.value, 0) });
    }
    return { points: weeks, weekly: true, start, end };
  }

  /** The smallest round step (1, 2, 5, 10, 20, …) that covers v in at most 5 steps. Counts are
      whole numbers, so the ticks are too. */
  function tickStep(v) {
    for (let pow = 1; ; pow *= 10) {
      for (const m of [1, 2, 5]) if (Math.ceil(v / (m * pow)) <= 5) return m * pow;
    }
  }

  const tip = $('tip');
  function showTip(evt, point, label, weekly) {
    tip.replaceChildren(el('strong', '', fmt(point.value) + ' ' + label), document.createTextNode(
      weekly && point.from !== point.to ? thaiDate(point.from) + ' – ' + thaiDate(point.to) : thaiDate(point.from)));
    const box = evt.target.getBoundingClientRect();
    tip.style.opacity = '1';
    const w = tip.offsetWidth;
    tip.style.left = Math.max(8, Math.min(window.innerWidth - w - 8, box.left + box.width / 2 - w / 2)) + 'px';
    tip.style.top = Math.max(8, box.top - tip.offsetHeight - 8) + 'px';
  }
  const hideTip = () => { tip.style.opacity = '0'; };

  function draw(metric, label, days) {
    const host = $('chart-' + metric);
    const { points, weekly } = series(metric, days);
    const total = points.reduce((s, p) => s + p.value, 0);
    $('sum-' + metric).textContent = fmt(total);
    host.replaceChildren();
    if (total === 0) {
      host.append(el('div', 'empty', 'ไม่มีข้อมูลในช่วงนี้'));
      return points;
    }

    const W = 480, H = 220, left = 34, right = 8, top = 16, bottom = 22;
    const plotW = W - left - right, plotH = H - top - bottom;
    const highest = Math.max(...points.map(p => p.value));
    const step = tickStep(highest);
    const max = Math.ceil(highest / step) * step;
    const band = plotW / points.length;
    const barW = Math.max(1, Math.min(24, band - 2));
    const y = v => top + plotH - (v / max) * plotH;
    const svg = svgEl('svg', { viewBox: '0 0 ' + W + ' ' + H, role: 'img', 'aria-label': label + (weekly ? 'ต่อสัปดาห์' : 'ต่อวัน') + ' รวม ' + fmt(total) });

    for (let v = 0; v <= max; v += step) {
      svg.append(svgEl('line', { class: v === 0 ? 'axis-line' : 'grid-line', x1: left, x2: W - right, y1: y(v), y2: y(v) }));
      const t = svgEl('text', { class: 'tick', x: left - 6, y: y(v) + 4, 'text-anchor': 'end' });
      t.textContent = fmt(v);
      svg.append(t);
    }

    // A date under the first bar, the last, and a few between: never one per bar.
    const every = Math.max(1, Math.ceil(points.length / 5));
    const peak = points.reduce((best, p, i) => (p.value > points[best].value ? i : best), 0);
    points.forEach((p, i) => {
      const cx = left + band * i + band / 2;
      if (i % every === 0 || i === points.length - 1) {
        if (i === points.length - 1 && (points.length - 1) % every !== 0 && (points.length - 1) % every < every / 2) return;
        const t = svgEl('text', { class: 'tick', x: cx, y: H - 6, 'text-anchor': i === 0 ? 'start' : i === points.length - 1 ? 'end' : 'middle' });
        t.textContent = shortDate(p.from);
        svg.append(t);
      }
    });

    points.forEach((p, i) => {
      const x = left + band * i + (band - barW) / 2;
      const h = (p.value / max) * plotH;
      const r = Math.min(4, barW / 2, h);
      // The whole band is the target, so a short bar is as easy to point at as a tall one.
      const hit = svgEl('rect', { class: 'hit', x: left + band * i, y: top, width: band, height: plotH, tabindex: p.value > 0 ? 0 : -1 });
      hit.setAttribute('aria-label', thaiDate(p.from) + ': ' + fmt(p.value) + ' ' + label);
      hit.addEventListener('pointerenter', e => showTip(e, p, label, weekly));
      hit.addEventListener('pointerleave', hideTip);
      hit.addEventListener('focus', e => showTip(e, p, label, weekly));
      hit.addEventListener('blur', hideTip);
      svg.append(hit);
      // Rounded at the top, square on the baseline.
      const bar = svgEl('path', { class: 'bar', d: h <= 0 ? '' :
        'M' + x + ',' + (top + plotH) + ' v' + -(h - r) + ' q0,' + -r + ' ' + r + ',' + -r + ' h' + (barW - 2 * r) +
        ' q' + r + ',0 ' + r + ',' + r + ' v' + (h - r) + ' z' });
      svg.append(bar);
      if (i === peak) {
        const t = svgEl('text', { class: 'peak', x: x + barW / 2, y: y(p.value) - 5,
          'text-anchor': i < 2 ? 'start' : i > points.length - 3 ? 'end' : 'middle' });
        t.textContent = fmt(p.value);
        svg.append(t);
      }
    });
    host.append(svg);
    return points;
  }

  function drawTable(days) {
    const cols = METRICS;
    const table = $('table');
    table.replaceChildren();
    const head = el('tr');
    head.append(el('th', '', 'วันที่'), ...cols.map(([, label]) => el('th', '', label)));
    table.append(head);
    const { start, end } = series('events_created', days);
    const dayKeys = Object.keys(byDay).filter(d => d >= start && d <= end).sort().reverse();
    for (const d of dayKeys) {
      const row = el('tr');
      row.append(el('td', '', thaiDate(d)), ...cols.map(([key]) => el('td', '', fmt(byDay[d][key]))));
      table.append(row);
    }
    if (dayKeys.length === 0) {
      const row = el('tr');
      const cell = el('td', '', 'ไม่มีข้อมูลในช่วงนี้');
      cell.colSpan = cols.length + 1;
      row.append(cell);
      table.append(row);
    }
  }

  function render(days) {
    for (const b of document.querySelectorAll('.filters button')) b.setAttribute('aria-pressed', String(Number(b.dataset.days) === days));
    const { start, end, weekly } = series('events_created', days);
    $('range').textContent = thaiDate(start) + ' – ' + thaiDate(end) + (weekly ? ' · แสดงเป็นรายสัปดาห์' : '');
    $('t1').textContent = 'นัดที่สร้าง' + (weekly ? 'ต่อสัปดาห์' : 'ต่อวัน');
    $('t2').textContent = 'คนที่ลงเวลา' + (weekly ? 'ต่อสัปดาห์' : 'ต่อวัน');
    draw('events_created', 'นัด', days);
    draw('responses', 'คน', days);
    drawTable(days);
  }
  for (const b of document.querySelectorAll('.filters button')) b.addEventListener('click', () => render(Number(b.dataset.days)));
  render(30);
})();
</script>
</body>
</html>
`;
}

function openInBrowser(file) {
  const [cmd, args] =
    process.platform === 'win32' ? ['cmd', ['/c', 'start', '', file]] : process.platform === 'darwin' ? ['open', [file]] : ['xdg-open', [file]];
  execFile(cmd, args, () => {});
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const stats = args.from ? JSON.parse(readFileSync(resolve(args.from), 'utf-8')) : await fetchStats(args.env);

  if (args.json) {
    console.log(JSON.stringify(stats, null, 2));
    return;
  }
  console.log(formatSummary(stats));

  const out = resolve(args.out);
  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(out, buildHtml(stats), 'utf-8');
  console.log(`\nรายงาน: ${out}`);
  if (args.open) openInBrowser(out);
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  main().catch(err => {
    console.error(err.message);
    process.exit(1);
  });
}
