import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { PayRate } from "../models/sql/index.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe("PayRate model-adapter contract", () => {
  test("PayRate model exposes fields used by payroll adapter", () => {
    const attrs = PayRate.rawAttributes;
    expect(attrs).toHaveProperty("employee_id");
    expect(attrs).toHaveProperty("pay_rate");
    expect(attrs).toHaveProperty("pay_type");
    expect(attrs).toHaveProperty("effective_date");
    expect(attrs.employee_id.unique).not.toBe(true);
  });

  test("payroll adapter uses the same pay_rate contract fields", () => {
    const adapterPath = path.resolve(__dirname, "..", "adapters", "payroll.adapter.js");
    const source = fs.readFileSync(adapterPath, "utf-8");

    expect(source).toContain("employee_id");
    expect(source).toContain("pay_rate");
    expect(source).toContain("pay_type");
    expect(source).toContain("effective_date");
  });
});
