$projectRoot = Split-Path -Parent $PSScriptRoot
$outputDir = if ($env:HOMEWORK_SSO_SCREENSHOT_DIR) {
  $env:HOMEWORK_SSO_SCREENSHOT_DIR
} else {
  Join-Path $projectRoot "docs\homework-sso-assets\screenshots"
}

$dashboardPort = if ($env:DASHBOARD_PORT) { [int]$env:DASHBOARD_PORT } else { 4200 }
$payrollPort = if ($env:PAYROLL_PORT) { [int]$env:PAYROLL_PORT } else { 4100 }
$adminEmail = if ($env:ADMIN_EMAIL) { $env:ADMIN_EMAIL } else { "admin@localhost" }
$adminPassword = if ($env:ADMIN_PASSWORD) { $env:ADMIN_PASSWORD } else { "admin_dev" }
$employeeId = if ($env:HOMEWORK_SSO_EMPLOYEE_ID) { $env:HOMEWORK_SSO_EMPLOYEE_ID } else { "EMP0000001" }

$dashboardLoginUrl = "http://127.0.0.1:$dashboardPort/login"
$dashboardHomeUrl = "http://127.0.0.1:$dashboardPort/dashboard"
$payrollUrl = "http://127.0.0.1:$payrollPort/"

$dashboardShot = (Join-Path $outputDir "01-hr-dashboard-signed-in.png").Replace('\', '/')
$payrollShot = (Join-Path $outputDir "02-payroll-restored-record.png").Replace('\', '/')
$logoutShot = (Join-Path $outputDir "03-payroll-after-logout.png").Replace('\', '/')

New-Item -ItemType Directory -Force -Path $outputDir | Out-Null

$playwrightSession = "homework-sso-capture-" + ([Guid]::NewGuid().ToString("N").Substring(0, 8))
$playwrightArgs = @("--yes", "--package", "@playwright/cli", "playwright-cli")

$captureCode = @(
  "async (page) => {",
  "await page.setViewportSize({ width: 1600, height: 960 });",
  "await page.goto('$dashboardLoginUrl');",
  "await page.getByRole('textbox', { name: 'Email Address' }).fill('$adminEmail');",
  "await page.getByRole('textbox', { name: 'Password' }).fill('$adminPassword');",
  "await page.getByRole('button', { name: 'Sign In' }).click();",
  "await page.waitForURL('**/dashboard', { timeout: 30000 });",
  "await page.screenshot({ path: '$dashboardShot', fullPage: true });",
  "await page.goto('$payrollUrl');",
  "await page.waitForFunction(() => {",
  "  const text = document.querySelector('#session-state')?.textContent?.toLowerCase() || '';",
  "  return text.includes('signed in') || text.includes('restored') || text.includes('session active');",
  "}, { timeout: 30000 });",
  "await page.locator('#employee-id').fill('$employeeId');",
  "await page.locator('#lookup-record').click();",
  "await page.waitForFunction(() => !document.querySelector('#record-layout')?.classList.contains('hidden'), { timeout: 30000 });",
  "await page.screenshot({ path: '$payrollShot', fullPage: true });",
  "await page.locator('#clear-session').click();",
  "await page.waitForFunction(() => document.querySelector('#session-state')?.textContent?.toLowerCase().includes('signed out'), { timeout: 30000 });",
  "await page.screenshot({ path: '$logoutShot', fullPage: true });",
  "return {",
  "  dashboardShot: '$dashboardShot',",
  "  payrollShot: '$payrollShot',",
  "  logoutShot: '$logoutShot'",
  "};",
  "}"
) -join " "

try {
  & npx @playwrightArgs --session $playwrightSession open about:blank | Out-Null
  if (-not $?) {
    throw "Failed to open Playwright browser session."
  }

  $runOutput = & npx @playwrightArgs --session $playwrightSession run-code $captureCode 2>&1
  if (-not $?) {
    throw "Homework SSO screenshot capture failed.`n$($runOutput -join [Environment]::NewLine)"
  }

  Write-Output "Homework SSO screenshots captured:"
  Write-Output "  $dashboardShot"
  Write-Output "  $payrollShot"
  Write-Output "  $logoutShot"
} finally {
  & npx @playwrightArgs --session $playwrightSession close 2>$null | Out-Null
}
