import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe("advanced questions audit contract", () => {
  test("questions audit targets the live dashboard and user contracts that still exist", () => {
    const source = fs.readFileSync(
      path.resolve(__dirname, "..", "..", "tests", "advanced", "questions-audit.test.js"),
      "utf-8",
    );

    expect(source).not.toContain("/dashboard/summary");
    expect(source).not.toContain("Password hashes exposed");
    expect(source).not.toContain("SECURITY GAP");
    expect(source).toContain("/dashboard/executive-brief");
    expect(source).toContain("body.data?.employees");
    expect(source).toContain("getAlertEmployees(");
    expect(source).toContain("not.toHaveProperty('password')");
  });
});
