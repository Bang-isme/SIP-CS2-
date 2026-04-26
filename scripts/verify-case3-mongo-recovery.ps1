$projectRoot = Split-Path -Parent $PSScriptRoot
$saPort = if ($env:SA_PORT) { [int]$env:SA_PORT } else { 4000 }
$dashboardPort = if ($env:DASHBOARD_PORT) { [int]$env:DASHBOARD_PORT } else { 4200 }
$mongoMarker = Join-Path $projectRoot "run\mongo.preexisting"

function Get-ServiceListenerPid {
  param(
    [int]$Port
  )

  $listener = Get-NetTCPConnection -LocalPort $Port -ErrorAction SilentlyContinue |
    Where-Object { $_.State -eq "Listen" } |
    Select-Object -First 1
  if (-not $listener) {
    return $null
  }

  return [int]$listener.OwningProcess
}

function Wait-ForReadyState {
  param(
    [string]$Url,
    [string]$Label,
    [bool]$ExpectReady,
    [int]$TimeoutSeconds = 45,
    [int]$RequiredConsecutiveSuccesses = 2
  )

  $successes = 0
  for ($attempt = 0; $attempt -lt $TimeoutSeconds; $attempt++) {
    $matched = $false

    try {
      $response = Invoke-RestMethod -Uri $Url -TimeoutSec 5
      $matched = $ExpectReady -and $response.ready -eq $true
    } catch {
      $matched = -not $ExpectReady
    }

    if ($matched) {
      $successes += 1
      if ($successes -ge $RequiredConsecutiveSuccesses) {
        return
      }
    } else {
      $successes = 0
    }

    Start-Sleep -Seconds 1
  }

  $stateText = if ($ExpectReady) { "ready" } else { "degraded" }
  throw "$Label did not reach a stable $stateText state at $Url within ${TimeoutSeconds}s."
}

if (Test-Path $mongoMarker) {
  Write-Output "Skipping Mongo recovery smoke because MongoDB was already running before Case 3 startup."
  exit 0
}

$saPidBefore = Get-ServiceListenerPid -Port $saPort
$dashboardPidBefore = Get-ServiceListenerPid -Port $dashboardPort

if (-not $saPidBefore -or -not $dashboardPidBefore) {
  throw "Mongo recovery smoke requires SA and Dashboard to be listening before the dependency interruption."
}

& (Join-Path $projectRoot "scripts\stop-local-mongo.ps1")

Wait-ForReadyState -Url "http://127.0.0.1:$saPort/api/health/ready" -Label "SA" -ExpectReady:$false
Wait-ForReadyState -Url "http://127.0.0.1:$dashboardPort/api/health/ready" -Label "Dashboard" -ExpectReady:$false

& (Join-Path $projectRoot "scripts\start-local-mongo.ps1")

Wait-ForReadyState -Url "http://127.0.0.1:$saPort/api/health/ready" -Label "SA" -ExpectReady:$true
Wait-ForReadyState -Url "http://127.0.0.1:$dashboardPort/api/health/ready" -Label "Dashboard" -ExpectReady:$true

$saPidAfter = Get-ServiceListenerPid -Port $saPort
$dashboardPidAfter = Get-ServiceListenerPid -Port $dashboardPort

if ($saPidAfter -ne $saPidBefore) {
  throw "SA process restarted during Mongo recovery smoke (before PID $saPidBefore, after PID $saPidAfter)."
}

if ($dashboardPidAfter -ne $dashboardPidBefore) {
  throw "Dashboard process restarted during Mongo recovery smoke (before PID $dashboardPidBefore, after PID $dashboardPidAfter)."
}

Write-Output "Mongo dependency recovery verified: SA and Dashboard recovered without process restarts."
