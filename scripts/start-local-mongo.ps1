$mongoRoot = "D:\MongoDB"
$mongod = Join-Path $mongoRoot "Server\8.2\bin\mongod.exe"
$config = Join-Path $mongoRoot "mongod.conf"
$pidFile = Join-Path $mongoRoot "run\mongod.pid"

if (-not (Test-Path $mongod)) {
  throw "mongod.exe not found at $mongod"
}

if (-not (Test-Path $config)) {
  throw "Mongo config not found at $config"
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
for ($i = 0; $i -lt 30; $i++) {
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
  throw "MongoDB local did not start listening on port 27017 in time."
}

Write-Output "MongoDB local started on 127.0.0.1:27017 (PID $($process.Id))."
