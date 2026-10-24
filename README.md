# Golf skip review — Android app

Native **Kotlin + Jetpack Compose** app (not a WebView). Package `com.simon.golfchatreview`.

WhatsApp **does not** let a third-party app pull a personal 1:1 chat. Update = official **Export chat → Without media** → Import in the **Update** tab.

## Install the APK (Android)

1. Download **golf-skips-debug.apk** from [GitHub Releases](https://github.com/simonjpeters-arch/golf-chat-review/releases).
2. On the phone: Settings → allow **Install unknown apps** for Chrome/Files.
3. Open the APK → Install → open **Golf Skips**.

Repo: https://github.com/simonjpeters-arch/golf-chat-review

### Screens

| Tab | What you see |
|---|---|
| **Dashboard** | Large KPIs (confirmed, Simon/Gaythan/Both, median notice, same-day %, &lt;2h, after-start), who-skipped donut, top 5 excuses, worst notice, bottom line |
| **Audit** | Scrollable evidence list (date, who, quote, notice hours). Chips: All / Simon / Gaythan / Both / Short notice |
| **Over time** | Quarterly stacked bars, cumulative Simon vs Gaythan, notice buckets |
| **Update** | Storage Access Framework file picker for `.txt` / `.zip`. Parses on-device, persists in DataStore |
| **Verify evidence** | From Audit (after the real list): joke stamp + opens YouTube Rickroll. Does not lock the phone |

The app ships a **bundled snapshot** of the current 42 confirmed rows so it is useful before any import.

## Build locally

Needs JDK 17 and Android SDK 35 (`ANDROID_HOME`).

```bat
cd C:\Users\simon\Projects\golf-chat-review\android
set JAVA_HOME=C:\Program Files\Microsoft\jdk-17.0.20.101-hotspot
gradlew.bat assembleDebug --no-daemon
```

APK: `android\app\build\outputs\apk\debug\app-debug.apk`

## WhatsApp export (Update tab)

Android: chat → ⋮ → More → **Export chat** → **Without media** → Import in the app.

## Nathan vs Simon

| Who | What |
|---|---|
| **Nathan** | Install the APK. Read Dashboard + Audit. Optional Verify button is a prank. |
| **Simon** | Same APK. Use **Update** to import a new export. |

`share.html` / GitHub Pages remain as a leftover web snapshot — **the Android app is the product**.

Raw chat is **not** in git (`C:\Users\simon\Downloads\WhatsApp Chat with Gaythan Sandridge.txt`).
