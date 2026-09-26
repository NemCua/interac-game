$ErrorActionPreference = 'Continue'
$repoDir = Split-Path -Parent $PSScriptRoot
Set-Location $repoDir

Write-Host '=== INTERAC GAME CLOUD PC ===' -ForegroundColor Green
Write-Host 'Dang kiem tra ban cap nhat...' -ForegroundColor Cyan
git pull --ff-only

Write-Host 'Dang dong bo thu vien...' -ForegroundColor Cyan
npm install --omit=dev --no-audit --no-fund

$python = if (Get-Command py -ErrorAction SilentlyContinue) { 'py' } else { 'python' }
if ($python -eq 'py') {
    & py -3 -m pip install --user --quiet --disable-pip-version-check -r requirements.txt
} else {
    & python -m pip install --user --quiet --disable-pip-version-check -r requirements.txt
}

$env:PORT = if ($env:PORT) { $env:PORT } else { '8787' }
$gameUrl = "http://localhost:$($env:PORT)"
$controlUrl = "$gameUrl/control.html"
$openedBrowser = $false

Write-Host "Game: $gameUrl" -ForegroundColor Yellow
Write-Host "Dieu khien: $controlUrl" -ForegroundColor Yellow
Write-Host 'Dong cua so nay de tat server.' -ForegroundColor DarkGray

while ($true) {
    $server = Start-Process -FilePath 'node' -ArgumentList 'server.mjs' -WorkingDirectory $repoDir -PassThru -NoNewWindow
    if (-not $openedBrowser) {
        Start-Sleep -Seconds 2
        Start-Process $gameUrl
        Start-Process $controlUrl
        $openedBrowser = $true
    }
    $server.WaitForExit()
    Write-Host 'Server vua dung, tu khoi dong lai sau 3 giay...' -ForegroundColor Yellow
    Start-Sleep -Seconds 3
}
