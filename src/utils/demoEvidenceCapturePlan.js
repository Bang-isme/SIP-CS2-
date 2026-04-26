import path from "node:path";

export const formatEvidenceDate = (date = new Date()) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

export const buildEvidenceBundleDir = (
  repoRoot = process.cwd(),
  dateStamp = formatEvidenceDate(),
) => path.join(repoRoot, "docs", "demo", "evidence", dateStamp);

export const buildEvidenceOutputDir = (
  repoRoot = process.cwd(),
  dateStamp = formatEvidenceDate(),
) => path.join(buildEvidenceBundleDir(repoRoot, dateStamp), "screenshots");

export const getEvidenceBundleTargets = (bundleDir) => {
  const logsDir = path.join(bundleDir, "logs");
  const dataDir = path.join(bundleDir, "data");
  const screenshotsDir = path.join(bundleDir, "screenshots");

  return {
    bundleDir,
    logsDir,
    dataDir,
    screenshotsDir,
    readme: path.join(bundleDir, "README.md"),
    summary: path.join(dataDir, "evidence-summary.json"),
    demoPrepareReport: path.join(dataDir, "dashboard-demo-prepare.json"),
    verifyBackendLog: path.join(logsDir, "verify-backend.log"),
    verifyFrontendLog: path.join(logsDir, "verify-frontend.log"),
    verifyCase3Log: path.join(logsDir, "verify-case3.log"),
    verifyCase4OperationsLog: path.join(logsDir, "verify-case4-operations-demo.log"),
    stackStartLog: path.join(logsDir, "case3-stack-start.log"),
    demoPrepareLog: path.join(logsDir, "demo-dashboard-prepare.log"),
    captureLog: path.join(logsDir, "capture-demo-evidence.log"),
  };
};

export const getEvidenceScreenshotTargets = (outputDir) => ({
  saHome: path.join(outputDir, "sa-home.png"),
  dashboardReady: path.join(outputDir, "dashboard-ready-for-memo.png"),
  alertsReview: path.join(outputDir, "alerts-review.png"),
  alertSettings: path.join(outputDir, "alert-settings.png"),
  payrollRecord: path.join(outputDir, "payroll-record.png"),
  metadata: path.join(outputDir, "capture-metadata.json"),
});
