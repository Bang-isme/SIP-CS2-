import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe("dashboard demo preparation contract", () => {
  test("demo prep script delegates missing-alert orchestration to the dedicated service", () => {
    const scriptSource = fs.readFileSync(
      path.resolve(__dirname, "..", "..", "scripts", "prepare-dashboard-demo.js"),
      "utf-8",
    );
    const serviceSource = fs.readFileSync(
      path.resolve(__dirname, "..", "services", "dashboardDemoPreparationService.js"),
      "utf-8",
    );

    expect(scriptSource).toContain('`${DASHBOARD_BASE_URL}/alerts`');
    expect(scriptSource).toContain("prepareDashboardDemo");
    expect(scriptSource).toContain("refreshAlertAggregates");
    expect(scriptSource).toContain("provisionAlertEvidence");
    expect(scriptSource).toContain("DASHBOARD_DEMO_PREP_OUTPUT_PATH");

    expect(serviceSource).toContain("benefits_change");
    expect(serviceSource).toContain("missingTriggeredTypes");
    expect(serviceSource).toContain("provisionedBenefitDemoEmployeeId");
    expect(serviceSource).toContain("remainingMissingTypes");
    expect(serviceSource).toContain("Dashboard demo is still missing active alert types");
  });
});
