$mongoRoot = "D:\MongoDB"
$mongod = Join-Path $mongoRoot "Server\8.2\bin\mongod.exe"
$serviceName = "SIPLocalMongoDB"

if (-not (Test-Path $mongod)) {
  throw "mongod.exe not found at $mongod"
}

$service = Get-Service -Name $serviceName -ErrorAction SilentlyContinue
if (-not $service) {
  Write-Output "MongoDB Windows service '$serviceName' is not installed."
  exit 0
}

if ($service.Status -eq "Running") {
  Stop-Service -Name $serviceName -Force
  Start-Sleep -Seconds 2
}

& $mongod --remove --serviceName $serviceName

if ($LASTEXITCODE -ne 0) {
  throw "Failed to remove MongoDB Windows service '$serviceName'."
}

Write-Output "MongoDB Windows service '$serviceName' removed."
