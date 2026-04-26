import path from "node:path";
import {
  buildEvidenceBundleDir,
  buildEvidenceOutputDir,
  formatEvidenceDate,
  getEvidenceBundleTargets,
  getEvidenceScreenshotTargets,
} from "../utils/demoEvidenceCapturePlan.js";

describe("demo evidence capture plan", () => {
  test("uses a date-based evidence folder instead of a hardcoded capture date", () => {
    expect(formatEvidenceDate(new Date("2026-04-18T09:30:00+07:00"))).toBe("2026-04-18");

    const outputDir = buildEvidenceOutputDir("D:\\SIP_CS 2\\SIP_CS", "2026-04-18");
    expect(outputDir).toBe(
      path.join("D:\\SIP_CS 2\\SIP_CS", "docs", "demo", "evidence", "2026-04-18", "screenshots"),
    );
  });

  test("exposes canonical bundle targets for logs, data, and summary output", () => {
    const bundleDir = buildEvidenceBundleDir("D:\\SIP_CS 2\\SIP_CS", "2026-04-18");
    const targets = getEvidenceBundleTargets(bundleDir);

    expect(bundleDir).toBe(
      path.join("D:\\SIP_CS 2\\SIP_CS", "docs", "demo", "evidence", "2026-04-18"),
    );
    expect(targets.readme).toMatch(/README\.md$/);
    expect(targets.summary).toMatch(/evidence-summary\.json$/);
    expect(targets.demoPrepareReport).toMatch(/dashboard-demo-prepare\.json$/);
    expect(targets.verifyBackendLog).toMatch(/verify-backend\.log$/);
    expect(targets.verifyFrontendLog).toMatch(/verify-frontend\.log$/);
    expect(targets.verifyCase3Log).toMatch(/verify-case3\.log$/);
    expect(targets.verifyCase4OperationsLog).toMatch(/verify-case4-operations-demo\.log$/);
    expect(targets.demoPrepareLog).toMatch(/demo-dashboard-prepare\.log$/);
    expect(targets.captureLog).toMatch(/capture-demo-evidence\.log$/);
  });

  test("plans the expanded screenshot bundle for alerts evidence as well as system overview", () => {
    const targets = getEvidenceScreenshotTargets("D:\\SIP_CS 2\\SIP_CS\\docs\\demo\\evidence\\2026-04-18\\screenshots");

    expect(targets).toMatchObject({
      saHome: expect.stringMatching(/sa-home\.png$/),
      dashboardReady: expect.stringMatching(/dashboard-ready-for-memo\.png$/),
      alertsReview: expect.stringMatching(/alerts-review\.png$/),
      alertSettings: expect.stringMatching(/alert-settings\.png$/),
      payrollRecord: expect.stringMatching(/payroll-record\.png$/),
      metadata: expect.stringMatching(/capture-metadata\.json$/),
    });
  });
});
