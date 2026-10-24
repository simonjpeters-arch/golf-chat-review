"""Excuse categories + notice-time estimates from CSV + WhatsApp export."""
from __future__ import annotations

import csv
import re
from datetime import datetime, timedelta, time
from pathlib import Path

ROOT = Path(__file__).parent
WHATSAPP = Path(r"C:\Users\simon\Downloads\WhatsApp Chat with Gaythan Sandridge.txt")

MSG_RE = re.compile(
    r"^(\d{1,2}/\d{1,2}/\d{2,4}),\s*(\d{1,2}:\d{2}\s*[AP]M)\s*-\s*([^:]+):\s*(.*)$",
    re.IGNORECASE,
)

CANCEL_RE = re.compile(
    r"can't|cannot|won't|wont|bail|not going|no golf|cancel|neither can|"
    r"not feeling|not fancy|don't fancy|dont fancy|not sure i|interest in playing|"
    r"didn't go|didnt go|haven't gone|decided against|probably won't|"
    r"not going to be able|can we not|not make|not in the mood|being lame|"
    r"not so sure|you go golf|you should go|on your own|legs dead|away this weekend",
    re.I,
)

GOLF_RE = re.compile(r"golf|pitch|tee|urban|trent|bay", re.I)

# Hand-tuned when chat/plan is ambiguous (session local time, cancel from WhatsApp).
MANUAL: dict[str, dict] = {
    "8/6/20": {
        "session": "2020-08-06T18:00",
        "cancel": "2020-08-06T17:19",
        "note": "Same-day invite; thumb + working late messages evening",
    },
    "8/10/20": {
        "session": "2020-08-10T12:00",
        "cancel": "2020-08-10T11:02",
        "note": "Declined when golf suggested",
    },
    "9/15/20": {
        "session": "2020-09-15T12:00",
        "cancel": "2020-09-15T10:41",
        "note": "Chose swimming over planned golf",
    },
    "4/23/21": {
        "session": "2021-04-23T18:00",
        "cancel": "2021-04-23T09:12",
        "note": "Finger injury — avoided golf few days; first clear bail that day",
    },
    "3/4/23": {
        "session": "2023-03-05T09:00",
        "cancel": "2023-03-04T23:47",
        "note": "Skip logged 3/4; session was next morning",
    },
    "10/9/23": {
        "session": "2023-10-10T18:00",
        "cancel": "2023-10-09T14:22",
        "note": "Can't golf tomorrow — dinner conflict",
    },
    "3/28/25": {
        "session": "2025-03-29T08:00",
        "cancel": "2025-03-28T20:31",
        "note": "MK weekend tee; bail night before",
    },
    "9/26/22": {
        "session": "2022-09-24T09:00",
        "cancel": "2022-09-22T18:05",
        "note": "Saturday Trent — moved to Sunday (~2 days notice)",
    },
    "10/3/22": {
        "session": "2022-10-01T10:00",
        "cancel": "2022-09-29T12:18",
        "note": "Away this weekend — ~2 days before Sat",
    },
    "10/14/23": {
        "session": "2023-10-14T09:00",
        "cancel": "2023-10-14T10:52",
        "note": "Morning golf; message after start time (no real notice)",
    },
}


def parse_csv_date(s: str) -> datetime | None:
    m = re.match(r"(\d{1,2})/(\d{1,2})/(\d{2,4})", s.strip())
    if not m:
        return None
    mo, d, y = int(m.group(1)), int(m.group(2)), int(m.group(3))
    if y < 100:
        y += 2000
    return datetime(y, mo, d)


def parse_msg_dt(date_s: str, time_s: str) -> datetime:
    d = parse_csv_date(date_s)
    if not d:
        raise ValueError(date_s)
    t = time_s.replace("\u202f", " ").replace("\xa0", " ").strip()
    return datetime.strptime(f"{d.month}/{d.day}/{d.year} {t}", "%m/%d/%Y %I:%M %p")


def load_messages(path: Path) -> list[tuple[datetime, str, str]]:
    if not path.is_file():
        return []
    out: list[tuple[datetime, str, str]] = []
    for line in path.read_text(encoding="utf-8", errors="replace").splitlines():
        m = MSG_RE.match(line.strip())
        if not m:
            continue
        try:
            dt = parse_msg_dt(m.group(1), m.group(2))
        except ValueError:
            continue
        sender = m.group(3).strip()
        text = m.group(4)
        out.append((dt, sender, text))
    out.sort(key=lambda x: x[0])
    return out


