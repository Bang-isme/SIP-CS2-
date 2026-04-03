$projectRoot = Split-Path -Parent $PSScriptRoot
$runDir = Join-Path $projectRoot "run"
$pidFile = Join-Path $runDir "backend.pid"
$stdoutLog = Join-Path $runDir "backend.out.log"
$stderrLog = Join-Path $runDir "backend.err.log"

New-Item -ItemType Directory -Force -Path $runDir | Out-Null

$existing = Get-NetTCPConnection -LocalPort 4000 -ErrorAction SilentlyContinue |
  Where-Object { $_.State -eq "Listen" } |
  Select-Object -First 1

if ($existing) {
  Write-Output "Backend local already listening on port 4000 (PID $($existing.OwningProcess))."
  exit 0
}

$process = Start-Process -FilePath "node" `
  -ArgumentList @("src/index.js") `
  -WorkingDirectory $projectRoot `
  -RedirectStandardOutput $stdoutLog `
  -RedirectStandardError $stderrLog `
  -WindowStyle Hidden `
  -PassThru

Set-Content -Path $pidFile -Value $process.Id

$ready = $false
for ($i = 0; $i -lt 30; $i++) {
  Start-Sleep -Seconds 1
  $listening = Get-NetTCPConnection -LocalPort 4000 -ErrorAction SilentlyContinue |
    Where-Object { $_.State -eq "Listen" } |
    Select-Object -First 1
  if ($listening) {
    $ready = $true
    break
  }
}

if (-not $ready) {
  throw "Backend local did not start listening on port 4000 in time. Check $stderrLog"
}

Write-Output "Backend local started on http://127.0.0.1:4000 (PID $($process.Id))."
