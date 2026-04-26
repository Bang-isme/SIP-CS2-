$projectRoot = Split-Path -Parent $PSScriptRoot
$saPort = if ($env:SA_PORT) { [int]$env:SA_PORT } else { 4000 }
$payrollPort = if ($env:PAYROLL_PORT) { [int]$env:PAYROLL_PORT } else { 4100 }
$dashboardPort = if ($env:DASHBOARD_PORT) { [int]$env:DASHBOARD_PORT } else { 4200 }
$adminEmail = if ($env:ADMIN_EMAIL) { $env:ADMIN_EMAIL } else { "admin@localhost" }
$adminPassword = if ($env:ADMIN_PASSWORD) { $env:ADMIN_PASSWORD } else { "admin_dev" }
$playwrightSession = "case3-auth-smoke-" + ([Guid]::NewGuid().ToString("N").Substring(0, 8))
$playwrightArgs = @("--yes", "--package", "@playwright/cli", "playwright-cli")
$loginUrl = "http://127.0.0.1:$dashboardPort/login"
$payrollUrl = "http://127.0.0.1:$payrollPort/?employeeId=EMP0000001"
$employeesUrl = "http://127.0.0.1:$dashboardPort/dashboard/admin/employees"
$integrationUrl = "http://127.0.0.1:$dashboardPort/dashboard/integration"

$smokeCode = @(
  "async (page) => {",
  "const browser = page.context().browser();",
  "await page.goto('$loginUrl');",
  "await page.getByRole('textbox', { name: 'Email Address' }).fill('$adminEmail');",
  "await page.getByRole('textbox', { name: 'Password' }).fill('$adminPassword');",
  "await page.getByRole('button', { name: 'Sign In' }).click();",
  "await page.waitForURL('**/dashboard', { timeout: 30000 });",
  "await page.goto('$employeesUrl');",
  "await page.waitForURL('**/dashboard/admin/employees', { timeout: 30000 });",
  "await page.reload();",
  "await page.waitForURL('**/dashboard/admin/employees', { timeout: 30000 });",
  "const restoredUrl = page.url();",
  "const deepLinkPage = await page.context().newPage();",
  "await deepLinkPage.goto('$integrationUrl');",
  "await deepLinkPage.waitForURL('**/dashboard/integration', { timeout: 30000 });",
  "const deepLinkUrl = deepLinkPage.url();",
  "const payrollFromDashboardPage = await page.context().newPage();",
  "await payrollFromDashboardPage.goto('$payrollUrl');",
  "await payrollFromDashboardPage.waitForFunction(() => document.querySelector('#session-state')?.textContent?.includes('Signed in'), { timeout: 30000 });",
  "await payrollFromDashboardPage.waitForFunction(() => document.querySelector('#metric-employee-id')?.textContent?.trim() === 'EMP0000001', { timeout: 30000 });",
  "const payrollEvidenceId = await payrollFromDashboardPage.locator('#metric-employee-id').textContent();",
  "await page.getByRole('button', { name: 'Sign Out' }).click();",
  "await page.waitForURL('**/login', { timeout: 30000 });",
  "const dashboardAfterLogoutUrl = page.url();",
  "await payrollFromDashboardPage.reload();",
  "await payrollFromDashboardPage.waitForFunction(() => document.querySelector('#session-state')?.textContent?.includes('Signed out'), { timeout: 30000 });",
  "const payrollAfterDashboardLogoutState = await payrollFromDashboardPage.locator('#session-state').textContent();",
  "const payrollAfterDashboardLogoutPrompt = await payrollFromDashboardPage.locator('#record-state').textContent();",
  "await payrollFromDashboardPage.close();",
  "await deepLinkPage.close();",
  "const reverseContext = await browser.newContext();",
  "const payrollSignInPage = await reverseContext.newPage();",
  "await payrollSignInPage.goto('$payrollUrl');",
  "await payrollSignInPage.locator('#email').fill('$adminEmail');",
  "await payrollSignInPage.locator('#password').fill('$adminPassword');",
  "await payrollSignInPage.locator('#login-submit').click();",
  "await payrollSignInPage.waitForFunction(() => document.querySelector('#session-state')?.textContent?.includes('Signed in'), { timeout: 30000 });",
  "await payrollSignInPage.waitForFunction(() => document.querySelector('#metric-employee-id')?.textContent?.trim() === 'EMP0000001', { timeout: 30000 });",
  "const payrollFirstEvidenceId = await payrollSignInPage.locator('#metric-employee-id').textContent();",
  "const dashboardFromPayrollPage = await reverseContext.newPage();",
  "await dashboardFromPayrollPage.goto('$employeesUrl');",
  "await dashboardFromPayrollPage.waitForURL('**/dashboard/admin/employees', { timeout: 30000 });",
  "await dashboardFromPayrollPage.reload();",
  "await dashboardFromPayrollPage.waitForURL('**/dashboard/admin/employees', { timeout: 30000 });",
  "const dashboardFromPayrollUrl = dashboardFromPayrollPage.url();",
  "await payrollSignInPage.locator('#clear-session').click();",
  "await payrollSignInPage.waitForFunction(() => document.querySelector('#session-state')?.textContent?.includes('Signed out'), { timeout: 30000 });",
  "const payrollAfterLogoutState = await payrollSignInPage.locator('#session-state').textContent();",
  "await dashboardFromPayrollPage.goto('$employeesUrl');",
  "await dashboardFromPayrollPage.waitForURL('**/login', { timeout: 30000 });",
  "const dashboardAfterPayrollLogoutUrl = dashboardFromPayrollPage.url();",
  "await dashboardFromPayrollPage.close();",
  "await payrollSignInPage.close();",
  "await reverseContext.close();",
  "return { restoredUrl, deepLinkUrl, payrollEvidenceId, dashboardAfterLogoutUrl, payrollAfterDashboardLogoutState, payrollAfterDashboardLogoutPrompt, payrollFirstEvidenceId, dashboardFromPayrollUrl, payrollAfterLogoutState, dashboardAfterPayrollLogoutUrl };",
  "}"
) -join " "

