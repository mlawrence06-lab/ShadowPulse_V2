$ErrorActionPreference = 'Stop'
Set-Location $PSScriptRoot
$ver = (Get-Content -Raw manifest.json | Select-String '"version"\s*:\s*"([^"]+)"').Matches.Groups[1].Value
$zip = "ShadowPulse-v${ver}.zip"
if (Test-Path $zip) { Remove-Item $zip }
Compress-Archive -Path manifest.json, scripts, style, icons -DestinationPath $zip
Write-Host "Chrome build: $zip"
Write-Host "Size: $([math]::Round((Get-Item $zip).Length / 1KB, 2)) KB"
