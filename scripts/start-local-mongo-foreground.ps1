$mongoRoot = "D:\MongoDB"
$mongod = Join-Path $mongoRoot "Server\8.2\bin\mongod.exe"
$config = Join-Path $mongoRoot "mongod.conf"
$serviceName = "SIPLocalMongoDB"
$mongoLogPath = "D:\MongoDB\log\mongod.log"

function Start-LogTail {
  param(
    [string]$Path,
    [string]$Message
  )

  Write-Output $Message

  if (-not (Test-Path $Path)) {
    throw "Mongo log file not found at $Path"
  }

  Get-Content -Path $Path -Tail 20 -Wait
}

if (-not (Test-Path $mongod)) {
  throw "mongod.exe not found at $mongod"
}

if (-not (Test-Path $config)) {
  throw "Mongo config not found at $config"
}

$service = Get-Service -Name $serviceName -ErrorAction SilentlyContinue
if ($service) {
  if ($service.Status -ne "Running") {
    Start-Service -Name $serviceName
  }

  Start-LogTail -Path $mongoLogPath -Message "MongoDB Windows service '$serviceName' is running. Tailing $mongoLogPath ..."
  exit 0
}

$existing = Get-NetTCPConnection -LocalPort 27017 -ErrorAction SilentlyContinue |
  Where-Object { $_.State -eq "Listen" } |
  Select-Object -First 1

if ($existing) {
  Start-LogTail -Path $mongoLogPath -Message "MongoDB local already listening on port 27017 (PID $($existing.OwningProcess)). Tailing $mongoLogPath ..."
  exit 0
}

Write-Output "Starting MongoDB in foreground on 127.0.0.1:27017 ..."
& $mongod "--config" $config
exit $LASTEXITCODE
