/**
 * In-browser golf skip analysis — port of analytics_enrichment.py
 * plus conservative auto-detection of new skip phrases from an official export.
 */
(function (global) {
  const CANCEL_RE =
    /can't|cannot|won't|wont|bail|not going|no golf|cancel|neither can|not feeling|not fancy|don't fancy|dont fancy|not sure i|interest in playing|didn't go|didnt go|haven't gone|decided against|probably won't|not going to be able|can we not|not make|not in the mood|being lame|not so sure|you go golf|you should go|on your own|legs dead|away this weekend/i;

  const GOLF_RE = /golf|pitch|tee|urban|trent|bay/i;

  const SEARCH_PHRASES = [
    "golf",
    "this weekend / Saturday / Sunday / tomorrow / tonight / Friday",
    "skip, bail, cancel, pull out, not turn, no show, not coming, can't make, won't make",
    "sorry not coming / sorry can't make",
    "bailing on golf / don't fancy / decided against",
    "haven't gone golf / you go by all means / shall I cancel / go ahead and cancel",
  ];

  const MANUAL = {
    "8/6/20": { session: "2020-08-06T18:00", cancel: "2020-08-06T17:19", note: "Same-day invite; thumb + working late messages evening" },
    "8/10/20": { session: "2020-08-10T12:00", cancel: "2020-08-10T11:02", note: "Declined when golf suggested" },
    "9/15/20": { session: "2020-09-15T12:00", cancel: "2020-09-15T10:41", note: "Chose swimming over planned golf" },
    "4/23/21": { session: "2021-04-23T18:00", cancel: "2021-04-23T09:12", note: "Finger injury — avoided golf few days; first clear bail that day" },
    "3/4/23": { session: "2023-03-05T09:00", cancel: "2023-03-04T23:47", note: "Skip logged 3/4; session was next morning" },
    "10/9/23": { session: "2023-10-10T18:00", cancel: "2023-10-09T14:22", note: "Can't golf tomorrow — dinner conflict" },
    "3/28/25": { session: "2025-03-29T08:00", cancel: "2025-03-28T20:31", note: "MK weekend tee; bail night before" },
    "9/26/22": { session: "2022-09-24T09:00", cancel: "2022-09-22T18:05", note: "Saturday Trent — moved to Sunday (~2 days notice)" },
    "10/3/22": { session: "2022-10-01T10:00", cancel: "2022-09-29T12:18", note: "Away this weekend — ~2 days before Sat" },
    "10/14/23": { session: "2023-10-14T09:00", cancel: "2023-10-14T10:52", note: "Morning golf; message after start time (no real notice)" },
  };

  function parseCsvDate(s) {
    const m = String(s || "").match(/(\d{1,2})\/(\d{1,2})\/(\d{2,4})/);
    if (!m) return null;
    let mo = parseInt(m[1], 10);
    let d = parseInt(m[2], 10);
    let y = parseInt(m[3], 10);
    if (y < 100) y += 2000;
    if (mo > 12 && d <= 12) {
      const tmp = mo;
      mo = d;
      d = tmp;
    }
    const dt = new Date(y, mo - 1, d);
    return Number.isNaN(dt.getTime()) ? null : dt;
  }

  function addDays(dt, n) {
    const x = new Date(dt.getTime());
    x.setDate(x.getDate() + n);
    return x;
  }

  function atTime(day, h, min) {
    return new Date(day.getFullYear(), day.getMonth(), day.getDate(), h, min || 0, 0);
  }

  function isoLocal(dt) {
    if (!dt) return null;
    const p = (n) => String(n).padStart(2, "0");
    return `${dt.getFullYear()}-${p(dt.getMonth() + 1)}-${p(dt.getDate())}T${p(dt.getHours())}:${p(dt.getMinutes())}`;
  }

  function senderMatches(who, sender) {
    const GP = global.GolfParse;
    if (who === "Simon") return GP.isSimon(sender);
    if (who === "Gaythan") return GP.isGaythan(sender);
    if (who === "Both") return GP.isSimon(sender) || GP.isGaythan(sender);
    return false;
  }

  function extractQuotes(reason) {
    const quotes = [];
    const re = /""([^"]+)""|"([^"]+)"/g;
    let m;
    while ((m = re.exec(reason || ""))) {
      const q = (m[1] || m[2] || "").trim().toLowerCase();
      if (q.length >= 8) quotes.push(q);
    }
    return quotes;
  }

  function inferSessionDt(rowDate, planned) {
    const p = (planned || "").toLowerCase();
    let d = new Date(rowDate.getFullYear(), rowDate.getMonth(), rowDate.getDate());
    if (p.includes("next morning") || /golf next day/.test(p)) d = addDays(d, 1);
    else if (p.includes("tomorrow") && p.includes("golf")) d = addDays(d, 1);
    if (p.includes("11am") || p.includes("11 am")) return atTime(d, 11, 0);
    if (p.includes("9pm") || p.includes("9 pm")) return atTime(d, 21, 0);
    if (p.includes("3-4pm") || p.includes("3–4pm") || p.includes("~3")) return atTime(d, 15, 30);
    if (p.includes("morning") || p.includes("tee")) return atTime(d, 9, 0);
    if (p.includes("evening") || p.includes("night") || p.includes("tonight")) return atTime(d, 19, 0);
    if (p.includes("friday")) return atTime(d, 17, 0);
    if (p.includes("weekend") || p.includes("saturday") || p.includes("sunday")) return atTime(d, 10, 0);
    if (p.includes("few days")) return atTime(d, 18, 0);
    return atTime(d, 12, 0);
  }

  function classifyExcuse(reason, planned) {
    const t = `${reason} ${planned}`.toLowerCase();
    if (
      /don't fancy|dont fancy|not fancy|interest in playing|not in the mood|chill|didn't see the point|decided against|legs dead|can we not|not so sure|being lame|playstation/.test(
        t
      )
    ) {
      return "Don't fancy / mood";
    }
    if (/thumb|finger|back|sore|injury|surgery|heartburn|split|hold the club/.test(t)) return "Injury / physical";
    if (
      /work|boss|office|deadline|reading|dinner|gig|varonis|james|swim|ned spot|birthday|thanksgiving|thai|cooking|camping|cycle|packing|trip/.test(
        t
      )
    ) {
      return "Other plans / work / social";
    }
    if (/girl|eve|dan|night out|hungover|arose|ended up at/.test(t)) return "Social / dating / night out";
    if (/locked out|forgot/.test(t)) return "Forgot / logistics";
    if (/away|weekend|can't do saturday/.test(t)) return "Travel / schedule";
    return "Other / unclear";
  }

  function noticeBucket(hours) {
    if (hours == null || Number.isNaN(hours)) return "Unknown";
    if (hours < 0) return "After start / none";
    if (hours < 2) return "<2 hours";
    if (hours < 6) return "Same day (2-6h)";
    if (hours < 24) return "Same day (6h+)";
    if (hours < 48) return "Previous day";
    if (hours < 72) return "2-3 days";
    return "3+ days";
  }

  function findCancelDt(messages, who, rowDate, session, reason) {
    const quotes = extractQuotes(reason);
    const windowStart = session.getTime() - 5 * 24 * 3600 * 1000;
    const windowEnd = session.getTime() + 2 * 3600 * 1000;
    const candidates = [];
    for (const msg of messages) {
      const tms = msg.dt.getTime();
      if (tms < windowStart || tms > windowEnd) continue;
      if (!senderMatches(who, msg.sender)) continue;
      const tl = msg.text.toLowerCase();
      let score = 0;
      if (CANCEL_RE.test(tl)) score += 3;
      if (GOLF_RE.test(tl)) score += 2;
      for (const q of quotes) {
        if (tl.includes(q.slice(0, 20)) || q.includes(tl.slice(0, 40))) score += 8;
      }
      if (score >= 3) candidates.push({ dt: msg.dt, text: msg.text, score, timeS: msg.timeS });
    }
    if (!candidates.length) {
      const day = rowDate.toDateString();
      for (const msg of messages) {
        if (msg.dt.toDateString() !== day) continue;
        if (!senderMatches(who, msg.sender)) continue;
        if (CANCEL_RE.test(msg.text) && (GOLF_RE.test(msg.text) || quotes.length)) {
          candidates.push({ dt: msg.dt, text: msg.text, score: 2, timeS: msg.timeS });
        }
      }
    }
    if (!candidates.length) return { dt: null, text: "", timeS: "" };
    candidates.sort((a, b) => b.score - a.score || a.dt - b.dt);
    const best = candidates[0];
    return { dt: best.dt, text: best.text.slice(0, 100), timeS: best.timeS };
  }

  function enrichRow(row, messages) {
    const dateS = row.Date;
    const rowDate = parseCsvDate(dateS);
    if (!rowDate) return null;
    const who = row.WhoSkipped;
    const planned = row.Planned || "";
    const reason = row.Reason || "";
    const category = classifyExcuse(reason, planned);
    let session;
    let cancel;
    let note = "";
    let cancelTimeS = "";
    if (MANUAL[dateS]) {
      const m = MANUAL[dateS];
      session = new Date(m.session);
      cancel = new Date(m.cancel);
      note = m.note || "";
    } else {
      session = inferSessionDt(rowDate, planned);
      const found = findCancelDt(messages, who, rowDate, session, reason);
      cancel = found.dt;
      note = found.text;
      cancelTimeS = found.timeS;
    }
    let hours = null;
    if (session && cancel) hours = (session.getTime() - cancel.getTime()) / 3600000;
    if (hours != null) hours = Math.round(hours * 100) / 100;
    return {
      date: dateS,
      who,
      category,
      session_iso: isoLocal(session),
      cancel_iso: isoLocal(cancel),
      notice_hours: hours,
      bucket: noticeBucket(hours),
      note: note || "",
      cancel_clock: cancelTimeS,
      planned,
      reason,
      outcome: row.Outcome || "",
      source: row.source || "curated",
    };
  }

  function median(vals) {
    if (!vals.length) return null;
    const s = [...vals].sort((a, b) => a - b);
    const m = Math.floor(s.length / 2);
    if (s.length % 2) return s[m];
    return (s[m - 1] + s[m]) / 2;
  }

  function buildAnalytics(confirmed, messages) {
    const notices = confirmed.map((r) => enrichRow(r, messages || [])).filter(Boolean);
    const catCounts = {};
    const bucketCounts = {};
    for (const n of notices) {
      catCounts[n.category] = (catCounts[n.category] || 0) + 1;
      bucketCounts[n.bucket] = (bucketCounts[n.bucket] || 0) + 1;
    }
    const topExcuses = Object.entries(catCounts).sort((a, b) => b[1] - a[1]);
    const knownHours = notices.map((n) => n.notice_hours).filter((h) => h != null);
    const knownSorted = [...knownHours].sort((a, b) => a - b);
    const worst = notices.filter((n) => n.notice_hours != null).sort((a, b) => a.notice_hours - b.notice_hours).slice(0, 8);
    const byWho = { Simon: [], Gaythan: [], Both: [] };
    for (const n of notices) {
      if (n.notice_hours == null) continue;
      if (byWho[n.who]) byWho[n.who].push(n.notice_hours);
    }
    const rnd = (v) => (v == null ? null : Math.round(v * 10) / 10);
    return {
      excuse_categories: topExcuses.map(([k, v]) => ({ category: k, count: v })),
      top_excuses: topExcuses.slice(0, 5).map(([k, v], i) => ({ rank: i + 1, category: k, count: v })),
      notice: notices,
      notice_buckets: bucketCounts,
      notice_summary: {
        median_hours: rnd(median(knownSorted)),
        mean_hours: knownHours.length ? rnd(knownHours.reduce((a, b) => a + b, 0) / knownHours.length) : null,
        under_2h: knownHours.filter((h) => h >= 0 && h < 2).length,
        same_day: knownHours.filter((h) => h >= 0 && h < 24).length,
        after_start: knownHours.filter((h) => h < 0).length,
        known_count: knownHours.length,
        simon_median: rnd(median(byWho.Simon)),
        gaythan_median: rnd(median(byWho.Gaythan)),
      },
      worst_notice: worst,
    };
  }

  function isFalsePositiveText(t) {
    const x = t.toLowerCase();
    if (/skipping rope|skip rope/.test(x)) return true;
    if (/mini[\s-]?golf/.test(x)) return true;
    if (/\bpga\b/.test(x) && /virtual|playstation|one round of pga/.test(x)) return true;
    if (/drug delivery|haven't turned up/.test(x) && !/golf/.test(x)) return true;
    if (/training for a race you bailed/.test(x)) return true;
    if (/harold/.test(x) && /bail/.test(x) && !/golf/.test(x)) return true;
    if (/so we playing or you bailing/.test(x)) return true;
    return false;
  }

  function detectNewSkips(messages, existingDates) {
    const known = new Set(existingDates);
    const byDate = new Map();
    for (const msg of messages) {
      if (isFalsePositiveText(msg.text)) continue;
      const tl = msg.text.toLowerCase();
      if (!GOLF_RE.test(tl) || !CANCEL_RE.test(tl)) continue;
      const role = global.GolfParse.senderRole(msg.sender);
      if (role === "Other") continue;
      const key = global.GolfParse.dateKey(msg.dt);
      if (known.has(key)) continue;
      const prev = byDate.get(key);
      const rec = {
        Date: key,
        WhoSkipped: role,
        Planned: "Golf (auto-detected from export)",
        Reason: `"${msg.text.replace(/\s+/g, " ").slice(0, 180)}"`,
        Outcome: "Auto-detected skip/cancel phrasing in golf context — review on Audit trail",
        source: "auto",
        _dt: msg.dt,
      };
      if (!prev || msg.dt < prev._dt) byDate.set(key, rec);
    }
    const bothDates = new Map();
    for (const rec of byDate.values()) {
      const day = rec.Date;
      const others = messages.filter((m) => global.GolfParse.dateKey(m.dt) === day && GOLF_RE.test(m.text) && CANCEL_RE.test(m.text));
      const roles = new Set(others.map((m) => global.GolfParse.senderRole(m.sender)).filter((r) => r !== "Other"));
      if (roles.has("Simon") && roles.has("Gaythan")) rec.WhoSkipped = "Both";
      bothDates.set(day, rec);
    }
    return [...bothDates.values()].map(({ _dt, ...row }) => row);
  }

  function detectWeekdayWeekend(messages, existingWeekday) {
    const existing = new Set(
      (existingWeekday || []).map((r) => String(r.WeekdayDate || "") + "|" + String(r.WeekendDatePlanned || ""))
    );
    const extra = [];
    for (let i = 0; i < messages.length; i++) {
      const msg = messages[i];
      const dow = msg.dt.getDay(); // 0 Sun
      if (dow === 0 || dow === 5 || dow === 6) continue;
      const tl = msg.text.toLowerCase();
      if (!GOLF_RE.test(tl)) continue;
      if (!/weekend|saturday|sunday/.test(tl)) continue;
      if (isFalsePositiveText(msg.text)) continue;
      const weekendStart = addDays(msg.dt, dow === 1 ? 4 : dow === 2 ? 3 : dow === 3 ? 2 : 1);
      const weekendEnd = addDays(weekendStart, 3);
      const weekendMsgs = messages.filter((m) => m.dt >= weekendStart && m.dt < weekendEnd);
      const golfWeekend = weekendMsgs.filter((m) => GOLF_RE.test(m.text));
      const cancelWeekend = golfWeekend.filter((m) => CANCEL_RE.test(m.text));
      let type = "fizzled";
      let outcome = "No explicit weekend golf skip found; plan may have fizzled.";
      if (cancelWeekend.length) {
        type = "confirmed";
        outcome = cancelWeekend[0].text.replace(/\s+/g, " ").slice(0, 160);
      }
      const wkKey = `${global.GolfParse.dateKey(msg.dt)}|${global.GolfParse.dateKey(weekendStart)}`;
      if (existing.has(wkKey)) continue;
      existing.add(wkKey);
      extra.push({
        WeekdayDate: `${global.GolfParse.dateKey(msg.dt)} (auto)`,
        WhoMentionedPlanned: global.GolfParse.senderRole(msg.sender),
        WeekendDatePlanned: global.GolfParse.dateKey(weekendStart),
        MidWeekQuote: msg.text.replace(/\s+/g, " ").slice(0, 160),
        WeekendOutcome: outcome,
        WhoFailed: cancelWeekend.length ? global.GolfParse.senderRole(cancelWeekend[0].sender) : "Unclear",
        Type: type,
        source: "auto",
      });
    }
    return extra.slice(0, 40);
  }

  function statsFrom(confirmed, weekday, borderline) {
    return {
      confirmed_total: confirmed.length,
      simon: confirmed.filter((r) => r.WhoSkipped === "Simon").length,
      gaythan: confirmed.filter((r) => r.WhoSkipped === "Gaythan").length,
      both: confirmed.filter((r) => r.WhoSkipped === "Both").length,
      borderline: borderline.length,
      weekday_confirmed: weekday.filter((r) => r.Type === "confirmed").length,
      weekday_fizzled: weekday.filter((r) => r.Type === "fizzled").length,
    };
  }

  function metaFromMessages(messages) {
    if (!messages.length) {
      return { messageCount: 0, dateRange: "—", golfMentions: 0 };
    }
    const first = messages[0].dt;
    const last = messages[messages.length - 1].dt;
    const fmt = (d) => d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
    return {
      messageCount: messages.length,
      dateRange: `${fmt(first)} – ${fmt(last)}`,
      golfMentions: messages.filter((m) => /golf/i.test(m.text)).length,
    };
  }

  function buildDashboardData(seed, messages) {
    const msgs = messages || [];
    const curatedConfirmed = (seed.confirmed || []).map((r) => ({ ...r, source: r.source || "curated" }));
    const curatedDates = curatedConfirmed.map((r) => r.Date);
    const auto = msgs.length ? detectNewSkips(msgs, curatedDates) : [];
    const confirmed = curatedConfirmed.concat(auto);
    const curatedWeekday = (seed.weekday || []).map((r) => ({ ...r, source: r.source || "curated" }));
    const autoWeek = msgs.length ? detectWeekdayWeekend(msgs, curatedWeekday) : [];
    const weekday = curatedWeekday.concat(autoWeek);
    const borderline = (seed.borderline || []).map((r) => ({ ...r, source: r.source || "curated" }));
    const analytics = buildAnalytics(confirmed, msgs);
    const stats = statsFrom(confirmed, weekday, borderline);
    return { confirmed, weekday, borderline, analytics, stats, autoNew: auto.length, autoWeek: autoWeek.length };
  }

  function auditRows(data) {
    const noticeByDate = new Map();
    for (const n of (data.analytics && data.analytics.notice) || []) {
      noticeByDate.set(n.date, n);
    }
    return (data.confirmed || []).map((r) => {
      const n = noticeByDate.get(r.Date) || {};
      return {
        Date: r.Date,
        WhoSkipped: r.WhoSkipped,
        Planned: r.Planned,
        Reason: r.Reason,
        Outcome: r.Outcome,
        cancel_iso: n.cancel_iso || "",
        session_iso: n.session_iso || "",
        notice_hours: n.notice_hours,
        category: n.category || classifyExcuse(r.Reason, r.Planned),
        bucket: n.bucket || "",
        note: n.note || "",
        source: r.source || "curated",
      };
    });
  }

  global.GolfAnalysis = {
    CANCEL_RE,
    GOLF_RE,
    SEARCH_PHRASES,
    classifyExcuse,
    inferSessionDt,
    noticeBucket,
    buildAnalytics,
    buildDashboardData,
    auditRows,
    metaFromMessages,
    parseCsvDate,
  };
})(window);