def is_simon(sender: str) -> bool:
    return sender.startswith("🥸") or "simon" in sender.lower()


def is_gaythan(sender: str) -> bool:
    return "gaythan" in sender.lower()


def sender_matches(who: str, sender: str) -> bool:
    if who == "Simon":
        return is_simon(sender)
    if who == "Gaythan":
        return is_gaythan(sender)
    if who == "Both":
        return is_simon(sender) or is_gaythan(sender)
    return False


def extract_quotes(reason: str) -> list[str]:
    quotes: list[str] = []
    for m in re.finditer(r'""([^"]+)""|"([^"]+)"', reason):
        q = (m.group(1) or m.group(2) or "").strip().lower()
        if len(q) >= 8:
            quotes.append(q)
    return quotes


def infer_session_dt(row_date: datetime, planned: str) -> datetime:
    p = (planned or "").lower()
    d = row_date.date()

    if "next morning" in p or re.search(r"golf next day", p):
        d = d + timedelta(days=1)
    elif "tomorrow" in p and "golf" in p:
        d = d + timedelta(days=1)

    if "11am" in p or "11 am" in p:
        return datetime.combine(d, time(11, 0))
    if "9pm" in p or "9 pm" in p:
        return datetime.combine(d, time(21, 0))
    if "3-4pm" in p or "3–4pm" in p or "~3" in p:
        return datetime.combine(d, time(15, 30))
    if "morning" in p or "tee" in p:
        return datetime.combine(d, time(9, 0))
    if "evening" in p or "night" in p or "tonight" in p:
        return datetime.combine(d, time(19, 0))
    if "friday" in p:
        return datetime.combine(d, time(17, 0))
    if "weekend" in p or "saturday" in p or "sunday" in p:
        return datetime.combine(d, time(10, 0))
    if "few days" in p:
        return datetime.combine(d, time(18, 0))
    return datetime.combine(d, time(12, 0))


def classify_excuse(reason: str, planned: str = "") -> str:
    t = f"{reason} {planned}".lower()
    if re.search(r"don't fancy|dont fancy|not fancy|interest in playing|not in the mood|"
                 r"chill|didn't see the point|decided against|legs dead|can we not|"
                 r"not so sure|being lame|playstation", t):
        return "Don't fancy / mood"
    if re.search(r"thumb|finger|back|sore|injury|surgery|heartburn|split|hold the club", t):
        return "Injury / physical"
    if re.search(r"work|boss|office|deadline|reading|dinner|gig|varonis|james|"
                 r"swim|ned spot|birthday|thanksgiving|thai|cooking|camping|cycle|packing|trip", t):
        return "Other plans / work / social"
    if re.search(r"girl|eve|dan|night out|hungover|arose|ended up at", t):
        return "Social / dating / night out"
    if re.search(r"locked out|forgot", t):
        return "Forgot / logistics"
    if re.search(r"away|weekend|can't do saturday", t):
        return "Travel / schedule"
    return "Other / unclear"


def notice_bucket(hours: float | None) -> str:
    if hours is None:
        return "Unknown"
    if hours < 0:
        return "After start / none"
    if hours < 2:
        return "<2 hours"
    if hours < 6:
        return "Same day (2-6h)"
    if hours < 24:
        return "Same day (6h+)"
    if hours < 48:
        return "Previous day"
    if hours < 72:
        return "2-3 days"
    return "3+ days"


def find_cancel_dt(
    messages: list[tuple[datetime, str, str]],
    who: str,
    row_date: datetime,
    session: datetime,
    reason: str,
) -> tuple[datetime | None, str]:
    quotes = extract_quotes(reason)
    window_start = session - timedelta(days=5)
    window_end = session + timedelta(hours=2)
    candidates: list[tuple[datetime, str, int]] = []

    for dt, sender, text in messages:
        if dt < window_start or dt > window_end:
            continue
        if not sender_matches(who, sender):
            continue
        tl = text.lower()
        score = 0
        if CANCEL_RE.search(tl):
            score += 3
        if GOLF_RE.search(tl):
            score += 2
        for q in quotes:
            if q[:20] in tl or tl[:40] in q:
                score += 8
        if score >= 3:
            candidates.append((dt, text, score))

    if not candidates:
        # Same calendar day as CSV row, any cancel from skipper
        day = row_date.date()
        for dt, sender, text in messages:
            if dt.date() != day:
                continue
            if not sender_matches(who, sender):
                continue
            if CANCEL_RE.search(text) and (GOLF_RE.search(text) or quotes):
                candidates.append((dt, text, 2))

    if not candidates:
        return None, ""

    candidates.sort(key=lambda x: (-x[2], x[0]))
    best = candidates[0]
    return best[0], best[1][:100]


