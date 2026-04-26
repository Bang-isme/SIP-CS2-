$mongoRoot = "D:\MongoDB"
$mongod = Join-Path $mongoRoot "Server\8.2\bin\mongod.exe"
$config = Join-Path $mongoRoot "mongod.conf"
$pidFile = Join-Path $mongoRoot "run\mongod.pid"
$serviceName = "SIPLocalMongoDB"
$startupTimeoutSeconds = if ($env:MONGO_LOCAL_START_TIMEOUT_SECONDS) {
  [Math]::Max(10, [int]$env:MONGO_LOCAL_START_TIMEOUT_SECONDS)
} else {
  60
}
$mongoLogPath = "D:\MongoDB\log\mongod.log"

function Get-MongoStartupFailureDetail {
  param(
    [int]$ProcessId
  )

  $messages = @()
  if ($ProcessId) {
    $process = Get-Process -Id $ProcessId -ErrorAction SilentlyContinue
    if (-not $process) {
      $messages += "Process $ProcessId exited before MongoDB started listening."
    }
  }

  if (Test-Path $mongoLogPath) {
    $logTail = Get-Content -Path $mongoLogPath -Tail 12 -ErrorAction SilentlyContinue
    if ($logTail) {
      $messages += "Recent mongod.log lines:"
      $messages += ($logTail -join [Environment]::NewLine)
    }
  }

  return ($messages -join [Environment]::NewLine)
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

  for ($i = 0; $i -lt $startupTimeoutSeconds; $i++) {
    Start-Sleep -Seconds 1
    $service = Get-Service -Name $serviceName -ErrorAction SilentlyContinue
    if ($service -and $service.Status -eq "Running") {
      Write-Output "MongoDB local service '$serviceName' is running."
      exit 0
    }
  }

  throw "MongoDB Windows service '$serviceName' did not reach Running state within $startupTimeoutSeconds seconds."
}

$existing = Get-NetTCPConnection -LocalPort 27017 -ErrorAction SilentlyContinue |
  Select-Object -First 1

if ($existing) {
  Write-Output "MongoDB local already listening on port 27017."
  if (Test-Path $pidFile) {
    Write-Output "PID file: $(Get-Content $pidFile)"
  }
  exit 0
}

$process = Start-Process -FilePath $mongod `
  -ArgumentList @("--config", $config) `
  -WorkingDirectory (Split-Path $mongod) `
  -WindowStyle Hidden `
  -PassThru

Set-Content -Path $pidFile -Value $process.Id

$ready = $false
for ($i = 0; $i -lt $startupTimeoutSeconds; $i++) {
  Start-Sleep -Seconds 1
  $listening = Get-NetTCPConnection -LocalPort 27017 -ErrorAction SilentlyContinue |
    Where-Object { $_.State -eq "Listen" } |
    Select-Object -First 1
  if ($listening) {
    $ready = $true
    break
  }
}

if (-not $ready) {
  $failureDetail = Get-MongoStartupFailureDetail -ProcessId $process.Id
  $message = "MongoDB local did not start listening on port 27017 within $startupTimeoutSeconds seconds."
  if ($failureDetail) {
    $message = "$message`n$failureDetail"
  }
  throw $message
}

Write-Output "MongoDB local started on 127.0.0.1:27017 (PID $($process.Id))."
