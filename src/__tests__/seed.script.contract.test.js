import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe("seed and repair script contracts", () => {
  test("seed script wraps batch SQL writes in a transaction and resets derived tables", () => {
    const seedPath = path.resolve(__dirname, "..", "..", "scripts", "seed.js");
    const source = fs.readFileSync(seedPath, "utf-8");

    expect(source).toContain("const sqlTransaction = await sequelize.transaction()");
    expect(source).toContain("transaction: sqlTransaction");
    expect(source).toContain("\"earnings_employee_year\"");
    expect(source).toContain("\"earnings_summary\"");
    expect(source).toContain("\"alert_employees\"");
  });

  test("repair script covers pay_rates and alert_employees orphans", () => {
    const repairPath = path.resolve(__dirname, "..", "..", "scripts", "repair-cross-db-consistency.js");
    const source = fs.readFileSync(repairPath, "utf-8");

    expect(source).toContain("PayRate");
    expect(source).toContain("AlertEmployee");
    expect(source).toContain("\"pay_rates\"");
    expect(source).toContain("\"alert_employees\"");
  });

  test("mysql schema bootstrap includes pay-rate contract migration", () => {
    const mysqlDatabasePath = path.resolve(__dirname, "..", "mysqlDatabase.js");
    const source = fs.readFileSync(mysqlDatabasePath, "utf-8");

    expect(source).toContain("20260403_000005_pay_rate_schema_contract_cleanup");
    expect(source).toContain("legacyColumnsToDrop");
    expect(source).toContain("DROP COLUMN");
  });
});
