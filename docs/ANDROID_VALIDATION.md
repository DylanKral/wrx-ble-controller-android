# Android migration validation

Date: 2026-10-29 (America/Los_Angeles).

## Completed

- TypeScript check: passed.
- Unit suite: **136 passed**, including 126 existing tests and 10 native BLE adapter tests.
- Initial complete browser suite: 71 passed; one assertion expected the old Browser active wording. Updated that assertion to App active.
- Targeted browser rerun: **30 passed**, covering the corrected lifecycle test, all mobile layout checks, application flows, exports, and two new Android migration checks. All 72 original browser tests have passed across these runs, plus the two new tests.
- Production-assets browser checks: **6 passed**, covering SVG tracks, output modes, persistence, insets and disconnect recovery. The historical HTML color-comparison test timed out because its reference HTML is only served by the development server, not packaged in production. That test passed in the initial development-server suite; the documented production command excludes it. This is not an Android runtime test.
- Production Vite build and Capacitor Android sync: passed. All four native plugins registered (Bluetooth LE, App lifecycle, Filesystem, Share).
- Asset verification: all **8 production files** match Android's bundled public assets; relative paths and absence of a remote server URL verified.
- Original browser repository remains clean. Animation engine, command encoding and calibrated simulator source files are unchanged in the Android copy.
- Android repository has no remote; Pages workflow moved outside the workflows directory. No commits, pushes, merges or publishing performed.

## Build and hardware blockers

Debug APK compilation was attempted with the installed JDK 14. Gradle failed applying the Android plugin because it requires at least Java 17 to run. The generated Capacitor compile configuration additionally targets **Java 21**, so install/select **JDK 21**, not just JDK 17. The installed Android Studio runtime is Java 11; installed SDK platforms are 31 and 32, while this project targets **SDK 36**. See the README for the updated toolchain and build commands.

**No APK or AAB was produced or installed.** Native compilation, manifest merge, Android WebView runtime and release bundle generation remain unverified until that toolchain is installed. The generated Gradle wrapper and Android Studio source project are present.

ADB started successfully and reported **no attached devices**. Real scanning, permission dialogs, two-controller connections, native command delivery and radio reconnection could not be tested. Unit tests use a mocked BleClient, and browser tests use a mocked browser BLE transport. They do not prove controller behavior or actual native bridge operation.

## Physical Android acceptance checklist (pending)

Use both Dream controllers and a phone with Bluetooth LE. Record phone model, Android version, WebView version, build version, controller IDs and results.

1. Build/install the debug APK. Launch with network connectivity disabled and Bluetooth enabled; confirm bundled UI, SVG animation and all preset/editor pages work without network requests.
2. On a fresh installation, use Simulation Only without permission prompts. Test denial and later grant from Connect. On Android 12+, confirm Nearby devices only; on API 24?30 confirm the required scan location prompt and location-service behavior.
3. Scan and select Dream-CF4B for left and Dream-A90F for right. Confirm independent status indicators, wrong-side rejection, manual disconnect and saved device IDs after force-close/relaunch.
4. Send Mode 4 and RGB blue/red. Compare physical effects against the existing verified controller behavior. Verify modes 1?256 retain their native encoding and speed byte; exercise factory loops without repeated writes.
5. Run Custom presets, editing, playlists, scheduler timing and speed changes in all three output modes. Simulation Only must not send output commands; Hardware Only must not render live animation; Combined should drive both.
6. Press Stop + Red during queued playback and during calibration. Confirm scheduled commands stop and both connected lights turn red. Disconnect or power off one controller mid-animation: playback must stop, retries must be bounded, and recovery must not resume playback. Press Stop + Red after recovery to reset the recovered controller.
7. Toggle Bluetooth off/on, go out of range/back, deny permissions, and disconnect during an outstanding write. Confirm no frozen UI, stale animation packet after reconnect, or unhandled error. Native timeouts must release/invalidate the failed link.
8. Lock/unlock and background/foreground during playback. App scheduling stays stopped on return. A factory effect already running inside a controller may continue until a new command is received.
9. Test portrait/landscape, gesture and three-button navigation, display cutouts, large font size and keyboard input. Confirm sticky simulator placement and accessible Stop + Red above the navigation area.
10. Save preferences/profiles, force-close and reopen. Export JSON and CSV through Android Share, save them using an installed file target, then import a browser backup through the file chooser. Verify persisted values and file contents.
11. Build the unsigned release AAB. Signing and any store submission require a separate approved publishing step.

## Remaining tooling observations

The production bundle has one JavaScript chunk over Vite's 500 kB advisory threshold; build succeeds. No animation/UI restructuring was introduced solely to silence that warning.

The dependency audit reported three findings in the inherited development test toolchain (Vitest/mocker/tinypool: one moderate, two critical), with a major Vitest upgrade suggested. These are not production runtime dependencies. That unrelated major test-runner migration was not included; address it before exposing development/test servers beyond localhost. The app's production dependencies had no findings in this audit.
