import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe("Case 4 operations demo verification contract", () => {
  test("operations demo smoke script seeds warning queue state, checks parity, and verifies audit evidence", () => {
    const source = fs.readFileSync(
      path.resolve(__dirname, "..", "..", "scripts", "verify-case4-operations-demo.ps1"),
      "utf-8",
    );

    expect(source).toContain("demo-integration-queue-scenario.js");
    expect(source).toContain('Invoke-DemoScenario -Scenario "warning"');
    expect(source).toContain("/api/integrations/events/metrics");
    expect(source).toContain("/api/integrations/events/reconciliation?fresh=true");
    expect(source).toContain("/api/integrations/events/{0}/audit?page=1&limit=10");
    expect(source).toContain("/api/integrations/events/retry/{0}");
    expect(source).toContain("Retry queued");
    expect(source).toContain("retry-event");
    expect(source).toContain('Invoke-DemoScenario -Scenario "cleanup"');
  });
});
