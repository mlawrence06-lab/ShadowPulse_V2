$manifestPath = "extension/manifest.json"
if (-not (Test-Path $manifestPath)) {
    Write-Error "manifest.json not found at $manifestPath"
    exit 1
}

$json = Get-Content $manifestPath -Raw | ConvertFrom-Json
$versionParts = $json.version.Split('.')
$versionParts[-1] = [int]$versionParts[-1] + 1
$newVersion = $versionParts -join '.'

$json.version = $newVersion
$json | ConvertTo-Json -Depth 10 | Set-Content $manifestPath

Write-Host "Extension version bumped to $newVersion"
