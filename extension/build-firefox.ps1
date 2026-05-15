# ShadowPulse Firefox Build Script
# Creates a Firefox-compatible extension package for AMO submission

$ErrorActionPreference = "Stop"

# Get the script directory
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $ScriptDir

# Read version from firefox_manifest.json
$ManifestPath = Join-Path $ScriptDir "firefox_manifest.json"
$ManifestContent = Get-Content -Raw -Path $ManifestPath
$VersionMatch = [regex]::Match($ManifestContent, '"version"\s*:\s*"([^"]+)"')
$Version = if ($VersionMatch.Success) { $VersionMatch.Groups[1].Value } else { "2.3.2" }

Write-Host "========================================"
Write-Host "ShadowPulse Firefox Build Script"
Write-Host "Version: $Version"
Write-Host "========================================"
Write-Host ""

# Define paths
$BuildDir = Join-Path $ScriptDir "firefox_build"
$ScriptsDir = Join-Path $BuildDir "scripts"
$StyleDir = Join-Path $BuildDir "style"
$OutputZip = Join-Path $ScriptDir "ShadowPulse-v${Version}-firefox.zip"

# Clean and create build directory
Write-Host "[1/5] Cleaning previous build..."
if (Test-Path $BuildDir) {
    Remove-Item -Recurse -Force $BuildDir
}
New-Item -ItemType Directory -Force -Path $ScriptsDir | Out-Null
New-Item -ItemType Directory -Force -Path $StyleDir | Out-Null

# Copy files
Write-Host "[2/5] Copying content scripts..."
$FilesToCopy = @(
    "scripts/utils.js",
    "scripts/ui.js",
    "scripts/faucet.js",
    "scripts/stats.js",
    "scripts/pulse.js",
    "scripts/main.js",
    "scripts/theme_boot.js"
)

foreach ($file in $FilesToCopy) {
    $Source = Join-Path $ScriptDir $file
    $Dest = Join-Path $BuildDir $file
    if (Test-Path $Source) {
        Copy-Item -Path $Source -Destination $Dest -Force
        Write-Host "      Copied: $file"
    } else {
        Write-Warning "      Missing: $file"
    }
}

Write-Host "[3/5] Copying styles and assets..."
$CssSource = Join-Path $ScriptDir "style/main.css"
$CssDest = Join-Path $BuildDir "style/main.css"
if (Test-Path $CssSource) {
    Copy-Item -Path $CssSource -Destination $CssDest -Force
    Write-Host "      Copied: style/main.css"
}

$IconsSource = Join-Path $ScriptDir "icons"
$IconsDest = Join-Path $BuildDir "icons"
if (Test-Path $IconsSource) {
    Copy-Item -Path $IconsSource -Destination $IconsDest -Recurse -Force
    Write-Host "      Copied: icons/"
}

Write-Host "[4/5] Installing Firefox-specific files..."
# Copy Firefox manifest
$FirefoxManifestSource = Join-Path $ScriptDir "firefox_manifest.json"
$FirefoxManifestDest = Join-Path $BuildDir "manifest.json"
Copy-Item -Path $FirefoxManifestSource -Destination $FirefoxManifestDest -Force
Write-Host "      Installed: manifest.json (Firefox version)"

# Copy Firefox background script
$FirefoxBgSource = Join-Path $ScriptDir "scripts/firefox_background.js"
$FirefoxBgDest = Join-Path $BuildDir "scripts/background.js"
Copy-Item -Path $FirefoxBgSource -Destination $FirefoxBgDest -Force
Write-Host "      Installed: scripts/background.js (Firefox version)"

# Create the zip file with forward slashes (for Firefox/Unix compatibility)
Write-Host "[5/5] Creating distribution package..."
if (Test-Path $OutputZip) {
    Remove-Item -Force $OutputZip
}

# Use .NET ZipFile with explicit entry names to ensure forward slashes
Add-Type -AssemblyName System.IO.Compression.FileSystem
Add-Type -AssemblyName System.IO.Compression

$CompressionLevel = [System.IO.Compression.CompressionLevel]::Optimal
$ZipArchiveMode = [System.IO.Compression.ZipArchiveMode]

# Create zip file
$ZipArchive = [System.IO.Compression.ZipFile]::Open($OutputZip, $ZipArchiveMode::Create)

try {
    # Get all files in build directory recursively
    $Files = Get-ChildItem -Path $BuildDir -Recurse -File
    
    foreach ($File in $Files) {
        # Calculate relative path from build dir
        $RelativePath = $File.FullName.Substring($BuildDir.Length + 1)
        
        # Convert backslashes to forward slashes for Unix/Firefox compatibility
        $EntryName = $RelativePath -replace '\\', '/'
        
        # Create entry with forward slashes
        $Entry = $ZipArchive.CreateEntry($EntryName, $CompressionLevel)
        
        # Copy file content
        $FileStream = [System.IO.File]::OpenRead($File.FullName)
        $EntryStream = $Entry.Open()
        $FileStream.CopyTo($EntryStream)
        
        # Clean up streams
        $EntryStream.Close()
        $EntryStream.Dispose()
        $FileStream.Close()
        $FileStream.Dispose()
        
        Write-Host "      Added: $EntryName"
    }
} finally {
    $ZipArchive.Dispose()
}

Write-Host ""
Write-Host "========================================"
Write-Host "Build Complete!"
Write-Host "========================================"
Write-Host "Package: ShadowPulse-v${Version}-firefox.zip"
Write-Host "Size:    $([math]::Round((Get-Item $OutputZip).Length / 1KB, 2)) KB"
Write-Host ""
Write-Host "The extension is ready for AMO submission."
Write-Host ""
Write-Host "To test locally in Firefox:"
Write-Host "  1. Open Firefox and navigate to about:debugging"
Write-Host "  2. Click 'This Firefox' -> 'Load Temporary Add-on...'"
Write-Host "  3. Select the manifest.json from the firefox_build folder"
Write-Host "========================================"
