$ErrorActionPreference = 'Stop'

$repoUrl = 'https://github.com/NemCua/interac-game.git'
$installDir = Join-Path $env:USERPROFILE 'interac-game'
$downloadDir = Join-Path $env:TEMP 'interac-game-installer'
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
New-Item -ItemType Directory -Force -Path $downloadDir | Out-Null

function Refresh-Path {
    $machinePath = [Environment]::GetEnvironmentVariable('Path', 'Machine')
    $userPath = [Environment]::GetEnvironmentVariable('Path', 'User')
    $env:Path = "$machinePath;$userPath"
}

function Install-WithWinget($id, $name) {
    Write-Host "Dang cai $name..." -ForegroundColor Cyan
    winget install --id $id --exact --silent --accept-package-agreements --accept-source-agreements
}

function Install-GitDirect {
    Write-Host 'Khong co winget - dang tai Git chinh thuc...' -ForegroundColor Cyan
    $release = Invoke-RestMethod 'https://api.github.com/repos/git-for-windows/git/releases/latest'
    $asset = $release.assets | Where-Object { $_.name -match '^Git-[0-9.]+-64-bit\.exe$' } | Select-Object -First 1
    if (-not $asset) { throw 'Khong tim thay bo cai Git for Windows x64.' }
    $installer = Join-Path $downloadDir 'git-installer.exe'
    Invoke-WebRequest -UseBasicParsing $asset.browser_download_url -OutFile $installer
    $process = Start-Process $installer -ArgumentList '/VERYSILENT','/NORESTART','/NOCANCEL','/SP-' -Wait -PassThru
    if ($process.ExitCode -ne 0) { throw "Cai Git that bai (ma $($process.ExitCode))." }
}

function Install-NodeDirect {
    Write-Host 'Khong co winget - dang tai Node.js LTS chinh thuc...' -ForegroundColor Cyan
    $release = Invoke-RestMethod 'https://nodejs.org/dist/index.json' | Where-Object { $_.lts } | Select-Object -First 1
    if (-not $release) { throw 'Khong tim thay phien ban Node.js LTS.' }
    $version = $release.version
    $installer = Join-Path $downloadDir 'node-lts-x64.msi'
    Invoke-WebRequest -UseBasicParsing "https://nodejs.org/dist/$version/node-$version-x64.msi" -OutFile $installer
    $process = Start-Process 'msiexec.exe' -ArgumentList '/i',"`"$installer`"",'/qn','/norestart' -Wait -PassThru
    if ($process.ExitCode -ne 0) { throw "Cai Node.js that bai (ma $($process.ExitCode))." }
}

function Install-PythonDirect {
    Write-Host 'Khong co winget - dang tai Python chinh thuc...' -ForegroundColor Cyan
    $installer = Join-Path $downloadDir 'python-3.12.10-amd64.exe'
    Invoke-WebRequest -UseBasicParsing 'https://www.python.org/ftp/python/3.12.10/python-3.12.10-amd64.exe' -OutFile $installer
    $process = Start-Process $installer -ArgumentList '/quiet','InstallAllUsers=0','PrependPath=1','Include_test=0','Include_launcher=1' -Wait -PassThru
    if ($process.ExitCode -ne 0) { throw "Cai Python that bai (ma $($process.ExitCode))." }
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
Refresh-Path

$hasWinget = $null -ne (Get-Command winget -ErrorAction SilentlyContinue)

if (-not (Get-Command git -ErrorAction SilentlyContinue)) {
    if ($hasWinget) { Install-WithWinget 'Git.Git' 'Git' } else { Install-GitDirect }
    Refresh-Path
}
if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    if ($hasWinget) { Install-WithWinget 'OpenJS.NodeJS.LTS' 'Node.js LTS' } else { Install-NodeDirect }
    Refresh-Path
}
$pythonExe = Find-RealPython
if (-not $pythonExe) {
    if ($hasWinget) { Install-WithWinget 'Python.Python.3.12' 'Python 3.12' } else { Install-PythonDirect }
    Refresh-Path
    Start-Sleep -Seconds 2
    $pythonExe = Find-RealPython
}
if (-not $pythonExe) { throw 'Khong tim thay Python that sau khi cai. Hay khoi dong lai Windows roi chay lai lenh cai dat.' }
if (-not (Get-Command git -ErrorAction SilentlyContinue)) { throw 'Khong tim thay Git sau khi cai dat.' }
if (-not (Get-Command node -ErrorAction SilentlyContinue)) { throw 'Khong tim thay Node.js sau khi cai dat.' }

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
