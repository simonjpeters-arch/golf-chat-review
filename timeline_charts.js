/* Embedded in share.html — offline canvas charts. Requires global DATA. */
(function () {
  const COL = { Simon: "#5b9fd4", Gaythan: "#e07a5f", Both: "#b48ead", muted: "#8b9cb3" };
  const LANE = { Simon: 0, Gaythan: 1, Both: 2 };
  const EXCUSE_COL = {
    "Don't fancy / mood": "#e07a5f",
    "Injury / physical": "#5b9fd4",
    "Other plans / work / social": "#f2cc60",
    "Social / dating / night out": "#b48ead",
    "Forgot / logistics": "#81a1c1",
    "Travel / schedule": "#3dd68c",
    "Other / unclear": "#8b9cb3",
  };
  const BUCKET_ORDER = [
    "After start / none",
    "<2 hours",
    "Same day (2-6h)",
    "Same day (6h+)",
    "Previous day",
    "2-3 days",
    "3+ days",
    "Unknown",
  ];

  function parseLooseDate(s) {
    const m = String(s || "").match(/(\d{1,2})\/(\d{1,2})\/(\d{2,4})/);
    if (!m) return null;
    let y = parseInt(m[3], 10);
    if (y < 100) y += 2000;
    return new Date(y, parseInt(m[1], 10) - 1, parseInt(m[2], 10));
  }

  function fmtDate(d) {
    return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
  }

  function quarterKey(d) {
    const q = Math.floor(d.getMonth() / 3) + 1;
    return `${d.getFullYear()}-Q${q}`;
  }

  function quarterLabel(key) {
    const [y, q] = key.split("-");
    return `${q} ${y.slice(2)}`;
  }

  function setupCanvas(canvas) {
    const dpr = window.devicePixelRatio || 1;
    const w = canvas.clientWidth || canvas.offsetWidth || 800;
    const h = parseInt(canvas.getAttribute("height") || "280", 10);
    canvas.width = Math.floor(w * dpr);
    canvas.height = Math.floor(h * dpr);
    canvas.style.height = h + "px";
    const ctx = canvas.getContext("2d");
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    return { ctx, w, h };
  }

  function prepEvents() {
    return DATA.confirmed
      .map((r) => ({
        date: parseLooseDate(r.Date),
        who: r.WhoSkipped,
        reason: (r.Reason || "").slice(0, 120),
        planned: r.Planned || "",
        raw: r,
      }))
      .filter((e) => e.date)
      .sort((a, b) => a.date - b.date);
  }

  let timelineReady = false;
  let dashboardReady = false;

  function pid(scope, name) {
    return (scope === "dash" ? "dash-" : "") + name;
  }

  function drawScatter(canvas, tipEl, compact) {
    const events = prepEvents();
    if (!events.length) return;
    const { ctx, w, h } = setupCanvas(canvas);
    const pad = compact ? { l: 44, r: 12, t: 18, b: 28 } : { l: 52, r: 16, t: 24, b: 36 };
    const minT = events[0].date.getTime();
    const maxT = events[events.length - 1].date.getTime();
    const span = maxT - minT || 1;
    const laneH = (h - pad.t - pad.b) / 3;

    ctx.fillStyle = "#0f1419";
    ctx.fillRect(0, 0, w, h);

    const scatterPoints = [];
    ["Simon", "Gaythan", "Both"].forEach((name, i) => {
      const y = pad.t + laneH * i + laneH / 2;
      ctx.fillStyle = COL.muted;
      ctx.font = (compact ? "10px" : "12px") + " Segoe UI, system-ui, sans-serif";
      ctx.textAlign = "right";
      ctx.fillText(name, pad.l - 8, y + 4);
      ctx.strokeStyle = "#2d3a4f";
      ctx.beginPath();
      ctx.moveTo(pad.l, y);
      ctx.lineTo(w - pad.r, y);
      ctx.stroke();
    });

    events.forEach((ev, idx) => {
      const lane = LANE[ev.who] ?? 1;
      const x = pad.l + ((ev.date.getTime() - minT) / span) * (w - pad.l - pad.r);
      const y = pad.t + laneH * lane + laneH / 2;
      const r = compact ? 5 : 7;
      ctx.beginPath();
      ctx.fillStyle = COL[ev.who] || COL.muted;
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#0f1419";
      ctx.lineWidth = 2;
      ctx.stroke();
      scatterPoints.push({ x, y, r: r + 4, ev, idx });
    });

    ctx.fillStyle = COL.muted;
    ctx.font = "11px Segoe UI, system-ui, sans-serif";
    ctx.textAlign = "center";
    const years = [...new Set(events.map((e) => e.date.getFullYear()))];
    years.forEach((yr) => {
      const d = new Date(yr, 0, 1);
      if (d.getTime() < minT || d.getTime() > maxT) return;
      const x = pad.l + ((d.getTime() - minT) / span) * (w - pad.l - pad.r);
      ctx.fillText(String(yr), x, h - 10);
    });

    if (!tipEl) return;
    canvas.onmousemove = (e) => {
      const rect = canvas.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;
      let hit = null;
      for (const p of scatterPoints) {
        if ((mx - p.x) ** 2 + (my - p.y) ** 2 <= p.r ** 2) {
          hit = p;
          break;
        }
      }
      if (!hit) {
        tipEl.style.display = "none";
        return;
      }
      tipEl.style.display = "block";
      tipEl.innerHTML = `<strong>${fmtDate(hit.ev.date)} · ${hit.ev.who}</strong><br>${hit.ev.planned}<br><em>${hit.ev.reason}</em>`;
      let left = e.clientX - rect.left + 12;
      let top = e.clientY - rect.top + 12;
      tipEl.style.left = left + "px";
      tipEl.style.top = top + "px";
    };
    canvas.onmouseleave = () => {
      tipEl.style.display = "none";
    };
  }

  function drawQuarterly(canvas) {
    const events = prepEvents();
    const { ctx, w, h } = setupCanvas(canvas);
    const pad = { l: 44, r: 12, t: 20, b: 52 };
    const buckets = {};
    events.forEach((ev) => {
      const k = quarterKey(ev.date);
      if (!buckets[k]) buckets[k] = { Simon: 0, Gaythan: 0, Both: 0 };
      buckets[k][ev.who] = (buckets[k][ev.who] || 0) + 1;
    });
    const keys = Object.keys(buckets).sort();
    const max = Math.max(1, ...keys.map((k) => buckets[k].Simon + buckets[k].Gaythan + buckets[k].Both));
    const barW = Math.max(8, (w - pad.l - pad.r) / keys.length - 4);

    ctx.fillStyle = "#0f1419";
    ctx.fillRect(0, 0, w, h);

    keys.forEach((k, i) => {
      const x = pad.l + i * (barW + 4);
      let yBase = h - pad.b;
      ["Simon", "Gaythan", "Both"].forEach((who) => {
        const n = buckets[k][who] || 0;
        const bh = (n / max) * (h - pad.t - pad.b);
        if (n === 0) return;
        ctx.fillStyle = COL[who];
        ctx.fillRect(x, yBase - bh, barW, bh);
        yBase -= bh;
      });
      ctx.fillStyle = COL.muted;
      ctx.font = "10px Segoe UI, system-ui, sans-serif";
      ctx.textAlign = "center";
      ctx.save();
      ctx.translate(x + barW / 2, h - 8);
      ctx.rotate(-0.5);
      ctx.fillText(quarterLabel(k), 0, 0);
      ctx.restore();
    });

    ctx.fillStyle = COL.muted;
    ctx.font = "12px Segoe UI, system-ui, sans-serif";
    ctx.textAlign = "left";
    ctx.fillText("Skips per quarter (stacked: Simon → Gaythan → Both)", pad.l, 14);
  }

  function drawCumulative(canvas, compact) {
    const events = prepEvents();
    const { ctx, w, h } = setupCanvas(canvas);
    const pad = { l: 44, r: 16, t: 24, b: 36 };
    let s = 0,
      g = 0,
      b = 0;
    const ptsS = [];
    const ptsG = [];
    const minT = events[0].date.getTime();
    const maxT = events[events.length - 1].date.getTime();
    const span = maxT - minT || 1;

    events.forEach((ev) => {
      if (ev.who === "Simon") s++;
      else if (ev.who === "Gaythan") g++;
      else if (ev.who === "Both") b++;
      const x = pad.l + ((ev.date.getTime() - minT) / span) * (w - pad.l - pad.r);
      ptsS.push({ x, y: s });
      ptsG.push({ x, y: g });
    });

    const maxY = Math.max(s, g, b, 1);

    ctx.fillStyle = "#0f1419";
    ctx.fillRect(0, 0, w, h);

    function drawLine(pts, color, label) {
      ctx.strokeStyle = color;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      pts.forEach((p, i) => {
        const y = h - pad.b - (p.y / maxY) * (h - pad.t - pad.b);
        if (i === 0) ctx.moveTo(p.x, y);
        else ctx.lineTo(p.x, y);
      });
      ctx.stroke();
      const last = pts[pts.length - 1];
      const ly = h - pad.b - (last.y / maxY) * (h - pad.t - pad.b);
      ctx.fillStyle = color;
      ctx.font = "12px Segoe UI, system-ui, sans-serif";
      ctx.textAlign = "left";
      ctx.fillText(`${label}: ${last.y}`, last.x + 6, ly + 4);
    }

    drawLine(ptsS, COL.Simon, "Simon");
    drawLine(ptsG, COL.Gaythan, "Gaythan");

    if (!compact) {
      ctx.fillStyle = COL.muted;
      ctx.font = "11px Segoe UI, system-ui, sans-serif";
      ctx.fillText("Running total of confirmed skips (mutual rounds count once on Both lane only in scatter)", pad.l, 14);
    }
  }

  function drawPie(canvas, slices, title) {
    const total = slices.reduce((a, s) => a + s.value, 0) || 1;
    const { ctx, w, h } = setupCanvas(canvas);
    const cx = w / 2;
    const cy = h / 2 - 8;
    const r = Math.min(w, h) * 0.32;
    let a0 = -Math.PI / 2;
    ctx.fillStyle = "#0f1419";
    ctx.fillRect(0, 0, w, h);
    slices.forEach((s) => {
      const a1 = a0 + (s.value / total) * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.fillStyle = s.color;
      ctx.arc(cx, cy, r, a0, a1);
      ctx.closePath();
      ctx.fill();
      a0 = a1;
    });
    ctx.beginPath();
    ctx.fillStyle = "#0f1419";
    ctx.arc(cx, cy, r * 0.52, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = COL.muted;
    ctx.font = "11px Segoe UI, system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(title, cx, cy - 4);
    ctx.fillStyle = "#e8edf4";
    ctx.font = "bold 18px Segoe UI, system-ui, sans-serif";
    ctx.fillText(String(total), cx, cy + 16);
  }

  function drawAttributionPies(scope) {
    const s = DATA.stats;
    const whoEl = document.getElementById(pid(scope, "chart-pie-who"));
    const excEl = document.getElementById(pid(scope, "chart-pie-excuse"));
    if (whoEl) {
      drawPie(
        whoEl,
        [
          { label: "Simon", value: s.simon, color: COL.Simon },
          { label: "Gaythan", value: s.gaythan, color: COL.Gaythan },
          { label: "Both", value: s.both, color: COL.Both },
        ],
        "Skips"
      );
    }
    const cats = (DATA.analytics && DATA.analytics.excuse_categories) || [];
    if (excEl) {
      drawPie(
        excEl,
        cats.map((c) => ({
          label: c.category,
          value: c.count,
          color: EXCUSE_COL[c.category] || COL.muted,
        })),
        "Reasons"
      );
    }
  }

  function renderTopExcuses(scope, asCards) {
    const el = document.getElementById(pid(scope, asCards ? "excuse-cards" : "excuse-top5"));
    if (!el) return;
    const top = (DATA.analytics && DATA.analytics.top_excuses) || [];
    if (asCards) {
      el.innerHTML = top
        .map(
          (t) => `<div class="excuse-card">
        <span class="exc-rank">#${t.rank}</span>
        <span>${t.category}</span>
        <span class="exc-count" style="color:${EXCUSE_COL[t.category] || COL.muted}">${t.count}</span>
      </div>`
        )
        .join("");
      return;
    }
    const max = Math.max(1, ...top.map((t) => t.count));
    el.innerHTML = top
      .map(
        (t) => `<li>
      <span class="rank">${t.rank}</span>
      <span style="flex:0 0 42%">${t.category}</span>
      <div class="bar-bg"><div class="bar-fill" style="width:${(t.count / max) * 100}%;background:${EXCUSE_COL[t.category] || COL.muted}"></div></div>
      <strong>${t.count}</strong>
    </li>`
      )
      .join("");
  }

  function renderNoticeCallout() {
    const el = document.getElementById("notice-callout");
    const ns = (DATA.analytics && DATA.analytics.notice_summary) || {};
    if (!el || ns.median_hours == null) return;
    el.innerHTML = `Median warning: <strong>${ns.median_hours} hours</strong> before inferred tee/session time
      (Simon median <strong>${ns.simon_median}h</strong>, Gaythan <strong>${ns.gaythan_median}h</strong>).
      <strong>${ns.under_2h}</strong> of ${ns.known_count} skips gave the other person <strong>&lt;2 hours</strong>;
      <strong>${ns.after_start}</strong> were after start time or effectively no notice.
      Mean ${ns.mean_hours}h — pulled up by a few early cancels.`;
  }

  function drawNoticeBuckets(canvas) {
    const buckets = (DATA.analytics && DATA.analytics.notice_buckets) || {};
    const { ctx, w, h } = setupCanvas(canvas);
    const pad = { l: 44, r: 12, t: 28, b: 72 };
    const labels = BUCKET_ORDER.filter((k) => buckets[k]);
    const vals = labels.map((k) => buckets[k] || 0);
    const max = Math.max(1, ...vals);
    const barW = Math.max(12, (w - pad.l - pad.r) / labels.length - 6);
    ctx.fillStyle = "#0f1419";
    ctx.fillRect(0, 0, w, h);
    labels.forEach((lab, i) => {
      const n = vals[i];
      const x = pad.l + i * (barW + 6);
      const bh = (n / max) * (h - pad.t - pad.b);
      const y = h - pad.b - bh;
      const hot = lab.includes("After") || lab.includes("<2");
      ctx.fillStyle = hot ? "#e07a5f" : "#5b9fd4";
      ctx.fillRect(x, y, barW, bh);
      ctx.fillStyle = "#e8edf4";
      ctx.font = "11px Segoe UI, system-ui, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(String(n), x + barW / 2, y - 4);
      ctx.fillStyle = COL.muted;
      ctx.font = "9px Segoe UI, system-ui, sans-serif";
      ctx.save();
      ctx.translate(x + barW / 2, h - 6);
      ctx.rotate(-0.55);
      ctx.fillText(lab, 0, 0);
      ctx.restore();
    });
    ctx.fillStyle = COL.muted;
    ctx.font = "12px Segoe UI, system-ui, sans-serif";
    ctx.textAlign = "left";
    ctx.fillText("How much warning the other person got (skip message → planned session)", pad.l, 16);
  }

  let noticeScatterPts = [];

  function drawNoticeScatter(canvas, tipEl) {
    const rows = (DATA.analytics && DATA.analytics.notice) || [];
    const pts = rows.filter((r) => r.notice_hours != null && r.session_iso);
    const { ctx, w, h } = setupCanvas(canvas);
    const pad = { l: 48, r: 16, t: 24, b: 40 };
    if (!pts.length) return;
    const dates = pts.map((p) => new Date(p.session_iso).getTime());
    const minT = Math.min(...dates);
    const maxT = Math.max(...dates);
    const span = maxT - minT || 1;
    const hours = pts.map((p) => p.notice_hours);
    const minH = Math.min(-2, ...hours);
    const maxH = Math.max(72, ...hours);
    const spanH = maxH - minH || 1;

    ctx.fillStyle = "#0f1419";
    ctx.fillRect(0, 0, w, h);
    const zeroY = h - pad.b - ((0 - minH) / spanH) * (h - pad.t - pad.b);
    ctx.strokeStyle = "#e07a5f";
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(pad.l, zeroY);
    ctx.lineTo(w - pad.r, zeroY);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = COL.muted;
    ctx.font = "10px Segoe UI, system-ui, sans-serif";
    ctx.fillText("0h = session start", pad.l + 4, zeroY - 6);

    noticeScatterPts = [];
    pts.forEach((p) => {
      const t = new Date(p.session_iso).getTime();
      const x = pad.l + ((t - minT) / span) * (w - pad.l - pad.r);
      const y = h - pad.b - ((p.notice_hours - minH) / spanH) * (h - pad.t - pad.b);
      ctx.beginPath();
      ctx.fillStyle = COL[p.who] || COL.muted;
      ctx.arc(x, y, 6, 0, Math.PI * 2);
      ctx.fill();
      noticeScatterPts.push({ x, y, r: 10, p });
    });
    ctx.fillStyle = COL.muted;
    ctx.font = "11px Segoe UI, system-ui, sans-serif";
    ctx.fillText("Hours of notice (log scale feel) vs session date — below line = late/no notice", pad.l, 14);

    canvas.onmousemove = (e) => {
      const rect = canvas.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;
      let hit = null;
      for (const pt of noticeScatterPts) {
        if ((mx - pt.x) ** 2 + (my - pt.y) ** 2 <= pt.r ** 2) {
          hit = pt;
          break;
        }
      }
      if (!hit) {
        tipEl.style.display = "none";
        return;
      }
      tipEl.style.display = "block";
      const h = hit.p.notice_hours;
      tipEl.innerHTML = `<strong>${hit.p.date} · ${hit.p.who}</strong><br>${h.toFixed(1)}h notice · ${hit.p.bucket}<br><em>${(hit.p.note || "").slice(0, 100)}</em>`;
      tipEl.style.left = mx + 12 + "px";
      tipEl.style.top = my + 12 + "px";
    };
    canvas.onmouseleave = () => {
      tipEl.style.display = "none";
    };
  }

  function renderWorstNotice(scope, limit) {
    const el = document.getElementById(pid(scope, "worst-notice"));
    if (!el) return;
    const worst = (DATA.analytics && DATA.analytics.worst_notice) || [];
    const n = limit || 6;
    el.innerHTML = `<ul class="worst-notice">${worst
      .slice(0, n)
      .map((w) => {
        const h = w.notice_hours;
        const label = h < 0 ? `${Math.abs(h).toFixed(1)}h after start` : `${h.toFixed(1)}h before`;
        return `<li><strong>${w.date}</strong> ${w.who} — ${label} · ${w.category}${w.note ? ` — <span style="color:var(--muted)">${w.note.slice(0, 70)}</span>` : ""}</li>`;
      })
      .join("")}</ul>`;
  }

  function drawWeekendFlow(container) {
    const rows = DATA.weekday || [];
    container.innerHTML = "";
    rows.forEach((r) => {
      const card = document.createElement("div");
      card.className = "wk-flow-card " + (r.Type === "fizzled" ? "fizzled" : "confirmed");
      const who = (r.WhoFailed || "").toLowerCase();
      let badge = "badge-muted";
      if (who.includes("simon") && !who.includes("gaythan")) badge = "badge-simon";
      else if (who.includes("gaythan") && !who.includes("simon")) badge = "badge-gaythan";
      else if (who.includes("both")) badge = "badge-both";
      card.innerHTML = `
        <div class="wk-flow-top">
          <span class="badge ${r.Type === "confirmed" ? "badge-confirmed" : "badge-fizzled"}">${r.Type}</span>
          <span class="badge ${badge}">${r.WhoFailed || "?"}</span>
        </div>
        <div class="wk-flow-row">
          <div class="wk-node"><div class="wk-label">Mid-week plan</div><div class="wk-date">${r.WeekdayDate}</div><div class="wk-snippet">${(r.MidWeekQuote || "").replace(/"/g, "'").slice(0, 90)}…</div></div>
          <div class="wk-arrow" aria-hidden="true">→</div>
          <div class="wk-node"><div class="wk-label">Weekend</div><div class="wk-date">${r.WeekendDatePlanned}</div><div class="wk-snippet">${(r.WeekendOutcome || "").replace(/"/g, "'").slice(0, 90)}…</div></div>
        </div>`;
      container.appendChild(card);
    });
  }

  function renderTimelineLegend() {
    const s = DATA.stats;
    const el = document.getElementById("timeline-legend");
    if (!el) return;
    el.innerHTML = `
      <span><i class="dot simon"></i> Simon <strong>${s.simon}</strong></span>
      <span><i class="dot gaythan"></i> Gaythan <strong>${s.gaythan}</strong></span>
      <span><i class="dot both"></i> Both <strong>${s.both}</strong></span>
      <span class="tl-note">42 dated confirmed skips · Jun 2020 – Jun 2025 · hover dots for quotes</span>`;
  }

  function redrawScope(scope, opts) {
    const compact = opts && opts.compact;
    drawAttributionPies(scope);
    renderTopExcuses(scope, scope === "dash");
    if (scope === "tl") renderNoticeCallout();
    renderWorstNotice(scope, scope === "dash" ? 5 : 6);
    const buckets = document.getElementById(pid(scope, "chart-notice-buckets"));
    if (buckets) drawNoticeBuckets(buckets);
    if (scope === "tl") {
      drawNoticeScatter(document.getElementById("chart-notice-scatter"), document.getElementById("tip-notice"));
    }
    const scatter = document.getElementById(pid(scope, "chart-scatter"));
    const tip = document.getElementById(pid(scope, "tip-scatter"));
    if (scatter) drawScatter(scatter, tip, compact);
    const q = document.getElementById(pid(scope, "chart-quarterly"));
    if (q) drawQuarterly(q);
    const cum = document.getElementById(pid(scope, "chart-cumulative"));
    if (cum) drawCumulative(cum, compact);
  }

  function drawWeekendStrip(container) {
    if (!container) return;
    const rows = DATA.weekday || [];
    container.innerHTML = rows
      .map((r) => {
        const cls = r.Type === "fizzled" ? "fizzled" : "confirmed";
        return `<div class="wk-strip-item ${cls}">
        <div><span class="badge ${r.Type === "confirmed" ? "badge-confirmed" : "badge-fizzled"}">${r.Type}</span>
        ${r.WhoFailed || ""}</div>
        <div style="margin-top:0.35rem"><strong>${r.WeekdayDate}</strong> → ${r.WeekendDatePlanned}</div>
        <div style="color:var(--muted);margin-top:0.25rem">${(r.WeekendOutcome || "").replace(/"/g, "'").slice(0, 55)}…</div>
      </div>`;
      })
      .join("");
  }

  window.initDashboardCharts = function () {
    redrawScope("dash", { compact: true });
    drawWeekendStrip(document.getElementById("dash-wk-strip"));
    dashboardReady = true;
  };

  window.initTimelineCharts = function () {
    if (timelineReady) {
      redrawScope("tl");
      return;
    }
    renderTimelineLegend();
    redrawScope("tl");
    drawWeekendFlow(document.getElementById("wk-flow"));
    timelineReady = true;
  };

  window.renderDashboardPanel = function () {
    const panel = document.getElementById("panel-dashboard");
    if (!panel || panel.dataset.built) return;
    const s = DATA.stats;
    const ns = (DATA.analytics && DATA.analytics.notice_summary) || {};
    const pctSame =
      ns.known_count && ns.same_day != null
        ? Math.round((ns.same_day / ns.known_count) * 100)
        : "—";
    panel.innerHTML = `
      <p class="dashboard-lead">Executive view — 42 confirmed golf skips from WhatsApp (2020–2025). Same data as the tables; charts are offline in this file.</p>
      <div class="kpi-row">
        <div class="kpi kpi-accent"><div class="kpi-val">${s.confirmed_total}</div><div class="kpi-lbl">Confirmed skips</div></div>
        <div class="kpi kpi-simon"><div class="kpi-val">${s.simon}</div><div class="kpi-lbl">Simon skipped</div></div>
        <div class="kpi kpi-gaythan"><div class="kpi-val">${s.gaythan}</div><div class="kpi-lbl">Gaythan skipped</div></div>
        <div class="kpi kpi-both"><div class="kpi-val">${s.both}</div><div class="kpi-lbl">Both skipped</div></div>
        <div class="kpi kpi-accent"><div class="kpi-val">${ns.median_hours != null ? ns.median_hours + "h" : "—"}</div><div class="kpi-lbl">Median notice</div></div>
        <div class="kpi kpi-warn"><div class="kpi-val">${pctSame}%</div><div class="kpi-lbl">Same-day cancel</div></div>
        <div class="kpi kpi-warn"><div class="kpi-val">${ns.under_2h || 0}</div><div class="kpi-lbl">&lt;2h notice</div></div>
        <div class="kpi kpi-warn"><div class="kpi-val">${ns.after_start || 0}</div><div class="kpi-lbl">After start / none</div></div>
      </div>
      <div class="dash-grid-3">
        <div class="dash-panel"><h3>Who skipped</h3><p class="chart-sub">Share of 42 confirmed</p><canvas id="dash-chart-pie-who" height="160"></canvas></div>
        <div class="dash-panel"><h3>Excuse mix</h3><p class="chart-sub">One category per row</p><canvas id="dash-chart-pie-excuse" height="160"></canvas></div>
        <div class="dash-panel"><h3>Top 5 excuses</h3><p class="chart-sub">By frequency (ties at top)</p><div id="dash-excuse-cards" class="excuse-cards"></div></div>
      </div>
      <div class="dash-grid">
        <div class="dash-panel"><h3>Notice buckets</h3><p class="chart-sub">Warning time before inferred session</p><canvas id="dash-chart-notice-buckets" height="220"></canvas></div>
        <div class="dash-panel"><h3>Cumulative skips</h3><p class="chart-sub">Simon vs Gaythan over time</p><canvas id="dash-chart-cumulative" height="220"></canvas></div>
      </div>
      <div class="dash-grid">
        <div class="dash-panel"><h3>Quarterly volume</h3><p class="chart-sub">Stacked by who skipped</p><canvas id="dash-chart-quarterly" height="200"></canvas></div>
        <div class="dash-panel"><h3>Skip timeline</h3><p class="chart-sub">Hover dots for quotes</p>
          <div class="chart-wrap scatter-wrap"><canvas id="dash-chart-scatter" height="160"></canvas><div id="dash-tip-scatter" class="chart-tip"></div></div>
        </div>
      </div>
      <div class="dash-grid">
        <div class="dash-panel callout-panel"><h3>Shortest notice (worst 5)</h3><p class="chart-sub">Cancel message vs planned tee — see Methodology</p><div id="dash-worst-notice"></div></div>
        <div class="dash-panel"><h3>Weekday plan → weekend</h3><p class="chart-sub">${s.weekday_confirmed} confirmed · ${s.weekday_fizzled} fizzled — scroll →</p><div id="dash-wk-strip" class="wk-strip"></div></div>
      </div>
      <div class="dash-bottomline">
        <h3>Bottom line</h3>
        <ul>
          <li><strong>Gaythan</strong> accounts for more confirmed skips (${s.gaythan} vs Simon ${s.simon}); many are mood / “don't fancy it”.</li>
          <li><strong>Simon</strong> skips cluster around work, injury, and social conflicts — often with little notice (median ${ns.simon_median || "?"}h).</li>
          <li><strong>Notice:</strong> median ${ns.median_hours || "?"}h overall; ${ns.under_2h || 0} under 2 hours; ${ns.after_start || 0} after session start.</li>
          <li>Weekday enthusiasm often dies by the weekend — see strip above and full tab.</li>
        </ul>
      </div>
      <div class="dash-data-nav">
        <span>Full data:</span>
        <button type="button" class="dash-link" data-goto="confirmed">Confirmed table (${s.confirmed_total})</button>
        <button type="button" class="dash-link" data-goto="weekday">Weekday→weekend (${(DATA.weekday || []).length})</button>
        <button type="button" class="dash-link" data-goto="borderline">Borderline (${s.borderline})</button>
        <button type="button" class="dash-link" data-goto="timeline">Over time (detail)</button>
        <button type="button" class="dash-link" data-goto="audit">Audit trail (Nathan)</button>
        <button type="button" class="dash-link" data-goto="methodology">Methodology</button>
      </div>`;
    panel.dataset.built = "1";
    panel.querySelectorAll(".dash-link[data-goto]").forEach((btn) => {
      btn.onclick = () => {
        if (typeof switchToTab === "function") switchToTab(btn.dataset.goto);
      };
    });
    requestAnimationFrame(() => initDashboardCharts());
  };

  window.renderTimelinePanel = function () {
    const panel = document.getElementById("panel-timeline");
    if (!panel || panel.dataset.built) return;
    panel.innerHTML = `
      <div id="timeline-legend" class="timeline-legend"></div>
      <p class="chart-lead">Visual proof from the same 42 confirmed rows in the tables — not a separate count.</p>
      <div class="chart-grid-3">
        <div class="chart-card">
          <h3>Who skipped (pie)</h3>
          <p class="chart-sub">Simon ${DATA.stats.simon} · Gaythan ${DATA.stats.gaythan} · Both ${DATA.stats.both}</p>
          <canvas id="chart-pie-who" height="200"></canvas>
        </div>
        <div class="chart-card">
          <h3>Excuse categories (pie)</h3>
          <p class="chart-sub">Keyword rules on Reason + Planned fields</p>
          <canvas id="chart-pie-excuse" height="200"></canvas>
        </div>
        <div class="chart-card">
          <h3>Top 5 excuse types</h3>
          <p class="chart-sub">Ranked by count (ties possible)</p>
          <ul id="excuse-top5" class="excuse-list"></ul>
        </div>
      </div>
      <div id="notice-callout" class="notice-callout"></div>
      <div class="chart-grid-2">
        <div class="chart-card">
          <h3>Notice buckets — how little warning?</h3>
          <p class="chart-sub">Cancel/skip message time vs inferred session start (WhatsApp timestamps)</p>
          <canvas id="chart-notice-buckets" height="280"></canvas>
        </div>
        <div class="chart-card">
          <h3>Notice hours vs session date</h3>
          <p class="chart-sub">Dots below the red line = late or no warning</p>
          <div class="chart-wrap scatter-wrap">
            <canvas id="chart-notice-scatter" height="280"></canvas>
            <div id="tip-notice" class="chart-tip"></div>
          </div>
          <div id="worst-notice"></div>
        </div>
      </div>
      <div class="chart-card">
        <h3>Timeline — every confirmed skip</h3>
        <p class="chart-sub">Each dot is one dated skip. Lane = who failed. Hover for reason.</p>
        <div class="chart-wrap scatter-wrap">
          <canvas id="chart-scatter" height="220"></canvas>
          <div id="tip-scatter" class="chart-tip"></div>
        </div>
      </div>
      <div class="chart-grid-2">
        <div class="chart-card">
          <h3>Quarterly volume (stacked)</h3>
          <canvas id="chart-quarterly" height="260"></canvas>
        </div>
        <div class="chart-card">
          <h3>Cumulative skips over time</h3>
          <canvas id="chart-cumulative" height="260"></canvas>
        </div>
      </div>
      <div class="chart-card">
        <h3>Weekday plan → weekend outcome</h3>
        <p class="chart-sub">Green = confirmed weekend failure · Yellow = fizzled plan</p>
        <div id="wk-flow" class="wk-flow"></div>
      </div>`;
    panel.dataset.built = "1";
    requestAnimationFrame(() => initTimelineCharts());
  };

  window.addEventListener("resize", () => {
    if (dashboardReady) initDashboardCharts();
    if (timelineReady) initTimelineCharts();
  });
})();
