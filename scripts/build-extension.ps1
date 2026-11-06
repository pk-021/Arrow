param(
  [ValidateSet('development', 'web-store', 'web-store-draft')]
  [string]$Target = 'development',
  [string]$OutputDirectory = 'dist'
)

$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
$destination = Join-Path $root (Join-Path $OutputDirectory $Target)
$manifestPath = Join-Path $root 'manifest.json'

if (Test-Path -LiteralPath $destination) {
  Remove-Item -LiteralPath $destination -Recurse -Force
}
New-Item -ItemType Directory -Path $destination -Force | Out-Null

foreach ($directory in @('assets', 'css', 'js')) {
  Copy-Item -LiteralPath (Join-Path $root $directory) -Destination (Join-Path $destination $directory) -Recurse -Force
}
foreach ($file in @('login.html', 'notification.html', 'popup.html', 'rules.json', 'settings.html')) {
  Copy-Item -LiteralPath (Join-Path $root $file) -Destination (Join-Path $destination $file) -Force
}

$manifest = Get-Content -LiteralPath $manifestPath -Raw | ConvertFrom-Json
if ($Target -eq 'web-store-draft') {
  $manifest.PSObject.Properties.Remove('key')
}
$manifestJson = $manifest | ConvertTo-Json -Depth 20
[System.IO.File]::WriteAllText((Join-Path $destination 'manifest.json'), $manifestJson, (New-Object System.Text.UTF8Encoding($false)))

if ($Target -eq 'web-store' -or $Target -eq 'web-store-draft') {
  $zipName = if ($Target -eq 'web-store-draft') { 'arrow-web-store-draft.zip' } else { 'arrow-web-store.zip' }
  $zipPath = Join-Path $root (Join-Path $OutputDirectory $zipName)
  if (Test-Path -LiteralPath $zipPath) { Remove-Item -LiteralPath $zipPath -Force }
  Compress-Archive -Path (Join-Path $destination '*') -DestinationPath $zipPath -Force
  Write-Output "Created Chrome Web Store package: $zipPath"
} else {
  Write-Output "Created unpacked development extension: $destination"
}
