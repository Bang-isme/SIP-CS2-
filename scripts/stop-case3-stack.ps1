$projectRoot = Split-Path -Parent $PSScriptRoot
$saPort = if ($env:SA_PORT) { [int]$env:SA_PORT } else { 4000 }
$payrollPort = if ($env:PAYROLL_PORT) { [int]$env:PAYROLL_PORT } else { 4100 }
$dashboardPort = if ($env:DASHBOARD_PORT) { [int]$env:DASHBOARD_PORT } else { 4200 }
$mongoMarker = Join-Path $projectRoot "run\mongo.preexisting"

& (Join-Path $projectRoot "scripts\stop-case3-service.ps1") -Name "Dashboard" -Port $dashboardPort
& (Join-Path $projectRoot "scripts\stop-case3-service.ps1") -Name "Payroll" -Port $payrollPort
& (Join-Path $projectRoot "scripts\stop-case3-service.ps1") -Name "SA" -Port $saPort
if (Test-Path $mongoMarker) {
  Remove-Item $mongoMarker -Force -ErrorAction SilentlyContinue
} else {
  & (Join-Path $projectRoot "scripts\stop-local-mongo.ps1")
}

Write-Output "Case 3 stack stop command finished."
