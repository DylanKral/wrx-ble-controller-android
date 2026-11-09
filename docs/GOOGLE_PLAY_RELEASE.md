# Google Play release

This project keeps release signing credentials outside Git. The application ID is
com.dylankral.wrxblecontroller, version name is 1.0, version code is 1, and
compile/target SDK are API 36.

## 1. Verify the release toolchain

Use JDK 21. Android Studio's configured Gradle JDK is suitable, but PowerShell
must have JAVA_HOME set:

~~~powershell
$env:JAVA_HOME = "C:\Users\Dylank\.jdks\jbr-21.0.11"
$env:Path = "$env:JAVA_HOME\bin;$env:Path"
java -version
~~~

Use the SDK configured by Android Studio. API 36 and compatible build tools must
be installed.

## 2. Create an upload keystore once

Do not run this command if an existing upload keystore is already registered with
Google Play. Back up that existing keystore instead.

From the repository root, enter your own passwords when prompted. Do not put them
in the command line:

~~~powershell
New-Item -ItemType Directory -Force android\keys | Out-Null
& "$env:JAVA_HOME\bin\keytool.exe" -genkeypair -v `
  -keystore android\keys\wrx-upload.jks `
  -alias wrx-upload `
  -keyalg RSA -keysize 4096 -validity 10000
~~~

The keystore is ignored by Git. Store an encrypted backup in a secure location.

## 3. Configure signing credentials

Create android/keystore.properties locally. This file is ignored and must never
be committed:

~~~properties
storeFile=../keys/wrx-upload.jks
storePassword=YOUR_KEYSTORE_PASSWORD
keyAlias=wrx-upload
keyPassword=YOUR_KEY_PASSWORD
~~~

Alternatively, use environment variables in the PowerShell session:

~~~powershell
$env:ANDROID_KEYSTORE_PATH = "C:\full\path\to\wrx-upload.jks"
$env:ANDROID_KEYSTORE_PASSWORD = "your password"
$env:ANDROID_UPLOAD_KEY_ALIAS = "wrx-upload"
$env:ANDROID_UPLOAD_KEY_PASSWORD = "your password"
~~~

Environment variables are supported so credentials do not need to be stored in a
file. Do not print them.

## 4. Build the signed AAB

From the repository root:

~~~powershell
npm.cmd run android:release
~~~

The script runs the production TypeScript/Vite build, Capacitor synchronization,
Gradle bundleRelease, checks that the bundle exists, and verifies its signing
certificate with jarsigner.

Expected output:

~~~
android/app/build/outputs/bundle/release/app-release.aab
~~~

The command fails if signing credentials, the keystore, Java, or the bundle are
missing. It does not claim success for an unsigned bundle.

Manual verification:

~~~powershell
& "$env:JAVA_HOME\bin\jarsigner.exe" -verify -verbose -certs `
  android/app/build/outputs/bundle/release/app-release.aab
~~~

Look for jar verified.

## 5. Future releases

Google Play requires every uploaded version to have a higher version code.
Increment versionCode in android/app/build.gradle while updating versionName as
appropriate. Never reuse a version code already uploaded.

## 6. Upload to Play Console

In Google Play Console, create the app using the existing application ID, complete
the store listing and App content/Data safety declarations, create a release in
the desired testing track, and upload app-release.aab. Review the generated Play
signing configuration before promoting the release.

The upload key is the private key used by the developer to sign uploads. Google
Play verifies it and then signs distributed APKs with Google's separate
app-signing key. Keep the upload keystore private and backed up; losing it can
block future uploads.

## Current repository status

The Gradle signing configuration and PowerShell release workflow are present.
No keystore or signing credentials are stored in this repository. A signed AAB
cannot be generated until you configure a real upload keystore and credentials.
