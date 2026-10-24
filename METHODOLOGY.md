# Methodology — Golf no-show analysis

This document describes how the golf skip / no-show review was produced, so the approach can be understood, checked, or shared with others.

---

## 1. Source data

| Field | Value |
|---|---|
| **File** | `WhatsApp Chat with Gaythan Sandridge.txt` |
| **Path** | `C:\Users\simon\Downloads\WhatsApp Chat with Gaythan Sandridge.txt` |
| **Format** | WhatsApp text export (one message per line: `M/D/YY, H:MM AM/PM - Sender: text`) |
| **Approx. size** | ~6.6 MB |
| **Date range** | June 2020 – 2026 (from first message timestamp to latest in export) |
| **Participants** | Simon (🥸) and Gaythan Sandridge |
| **Golf mentions** | ~663 lines containing “golf” (case-insensitive) |

The raw chat was **not** copied into this project (personal data). All findings are derived from reading and searching that export.

---

## 2. Scope — what counts as golf

### Included (joint or planned-together sessions)

- **Pitch / range** — Urban Golf, Pitch Golf, bay bookings, membership sessions
- **Real / 18-hole golf** — Trent Park, courses outside London, MK trips, tee times
- **Explicit plans** — “golf later”, “golf tomorrow”, “golf this weekend”, booked slots
- **Outcomes** — skip, bail, cancel, no-show, played solo because the other didn’t come

### Excluded (false positives)

| Exclusion | Reason |
|---|---|
| Skipping rope / exercise | “skip” not golf-related |
| Swim golf | Swimming context, not rounds |
| News links / articles | Third-party content |
| Hyperbole | e.g. “can't play golf anymore” (jokes, not a dated skip) |
| Mini-golf only | Not the usual joint activity |
| Virtual PGA only | Video game, not irl golf |
| Non-golf “bailing” | Dinner, drugs, races, Harold’s stuff, etc. |
| Planning with no commitment | Vague “we should golf sometime” with no weekend/booking follow-up (→ borderline or omitted) |
| Threats/jokes that didn’t happen | e.g. “So we playing or you bailing” then they played |

---

## 3. Search approach

Analysis used systematic search over the full export, then **manual context reading** around each hit (typically ±20–50 lines) to confirm intent and outcome.

### Primary grep targets

- `golf` (all ~663 mentions reviewed or sampled by pattern)
- Golf + time: `this weekend`, `Saturday`, `Sunday`, `tomorrow`, `tonight`, `Friday`
- Golf + failure: `skip`, `bail`, `cancel`, `pull out`, `not turn`, `no show`, `not coming`, `can't make`, `won't make`

### Apology / bail phrasing (explicit user request)

These were searched in **golf context** (same message or nearby messages):

- sorry not coming / sorry can't make
- not coming / can't make it / won't make it
- can't do tonight (when golf planned)
- pull out / bailing / bailing on golf
- not turning up / didn't turn up
- decided against / don't fancy / not fancy golf
- not going to be able / not in the mood for golf
- haven't gone golf / you go by all means / shall I cancel / go ahead and cancel

### Weekday → weekend pass

Additional pass for **Mon–Thu** messages that reference:

- `this weekend`, `Saturday`, `Sunday`, `golf this week/weekend`
- Plans made mid-week with implied **Fri–Sun** outcome

Each weekday hit was traced forward to the target weekend to see whether golf happened, was cancelled, or fizzled without explicit bail text.

---

## 4. Inclusion criteria

### Confirmed no-show

A row is **confirmed** when all of the following hold:

1. **Planned or booked** golf together (or clear same-day invite accepted)
2. **One party did not attend** or both agreed to cancel / not go
3. **Date is identifiable** from the chat (message date or explicitly referenced play date)
4. **Attribution is clear** — who skipped, or both mutually

Includes: played solo after other bailed, cancelled booking, explicit “I'm not going”.

### Borderline / unclear

Included in `borderline.csv` when:

- Golf might be implied but message is ambiguous (e.g. “Not coming boo” on a cycle ride)
- Double-booking awareness, not a same-day skip with Simon
- Membership frustration, not one session
- Accusations without a single dated round (e.g. “54th booking” pattern)
- Wrong activity (swim, drug delivery, virtual PGA, running race)
- Forgot to book / never made a booking
- Early reluctance but session **did** happen (also listed under false positives in prose)

### False positive (looked like skip, did not happen)

Documented in `GOLF-NO-SHOWS.md` and `golf-analysis.csv` (`Category: false_positive`):

- Reluctance then rescheduled and **played** (e.g. moved to 5pm / 6pm)
- Banter about bailing with confirmed play afterward

---

## 5. Weekday → weekend failure logic

| Step | Rule |
|---|---|
| 1 | Find golf mention **Mon–Thu** referencing upcoming **Fri–Sun** (or “this weekend”) |
| 2 | Record who proposed/planned and quoted mid-week text |
| 3 | Read **Fri–Sun** messages (and Mon after if camping/away) for outcome |
| 4 | **Confirmed** — explicit skip/cancel/no-show on the planned weekend |
| 5 | **Fizzled** — mid-week agreement but no round; no booking; or silent drop with no weekend golf chat |
| 6 | **Who failed** — party who bailed, both, or “Unclear” if plan never solidified |

