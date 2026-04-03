$pidFile = "D:\MongoDB\run\mongod.pid"
$serviceName = "SIPLocalMongoDB"

$service = Get-Service -Name $serviceName -ErrorAction SilentlyContinue
if ($service) {
  if ($service.Status -eq "Running") {
    Stop-Service -Name $serviceName -Force
    Write-Output "Stopped MongoDB Windows service '$serviceName'."
  } else {
    Write-Output "MongoDB Windows service '$serviceName' is already stopped."
  }

  Remove-Item $pidFile -Force -ErrorAction SilentlyContinue
  exit 0
}

if (Test-Path $pidFile) {
  $mongoPid = Get-Content $pidFile | Select-Object -First 1
  if ($mongoPid) {
    $process = Get-Process -Id $mongoPid -ErrorAction SilentlyContinue
    if ($process) {
      Stop-Process -Id $mongoPid -Force
      Write-Output "Stopped MongoDB local process PID $mongoPid."
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
