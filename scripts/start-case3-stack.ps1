$projectRoot = Split-Path -Parent $PSScriptRoot
$saPort = if ($env:SA_PORT) { [int]$env:SA_PORT } else { 4000 }
$payrollPort = if ($env:PAYROLL_PORT) { [int]$env:PAYROLL_PORT } else { 4100 }
$dashboardPort = if ($env:DASHBOARD_PORT) { [int]$env:DASHBOARD_PORT } else { 4200 }
$runDir = Join-Path $projectRoot "run"
$mongoMarker = Join-Path $runDir "mongo.preexisting"

New-Item -ItemType Directory -Force -Path $runDir | Out-Null

function Wait-ForReadyService {
  param(
    [string]$Url,
    [string]$Label,
    [int]$TimeoutSeconds = 40,
    [int]$RequiredConsecutiveSuccesses = 2
  )

  $successes = 0
  for ($attempt = 0; $attempt -lt $TimeoutSeconds; $attempt++) {
    try {
      $response = Invoke-RestMethod -Uri $Url -TimeoutSec 5
      if ($response.ready -eq $true) {
        $successes += 1
        if ($successes -ge $RequiredConsecutiveSuccesses) {
          return
        }
      } else {
        $successes = 0
      }
    } catch {
      $successes = 0
    }

    Start-Sleep -Seconds 1
  }

  throw "$Label did not reach a stable ready state at $Url within ${TimeoutSeconds}s."
}

$mongoAlreadyRunning = Get-NetTCPConnection -LocalPort 27017 -ErrorAction SilentlyContinue |
  Select-Object -First 1

if ($mongoAlreadyRunning) {
  Set-Content -Path $mongoMarker -Value "1"
} else {
  Remove-Item $mongoMarker -Force -ErrorAction SilentlyContinue
}

& (Join-Path $projectRoot "scripts\start-local-mongo.ps1")

$env:DASHBOARD_AGGREGATION_ENABLED = if ($env:DASHBOARD_AGGREGATION_ENABLED) { $env:DASHBOARD_AGGREGATION_ENABLED } else { "true" }
$env:DASHBOARD_AGGREGATION_ON_START = if ($env:DASHBOARD_AGGREGATION_ON_START) { $env:DASHBOARD_AGGREGATION_ON_START } else { "true" }
$env:DASHBOARD_AGGREGATION_AWAIT_ON_START = if ($env:DASHBOARD_AGGREGATION_AWAIT_ON_START) { $env:DASHBOARD_AGGREGATION_AWAIT_ON_START } else { "true" }

$dashboardBuild = Join-Path $projectRoot "dashboard\dist\index.html"
if (-not (Test-Path $dashboardBuild) -and $env:CASE3_SKIP_DASHBOARD_BUILD -ne "1") {
  Push-Location $projectRoot
  try {
    npm --prefix dashboard run build
    if (-not $?) {
      throw "Dashboard build failed."
    }
  } finally {
    Pop-Location
  }
}

& (Join-Path $projectRoot "scripts\start-case3-service.ps1") -Name "SA" -Port $saPort -EntryPoint "src/sa-server.js"
& (Join-Path $projectRoot "scripts\start-case3-service.ps1") -Name "Payroll" -Port $payrollPort -EntryPoint "src/payroll-server.js"
& (Join-Path $projectRoot "scripts\start-case3-service.ps1") -Name "Dashboard" -Port $dashboardPort -EntryPoint "src/dashboard-server.js" -StartupTimeoutSeconds 240

Wait-ForReadyService -Url "http://127.0.0.1:$saPort/api/health/ready" -Label "SA"
Wait-ForReadyService -Url "http://127.0.0.1:$payrollPort/api/health/ready" -Label "Payroll"
Wait-ForReadyService -Url "http://127.0.0.1:$dashboardPort/api/health/ready" -Label "Dashboard"

if ($env:CASE3_PREPARE_DASHBOARD_DEMO -ne "0") {
  Push-Location $projectRoot
  try {
    node scripts/prepare-dashboard-demo.js
    if (-not $?) {
      throw "Dashboard demo preparation failed."
    }
  } finally {
    Pop-Location
  }
}

Write-Output "Case 3 stack is ready: SA ($saPort), Payroll ($payrollPort), Dashboard ($dashboardPort)."