Examples of **confirmed**: 10/27/22 Thu plan → Sat both skipped; 11/1/23 Wed plan → Sun Gaythan decided against.

Examples of **fizzled**: 2/27/23 Mon “golf maybe this weekend” → never booked; 8/21/23 Mon ask → Gaythan “no for now”.

Weekday plans that **did** happen are documented in methodology for transparency but not in the failures CSV.

---

## 6. Summary statistics & attribution

### Who skipped

| Label | Rule |
|---|---|
| **Simon** | Simon declined, cancelled, no-showed, or was reason joint round didn’t happen |
| **Gaythan** | Same for Gaythan |
| **Both** | Mutual “not fancy it” / both cancelled / both skipped same session |

Mutual sessions count **once** toward “Both”, not double-counted toward each person’s individual totals.

### Counts in exports

| Metric | Source |
|---|---|
| Confirmed rows | `confirmed-no-shows.csv` — one row per dated instance |
| Simon / Gaythan / Both | Count of `WhoSkipped` column |
| Borderline | `borderline.csv` row count |
| Weekday failures | `weekday-weekend-failures.csv`; `Type` = `confirmed` or `fizzled` |

### 42 vs 44 note

Early summary text in `GOLF-NO-SHOWS.md` states **44** confirmed instances (17 Simon + 24 Gaythan + 3 Both). The **chronological table and CSV contain 42 dated rows** (17 Simon + 22 Gaythan + 3 Both). The gap is two Gaythan entries that were counted in the narrative total but not listed as separate dated rows in the final table—likely merged duplicates or aggregate references. **CSV and HTML use the table (42)** as the authoritative dated list.

---

## 7. Visual tab (“Over time”)

The **Over time** tab in `share.html` visualises the same confirmed rows as the tables (no extra counts):

- **Scatter timeline** — each skip by date and lane (Simon / Gaythan / Both); hover shows planned session and reason snippet
- **Stacked quarterly bars** — skip volume per quarter
- **Cumulative lines** — running totals for Simon vs Gaythan
- **Weekday → weekend cards** — mid-week plan vs weekend outcome; green = confirmed failure, yellow = fizzled

Charts use embedded Canvas JavaScript only (no CDN) so the single-file report works offline. Regenerated via `build_html.py` (embeds `timeline_charts.js`).

**Excuse categories** — rule-based tags on the `Reason` and `Planned` CSV fields (e.g. injury, work/other plans, “don’t fancy”, social/night out). Not mutually exclusive in meaning but each row gets one primary bucket for counting.

**Notice time (warning to the other person)** — for each confirmed skip, `analytics_enrichment.py` reads the WhatsApp export:

1. **Session time** — inferred from `Planned` text (morning ≈ 09:00, evening ≈ 19:00, explicit 11am/9pm, “next morning” = following day, etc.) plus a few **manual overrides** when the chat context is clearer than the CSV one-liner.
2. **Cancel time** — first matching skip/cancel message from whoever skipped (or either party for “Both”) in a window around the session, scored against cancel/golf keywords and quoted phrases from the CSV reason.
3. **Notice hours** = session datetime minus cancel datetime. Buckets: &lt;2h, same-day bands, previous day, 2–3 days, 3+ days, and **after start / none** (negative hours).

Limitations: planned tee times are often not stated to the minute; some rows are same-day vibes not a booking; “Both” skips use either party’s first bail message. Treat medians and bucket counts as fair estimates, not legal timestamps.

---

## 8. Deliverables & build pipeline

```
WhatsApp export (manual read + grep)
        ↓
GOLF-NO-SHOWS.md (human-readable report)
        ↓
export_csv.py → confirmed-no-shows.csv
              → weekday-weekend-failures.csv
              → borderline.csv
              → golf-analysis.csv (all categories)
        ↓
build_html.py → index.html (interactive viewer from CSVs)
logic.html    (this methodology — standalone)
METHODOLOGY.md (same content, markdown)
```

| Script | Input | Output |
|---|---|---|
| `export_csv.py` | Embedded row data (mirrors markdown tables) | CSV files with RFC 4180 quoting |
| `build_html.py` | CSV files + `analytics_enrichment.py` (WhatsApp path inside) | `share.html` / `index.html` with tables, charts, notice stats |

Regenerate after data changes:

```bash
python export_csv.py
python build_html.py
```

---

## 9. Limitations

1. **Export completeness** — Only messages in the export exist; deleted messages or other channels are invisible.
2. **Ambiguous tone** — Banter (“you bailed”, “likely not turn up”) requires context; some rows are borderline by design.
3. **Date attribution** — Message date used when play date isn’t explicit; weekend failures infer planned day from weekday text.
4. **Solo play** — When one played alone after a bail, counted as skip for the absent party, not as a successful joint round.
5. **No automated NLP** — Classification was manual/semi-manual after search; not reproducible by re-running a single script on the chat without human judgment rules above.
6. **Personal chat** — Quotes are verbatim from a private conversation; share summaries responsibly.

---

## 10. How to cite / show others

- **Full data:** open `index.html` in a browser
- **Methodology:** open `logic.html` or this file
- **Raw evidence:** WhatsApp export at path above (not in repo)
- **Project folder:** `C:\Users\simon\Projects\golf-chat-review`

---

*Generated as part of the golf-chat-review project. Analysis performed August 2026.*
