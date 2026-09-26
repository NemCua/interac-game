$ErrorActionPreference = 'Stop'

$repoUrl = 'https://github.com/NemCua/interac-game.git'
$installDir = Join-Path $env:USERPROFILE 'interac-game'

function Refresh-Path {
    $machinePath = [Environment]::GetEnvironmentVariable('Path', 'Machine')
    $userPath = [Environment]::GetEnvironmentVariable('Path', 'User')
    $env:Path = "$machinePath;$userPath"
}

function Install-WithWinget($id, $name) {
    Write-Host "Dang cai $name..." -ForegroundColor Cyan
    winget install --id $id --exact --silent --accept-package-agreements --accept-source-agreements
}

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

Write-Host '=== CAI DAT INTERAC GAME TREN CLOUD PC ===' -ForegroundColor Green

if (-not (Get-Command winget -ErrorAction SilentlyContinue)) {
    throw 'Cloud PC can co winget (App Installer). Hay cap nhat Windows/App Installer roi chay lai.'
}

if (-not (Get-Command git -ErrorAction SilentlyContinue)) {
    Install-WithWinget 'Git.Git' 'Git'
    Refresh-Path
}
if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    Install-WithWinget 'OpenJS.NodeJS.LTS' 'Node.js LTS'
    Refresh-Path
}
$pythonExe = Find-RealPython
if (-not $pythonExe) {
    Install-WithWinget 'Python.Python.3.12' 'Python 3.12'
    Refresh-Path
    Start-Sleep -Seconds 2
    $pythonExe = Find-RealPython
}
if (-not $pythonExe) { throw 'Khong tim thay Python that sau khi cai. Hay khoi dong lai Windows roi chay lai lenh cai dat.' }

if (Test-Path (Join-Path $installDir '.git')) {
    Write-Host 'Game da ton tai, dang cap nhat...' -ForegroundColor Cyan
    git -C $installDir pull --ff-only
} elseif (Test-Path $installDir) {
    throw "Thu muc $installDir da ton tai nhung khong phai repository. Hay doi ten/xoa thu muc nay roi chay lai."
} else {
    git clone $repoUrl $installDir
}

Set-Location $installDir
npm ci --omit=dev

& $pythonExe -m pip install --user --disable-pip-version-check -r requirements.txt

$desktop = [Environment]::GetFolderPath('Desktop')
$shortcutPath = Join-Path $desktop 'Interac Game.lnk'
$shell = New-Object -ComObject WScript.Shell
$shortcut = $shell.CreateShortcut($shortcutPath)
$shortcut.TargetPath = 'powershell.exe'
$shortcut.Arguments = "-NoProfile -ExecutionPolicy Bypass -File `"$installDir\scripts\start-cloud-pc.ps1`""
$shortcut.WorkingDirectory = $installDir
$shortcut.IconLocation = "$env:SystemRoot\System32\SHELL32.dll,137"
$shortcut.Save()

Write-Host ''
Write-Host 'CAI DAT HOAN TAT!' -ForegroundColor Green
Write-Host "Da tao shortcut: $shortcutPath"
Write-Host 'Tu lan sau chi can bam dup Interac Game ngoai Desktop.'
Write-Host ''

& (Join-Path $installDir 'scripts\start-cloud-pc.ps1')
