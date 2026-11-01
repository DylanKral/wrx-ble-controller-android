# WRX RGB Controller for Android

Independent Capacitor Android application. Project directory:
`C:\Users\Dylank\Desktop\WRX Tail lights Android`.

The browser project at `C:\Users\Dylank\Desktop\WRX Tail lights` is separate and must not be edited by this project's commands. This Android application's repository is [DylanKral/wrx-ble-controller-android](https://github.com/DylanKral/wrx-ble-controller-android). The copied Pages workflow is archived as `.github/deploy.yml.disabled`, outside the workflows directory.

## Application

- Capacitor 8; package/application ID `com.dylankral.wrxblecontroller`; display name **WRX RGB Controller**.
- Android Studio project: `android/`. Minimum Android API 24; compile/target API 36.
- Vite builds relative asset paths into `dist/`; Capacitor copies these to Android assets. No remote server URL, GitHub Pages, or runtime internet dependency.
- Existing React/TypeScript design, calibrated SVG simulator, factory modes, Custom presets, editor, timing/speed controls, and preferences are retained.
- Main presets always use Combined playback (preview plus connected lights). Custom Testing and Calibration retain their output selector. Native BLE is selected automatically in Android; desktop browser preview uses Web Bluetooth.
- Android system bar CSS insets keep navigation, sticky simulator and Stop + Red clear of the system UI. Existing touch and narrow-screen layout is retained.
- Profile/configuration and calibration exports use Android's share sheet with cache files, without storage permissions. Import uses the existing file chooser.

## Setup and build (PowerShell)

Install Node 22+ and Android Studio 2025.2.1 or newer, with **JDK 21**, **Android SDK Platform 36**, Build Tools **36.0.0**, and Platform Tools. Select JDK 21 as Android Studio's Gradle JDK. Accept SDK licenses through Android Studio's SDK Manager. The old Android Studio/JDK 11 and standalone JDK 14 on this machine are insufficient.

```powershell
Set-Location 'C:\Users\Dylank\Desktop\WRX Tail lights Android'
npm.cmd ci
npm.cmd run android:sync
npm.cmd run android:open
```

Android Studio should locate the SDK and create its ignored `android/local.properties`. For command-line builds, set `JAVA_HOME` to your JDK 21 directory and `ANDROID_HOME` to your SDK directory in the current shell. Do not point JAVA_HOME at the old JDK 14. Example SDK location: `$env:LOCALAPPDATA\Android\Sdk`.

```powershell
npm.cmd run android:apk
# Output: android/app/build/outputs/apk/debug/app-debug.apk

npm.cmd run android:bundle
# Output: android/app/build/outputs/bundle/release/app-release.aab
```

Both commands rebuild and sync web assets first. The debug APK is debug-signed. The release bundle is **unsigned** until a private release signing configuration is supplied. Use Android Studio's Generate Signed App Bundle workflow later; keep keystores/passwords out of Git. Building a bundle does not publish it.

To install/run on a USB-debugging-enabled phone, select it in Android Studio, or run `npm.cmd run android:run`. Confirm it appears in `adb devices` first. After source changes always run `npm.cmd run android:sync` before running from Studio.

## Bluetooth and playback

The transport contract in `src/bluetooth/transport.ts` isolates the unchanged packet encoding and animation engine from the native plugin. `NativeBLETransport.ts` uses the plugin's Android scan picker, validates discovered writable services, remembers successful device IDs locally, and bridges disconnect events to BLEManager. Left is Dream-CF4B; right is Dream-A90F. Select the matching device for each Connect button.

The existing manager retains serialized commands, per-controller write exclusion and bounded reconnect attempts. Native writes time out after 5 seconds; failures invalidate the connection before later commands can use it. A disconnected controller stops Hardware/Combined playback and pending scheduled commands. Reconnecting never restarts playback automatically. Stop + Red cancels scheduled playback and sends the existing RGB-red packet to connected targets. A disconnected controller cannot receive red; reconnect and press Stop + Red again.

Backgrounding or locking the app stops JavaScript scheduling/calibration. **The last factory effect can continue inside the controller.** This app does not add a background BLE service or promise background animation timing.

UUIDs and packets remain unchanged:

- Write service: `0000ffd5-0000-1000-8000-00805f9b34fb`
- Write characteristic: `0000ffd9-0000-1000-8000-00805f9b34fb`
- Notification service/characteristic remain `ffd0` / `ffd4` in the same Bluetooth base UUID.
- Verified Mode 4 default: `9E0003819800E9`; blue: `560000FF00F0AA`; red: `56FF000000F0AA`.

Android 12+ requests Nearby devices (SCAN/CONNECT), with neverForLocation. Android 7?11 needs legacy Bluetooth and location permissions for BLE scanning; location permissions are capped at API 30. No advertising, background-location, camera or external-storage permission is requested. Simulation without saved devices does not initialize Bluetooth. Saved devices may trigger permission requests when auto-connect is enabled.

Preferences stay in the app's local WebView storage across normal restarts. Browser localStorage is a different sandbox and cannot be automatically copied. Export a complete backup from the browser and import it in the Android app to transfer user configuration. App uninstall/clear-data removes local preferences.

## Verification

```powershell
npm.cmd run typecheck
npm.cmd test
npm.cmd run test:e2e
npm.cmd run android:sync
node scripts/verify-android.mjs
# Optional production-assets browser checks after building:
$env:WRX_TEST_PRODUCTION = '1'
npx.cmd playwright test tests/browser/simulation.spec.ts tests/browser/androidMigration.spec.ts --grep-invert "match approved HTML"
```

See [Android validation](docs/ANDROID_VALIDATION.md) for results, toolchain blockers and the physical-device acceptance checklist. Browser automation and mocked native tests do not establish real Android radio behavior.

Reference documentation: [Capacitor setup](https://capacitorjs.com/docs/getting-started/environment-setup), [native BLE plugin](https://github.com/capacitor-community/bluetooth-le). The copied [browser reference](docs/BROWSER_PROJECT_REFERENCE.md) describes historical web functionality; its browser deployment instructions do not apply to this independent Android project.
