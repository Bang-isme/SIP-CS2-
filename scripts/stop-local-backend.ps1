$projectRoot = Split-Path -Parent $PSScriptRoot
$pidFile = Join-Path $projectRoot "run\backend.pid"

if (Test-Path $pidFile) {
  $backendPid = Get-Content $pidFile | Select-Object -First 1
  if ($backendPid) {
    $process = Get-Process -Id $backendPid -ErrorAction SilentlyContinue
    if ($process) {
      Stop-Process -Id $backendPid -Force
      Write-Output "Stopped backend local process PID $backendPid."
    }
  }
  Remove-Item $pidFile -Force -ErrorAction SilentlyContinue
  exit 0
}

$listening = Get-NetTCPConnection -LocalPort 4000 -ErrorAction SilentlyContinue |
  Where-Object { $_.State -eq "Listen" } |
  Select-Object -First 1

if ($listening) {
  Stop-Process -Id $listening.OwningProcess -Force
  Write-Output "Stopped backend local process PID $($listening.OwningProcess)."
  exit 0
}

Write-Output "Backend local is not running."
