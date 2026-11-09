[CmdletBinding()]
param()

$ErrorActionPreference = "Stop"
$repoRoot = Split-Path -Parent $PSScriptRoot
$androidRoot = Join-Path $repoRoot "android"
$bundle = Join-Path $androidRoot "app\build\outputs\bundle\release\app-release.aab"

if (-not $env:JAVA_HOME -or -not (Test-Path (Join-Path $env:JAVA_HOME "bin\java.exe"))) {
    throw "JAVA_HOME must point to a JDK containing bin\java.exe. In Android Studio, use the configured Gradle JDK path."
}

Push-Location $repoRoot
try {
    Write-Host "Building production web assets..."
    & npm.cmd run build
    if ($LASTEXITCODE -ne 0) { throw "Production web build failed." }

    Write-Host "Synchronizing Capacitor Android assets..."
    & npx.cmd cap sync android
    if ($LASTEXITCODE -ne 0) { throw "Capacitor synchronization failed." }

    Write-Host "Building signed Android App Bundle..."
    Push-Location $androidRoot
    try {
        & .\gradlew.bat bundleRelease
        if ($LASTEXITCODE -ne 0) { throw "Gradle bundleRelease failed." }
    } finally {
        Pop-Location
    }

    if (-not (Test-Path $bundle)) {
        throw "Expected AAB was not generated: $bundle"
    }

    $jarsigner = Join-Path $env:JAVA_HOME "bin\jarsigner.exe"
    if (-not (Test-Path $jarsigner)) {
        throw "jarsigner was not found at $jarsigner."
    }

    $verification = & $jarsigner -verify -verbose -certs $bundle 2>&1
    if ($LASTEXITCODE -ne 0 -or ($verification -notmatch "jar verified")) {
        throw "The generated AAB did not pass jarsigner verification."
    }

    Write-Host "Signed AAB verified: $bundle"
} finally {
    Pop-Location
}
