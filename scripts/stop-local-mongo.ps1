$pidFile = "D:\MongoDB\run\mongod.pid"

if (Test-Path $pidFile) {
  $pid = Get-Content $pidFile | Select-Object -First 1
  if ($pid) {
    $process = Get-Process -Id $pid -ErrorAction SilentlyContinue
    if ($process) {
      Stop-Process -Id $pid -Force
      Write-Output "Stopped MongoDB local process PID $pid."
    }
  }
  Remove-Item $pidFile -Force -ErrorAction SilentlyContinue
  exit 0
}

$listening = Get-NetTCPConnection -LocalPort 27017 -ErrorAction SilentlyContinue |
  Select-Object -First 1

if ($listening) {
  Stop-Process -Id $listening.OwningProcess -Force
  Write-Output "Stopped MongoDB local process PID $($listening.OwningProcess)."
  exit 0
}

Write-Output "MongoDB local is not running."
