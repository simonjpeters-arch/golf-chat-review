"""Build self-contained share.html (and index.html) from CSV exports."""
import csv
import json
from pathlib import Path

from analytics_enrichment import build_analytics

ROOT = Path(__file__).parent


def read_csv(name: str) -> list[dict[str, str]]:
    path = ROOT / name
    with path.open(encoding="utf-8", newline="") as f:
        return list(csv.DictReader(f))


def load_methodology_panel() -> str:
    return (ROOT / "methodology_panel.html").read_text(encoding="utf-8").strip()


def load_timeline_js() -> str:
    return (ROOT / "timeline_charts.js").read_text(encoding="utf-8")


def build_html(data: dict, methodology_html: str, timeline_js: str) -> str:
    payload = json.dumps(data, ensure_ascii=False)
    return (
        HTML_TEMPLATE.replace("/*__DATA__*/", payload)
        .replace("<!--__METHODOLOGY__-->", methodology_html)
        .replace("/*__TIMELINE_JS__*/", timeline_js)
    )


def main() -> None:
    confirmed = read_csv("confirmed-no-shows.csv")
    weekday = read_csv("weekday-weekend-failures.csv")
    borderline = read_csv("borderline.csv")

    simon = sum(1 for r in confirmed if r["WhoSkipped"] == "Simon")
    gaythan = sum(1 for r in confirmed if r["WhoSkipped"] == "Gaythan")
    both = sum(1 for r in confirmed if r["WhoSkipped"] == "Both")
    wk_confirmed = sum(1 for r in weekday if r["Type"] == "confirmed")
    wk_fizzled = sum(1 for r in weekday if r["Type"] == "fizzled")

    data = {
        "confirmed": confirmed,
        "weekday": weekday,
        "borderline": borderline,
        "analytics": build_analytics(confirmed),
        "stats": {
            "confirmed_total": len(confirmed),
            "simon": simon,
            "gaythan": gaythan,
            "both": both,
            "borderline": len(borderline),
            "weekday_confirmed": wk_confirmed,
            "weekday_fizzled": wk_fizzled,
        },
    }

    methodology = load_methodology_panel()
    timeline_js = load_timeline_js()
    html = build_html(data, methodology, timeline_js)

    for name in ("share.html", "index.html"):
        path = ROOT / name
        path.write_text(html, encoding="utf-8")
        print(path)


