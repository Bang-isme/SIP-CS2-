import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import {
  buildEvidenceOutputDir,
  formatEvidenceDate,
  getEvidenceScreenshotTargets,
} from "../src/utils/demoEvidenceCapturePlan.js";

const loadPlaywright = async () => {
  try {
    return await import("playwright-core");
  } catch (error) {
    throw new Error(
      "playwright-core is not installed. Install it locally for capture only, for example: npm install --no-save --no-package-lock playwright-core",
      { cause: error },
    );
  }
};

const resolveChromePath = async () => {
  const candidates = [
    process.env.PLAYWRIGHT_CHROME_PATH,
    "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
    "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
    "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
  ].filter(Boolean);

  for (const candidate of candidates) {
    try {
      await fs.access(candidate);
      return candidate;
    } catch {
      // Keep scanning known browser paths.
    }
  }

  throw new Error("No local Chrome/Edge executable was found for evidence capture.");
};

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const saveMetadata = async (outputDir, data) => {
  await fs.mkdir(outputDir, { recursive: true });
  const targets = getEvidenceScreenshotTargets(outputDir);
  await fs.writeFile(targets.metadata, JSON.stringify(data, null, 2), "utf8");
};

const maybeSignInPayroll = async (page, { email, password }) => {
  const signInHeading = page.getByRole("heading", { name: /sign in with the sa service/i });
  if (!(await signInHeading.isVisible().catch(() => false))) {
    return false;
  }

  const signedInBadge = page.getByText(/signed in/i).first();
  if (await signedInBadge.isVisible().catch(() => false)) {
    return false;
  }

  const signInButton = page.getByRole("button", { name: /^sign in$/i }).first();
  if (!(await signInButton.isVisible().catch(() => false))) {
    await signedInBadge.waitFor({ timeout: 5000 }).catch(() => null);
    return false;
  }

  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await signInButton.click();
  await signedInBadge.waitFor({ timeout: 15000 });
  return true;
};

const capture = async () => {
  const { chromium } = await loadPlaywright();
  const chromePath = await resolveChromePath();

  const evidenceDate = process.env.EVIDENCE_DATE_STAMP || formatEvidenceDate();
  const outputDir = process.env.EVIDENCE_OUTPUT_DIR
    || buildEvidenceOutputDir(process.cwd(), evidenceDate);
  const employeeId = process.env.EVIDENCE_EMPLOYEE_ID;
  const adminEmail = process.env.ADMIN_EMAIL || "admin@localhost";
  const adminPassword = process.env.ADMIN_PASSWORD || "admin_dev";

  if (!employeeId) {
    throw new Error("EVIDENCE_EMPLOYEE_ID is required.");
  }

  await fs.mkdir(outputDir, { recursive: true });

  const browser = await chromium.launch({
    headless: true,
    executablePath: chromePath,
  });

  const context = await browser.newContext({
    viewport: { width: 1440, height: 1200 },
    ignoreHTTPSErrors: true,
  });

  const metadata = {
    capturedAt: new Date().toISOString(),
    evidenceDate,
    outputDir,
    employeeId,
    chromePath,
    files: {},
  };
  const targets = getEvidenceScreenshotTargets(outputDir);

  try {
    const saPage = await context.newPage();
    await saPage.goto("http://127.0.0.1:4000/", { waitUntil: "networkidle" });
    await saPage.screenshot({ path: targets.saHome, fullPage: true });
    metadata.files.saHome = targets.saHome;

    const dashboardPage = await context.newPage();
    await dashboardPage.goto("http://127.0.0.1:4200/login", { waitUntil: "domcontentloaded" });
    await dashboardPage.getByLabel(/email address/i).fill(adminEmail);
    await dashboardPage.getByLabel(/^password$/i).fill(adminPassword);
    await dashboardPage.getByRole("button", { name: /sign in/i }).click();
    await dashboardPage.getByText(/ready for memo/i).waitFor({ timeout: 20000 });
    await dashboardPage.getByText(/session restore unavailable/i).waitFor({ state: "hidden", timeout: 8000 }).catch(() => null);
    await dashboardPage.getByText(/signed in/i).waitFor({ state: "hidden", timeout: 8000 }).catch(() => null);
    await wait(1200);
    await dashboardPage.screenshot({ path: targets.dashboardReady, fullPage: true });
    metadata.files.dashboardReady = targets.dashboardReady;

    await dashboardPage.goto("http://127.0.0.1:4200/alerts", { waitUntil: "networkidle" });
    await dashboardPage.getByRole("heading", { name: /alert review/i }).waitFor({ timeout: 20000 });
    await dashboardPage.getByRole("heading", { name: /alert detail/i }).scrollIntoViewIfNeeded();
    await wait(900);
    await dashboardPage.screenshot({ path: targets.alertsReview, fullPage: true });
    metadata.files.alertsReview = targets.alertsReview;

    const alertSettingsButton = dashboardPage.getByRole("button", { name: /alert settings/i }).first();
    if (await alertSettingsButton.isVisible().catch(() => false)) {
      await alertSettingsButton.click();
      await dashboardPage.getByRole("heading", { name: /alert settings/i }).waitFor({ timeout: 10000 });
      await wait(700);
      await dashboardPage.screenshot({ path: targets.alertSettings, fullPage: true });
      metadata.files.alertSettings = targets.alertSettings;
    }

    const payrollPage = await context.newPage();
    await payrollPage.goto("http://127.0.0.1:4100/", { waitUntil: "domcontentloaded" });
    await maybeSignInPayroll(payrollPage, { email: adminEmail, password: adminPassword });
    const employeeInput = payrollPage.getByLabel(/employee id/i);
    await employeeInput.fill(employeeId);
    await payrollPage.getByRole("button", { name: /open payroll record/i }).click();
    await payrollPage.getByText(employeeId, { exact: false }).first().waitFor({ timeout: 20000 });
    await payrollPage.getByRole("heading", { name: /latest pay-rate snapshot/i }).scrollIntoViewIfNeeded();
    await wait(1200);
    await payrollPage.screenshot({ path: targets.payrollRecord, fullPage: true });
    metadata.files.payrollRecord = targets.payrollRecord;

    await saveMetadata(outputDir, metadata);
  } finally {
    await context.close();
    await browser.close();
  }
};

capture().catch((error) => {
  console.error(error?.stack || error?.message || String(error));
  process.exit(1);
});
