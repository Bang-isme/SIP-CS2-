$projectRoot = Split-Path -Parent $PSScriptRoot
$outputDir = if ($env:HOMEWORK_SSO_VIDEO_DIR) {
  $env:HOMEWORK_SSO_VIDEO_DIR
} else {
  Join-Path $projectRoot "docs\homework-sso-assets\video"
}

$dashboardPort = if ($env:DASHBOARD_PORT) { [int]$env:DASHBOARD_PORT } else { 4200 }
$payrollPort = if ($env:PAYROLL_PORT) { [int]$env:PAYROLL_PORT } else { 4100 }
$adminEmail = if ($env:ADMIN_EMAIL) { $env:ADMIN_EMAIL } else { "admin@localhost" }
$adminPassword = if ($env:ADMIN_PASSWORD) { $env:ADMIN_PASSWORD } else { "admin_dev" }
$employeeId = if ($env:HOMEWORK_SSO_EMPLOYEE_ID) { $env:HOMEWORK_SSO_EMPLOYEE_ID } else { "EMP0000001" }

$dashboardLoginUrl = "http://127.0.0.1:$dashboardPort/login"
$dashboardHomeUrl = "http://127.0.0.1:$dashboardPort/dashboard"
$payrollUrl = "http://127.0.0.1:$payrollPort/"
$videoTarget = (Join-Path $outputDir "homework-sso-demo.webm").Replace('\', '/')
$recordingDir = (Join-Path $outputDir "raw").Replace('\', '/')

New-Item -ItemType Directory -Force -Path $outputDir | Out-Null
New-Item -ItemType Directory -Force -Path $recordingDir | Out-Null

if (Test-Path -LiteralPath $videoTarget) {
  Remove-Item -LiteralPath $videoTarget -Force
}

Get-ChildItem -LiteralPath $recordingDir -File -ErrorAction SilentlyContinue | Remove-Item -Force -ErrorAction SilentlyContinue

$playwrightSession = "homework-sso-video-" + ([Guid]::NewGuid().ToString("N").Substring(0, 8))
$playwrightArgs = @("--yes", "--package", "@playwright/cli", "playwright-cli")

$videoCode = @(
  "async (page) => {",
  "const browser = page.context().browser();",
  "const context = await browser.newContext({",
  "  viewport: { width: 1600, height: 960 },",
  "  recordVideo: { dir: '$recordingDir', size: { width: 1600, height: 960 } }",
  "});",
  "const demoPage = await context.newPage();",
  "await demoPage.goto('$payrollUrl');",
  "await demoPage.waitForTimeout(1200);",
  "await demoPage.goto('$dashboardLoginUrl');",
  "await demoPage.getByRole('textbox', { name: 'Email Address' }).fill('$adminEmail');",
  "await demoPage.getByRole('textbox', { name: 'Password' }).fill('$adminPassword');",
  "await demoPage.waitForTimeout(300);",
  "await demoPage.getByRole('button', { name: 'Sign In' }).click();",
  "await demoPage.waitForURL('**/dashboard', { timeout: 30000 });",
  "await demoPage.waitForTimeout(1200);",
  "await demoPage.goto('$payrollUrl');",
  "await demoPage.waitForFunction(() => {",
  "  const text = document.querySelector('#session-state')?.textContent?.toLowerCase() || '';",
  "  return text.includes('signed in') || text.includes('restored') || text.includes('session active');",
  "}, { timeout: 30000 });",
  "await demoPage.waitForTimeout(1000);",
  "await demoPage.locator('#employee-id').fill('$employeeId');",
  "await demoPage.locator('#lookup-record').click();",
  "await demoPage.waitForFunction(() => !document.querySelector('#record-layout')?.classList.contains('hidden'), { timeout: 30000 });",
  "await demoPage.waitForTimeout(1600);",
  "await demoPage.locator('#clear-session').click();",
  "await demoPage.waitForFunction(() => document.querySelector('#session-state')?.textContent?.toLowerCase().includes('signed out'), { timeout: 30000 });",
  "await demoPage.waitForTimeout(1200);",
  "const video = demoPage.video();",
  "await context.close();",
  "const videoPath = video ? await video.path() : null;",
  "return { videoPath };",
  "}"
) -join " "

try {
  & npx @playwrightArgs --session $playwrightSession open about:blank | Out-Null
  if (-not $?) {
    throw "Failed to open Playwright browser session."
  }

  $runOutput = & npx @playwrightArgs --session $playwrightSession run-code $videoCode 2>&1
  if (-not $?) {
    throw "Homework SSO video capture failed.`n$($runOutput -join [Environment]::NewLine)"
  }

  $rawVideo = Get-ChildItem -LiteralPath $recordingDir -Filter *.webm -File | Sort-Object LastWriteTime -Descending | Select-Object -First 1
  if (-not $rawVideo) {
    throw "Playwright did not produce a video file."
  }

  Copy-Item -LiteralPath $rawVideo.FullName -Destination $videoTarget -Force

  Write-Output "Homework SSO demo video captured:"
  Write-Output "  $videoTarget"
} finally {
  & npx @playwrightArgs --session $playwrightSession close 2>$null | Out-Null
}
