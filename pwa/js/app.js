(function () {
  let DATA = null;
  let lastMeta = {
    importDate: null,
    fileName: null,
    messageCount: 0,
    dateRange: "—",
    golfMentions: 0,
    lastUpdated: null,
    sha256: null,
    autoNew: 0,
  };

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

  function fmtWhen(iso) {
    if (!iso) return "—";
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return esc(iso);
    return d.toLocaleString();
  }

  function switchToTab(tabId) {
    document.querySelectorAll(".tab").forEach((b) => {
      b.classList.toggle("active", b.dataset.tab === tabId);
    });
    document.querySelectorAll(".panel").forEach((p) => p.classList.remove("active"));
    const panel = document.getElementById("panel-" + tabId);
    if (panel) panel.classList.add("active");
    if (tabId === "timeline" && typeof renderTimelinePanel === "function") {
      renderTimelinePanel();
      setTimeout(() => {
        if (typeof initTimelineCharts === "function") initTimelineCharts();
      }, 30);
    }
    if (tabId === "dashboard" && typeof initDashboardCharts === "function") {
      setTimeout(() => initDashboardCharts(), 30);
    }
    if (tabId === "audit") renderAuditPanel();
  }

  function makeTable(containerId, columns, rows, options = {}) {
    const container = document.getElementById(containerId);
    if (!container) return;
    const uid = containerId.replace("panel-", "");
    let sortCol = options.defaultSort || 0;
    let sortDir = 1;
    let filterWho = "";
    let filterType = "";
    let search = "";

    function filteredRows() {
      return rows.filter((r) => {
        if (filterWho && !(r[options.whoKey] || "").toLowerCase().includes(filterWho.toLowerCase())) return false;
        if (filterType && r.Type !== filterType) return false;
        if (search) {
          const hay = columns.map((c) => r[c.key] || "").join(" ").toLowerCase();
          if (!hay.includes(search.toLowerCase())) return false;
        }
        return true;
      });
    }

    function sortedRows(list) {
      const col = columns[sortCol];
      return [...list].sort((a, b) => {
        const av = String(a[col.key] || "").toLowerCase();
        const bv = String(b[col.key] || "").toLowerCase();
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
           <option value="both">Both</option></select>`
        : "";
      const typeOpts = options.typeFilter
        ? `<select id="f-type-${uid}"><option value="">All types</option>
           <option value="confirmed">Confirmed</option><option value="fizzled">Fizzled</option></select>`
        : "";
      container.innerHTML = `
        <div class="toolbar">
          <input type="search" id="f-search-${uid}" placeholder="Search…" value="${esc(search)}">
          ${whoOpts}${typeOpts}
          <span class="count">${list.length} of ${rows.length} rows</span>
        </div>
        <div class="table-wrap">
          <table>
            <thead><tr>${columns
              .map(
                (c, i) =>
                  `<th data-col="${i}" class="${sortCol === i ? (sortDir === 1 ? "sorted-asc" : "sorted-desc") : ""}">${esc(c.label)}</th>`
              )
              .join("")}</tr></thead>
            <tbody>${
              list.length
                ? list
                    .map(
                      (r) => `<tr>${columns
                        .map((c) => {
                          let v = r[c.key];
                          if (c.badge === "who") v = whoBadge(v);
                          else if (c.badge === "type") v = typeBadge(v);
                          else if (c.fmt === "hours")
                            v = v == null || v === "" ? "—" : Number(v).toFixed(1) + "h";
                          else v = esc(v);
                          return `<td class="${c.cls || ""}">${v}</td>`;
                        })
                        .join("")}</tr>`
                    )
                    .join("")
                : `<tr><td colspan="${columns.length}" class="empty">No matching rows</td></tr>`
            }
            </tbody>
          </table>
        </div>`;
      document.getElementById(`f-search-${uid}`).oninput = (e) => {
        search = e.target.value;
        draw();
      };
      if (options.whoFilter) {
        const el = document.getElementById(`f-who-${uid}`);
        el.value = filterWho;
        el.onchange = (e) => {
          filterWho = e.target.value;
          draw();
        };
      }
      if (options.typeFilter) {
        const el = document.getElementById(`f-type-${uid}`);
        el.value = filterType;
        el.onchange = (e) => {
          filterType = e.target.value;
          draw();
        };
      }
      container.querySelectorAll("th").forEach((th) => {
        th.onclick = () => {
          const col = +th.dataset.col;
          if (sortCol === col) sortDir *= -1;
          else {
            sortCol = col;
            sortDir = 1;
          }
          draw();
        };
      });
    }
    draw();
  }

  function paintMeta() {
    const el = document.getElementById("meta-strip");
    if (!el) return;
    el.innerHTML = `
      <div>Last updated<strong>${lastMeta.lastUpdated ? fmtWhen(lastMeta.lastUpdated) : "Seeded curated tables (import an export to refresh)"}</strong></div>
      <div>Import file<strong>${esc(lastMeta.fileName || "none yet")}</strong></div>
      <div>Messages parsed<strong>${lastMeta.messageCount || "—"}</strong></div>
      <div>Chat date range<strong>${esc(lastMeta.dateRange || "—")}</strong></div>`;
  }

  function renderTables() {
    makeTable(
      "panel-confirmed",
      [
        { key: "Date", label: "Date", cls: "date" },
        { key: "WhoSkipped", label: "Who skipped", badge: "who" },
        { key: "Planned", label: "Planned" },
        { key: "Reason", label: "Reason / quote", cls: "quote" },
        { key: "Outcome", label: "Outcome", cls: "quote" },
      ],
      DATA.confirmed,
      { whoKey: "WhoSkipped", whoFilter: true, defaultSort: 0 }
    );
    makeTable(
      "panel-weekday",
      [
        { key: "WeekdayDate", label: "Weekday", cls: "date" },
        { key: "WhoMentionedPlanned", label: "Who planned", badge: "who" },
        { key: "WeekendDatePlanned", label: "Weekend", cls: "date" },
        { key: "Type", label: "Type", badge: "type" },
        { key: "MidWeekQuote", label: "Mid-week", cls: "quote" },
        { key: "WeekendOutcome", label: "Weekend outcome", cls: "quote" },
        { key: "WhoFailed", label: "Who failed", badge: "who" },
      ],
      DATA.weekday,
      { whoKey: "WhoFailed", whoFilter: true, typeFilter: true, defaultSort: 0 }
    );
    makeTable(
      "panel-borderline",
      [
        { key: "Date", label: "Date", cls: "date" },
        { key: "Who", label: "Who", badge: "who" },
        { key: "Notes", label: "Notes", cls: "quote" },
      ],
      DATA.borderline,
      { whoKey: "Who", whoFilter: true, defaultSort: 0 }
    );
  }

  function renderAuditPanel() {
    const panel = document.getElementById("panel-audit");
    if (!panel) return;
    const s = DATA.stats;
    const rows = GolfAnalysis.auditRows(DATA);
    const phrases = GolfAnalysis.SEARCH_PHRASES.map((p) => `<li><code>${esc(p)}</code></li>`).join("");
    panel.innerHTML = `
      <p class="audit-lead">Evidence ledger for a skeptical reader. Every confirmed skip is one row: quote, inferred session, cancel timestamp from the export (when a file was imported), notice hours, excuse tag, outcome. Counts below must match the Confirmed / Weekday tabs.</p>
      <div class="audit-counts">
        <span class="badge badge-confirmed">Confirmed ${s.confirmed_total}</span>
        <span class="badge badge-simon">Simon ${s.simon}</span>
        <span class="badge badge-gaythan">Gaythan ${s.gaythan}</span>
        <span class="badge badge-both">Both ${s.both}</span>
        <span class="badge badge-fizzled">Weekday confirmed ${s.weekday_confirmed} · fizzled ${s.weekday_fizzled}</span>
        <span class="badge badge-muted">Borderline ${s.borderline}</span>
      </div>
      <div class="summary-block">
        <h2>How this was searched</h2>
        <ul>${phrases}</ul>
        <p>Curated rows come from the dated table (manual context read). After you import an official WhatsApp export, notice hours are recomputed from message timestamps. Auto-detected extras are tagged <span class="badge badge-auto">auto</span> — they are rule hits, not a replacement for the curated 42.</p>
      </div>
      <div id="audit-table"></div>
      <div class="summary-block">
        <h2>Export fingerprint</h2>
        <p class="chart-sub">SHA-256 of the last imported .txt (computed in this browser). WhatsApp does not provide a server-side hash API for personal chats.</p>
        <div class="hash-box" id="audit-hash">${esc(lastMeta.sha256 || "No export imported in this app yet — hash appears after Simon (or you) imports the official Without media .txt/.zip.")}</div>
        <div class="btn-row">
          <button type="button" class="btn btn-warn" data-prank="verify">Verify against original messages</button>
          <button type="button" class="btn btn-warn" data-prank="evidence">Open source evidence</button>
          <button type="button" class="btn btn-warn" data-prank="hash">Authenticate cryptographic hash</button>
        </div>
        <p class="chart-sub">The ledger above is the real audit. Those three buttons are the “trust but verify” path.</p>
      </div>`;
    makeTable(
      "audit-table",
      [
        { key: "Date", label: "Date", cls: "date" },
        { key: "WhoSkipped", label: "Who skipped", badge: "who" },
        { key: "Planned", label: "Planned session" },
        { key: "Reason", label: "Skip quote", cls: "quote" },
        { key: "cancel_iso", label: "Cancel timestamp" },
        { key: "session_iso", label: "Inferred session" },
        { key: "notice_hours", label: "Notice", fmt: "hours" },
        { key: "category", label: "Excuse tag" },
        { key: "Outcome", label: "Outcome", cls: "quote" },
        { key: "source", label: "Source" },
      ],
      rows,
      { whoKey: "WhoSkipped", whoFilter: true }
    );
    panel.querySelectorAll("[data-prank]").forEach((btn) => {
      btn.onclick = () => triggerNathanPrank(btn.dataset.prank);
    });
  }

  function closeNathanPrank() {
    const modal = document.getElementById("prank-modal");
    const wrap = document.getElementById("rick-embed");
    if (modal) modal.classList.remove("open");
    if (wrap) wrap.innerHTML = "";
  }

  function triggerNathanPrank() {
    const modal = document.getElementById("prank-modal");
    const wrap = document.getElementById("rick-embed");
    if (wrap) {
      wrap.innerHTML =
        '<iframe title="Never Gonna Give You Up" src="https://www.youtube.com/embed/dQw4w9WgXcQ?autoplay=1&amp;rel=0&amp;playsinline=1" allow="autoplay; encrypted-media; fullscreen; picture-in-picture" allowfullscreen></iframe>';
    }
    if (modal) modal.classList.add("open");
  }

  function applyData(next, metaPatch) {
    DATA = next;
    window.DATA = next;
    Object.assign(lastMeta, metaPatch || {});
    paintMeta();
    if (typeof resetChartPanels === "function") resetChartPanels();
    renderTables();
    if (typeof renderDashboardPanel === "function") renderDashboardPanel();
    const audit = document.getElementById("panel-audit");
    if (audit && audit.classList.contains("active")) renderAuditPanel();
    document.getElementById("auto-note").textContent = lastMeta.autoNew
      ? `Import added ${lastMeta.autoNew} auto-detected golf+skip date(s) not in the curated table.`
      : "";
  }

  function setStatus(msg, isErr) {
    const el = document.getElementById("import-status");
    if (!el) return;
    el.textContent = msg;
    el.classList.toggle("err", !!isErr);
  }

  async function ingestFile(file) {
    if (!file) return;
    setStatus("Reading " + file.name + "…");
    try {
      const text = await GolfParse.textFromFile(file);
      const messages = GolfParse.parseExportText(text);
      if (!messages.length) {
        setStatus("Could not parse any WhatsApp lines. Use Export chat → Without media (.txt or .zip).", true);
        return;
      }
      const built = GolfAnalysis.buildDashboardData(window.SEED_DATA, messages);
      const chatMeta = GolfAnalysis.metaFromMessages(messages);
      const sha = await GolfParse.sha256Hex(text);
      const meta = {
        importDate: new Date().toISOString(),
        lastUpdated: new Date().toISOString(),
        fileName: file.name,
        messageCount: chatMeta.messageCount,
        dateRange: chatMeta.dateRange,
        golfMentions: chatMeta.golfMentions,
        sha256: sha,
        autoNew: built.autoNew || 0,
      };
      applyData(built, meta);
      await GolfStore.save({ data: built, meta });
      setStatus(
        `Updated from ${file.name}: ${chatMeta.messageCount.toLocaleString()} messages, ${chatMeta.golfMentions} golf mentions, ${built.stats.confirmed_total} confirmed rows.`
      );
      switchToTab("dashboard");
    } catch (err) {
      console.error(err);
      setStatus(err.message || String(err), true);
    }
  }

  function bindImport() {
    const input = document.getElementById("file-input");
    const drop = document.getElementById("dropzone");
    const pick = document.getElementById("pick-file");
    pick.onclick = () => input.click();
    input.onchange = () => ingestFile(input.files && input.files[0]);
    ["dragenter", "dragover"].forEach((ev) => {
      drop.addEventListener(ev, (e) => {
        e.preventDefault();
        drop.classList.add("drag");
      });
    });
    ["dragleave", "drop"].forEach((ev) => {
      drop.addEventListener(ev, (e) => {
        e.preventDefault();
        drop.classList.remove("drag");
      });
    });
    drop.addEventListener("drop", (e) => {
      const f = e.dataTransfer.files && e.dataTransfer.files[0];
      ingestFile(f);
    });
  }

  function bindChrome() {
    document.querySelectorAll(".tab[data-tab]").forEach((btn) => {
      btn.onclick = () => switchToTab(btn.dataset.tab);
    });
    const close = document.getElementById("prank-close");
    if (close) close.onclick = closeNathanPrank;
    const modal = document.getElementById("prank-modal");
    if (modal) {
      modal.addEventListener("click", (e) => {
        if (e.target === modal) closeNathanPrank();
      });
    }
  }

  async function boot() {
    bindChrome();
    bindImport();
    const saved = await GolfStore.load();
    if (saved && saved.data) {
      applyData(saved.data, saved.meta || {});
      setStatus("Restored last import from this phone/browser. Import a new export to refresh.");
    } else {
      const seed = window.SEED_DATA;
      const built = GolfAnalysis.buildDashboardData(seed, []);
      applyData(built, { lastUpdated: null, fileName: null, messageCount: 0, dateRange: "Import an export to fill", sha256: null });
    }
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("./sw.js").catch(() => {});
    }
  }

  window.switchToTab = switchToTab;
  window.GolfApp = { switchToTab, triggerNathanPrank, ingestFile };
  document.addEventListener("DOMContentLoaded", boot);
})();
