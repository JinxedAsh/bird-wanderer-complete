$ErrorActionPreference = 'Stop'
$frontendPath = Join-Path $PSScriptRoot 'frontend'
$tokenPath = Join-Path $env:USERPROFILE '.config/bird-wanderer/cloudflare-tunnel-token'
$logPath = Join-Path $env:USERPROFILE '.cache/bird-wanderer-android/server-logs'
$expectedOrigin = 'https://birdwanderer.in'

if (-not (Test-Path -LiteralPath $tokenPath)) {
    throw 'The private named-tunnel credential is missing. Restore it locally; never paste it into chat or Git.'
}
$originLine = Get-Content -LiteralPath (Join-Path $frontendPath '.env') |
    Where-Object { $_ -match '^TUNNEL_ORIGIN=' } | Select-Object -First 1
if ($originLine -ne ('TUNNEL_ORIGIN=' + $expectedOrigin)) {
    throw 'Set the exact TUNNEL_ORIGIN for birdwanderer.in in frontend/.env before starting.'
}
$nodeCommand = Get-Command node -ErrorAction SilentlyContinue
if (-not $nodeCommand) { throw 'Node.js 24 is required; see Start-Dev.ps1.' }
$cloudflaredCommand = Get-Command cloudflared -ErrorAction SilentlyContinue
if (-not $cloudflaredCommand) { throw 'The existing cloudflared installation must be available on PATH.' }
New-Item -ItemType Directory -Path $logPath -Force | Out-Null
$runStamp = Get-Date -Format 'yyyyMMdd-HHmmss-fff'

$frontendListener = Get-NetTCPConnection -State Listen -LocalPort 3000 -ErrorAction SilentlyContinue
if (-not $frontendListener) {
    if (Get-NetTCPConnection -State Listen -LocalPort 3001 -ErrorAction SilentlyContinue) {
        throw 'Port 3001 is already occupied while the frontend is stopped. Check the existing server before restarting.'
    }
    Start-Process -FilePath $nodeCommand.Source -ArgumentList 'scripts/dev.mjs' `
        -WorkingDirectory $frontendPath -WindowStyle Hidden `
        -RedirectStandardOutput (Join-Path $logPath ($runStamp + '-domain-dev-out.log')) `
        -RedirectStandardError (Join-Path $logPath ($runStamp + '-domain-dev-error.log')) | Out-Null
    for ($attempt = 0; $attempt -lt 30; $attempt++) {
        if (Get-NetTCPConnection -State Listen -LocalPort 3000 -ErrorAction SilentlyContinue) { break }
        Start-Sleep -Milliseconds 500
    }
}
$page = Invoke-WebRequest -Uri 'http://127.0.0.1:3000/' -UseBasicParsing -TimeoutSec 10
if ($page.StatusCode -ne 200 -or $page.Content -notmatch 'Bird Wanderer') {
    throw 'Port 3000 is not serving the expected Bird Wanderer frontend. Existing processes were preserved.'
}
if (-not (Get-NetTCPConnection -State Listen -LocalPort 3001 -ErrorAction SilentlyContinue)) {
    throw 'The frontend is running but the project API is unavailable on port 3001.'
}

$tokenPattern = [regex]::Escape($tokenPath)
$existingConnector = Get-CimInstance Win32_Process -Filter "Name='cloudflared.exe'" |
    Where-Object { $_.CommandLine -match '--token-file' -and $_.CommandLine -match $tokenPattern }
if ($existingConnector) {
    Write-Output 'Reusing the existing named Cloudflare connector.'
} else {
    Start-Process -FilePath $cloudflaredCommand.Source `
        -ArgumentList @('tunnel', 'run', '--token-file', ('"' + $tokenPath + '"')) `
        -WindowStyle Hidden `
        -RedirectStandardOutput (Join-Path $logPath ($runStamp + '-domain-tunnel-out.log')) `
        -RedirectStandardError (Join-Path $logPath ($runStamp + '-domain-tunnel-error.log')) | Out-Null
    Write-Output 'Started the named Cloudflare connector using its private token file.'
}
Write-Output "Bird Wanderer address: $expectedOrigin"
Write-Output 'The laptop, project server and connector must stay running. DNS/TLS activation is checked separately.'