try {
  & npx @playwrightArgs --session $playwrightSession open about:blank | Out-Null
  if (-not $?) {
    throw "Failed to open Playwright browser session."
  }

  $runOutput = & npx @playwrightArgs --session $playwrightSession run-code $smokeCode 2>&1
  if (-not $?) {
    throw "Browser auth smoke flow failed.`n$($runOutput -join [Environment]::NewLine)"
  }

  $runText = ($runOutput | Out-String)
  if ($runText -notmatch [Regex]::Escape($employeesUrl)) {
    throw "Protected-route reload did not finish on $employeesUrl.`n$runText"
  }
  if ($runText -notmatch [Regex]::Escape($integrationUrl)) {
    throw "Protected deep link did not finish on $integrationUrl.`n$runText"
  }
  if ($runText -notmatch "payrollEvidenceId") {
    throw "Dashboard-first flow did not return payroll evidence details.`n$runText"
  }
  if ($runText -notmatch "dashboardAfterLogoutUrl") {
    throw "Dashboard logout did not report the post-logout redirect state.`n$runText"
  }
  if ($runText -notmatch "payrollAfterDashboardLogoutState") {
    throw "Payroll did not report the post-dashboard-logout state.`n$runText"
  }
  if ($runText -notmatch "payrollAfterDashboardLogoutPrompt") {
    throw "Payroll did not report the post-dashboard-logout prompt state.`n$runText"
  }
  if ($runText -notmatch "dashboardFromPayrollUrl") {
    throw "Payroll-first session did not restore into the protected Dashboard route.`n$runText"
  }
  if ($runText -notmatch "payrollAfterLogoutState") {
    throw "Payroll logout flow did not report a signed-out state.`n$runText"
  }
  if ($runText -notmatch "dashboardAfterPayrollLogoutUrl") {
    throw "Dashboard route did not report the post-logout redirect state after Payroll sign-out.`n$runText"
  }

  $networkOutput = & npx @playwrightArgs --session $playwrightSession network 2>&1
  if (-not $?) {
    throw "Failed to read Playwright network log."
  }

  $networkText = ($networkOutput | Out-String)
  $refreshFailurePattern = "\[POST\] http://127\.0\.0\.1:$saPort/api/auth/refresh => \[(400|401|403)\]"
  if ($networkText -match $refreshFailurePattern) {
    throw "Browser auth smoke detected a failing refresh request.`n$networkText"
  }
  $refreshSuccessPattern = "\[POST\] http://127\.0\.0\.1:$saPort/api/auth/refresh => \[200\] OK"
  $refreshSuccessCount = [Regex]::Matches($networkText, $refreshSuccessPattern).Count
  if ($refreshSuccessCount -lt 1) {
    throw "Browser auth smoke did not observe any successful refresh restore request.`n$networkText"
  }

  Write-Output "Case 3 browser auth smoke passed."
} finally {
  & npx @playwrightArgs --session $playwrightSession close 2>$null | Out-Null
}
