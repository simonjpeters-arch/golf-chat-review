# Golf skip review — phone app + Nathan audit

WhatsApp **does not** let a third-party app pull a personal 1:1 chat. There is no official API for that. This project never scrapes WhatsApp Web or uses unofficial clients.

**How data updates:** WhatsApp → **Export chat → Without media** → import the `.txt` or `.zip` in the app. Analysis runs in the browser.

## For Nathan (install on your phone)

This is a **website you pin as an app icon**, not an App Store / Play Store binary. GitHub cannot install a native app from a clone.

1. Open the **GitHub Pages** HTTPS link (Safari on iPhone, Chrome on Android):  
   **https://simonjpeters-arch.github.io/golf-chat-review/**  
   Repo: **https://github.com/simonjpeters-arch/golf-chat-review**
2. **iPhone:** Share → **Add to Home Screen** → Add.  
3. **Android:** Chrome menu → **Install app** or **Add to Home Screen**.
4. Open **Audit trail**. Scroll the real ledger (dates, quotes, notice hours). Counts must match the Confirmed tab.
5. Optional comedy: **Verify against original messages** / **Open source evidence** / **Authenticate cryptographic hash** — after the real table, those buttons open an **in-app YouTube embed** of Never Gonna Give You Up plus the ICBM banter stamp (the video is not stored in this repo).

You do **not** need a GitHub account to open a public Pages site.

## For Simon (update analysis)

1. Same Pages URL or local `pwa/` (see Serve locally).
2. **Update** tab → choose the latest official export (Without media).
3. Dashboard KPIs, pies, top excuses, notice buckets, cumulative, timeline, worst notice refresh in-browser.
4. Last import + results persist in IndexedDB / localStorage on that phone.

### Export paths

| Phone | Steps |
|---|---|
| Android | Chat → ⋮ → More → Export chat → **Without media** → save to Files |
| iPhone | Chat → contact name → Export Chat → **Without Media** → save to Files → in the PWA tap Choose file → Browse |

## What to send whom

| Who | What |
|---|---|
| **Nathan** | Public Pages URL (install + Audit trail). Or email **`share.html`** (one-file snapshot, works offline, includes Audit trail). |
| **Simon** | This repo / Pages / `pwa/` as the primary app so he can **import a new export** and persist results on his phone. |

`share.html` does not import new chats; it is a frozen report unless you regenerate it with `python build_html.py`.

## Serve locally (optional)

From `pwa/` (needed because `file://` blocks modules/service worker):

```bash
cd C:\Users\simon\Projects\golf-chat-review\pwa
python -m http.server 8080
```

On the phone, same Wi‑Fi: `http://<your-lan-ip>:8080/` — then Add to Home Screen. iOS Add to Home Screen is more reliable on **HTTPS** (use GitHub Pages).

## Project layout

| Path | Role |
|---|---|
| `pwa/` | Installable PWA (canonical app) |
| `docs/` | Copy of `pwa/` for **GitHub Pages** (`/docs` on `main`) |
| `share.html` / `index.html` | Emailable snapshot dashboard |
| `confirmed-no-shows.csv` etc. | Curated dated tables |
| `pwa/fixtures/sample-chat.txt` | Tiny parser fixture (not the 6.8 MB chat) |

Raw export (not in git): `C:\Users\simon\Downloads\WhatsApp Chat with Gaythan Sandridge.txt`

## Parser test

```bash
node pwa/js/test-parser.mjs
```

## Honesty constraints

- No WhatsApp auto-download. Import an export to refresh.
- Curated **42** confirmed dated skips stay the core ledger; import can add **auto**-tagged phrase hits for new dates.
- Rickroll is only on the Audit “verify” buttons, after real numbers are on screen.
