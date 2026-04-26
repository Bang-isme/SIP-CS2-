import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe("Case 5 readiness snapshot contract", () => {
  test("safe readiness script captures service, security, and database posture without claiming failover", () => {
    const source = fs.readFileSync(
      path.resolve(__dirname, "..", "..", "scripts", "case5-readiness-safe.js"),
      "utf-8",
    );

    expect(source).toContain("CASE5_READINESS_SAFE");
    expect(source).toContain("Non-destructive readiness snapshot");
    expect(source).toContain("securityPosture");
    expect(source).toContain("refreshSecretDistinctFromAccessSecret");
    expect(source).toContain("internalServiceSecretDistinctFromAccessSecret");
    expect(source).toContain("authCookieSecure");
    expect(source).toContain("probeService({ name: \"SA / HR Service\"");
    expect(source).toContain("probeService({ name: \"Payroll Service\"");
    expect(source).toContain("probeService({ name: \"Dashboard Service\"");
    expect(source).toContain("assertMySQLReadiness");
    expect(source).toContain("getMissingActiveMigrations");
    expect(source).toContain("getMissingRequiredTables");
    expect(source).toContain("This report does not prove real cross-site failover");
  });
});
