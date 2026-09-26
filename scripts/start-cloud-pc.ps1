$ErrorActionPreference = 'Continue'
$repoDir = Split-Path -Parent $PSScriptRoot
Set-Location $repoDir

function Find-RealPython {
    $candidates = @()
    $command = Get-Command python.exe -ErrorAction SilentlyContinue
    if ($command -and $command.Source -notlike '*\WindowsApps\*') { $candidates += $command.Source }
    $candidates += @(Get-ChildItem "$env:LocalAppData\Programs\Python\Python*\python.exe" -ErrorAction SilentlyContinue | Select-Object -ExpandProperty FullName)
    $candidates += @(Get-ChildItem "$env:ProgramFiles\Python*\python.exe" -ErrorAction SilentlyContinue | Select-Object -ExpandProperty FullName)
    foreach ($candidate in $candidates | Select-Object -Unique) {
        if (-not (Test-Path $candidate)) { continue }
        & $candidate --version *> $null
        if ($LASTEXITCODE -eq 0) { return $candidate }
    }
    return $null
}

Write-Host '=== INTERAC GAME CLOUD PC ===' -ForegroundColor Green
Write-Host 'Dang kiem tra ban cap nhat...' -ForegroundColor Cyan
git pull --ff-only

Write-Host 'Dang dong bo thu vien...' -ForegroundColor Cyan
npm install --omit=dev --no-audit --no-fund

$pythonExe = Find-RealPython
if (-not $pythonExe) {
    Write-Host 'Khong tim thay Python that. Hay chay lai lenh cai dat mot lan.' -ForegroundColor Red
    Read-Host 'Nhan Enter de dong'
    exit 1
}
& $pythonExe -m pip install --user --quiet --disable-pip-version-check -r requirements.txt
$env:PYTHON = $pythonExe

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
