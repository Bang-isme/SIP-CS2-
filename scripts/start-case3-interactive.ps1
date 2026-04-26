$projectRoot = Split-Path -Parent $PSScriptRoot
$saPort = if ($env:SA_PORT) { [int]$env:SA_PORT } else { 4000 }
$payrollPort = if ($env:PAYROLL_PORT) { [int]$env:PAYROLL_PORT } else { 4100 }
$dashboardPort = if ($env:DASHBOARD_PORT) { [int]$env:DASHBOARD_PORT } else { 4200 }
$powershellExe = Join-Path $PSHOME "powershell.exe"
$dashboardBuild = Join-Path $projectRoot "dashboard\dist\index.html"

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

function Start-InteractiveWindow {
  param(
    [string]$Title,
    [string]$Command
  )

  $bootstrap = "Set-Location '$projectRoot'; `$Host.UI.RawUI.WindowTitle = '$Title'; $Command"
  Start-Process -FilePath $powershellExe `
    -ArgumentList @("-NoExit", "-ExecutionPolicy", "Bypass", "-Command", $bootstrap) `
    -WorkingDirectory $projectRoot `
    -WindowStyle Normal | Out-Null
}

& (Join-Path $projectRoot "scripts\stop-case3-stack.ps1")

$occupiedAfterStop = Get-OccupiedCase3Ports -Ports @($saPort, $payrollPort, $dashboardPort)
if ($occupiedAfterStop.Count -gt 0) {
  $occupiedList = ($occupiedAfterStop | ForEach-Object { "$($_.port) (PID $($_.pid))" }) -join ", "
  throw "Interactive stack start requires ports $saPort, $payrollPort, and $dashboardPort to be free. Still occupied: $occupiedList"
}

$env:DASHBOARD_AGGREGATION_ENABLED = if ($env:DASHBOARD_AGGREGATION_ENABLED) { $env:DASHBOARD_AGGREGATION_ENABLED } else { "true" }
$env:DASHBOARD_AGGREGATION_ON_START = if ($env:DASHBOARD_AGGREGATION_ON_START) { $env:DASHBOARD_AGGREGATION_ON_START } else { "true" }
$env:DASHBOARD_AGGREGATION_AWAIT_ON_START = if ($env:DASHBOARD_AGGREGATION_AWAIT_ON_START) { $env:DASHBOARD_AGGREGATION_AWAIT_ON_START } else { "true" }

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

Start-InteractiveWindow -Title "SIP MongoDB" -Command "& '.\scripts\start-local-mongo-foreground.ps1'"
Start-Sleep -Milliseconds 500
Start-InteractiveWindow -Title "SIP SA Service" -Command "npm run sa:start"
Start-Sleep -Milliseconds 500
Start-InteractiveWindow -Title "SIP Payroll Service" -Command "npm run payroll:start"
Start-Sleep -Milliseconds 500
Start-InteractiveWindow -Title "SIP Dashboard Service" -Command "npm run dashboard:start"

Write-Output "Opened interactive service windows for MongoDB, SA, Payroll, and Dashboard."
