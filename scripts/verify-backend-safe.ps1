$projectRoot = Split-Path -Parent $PSScriptRoot
$mongoPort = 27017
$startedManagedMongo = $false
$previousSkipBackendProbe = $null

function Test-MongoListening {
  $listener = Get-NetTCPConnection -LocalPort $mongoPort -ErrorAction SilentlyContinue |
    Where-Object { $_.State -eq "Listen" } |
    Select-Object -First 1

  return [bool]$listener
}

function Invoke-ProjectCommand {
  param(
    [string]$Command,
    [string[]]$Arguments
  )

  Push-Location $projectRoot
  try {
    & $Command @Arguments
    if ($LASTEXITCODE -ne 0) {
      $joined = $Arguments -join " "
      throw "Command failed: $Command $joined"
    }
  } finally {
    Pop-Location
  }
}

try {
  if (-not (Test-MongoListening)) {
    & (Join-Path $projectRoot "scripts\start-local-mongo.ps1")
    $startedManagedMongo = $true
  } else {
    Write-Output "MongoDB local already listening on port $mongoPort before backend verification."
  }

  $previousSkipBackendProbe = $env:LOCAL_DOCTOR_SKIP_BACKEND_PROBES
  $env:LOCAL_DOCTOR_SKIP_BACKEND_PROBES = "1"
  try {
    Invoke-ProjectCommand -Command "npm" -Arguments @("run", "doctor:local")
  } finally {
    if ($null -ne $previousSkipBackendProbe) {
      $env:LOCAL_DOCTOR_SKIP_BACKEND_PROBES = $previousSkipBackendProbe
    } else {
      Remove-Item Env:LOCAL_DOCTOR_SKIP_BACKEND_PROBES -ErrorAction SilentlyContinue
    }
  }
  Invoke-ProjectCommand -Command "npm" -Arguments @("run", "lint")
  Invoke-ProjectCommand -Command "npm" -Arguments @("test")
  Invoke-ProjectCommand -Command "npm" -Arguments @("run", "test:advanced")
  Invoke-ProjectCommand -Command "npm" -Arguments @("run", "db:migrate:mysql:status")
  Invoke-ProjectCommand -Command "npm" -Arguments @("audit", "--omit=dev")
} finally {
  if ($startedManagedMongo) {
    & (Join-Path $projectRoot "scripts\stop-local-mongo.ps1")
  }
}
