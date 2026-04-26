$projectRoot = Split-Path -Parent $PSScriptRoot
$saPort = if ($env:SA_PORT) { [int]$env:SA_PORT } else { 4000 }
$payrollPort = if ($env:PAYROLL_PORT) { [int]$env:PAYROLL_PORT } else { 4100 }
$dashboardPort = if ($env:DASHBOARD_PORT) { [int]$env:DASHBOARD_PORT } else { 4200 }

function Get-OccupiedCase3Ports {
  param(
    [int[]]$Ports
  )

  $occupied = @()
  foreach ($port in $Ports) {
    $listener = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue |
      Where-Object { $_.State -eq "Listen" } |
      Select-Object -First 1
    if ($listener) {
      $occupied += [PSCustomObject]@{
        port = $port
        pid = $listener.OwningProcess
      }
    }
  }

  return $occupied
}

function Wait-ForPortsToBeFree {
  param(
    [int[]]$Ports,
    [int]$TimeoutSeconds = 20
  )

  for ($attempt = 0; $attempt -lt $TimeoutSeconds; $attempt++) {
    $occupied = Get-OccupiedCase3Ports -Ports $Ports
    if ($occupied.Count -eq 0) {
      return @()
    }
    Start-Sleep -Seconds 1
  }

  return Get-OccupiedCase3Ports -Ports $Ports
}

function Wait-ForHealthyService {
  param(
    [string]$Url,
    [string]$Label,
    [int]$TimeoutSeconds = 25,
    [int]$RequiredConsecutiveSuccesses = 2
  )

  $successes = 0
  for ($attempt = 0; $attempt -lt $TimeoutSeconds; $attempt++) {
    try {
      $response = Invoke-WebRequest -Uri $Url -UseBasicParsing -TimeoutSec 5
      if ($response.StatusCode -ge 200 -and $response.StatusCode -lt 300) {
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

  throw "$Label did not reach a stable healthy state at $Url within ${TimeoutSeconds}s."
}

try {
  & (Join-Path $projectRoot "scripts\stop-case3-stack.ps1")

  $occupiedPorts = Wait-ForPortsToBeFree -Ports @($saPort, $payrollPort, $dashboardPort)
  if ($occupiedPorts.Count -gt 0) {
    $occupiedList = ($occupiedPorts | ForEach-Object { "$($_.port) (PID $($_.pid))" }) -join ", "
    throw "Case 3 verification requires ports $saPort, $payrollPort, and $dashboardPort to be free after managed shutdown. Still occupied: $occupiedList"
  }

  & (Join-Path $projectRoot "scripts\start-case3-stack.ps1")
  Wait-ForHealthyService -Url "http://127.0.0.1:$saPort/api/health/ready" -Label "SA"
  Wait-ForHealthyService -Url "http://127.0.0.1:$payrollPort/api/health/ready" -Label "Payroll"
  Wait-ForHealthyService -Url "http://127.0.0.1:$dashboardPort/api/health/ready" -Label "Dashboard"

  if ($env:CASE3_SKIP_MONGO_RECOVERY_SMOKE -ne "1") {
    & (Join-Path $projectRoot "scripts\verify-case3-mongo-recovery.ps1")
    if (-not $?) {
      throw "Case 3 Mongo recovery verification failed."
    }
  }

  Push-Location $projectRoot
  try {
    node scripts/verify-case3-stack.js
    if (-not $?) {
      throw "Case 3 verification script failed."
    }

    if ($env:CASE3_SKIP_BROWSER_AUTH_SMOKE -ne "1") {
      & (Join-Path $projectRoot "scripts\verify-case3-browser-auth.ps1")
      if (-not $?) {
        throw "Case 3 browser auth smoke verification failed."
      }
    }

    if ($env:CASE3_SKIP_OPERATIONS_DEMO_SMOKE -ne "1") {
      & (Join-Path $projectRoot "scripts\verify-case4-operations-demo.ps1")
      if (-not $?) {
        throw "Case 4 operations demo verification failed."
      }
    }
  } finally {
    Pop-Location
  }
} finally {
  & (Join-Path $projectRoot "scripts\stop-case3-stack.ps1")
}
