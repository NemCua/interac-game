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
if (-not (Get-Command py -ErrorAction SilentlyContinue) -and -not (Get-Command python -ErrorAction SilentlyContinue)) {
    Install-WithWinget 'Python.Python.3.12' 'Python 3.12'
    Refresh-Path
}

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

$python = if (Get-Command py -ErrorAction SilentlyContinue) { 'py' } else { 'python' }
if ($python -eq 'py') {
    & py -3 -m pip install --user --disable-pip-version-check -r requirements.txt
} else {
    & python -m pip install --user --disable-pip-version-check -r requirements.txt
}

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
