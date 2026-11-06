param(
  [string]$PublicKey
)

$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
$manifestPath = Join-Path $root 'manifest.json'
if ([string]::IsNullOrWhiteSpace($PublicKey)) {
  $PublicKey = Get-Clipboard -Raw
}

$normalizedKey = $PublicKey `
  -replace '-----BEGIN PUBLIC KEY-----', '' `
  -replace '-----END PUBLIC KEY-----', '' `
  -replace '\s', ''

if ($normalizedKey -notmatch '^[A-Za-z0-9+/=]+$') {
  throw 'No valid public key was found. In the Chrome Web Store draft Package tab, copy the public key, then run npm run set:store-key again.'
}

$manifest = Get-Content -LiteralPath $manifestPath -Raw | ConvertFrom-Json
$manifest | Add-Member -NotePropertyName key -NotePropertyValue $normalizedKey -Force
$manifestJson = $manifest | ConvertTo-Json -Depth 20
[System.IO.File]::WriteAllText($manifestPath, $manifestJson, (New-Object System.Text.UTF8Encoding($false)))
$hashBytes = [System.Security.Cryptography.SHA256]::Create().ComputeHash([Convert]::FromBase64String($normalizedKey))
$alphabet = 'abcdefghijklmnop'
$extensionIdCharacters = foreach ($byte in $hashBytes[0..15]) {
  $alphabet[($byte -shr 4)]
  $alphabet[($byte -band 0x0f)]
}
$extensionId = -join $extensionIdCharacters
Write-Output "Updated manifest.json. Expected Chrome extension ID: $extensionId"
