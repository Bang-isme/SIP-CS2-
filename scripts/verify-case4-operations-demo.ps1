$projectRoot = Split-Path -Parent $PSScriptRoot
$saPort = if ($env:SA_PORT) { [int]$env:SA_PORT } else { 4000 }
$adminEmail = if ($env:ADMIN_EMAIL) { $env:ADMIN_EMAIL } else { "admin@localhost" }
$adminPassword = if ($env:ADMIN_PASSWORD) { $env:ADMIN_PASSWORD } else { "admin_dev" }
$demoPrefix = "EMP_DEMO_QUEUE_"
$expectedDemoBacklog = 38
$expectedDemoActionable = 12
$expectedDemoRows = 44

function Invoke-DemoScenario {
  param(
    [Parameter(Mandatory = $true)]
    [string]$Scenario
  )

  Push-Location $projectRoot
  try {
    node "scripts/demo-integration-queue-scenario.js" $Scenario
    if (-not $?) {
      throw "Demo queue scenario '$Scenario' failed."
    }
  } finally {
    Pop-Location
  }
}

try {
  Invoke-DemoScenario -Scenario "cleanup"
  Invoke-DemoScenario -Scenario "warning"

  $signinBody = @{
    email = $adminEmail
    password = $adminPassword
  } | ConvertTo-Json

  $signin = Invoke-RestMethod `
    -Method Post `
    -Uri "http://127.0.0.1:$saPort/api/auth/signin" `
    -ContentType "application/json" `
    -Body $signinBody `
    -SessionVariable session

  $token = $signin.token
  if (-not $token) {
    throw "Missing token from sign-in response."
  }

  $headers = @{
    "x-access-token" = $token
  }

  $eventsResponse = Invoke-RestMethod `
    -Method Get `
    -Uri "http://127.0.0.1:$saPort/api/integrations/events?status=ALL&page=1&limit=100" `
    -Headers $headers `
    -WebSession $session
  $events = @($eventsResponse.data)
  $demoEvents = @($events | Where-Object { $_.entity_id -like "$demoPrefix*" })

  if ($demoEvents.Count -lt $expectedDemoRows) {
    throw "Expected at least $expectedDemoRows demo queue rows after warning scenario, but found $($demoEvents.Count)."
  }

  $metricsResponse = Invoke-RestMethod `
    -Method Get `
    -Uri "http://127.0.0.1:$saPort/api/integrations/events/metrics" `
    -Headers $headers `
    -WebSession $session
  $metrics = $metricsResponse.data

  if (($metrics.backlog -as [int]) -lt $expectedDemoBacklog) {
    throw "Expected backlog >= $expectedDemoBacklog during warning scenario, got $($metrics.backlog)."
  }
  if (($metrics.actionable -as [int]) -lt $expectedDemoActionable) {
    throw "Expected actionable >= $expectedDemoActionable during warning scenario, got $($metrics.actionable)."
  }

  $reconciliationResponse = Invoke-RestMethod `
    -Method Get `
    -Uri "http://127.0.0.1:$saPort/api/integrations/events/reconciliation?fresh=true" `
    -Headers $headers `
    -WebSession $session
  $reconciliation = $reconciliationResponse.data

  if (-not $reconciliation.checkedAt) {
    throw "Parity snapshot missing checkedAt timestamp."
  }
  if (-not $reconciliation.summary) {
    throw "Parity snapshot missing summary payload."
  }
  if (($reconciliation.summary.sourceEmployeeCount -as [int]) -le 0) {
    throw "Parity snapshot returned a non-positive source employee count."
  }

  $failedDemoEvent = $demoEvents | Where-Object { $_.status -eq "FAILED" } | Select-Object -First 1
  if (-not $failedDemoEvent) {
    throw "No FAILED demo event available for retry audit verification."
  }

  $beforeAuditResponse = Invoke-RestMethod `
    -Method Get `
    -Uri ("http://127.0.0.1:$saPort/api/integrations/events/{0}/audit?page=1&limit=10" -f $failedDemoEvent.id) `
    -Headers $headers `
    -WebSession $session
  $beforeAuditEntries = @($beforeAuditResponse.data)

  $retryResponse = Invoke-RestMethod `
    -Method Post `
    -Uri ("http://127.0.0.1:$saPort/api/integrations/events/retry/{0}" -f $failedDemoEvent.id) `
    -Headers $headers `
    -WebSession $session

  if ($retryResponse.message -ne "Retry queued") {
    throw "Retry route returned unexpected message: $($retryResponse.message)"
  }

  $afterAuditResponse = Invoke-RestMethod `
    -Method Get `
    -Uri ("http://127.0.0.1:$saPort/api/integrations/events/{0}/audit?page=1&limit=10" -f $failedDemoEvent.id) `
    -Headers $headers `
    -WebSession $session
  $afterAuditEntries = @($afterAuditResponse.data)

  if ($afterAuditEntries.Count -le $beforeAuditEntries.Count) {
    throw "Retry action did not append a new audit entry for event #$($failedDemoEvent.id)."
  }

  $latestRetryAudit = $afterAuditEntries | Where-Object { $_.operator_action -eq "retry-event" } | Select-Object -First 1
  if (-not $latestRetryAudit) {
    throw "Audit trail missing retry-event evidence after operator retry."
  }
  if ($latestRetryAudit.target_status -ne "PENDING") {
    throw "Retry audit target status should be PENDING, got '$($latestRetryAudit.target_status)'."
  }
  if (-not $latestRetryAudit.operator_request_id) {
    throw "Retry audit is missing operator request id."
  }

  $updatedEventsResponse = Invoke-RestMethod `
    -Method Get `
    -Uri "http://127.0.0.1:$saPort/api/integrations/events?status=ALL&page=1&limit=100" `
    -Headers $headers `
    -WebSession $session
  $updatedEvent = @($updatedEventsResponse.data) | Where-Object { $_.id -eq $failedDemoEvent.id } | Select-Object -First 1
  if (-not $updatedEvent) {
    throw "Retried demo event #$($failedDemoEvent.id) could not be found after retry."
  }
  if ($updatedEvent.status -ne "PENDING") {
    throw "Retried demo event should move to PENDING, got '$($updatedEvent.status)'."
  }

  Write-Output "Case 4 operations demo verification passed."
} finally {
  Invoke-DemoScenario -Scenario "cleanup"
}
