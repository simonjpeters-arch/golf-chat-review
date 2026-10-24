# Golf Skips Android app

Jetpack Compose, minSdk 26, targetSdk 35, applicationId `com.simon.golfchatreview`.

**Debug APK** is the correct Golf Skips app (`com.simon.golfchatreview`). Debug means it is signed with the Android debug key so you can sideload without a Play Store signing key. It is not Helion.

```bat
set JAVA_HOME=C:\Program Files\Microsoft\jdk-17.0.20.101-hotspot
gradlew.bat assembleDebug --no-daemon
```

Output: `app/build/outputs/apk/debug/app-debug.apk`

On the phone: **Update → Choose .txt from phone**, or Share a `.txt` from Files into Golf Skips.
