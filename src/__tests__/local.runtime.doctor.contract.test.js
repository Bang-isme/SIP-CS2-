import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe("local runtime doctor contract", () => {
  test("package.json exposes doctor:local script", () => {
    const packagePath = path.resolve(__dirname, "..", "..", "package.json");
    const pkg = JSON.parse(fs.readFileSync(packagePath, "utf-8"));

    expect(pkg.scripts).toHaveProperty("doctor:local");
    expect(pkg.scripts["doctor:local"]).toContain("local-runtime-doctor.js");
  });

  test("doctor script checks migrations, health probes, and 500k baseline tables", () => {
    const scriptPath = path.resolve(__dirname, "..", "..", "scripts", "local-runtime-doctor.js");
    const source = fs.readFileSync(scriptPath, "utf-8");

    expect(source).toContain("ACTIVE_SQL_MIGRATION_IDS");
    expect(source).toContain("/api/health/live");
    expect(source).toContain("/api/health/ready");
    expect(source).toContain("LOCAL_DOCTOR_SKIP_BACKEND_PROBES");
    expect(source).toContain("employee_benefits");
    expect(source).toContain("pay_rates");
    expect(source).toContain("SIPLocalMongoDBAutostart");
  });
});