def enrich_row(
    row: dict[str, str],
    messages: list[tuple[datetime, str, str]],
) -> dict:
    date_s = row["Date"]
    row_date = parse_csv_date(date_s)
    if not row_date:
        return {}
    who = row["WhoSkipped"]
    planned = row.get("Planned", "")
    reason = row.get("Reason", "")
    category = classify_excuse(reason, planned)

    session = cancel = note = None
    if date_s in MANUAL:
        m = MANUAL[date_s]
        session = datetime.fromisoformat(m["session"])
        cancel = datetime.fromisoformat(m["cancel"])
        note = m.get("note", "")
    else:
        session = infer_session_dt(row_date, planned)
        cancel, snippet = find_cancel_dt(messages, who, row_date, session, reason)
        note = snippet

    hours = None
    if session and cancel:
        hours = (session - cancel).total_seconds() / 3600.0

    return {
        "date": date_s,
        "who": who,
        "category": category,
        "session_iso": session.isoformat() if session else None,
        "cancel_iso": cancel.isoformat() if cancel else None,
        "notice_hours": round(hours, 2) if hours is not None else None,
        "bucket": notice_bucket(hours),
        "note": note or "",
    }


def build_analytics(confirmed: list[dict[str, str]]) -> dict:
    messages = load_messages(WHATSAPP)
    notices = [enrich_row(r, messages) for r in confirmed]
    notices = [n for n in notices if n]

    cat_counts: dict[str, int] = {}
    for n in notices:
        cat_counts[n["category"]] = cat_counts.get(n["category"], 0) + 1
    top_excuses = sorted(cat_counts.items(), key=lambda x: -x[1])

    bucket_counts: dict[str, int] = {}
    for n in notices:
        b = n["bucket"]
        bucket_counts[b] = bucket_counts.get(b, 0) + 1

    known_hours = [n["notice_hours"] for n in notices if n["notice_hours"] is not None]
    known_hours_sorted = sorted(known_hours)

    def median(vals: list[float]) -> float | None:
        if not vals:
            return None
        m = len(vals) // 2
        if len(vals) % 2:
            return vals[m]
        return (vals[m - 1] + vals[m]) / 2

    worst = sorted(
        [n for n in notices if n["notice_hours"] is not None],
        key=lambda x: x["notice_hours"],
    )[:8]

    by_who: dict[str, list[float]] = {"Simon": [], "Gaythan": [], "Both": []}
    for n in notices:
        h = n["notice_hours"]
        if h is None:
            continue
        w = n["who"]
        if w in by_who:
            by_who[w].append(h)
        elif w == "Both":
            by_who["Both"].append(h)

    return {
        "excuse_categories": [{"category": k, "count": v} for k, v in top_excuses],
        "top_excuses": [{"rank": i + 1, "category": k, "count": v} for i, (k, v) in enumerate(top_excuses[:5])],
        "notice": notices,
        "notice_buckets": bucket_counts,
        "notice_summary": {
            "median_hours": round(median(known_hours_sorted), 1) if known_hours_sorted else None,
            "mean_hours": round(sum(known_hours) / len(known_hours), 1) if known_hours else None,
            "under_2h": sum(1 for h in known_hours if 0 <= h < 2),
            "same_day": sum(1 for h in known_hours if 0 <= h < 24),
            "after_start": sum(1 for h in known_hours if h < 0),
            "known_count": len(known_hours),
            "simon_median": round(median(sorted(by_who["Simon"])), 1) if by_who["Simon"] else None,
            "gaythan_median": round(median(sorted(by_who["Gaythan"])), 1) if by_who["Gaythan"] else None,
        },
        "worst_notice": worst,
    }


def main() -> None:
    confirmed = list(csv.DictReader((ROOT / "confirmed-no-shows.csv").open(encoding="utf-8")))
    a = build_analytics(confirmed)
    print("Top excuses:", a["top_excuses"])
    print("Notice summary:", a["notice_summary"])
    print("Buckets:", a["notice_buckets"])
    for w in a["worst_notice"][:5]:
        print(f"  {w['date']} {w['who']}: {w['notice_hours']}h — {w['note'][:60]}")


if __name__ == "__main__":
    main()