HTML_TEMPLATE = r"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Golf No-Show Analysis</title>
  <style>
    :root {
      --bg: #0f1419;
      --surface: #1a2332;
      --surface2: #243044;
      --text: #e8edf4;
      --muted: #8b9cb3;
      --accent: #3dd68c;
      --simon: #5b9fd4;
      --gaythan: #e07a5f;
      --both: #b48ead;
      --confirmed: #3dd68c;
      --fizzled: #f2cc60;
      --border: #2d3a4f;
      --radius: 10px;
      --code-bg: #121820;
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      font-family: "Segoe UI", system-ui, -apple-system, sans-serif;
      background: var(--bg);
      color: var(--text);
      line-height: 1.5;
      font-size: 15px;
    }
    header {
      background: linear-gradient(135deg, #1a2332 0%, #0f2820 100%);
      border-bottom: 1px solid var(--border);
      padding: 1.25rem 1rem 0;
    }
    header h1 {
      margin: 0 0 0.25rem;
      font-size: 1.5rem;
      font-weight: 700;
      letter-spacing: -0.02em;
    }
    header p {
      margin: 0 0 1rem;
      color: var(--muted);
      font-size: 0.9rem;
    }
    .tabs {
      display: flex;
      gap: 0.25rem;
      flex-wrap: wrap;
      overflow-x: auto;
      padding-bottom: 0;
    }
    .tab {
      background: transparent;
      border: none;
      color: var(--muted);
      padding: 0.65rem 1rem;
      cursor: pointer;
      font: inherit;
      font-size: 0.9rem;
      border-radius: var(--radius) var(--radius) 0 0;
      white-space: nowrap;
      transition: color 0.15s, background 0.15s;
    }
    .tab:hover { color: var(--text); background: rgba(255,255,255,0.04); }
    .tab.active {
      color: var(--accent);
      background: var(--bg);
      font-weight: 600;
    }
    main { padding: 1.25rem 1rem 2rem; max-width: 1480px; margin: 0 auto; }
    .dashboard-lead {
      color: var(--muted);
      font-size: 0.9rem;
      margin: 0 0 1rem;
      max-width: 72ch;
    }
    .kpi-row {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 0.65rem;
      margin-bottom: 1.25rem;
    }
    @media (max-width: 1100px) { .kpi-row { grid-template-columns: repeat(4, 1fr); } }
    @media (max-width: 640px) { .kpi-row { grid-template-columns: repeat(2, 1fr); } }
    .kpi {
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: var(--radius);
      padding: 0.85rem 0.75rem;
      text-align: center;
    }
    .kpi .kpi-val { font-size: 1.65rem; font-weight: 700; line-height: 1.1; }
    .kpi .kpi-lbl { font-size: 0.72rem; color: var(--muted); margin-top: 0.35rem; line-height: 1.25; }
    .kpi.kpi-simon .kpi-val { color: var(--simon); }
    .kpi.kpi-gaythan .kpi-val { color: var(--gaythan); }
    .kpi.kpi-both .kpi-val { color: var(--both); }
    .kpi.kpi-accent .kpi-val { color: var(--accent); }
    .kpi.kpi-warn .kpi-val { color: #f0a090; }
    .dash-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 1rem;
      margin-bottom: 1rem;
    }
    .dash-grid-3 {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 1rem;
      margin-bottom: 1rem;
    }
    @media (max-width: 1000px) {
      .dash-grid, .dash-grid-3 { grid-template-columns: 1fr; }
    }
    .dash-panel {
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: var(--radius);
      padding: 0.85rem 1rem 1rem;
    }
    .dash-panel h3 {
      margin: 0 0 0.25rem;
      font-size: 0.95rem;
      color: var(--accent);
      font-weight: 600;
    }
    .dash-panel .chart-sub { margin-bottom: 0.5rem; }
    .excuse-cards {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }
    .excuse-card {
      display: grid;
      grid-template-columns: 2rem 1fr auto;
      gap: 0.5rem;
      align-items: center;
      padding: 0.5rem 0.65rem;
      background: var(--surface2);
      border-radius: 8px;
      border: 1px solid var(--border);
      font-size: 0.85rem;
    }
    .excuse-card .exc-rank { font-weight: 700; color: var(--accent); }
    .excuse-card .exc-count { font-weight: 700; font-size: 1.1rem; }
    .callout-panel {
      background: rgba(224, 122, 95, 0.08);
      border: 1px solid rgba(224, 122, 95, 0.3);
    }
    .callout-panel ul { margin: 0.5rem 0 0; padding-left: 1.1rem; font-size: 0.82rem; color: #c5d0de; }
    .wk-strip {
      display: flex;
      gap: 0.5rem;
      overflow-x: auto;
      padding-bottom: 0.35rem;
      scrollbar-width: thin;
    }
    .wk-strip-item {
      flex: 0 0 220px;
      padding: 0.55rem 0.65rem;
      background: var(--surface2);
      border-radius: 8px;
      border: 1px solid var(--border);
      font-size: 0.75rem;
    }
    .wk-strip-item.confirmed { border-left: 3px solid var(--confirmed); }
    .wk-strip-item.fizzled { border-left: 3px solid var(--fizzled); }
    .dash-bottomline {
      margin: 1rem 0;
      padding: 1rem 1.25rem;
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: var(--radius);
      font-size: 0.9rem;
    }
    .dash-bottomline h3 { margin: 0 0 0.5rem; font-size: 1rem; color: var(--accent); }
    .dash-bottomline ul { margin: 0; padding-left: 1.25rem; color: #c5d0de; }
    .dash-data-nav {
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem;
      margin-top: 1.25rem;
      padding-top: 1rem;
      border-top: 1px solid var(--border);
    }
    .dash-data-nav span { color: var(--muted); font-size: 0.85rem; margin-right: 0.5rem; align-self: center; }
    .dash-link {
      background: var(--surface2);
      border: 1px solid var(--border);
      color: var(--text);
      padding: 0.45rem 0.85rem;
      border-radius: 8px;
      cursor: pointer;
      font: inherit;
      font-size: 0.85rem;
    }
    .dash-link:hover { border-color: var(--accent); color: var(--accent); }
    .panel { display: none; }
    .panel.active { display: block; }
    .stats-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
      gap: 0.75rem;
      margin-bottom: 1.5rem;
    }
    .stat-card {
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: var(--radius);
      padding: 1rem;
      text-align: center;
    }
    .stat-card .num { font-size: 2rem; font-weight: 700; line-height: 1.1; }
    .stat-card .label { font-size: 0.8rem; color: var(--muted); margin-top: 0.25rem; }
    .stat-card.simon .num { color: var(--simon); }
    .stat-card.gaythan .num { color: var(--gaythan); }
    .stat-card.both .num { color: var(--both); }
    .stat-card.accent .num { color: var(--accent); }
    .toolbar {
      display: flex;
      flex-wrap: wrap;
      gap: 0.75rem;
      align-items: center;
      margin-bottom: 1rem;
    }
    .toolbar input, .toolbar select {
      background: var(--surface);
      border: 1px solid var(--border);
      color: var(--text);
      padding: 0.5rem 0.75rem;
      border-radius: 8px;
      font: inherit;
      font-size: 0.9rem;
      min-width: 0;
    }
    .toolbar input { flex: 1 1 200px; }
    .count { color: var(--muted); font-size: 0.85rem; margin-left: auto; }
    .table-wrap {
      overflow-x: auto;
      border: 1px solid var(--border);
      border-radius: var(--radius);
      background: var(--surface);
    }
    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 0.875rem;
    }
    th, td {
      padding: 0.65rem 0.75rem;
      text-align: left;
      vertical-align: top;
      border-bottom: 1px solid var(--border);
    }
    th {
      background: var(--surface2);
      color: var(--muted);
      font-weight: 600;
      font-size: 0.75rem;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      cursor: pointer;
      user-select: none;
      white-space: nowrap;
    }
    th:hover { color: var(--text); }
    th.sorted-asc::after { content: " ▲"; color: var(--accent); }
    th.sorted-desc::after { content: " ▼"; color: var(--accent); }
    tr:last-child td { border-bottom: none; }
    tr:hover td { background: rgba(255,255,255,0.02); }
    td.date { white-space: nowrap; font-variant-numeric: tabular-nums; }
    td.quote { color: #c5d0de; max-width: 28rem; }
    .badge {
      display: inline-block;
      padding: 0.15rem 0.5rem;
      border-radius: 999px;
      font-size: 0.75rem;
      font-weight: 600;
      white-space: nowrap;
    }
    .badge-simon { background: rgba(91,159,212,0.2); color: var(--simon); }
    .badge-gaythan { background: rgba(224,122,95,0.2); color: var(--gaythan); }
    .badge-both { background: rgba(180,142,173,0.2); color: var(--both); }
    .badge-confirmed { background: rgba(61,214,140,0.15); color: var(--confirmed); }
    .badge-fizzled { background: rgba(242,204,96,0.15); color: var(--fizzled); }
    .badge-muted { background: rgba(139,156,179,0.15); color: var(--muted); }
    .summary-block {
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: var(--radius);
      padding: 1rem 1.25rem;
      margin-bottom: 1rem;
    }
    .summary-block h2 { margin: 0 0 0.75rem; font-size: 1rem; color: var(--accent); }
    .summary-block ul { margin: 0; padding-left: 1.25rem; color: #c5d0de; }
    .summary-block li { margin-bottom: 0.35rem; }
    .empty { padding: 2rem; text-align: center; color: var(--muted); }
    /* Methodology panel */
    .methodology-wrap { max-width: 900px; }
    .method-intro { color: var(--muted); margin-bottom: 1.5rem; font-size: 0.95rem; }
    .methodology-wrap section { margin-bottom: 2rem; scroll-margin-top: 1rem; }
    .methodology-wrap h2 {
      font-size: 1.15rem;
      color: var(--accent);
      margin: 0 0 0.75rem;
      padding-bottom: 0.4rem;
      border-bottom: 1px solid var(--border);
    }
    .methodology-wrap h3 { font-size: 1rem; margin: 1rem 0 0.5rem; }
    .methodology-wrap p { color: #c5d0de; margin: 0 0 0.75rem; }
    .methodology-wrap ul, .methodology-wrap ol {
      margin: 0 0 1rem;
      padding-left: 1.35rem;
      color: #c5d0de;
    }
    .methodology-wrap li { margin-bottom: 0.35rem; }
    .methodology-wrap table {
      margin-bottom: 1rem;
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: var(--radius);
      overflow: hidden;
    }
    code, .path {
      font-family: ui-monospace, Consolas, monospace;
      font-size: 0.85em;
      background: var(--code-bg);
      padding: 0.15rem 0.4rem;
      border-radius: 4px;
      color: #a8d4ff;
    }
    .card {
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: var(--radius);
      padding: 1rem 1.25rem;
      margin-bottom: 1rem;
      color: #c5d0de;
      font-size: 0.875rem;
      line-height: 1.7;
    }
    .card.warn { border-color: rgba(242,204,96,0.4); background: rgba(242,204,96,0.06); }
    .tag {
      display: inline-block;
      padding: 0.1rem 0.45rem;
      border-radius: 999px;
      font-size: 0.75rem;
      font-weight: 600;
    }
    .tag-in { background: rgba(61,214,140,0.15); color: var(--accent); }
    .tag-out { background: rgba(224,122,95,0.15); color: var(--gaythan); }
    footer.page-footer {
      text-align: center;
      padding: 1.25rem 1rem 2rem;
      color: var(--muted);
      font-size: 0.8rem;
      border-top: 1px solid var(--border);
    }
    .timeline-legend {
      display: flex;
      flex-wrap: wrap;
      gap: 1rem 1.5rem;
      align-items: center;
      padding: 0.75rem 1rem;
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: var(--radius);
      margin-bottom: 1rem;
      font-size: 0.9rem;
    }
    .timeline-legend .dot {
      display: inline-block;
      width: 10px;
      height: 10px;
      border-radius: 50%;
      margin-right: 0.35rem;
      vertical-align: middle;
    }
    .timeline-legend .dot.simon { background: var(--simon); }
    .timeline-legend .dot.gaythan { background: var(--gaythan); }
    .timeline-legend .dot.both { background: var(--both); }
    .timeline-legend .tl-note { color: var(--muted); font-size: 0.8rem; margin-left: auto; }
    .chart-lead { color: var(--muted); margin: 0 0 1rem; font-size: 0.9rem; }
    .chart-card {
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: var(--radius);
      padding: 1rem 1.25rem;
      margin-bottom: 1.25rem;
    }
    .chart-card h3 { margin: 0 0 0.35rem; font-size: 1rem; color: var(--accent); }
    .chart-sub { margin: 0 0 0.75rem; color: var(--muted); font-size: 0.85rem; }
    .chart-wrap { position: relative; width: 100%; }
    .chart-wrap canvas { width: 100%; display: block; background: #0f1419; border-radius: 8px; }
    .chart-tip {
      display: none;
      position: absolute;
      z-index: 10;
      max-width: 280px;
      padding: 0.6rem 0.75rem;
      background: var(--surface2);
      border: 1px solid var(--border);
      border-radius: 8px;
      font-size: 0.8rem;
      line-height: 1.4;
      color: #c5d0de;
      pointer-events: none;
      box-shadow: 0 8px 24px rgba(0,0,0,0.4);
    }
    .chart-grid-2 {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 1rem;
    }
    @media (max-width: 900px) { .chart-grid-2 { grid-template-columns: 1fr; } }
    .chart-grid-3 {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 1rem;
    }
    @media (max-width: 1000px) { .chart-grid-3 { grid-template-columns: 1fr; } }
    .pie-legend { font-size: 0.8rem; color: var(--muted); margin-top: 0.5rem; line-height: 1.6; }
    .excuse-list { margin: 0; padding: 0; list-style: none; }
    .excuse-list li {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      padding: 0.45rem 0;
      border-bottom: 1px solid var(--border);
      font-size: 0.9rem;
    }
    .excuse-list .rank { color: var(--accent); font-weight: 700; width: 1.5rem; }
    .excuse-list .bar-bg { flex: 1; height: 8px; background: var(--code-bg); border-radius: 4px; overflow: hidden; }
    .excuse-list .bar-fill { height: 100%; border-radius: 4px; }
    .notice-callout {
      background: rgba(224, 122, 95, 0.12);
      border: 1px solid rgba(224, 122, 95, 0.35);
      border-radius: var(--radius);
      padding: 0.75rem 1rem;
      margin-bottom: 1rem;
      font-size: 0.9rem;
    }
    .notice-callout strong { color: #f0a090; }
    .worst-notice { font-size: 0.85rem; color: #c5d0de; }
    .worst-notice li { margin: 0.35rem 0; }
    .wk-flow { display: flex; flex-direction: column; gap: 0.75rem; }
    .wk-flow-card {
      border: 1px solid var(--border);
      border-radius: var(--radius);
      padding: 0.75rem 1rem;
      background: var(--surface2);
    }
    .wk-flow-card.confirmed { border-left: 3px solid var(--confirmed); }
    .wk-flow-card.fizzled { border-left: 3px solid var(--fizzled); }
    .wk-flow-top { display: flex; gap: 0.5rem; margin-bottom: 0.5rem; }
    .wk-flow-row { display: flex; align-items: stretch; gap: 0.5rem; flex-wrap: wrap; }
    .wk-node { flex: 1 1 200px; min-width: 0; }
    .wk-arrow { align-self: center; color: var(--accent); font-size: 1.25rem; font-weight: bold; }
    .wk-label { font-size: 0.7rem; text-transform: uppercase; color: var(--muted); }
    .wk-date { font-weight: 600; font-size: 0.9rem; }
    .wk-snippet { font-size: 0.8rem; color: #c5d0de; margin-top: 0.25rem; }
    @media (max-width: 640px) {
      header h1 { font-size: 1.25rem; }
      .stats-grid { grid-template-columns: repeat(2, 1fr); }
      th, td { padding: 0.5rem; font-size: 0.8rem; }
      .count { width: 100%; margin-left: 0; }
    }
  </style>
</head>
<body>
  <header>
    <h1>Golf skip / no-show review</h1>
    <p>WhatsApp chat analysis · Simon &amp; Gaythan · 2020–2026 · executive dashboard</p>
    <nav class="tabs" role="tablist">
      <button class="tab active" data-tab="dashboard" role="tab">Dashboard</button>
      <button class="tab" data-tab="confirmed" role="tab">Confirmed no-shows</button>
      <button class="tab" data-tab="weekday" role="tab">Weekday → weekend</button>
      <button class="tab" data-tab="borderline" role="tab">Borderline</button>
      <button class="tab" data-tab="timeline" role="tab">Over time</button>
      <button class="tab" data-tab="audit" role="tab">Audit trail</button>
      <button class="tab" data-tab="methodology" role="tab">Methodology</button>
    </nav>
  </header>
  <main>
    <section id="panel-dashboard" class="panel active" role="tabpanel"></section>
    <section id="panel-confirmed" class="panel" role="tabpanel"></section>
    <section id="panel-weekday" class="panel" role="tabpanel"></section>
    <section id="panel-borderline" class="panel" role="tabpanel"></section>
    <section id="panel-timeline" class="panel" role="tabpanel"></section>
    <section id="panel-audit" class="panel" role="tabpanel"></section>
    <section id="panel-methodology" class="panel" role="tabpanel">
      <!--__METHODOLOGY__-->
    </section>
  </main>
  <footer class="page-footer">Self-contained report · August 2026 · all data and methodology in this file  </footer>
  <div id="prank-modal" style="display:none;position:fixed;inset:0;z-index:80;background:rgba(0,0,0,.78);align-items:center;justify-content:center;padding:.75rem">
    <div style="background:#111;border-radius:12px;width:min(40rem,100%);max-height:94vh;overflow:auto;padding:.75rem">
      <div id="rick-embed" style="position:relative;width:100%;padding-bottom:56.25%;background:#000;border-radius:8px;overflow:hidden;margin-bottom:.75rem"></div>
      <div style="background:#140808;border:4px double #c94c4c;color:#f0d0d0;padding:1rem .9rem;text-align:center">
        <h2 style="margin:0 0 .35rem;color:#ff6b6b;letter-spacing:.08em;font-size:.85rem;text-transform:uppercase">Independent Reliability Rating</h2>
        <p>Certified finding (banter edition)</p>
        <p style="font-size:1.05rem;font-weight:700;color:#fff">Nathan is more unreliable than a North Korean ICBM.</p>
        <p style="font-size:.72rem;color:#c9b">Joke / group-chat energy only — not an intelligence assessment, not a real missile rating. The Audit trail table is the actual golf evidence. Press play if the clip is paused.</p>
        <button type="button" class="dash-link" id="prank-close">Back to the real numbers</button>
      </div>
    </div>
  </div>
  <script>
    const DATA = /*__DATA__*/;

    function esc(s) {
      if (s == null) return "";
      return String(s)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
    }

    function whoBadge(who) {
      if (!who) return '<span class="badge badge-muted">—</span>';
      const w = who.toLowerCase();
      let cls = "badge-muted";
      if (w.includes("simon") && !w.includes("gaythan") && !w.includes("both")) cls = "badge-simon";
      else if (w.includes("gaythan") && !w.includes("simon") && !w.includes("both")) cls = "badge-gaythan";
      else if (w.includes("both") || (w.includes("simon") && w.includes("gaythan"))) cls = "badge-both";
      else if (w.includes("simon")) cls = "badge-simon";
      else if (w.includes("gaythan")) cls = "badge-gaythan";
      return `<span class="badge ${cls}">${esc(who)}</span>`;
    }

    function typeBadge(t) {
      const cls = t === "confirmed" ? "badge-confirmed" : "badge-fizzled";
      return `<span class="badge ${cls}">${esc(t)}</span>`;
    }

    function switchToTab(tabId) {
      document.querySelectorAll(".tab").forEach(b => {
        b.classList.toggle("active", b.dataset.tab === tabId);
      });
      document.querySelectorAll(".panel").forEach(p => p.classList.remove("active"));
      const panel = document.getElementById("panel-" + tabId);
      if (panel) panel.classList.add("active");
      if (tabId === "timeline" && typeof renderTimelinePanel === "function") {
        renderTimelinePanel();
        setTimeout(() => { if (typeof initTimelineCharts === "function") initTimelineCharts(); }, 30);
      }
      if (tabId === "dashboard" && typeof initDashboardCharts === "function") {
        setTimeout(() => initDashboardCharts(), 30);
      }
      if (tabId === "audit") renderShareAudit();
    }

    function renderShareAudit() {
      const panel = document.getElementById("panel-audit");
      if (!panel || panel.dataset.built) return;
      const s = DATA.stats;
      const notice = (DATA.analytics && DATA.analytics.notice) || [];
      const byDate = {};
      notice.forEach(n => { byDate[n.date] = n; });
      const rows = DATA.confirmed.map(r => {
        const n = byDate[r.Date] || {};
        return {
          Date: r.Date,
          WhoSkipped: r.WhoSkipped,
          Planned: r.Planned,
          Reason: r.Reason,
          Outcome: r.Outcome,
          cancel_iso: n.cancel_iso || "",
          session_iso: n.session_iso || "",
          notice_hours: n.notice_hours == null ? "" : String(n.notice_hours) + "h",
          category: n.category || "",
        };
      });
      panel.innerHTML = `
        <p class="dashboard-lead">Evidence ledger — same ${s.confirmed_total} confirmed rows as the tables (Simon ${s.simon}, Gaythan ${s.gaythan}, Both ${s.both}). Search phrases: golf; weekend/Saturday/Sunday; skip/bail/cancel; don't fancy; shall I cancel.</p>
        <div id="audit-table"></div>
        <p class="chart-sub">The table above is the real audit. Verify buttons are the comedy path.</p>
        <div class="btn-row" style="display:flex;flex-wrap:wrap;gap:.5rem;margin:1rem 0">
          <button type="button" class="dash-link" data-prank="1">Verify against original messages</button>
          <button type="button" class="dash-link" data-prank="1">Open source evidence</button>
          <button type="button" class="dash-link" data-prank="1">Cryptographic hash of chat</button>
        </div>`;
      makeTable("audit-table", [
        { key: "Date", label: "Date", cls: "date" },
        { key: "WhoSkipped", label: "Who skipped", badge: "who" },
        { key: "Planned", label: "Planned session" },
        { key: "Reason", label: "Skip quote", cls: "quote" },
        { key: "cancel_iso", label: "Cancel timestamp" },
        { key: "session_iso", label: "Inferred session" },
        { key: "notice_hours", label: "Notice" },
        { key: "category", label: "Excuse tag" },
        { key: "Outcome", label: "Outcome", cls: "quote" },
      ], rows, { whoKey: "WhoSkipped", whoFilter: true });
      panel.dataset.built = "1";
      function closeSharePrank() {
        const m = document.getElementById("prank-modal");
        const wrap = document.getElementById("rick-embed");
        if (m) m.style.display = "none";
        if (wrap) wrap.innerHTML = "";
      }
      panel.querySelectorAll("[data-prank]").forEach(btn => {
        btn.onclick = () => {
          const m = document.getElementById("prank-modal");
          const wrap = document.getElementById("rick-embed");
          if (wrap) wrap.innerHTML = '<iframe title="Never Gonna Give You Up" src="https://www.youtube.com/embed/dQw4w9WgXcQ?autoplay=1&rel=0&playsinline=1" style="position:absolute;inset:0;width:100%;height:100%;border:0" allow="autoplay; encrypted-media; fullscreen; picture-in-picture" allowfullscreen></iframe>';
          if (m) m.style.display = "flex";
        };
      });
      const prankCloseBtn = document.getElementById("prank-close");
      if (prankCloseBtn) prankCloseBtn.onclick = closeSharePrank;
    }

    function makeTable(containerId, columns, rows, options = {}) {
      const container = document.getElementById(containerId);
      const uid = containerId.replace("panel-", "");
      let sortCol = options.defaultSort || 0;
      let sortDir = 1;
      let filterWho = "";
      let filterType = "";
      let search = "";

      function filteredRows() {
        return rows.filter(r => {
          if (filterWho && !(r[options.whoKey] || "").toLowerCase().includes(filterWho.toLowerCase())) return false;
          if (filterType && r.Type !== filterType) return false;
          if (search) {
            const hay = columns.map(c => r[c.key] || "").join(" ").toLowerCase();
            if (!hay.includes(search.toLowerCase())) return false;
          }
          return true;
        });
      }

      function sortedRows(list) {
        const col = columns[sortCol];
        return [...list].sort((a, b) => {
          const av = (a[col.key] || "").toLowerCase();
          const bv = (b[col.key] || "").toLowerCase();
          if (av < bv) return -1 * sortDir;
          if (av > bv) return 1 * sortDir;
          return 0;
        });
      }

      function draw() {
        const list = sortedRows(filteredRows());
        const whoOpts = options.whoFilter
          ? `<select id="f-who-${uid}"><option value="">All who</option>
             <option value="simon">Simon</option><option value="gaythan">Gaythan</option>
             <option value="both">Both</option></select>` : "";
        const typeOpts = options.typeFilter
          ? `<select id="f-type-${uid}"><option value="">All types</option>
             <option value="confirmed">Confirmed</option><option value="fizzled">Fizzled</option></select>` : "";

        container.innerHTML = `
          <div class="toolbar">
            <input type="search" id="f-search-${uid}" placeholder="Search…" value="${esc(search)}">
            ${whoOpts}${typeOpts}
            <span class="count">${list.length} of ${rows.length} rows</span>
          </div>
          <div class="table-wrap">
            <table>
              <thead><tr>${columns.map((c, i) =>
                `<th data-col="${i}" class="${sortCol === i ? (sortDir === 1 ? "sorted-asc" : "sorted-desc") : ""}">${esc(c.label)}</th>`
              ).join("")}</tr></thead>
              <tbody>${list.length ? list.map(r => `<tr>${columns.map(c => {
                let v = r[c.key] || "";
                if (c.badge === "who") v = whoBadge(v);
                else if (c.badge === "type") v = typeBadge(v);
                else v = esc(v);
                return `<td class="${c.cls || ""}">${v}</td>`;
              }).join("")}</tr>`).join("") : `<tr><td colspan="${columns.length}" class="empty">No matching rows</td></tr>`}
              </tbody>
            </table>
          </div>`;

        document.getElementById(`f-search-${uid}`).oninput = e => { search = e.target.value; draw(); };
        if (options.whoFilter) {
          const el = document.getElementById(`f-who-${uid}`);
          el.value = filterWho;
          el.onchange = e => { filterWho = e.target.value; draw(); };
        }
        if (options.typeFilter) {
          const el = document.getElementById(`f-type-${uid}`);
          el.value = filterType;
          el.onchange = e => { filterType = e.target.value; draw(); };
        }
        container.querySelectorAll("th").forEach(th => {
          th.onclick = () => {
            const col = +th.dataset.col;
            if (sortCol === col) sortDir *= -1;
            else { sortCol = col; sortDir = 1; }
            draw();
          };
        });
      }
      draw();
    }

    document.querySelectorAll(".tab[data-tab]").forEach(btn => {
      btn.onclick = () => switchToTab(btn.dataset.tab);
    });
    const prankClose = document.getElementById("prank-close");
    if (prankClose) prankClose.onclick = () => {
      const m = document.getElementById("prank-modal");
      const wrap = document.getElementById("rick-embed");
      if (m) m.style.display = "none";
      if (wrap) wrap.innerHTML = "";
    };

    if (typeof renderDashboardPanel === "function") renderDashboardPanel();
    setTimeout(() => { if (typeof initDashboardCharts === "function") initDashboardCharts(); }, 40);
    makeTable("panel-confirmed", [
      { key: "Date", label: "Date", cls: "date" },
      { key: "WhoSkipped", label: "Who skipped", badge: "who" },
      { key: "Planned", label: "Planned" },
      { key: "Reason", label: "Reason / quote", cls: "quote" },
      { key: "Outcome", label: "Outcome", cls: "quote" },
    ], DATA.confirmed, { whoKey: "WhoSkipped", whoFilter: true, defaultSort: 0 });

    makeTable("panel-weekday", [
      { key: "WeekdayDate", label: "Weekday", cls: "date" },
      { key: "WhoMentionedPlanned", label: "Who planned", badge: "who" },
      { key: "WeekendDatePlanned", label: "Weekend", cls: "date" },
      { key: "Type", label: "Type", badge: "type" },
      { key: "MidWeekQuote", label: "Mid-week", cls: "quote" },
      { key: "WeekendOutcome", label: "Weekend outcome", cls: "quote" },
      { key: "WhoFailed", label: "Who failed", badge: "who" },
    ], DATA.weekday, { whoKey: "WhoFailed", whoFilter: true, typeFilter: true, defaultSort: 0 });

    makeTable("panel-borderline", [
      { key: "Date", label: "Date", cls: "date" },
      { key: "Who", label: "Who", badge: "who" },
      { key: "Notes", label: "Notes", cls: "quote" },
    ], DATA.borderline, { whoKey: "Who", whoFilter: true, defaultSort: 0 });

    /*__TIMELINE_JS__*/
  </script>
</body>
</html>
"""


if __name__ == "__main__":
    main()
