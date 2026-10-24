"""One-shot generator: seed JSON, tiny fixture, PNG icons. Not shipped as part of the app."""
from __future__ import annotations

import csv
import importlib.util
import json
import re
import struct
import zlib
from pathlib import Path

ROOT = Path(__file__).parent
WHATSAPP = Path(r"C:\Users\simon\Downloads\WhatsApp Chat with Gaythan Sandridge.txt")


def read_csv(name: str) -> list[dict[str, str]]:
    with (ROOT / name).open(encoding="utf-8", newline="") as f:
        return list(csv.DictReader(f))


def write_png(path: Path, size: int, rgb: tuple[int, int, int] = (61, 214, 140)) -> None:
    """Minimal PNG: dark bg + green circle (no PIL)."""
    r, g, b = rgb
    rows = []
    cx = cy = size / 2
    rad = size * 0.36
    for y in range(size):
        row = bytearray()
        row.append(0)
        for x in range(size):
            dx, dy = x - cx, y - cy
            inside = dx * dx + dy * dy <= rad * rad
            ring = abs((dx * dx + dy * dy) ** 0.5 - rad) < size * 0.03
            if ring:
                row += bytes([15, 20, 25, 255])
            elif inside:
                row += bytes([r, g, b, 255])
            else:
                row += bytes([15, 20, 25, 255])
        rows.append(bytes(row))
    raw = b"".join(rows)

    def chunk(tag: bytes, data: bytes) -> bytes:
        return struct.pack(">I", len(data)) + tag + data + struct.pack(">I", zlib.crc32(tag + data) & 0xFFFFFFFF)

    ihdr = struct.pack(">IIBBBBB", size, size, 8, 6, 0, 0, 0)
    png = b"\x89PNG\r\n\x1a\n" + chunk(b"IHDR", ihdr) + chunk(b"IDAT", zlib.compress(raw, 9)) + chunk(b"IEND", b"")
    path.write_bytes(png)


def main() -> None:
    spec = importlib.util.spec_from_file_location("ae", ROOT / "analytics_enrichment.py")
    ae = importlib.util.module_from_spec(spec)
    assert spec.loader
    spec.loader.exec_module(ae)

    confirmed = read_csv("confirmed-no-shows.csv")
    weekday = read_csv("weekday-weekend-failures.csv")
    borderline = read_csv("borderline.csv")
    analytics = ae.build_analytics(confirmed)
    simon = sum(1 for r in confirmed if r["WhoSkipped"] == "Simon")
    gaythan = sum(1 for r in confirmed if r["WhoSkipped"] == "Gaythan")
    both = sum(1 for r in confirmed if r["WhoSkipped"] == "Both")
    seed = {
        "confirmed": confirmed,
        "weekday": weekday,
        "borderline": borderline,
        "analytics": analytics,
        "stats": {
            "confirmed_total": len(confirmed),
            "simon": simon,
            "gaythan": gaythan,
            "both": both,
            "borderline": len(borderline),
            "weekday_confirmed": sum(1 for r in weekday if r["Type"] == "confirmed"),
            "weekday_fizzled": sum(1 for r in weekday if r["Type"] == "fizzled"),
        },
    }

    js_dir = ROOT / "pwa" / "js"
    js_dir.mkdir(parents=True, exist_ok=True)
    (js_dir / "seed-data.json").write_text(json.dumps(seed, ensure_ascii=False), encoding="utf-8")
    print("seed", seed["stats"])
    print("notice", seed["analytics"]["notice_summary"])

    fx_dir = ROOT / "pwa" / "fixtures"
    fx_dir.mkdir(parents=True, exist_ok=True)
    needles = [
        "I'm bailing on golf later",
        "I am not going to golf, even though I am up",
        "don't fancy golf, met a girl",
        "I won't be able to hold the club",
    ]
    fx: list[str] = [
        "6/15/20, 12:24\u202fPM - Messages and calls are end-to-end encrypted. Only people in this chat can read them.",
        "6/15/20, 12:21\u202fPM - Gaythan Sandridge: hello from fixture",
        "6/15/20, 3:04\u202fPM - \U0001f978: it is only halfway",
        "8/6/20, 5:19\u202fPM - \U0001f978: I won't be able to hold the club",
        "4/3/23, 3:52\u202fPM - Gaythan Sandridge: I'm bailing on golf later, you go by all means",
        "12/8/21, 5:24\u202fPM - Gaythan Sandridge: Yo man sorry to be crap but don't fancy golf, met a girl last night, been painting all day, just want to chill",
        "6/7/25, 9:03\u202fAM - \U0001f978: I am not going to golf, even though I am up",
        "4/1/26, 9:10\u202fPM - Gaythan Sandridge: Then just choose to back up to Google",
    ]
    if WHATSAPP.is_file():
        lines = WHATSAPP.read_text(encoding="utf-8", errors="replace").splitlines()
        extra: list[str] = []
        for needle in needles:
            for i, line in enumerate(lines):
                if needle.lower() in line.lower():
                    start = max(0, i - 1)
                    extra.extend(lines[start : i + 2])
                    extra.append("")
                    break
        if extra:
            fx.extend(["", "# --- excerpts from real export (tiny) ---"] + extra)
    (fx_dir / "sample-chat.txt").write_text("\n".join(fx) + "\n", encoding="utf-8")
    print("fixture bytes", (fx_dir / "sample-chat.txt").stat().st_size)

    icons = ROOT / "pwa" / "icons"
    icons.mkdir(parents=True, exist_ok=True)
    write_png(icons / "icon-192.png", 192)
    write_png(icons / "icon-512.png", 512)
    write_png(icons / "apple-touch-icon.png", 180)
    print("icons ok")


if __name__ == "__main__":
    main()
