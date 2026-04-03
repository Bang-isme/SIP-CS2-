import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe("local backend and stack runtime scripts", () => {
  test("package.json exposes backend and stack commands", () => {
    const packagePath = path.resolve(__dirname, "..", "..", "package.json");
    const pkg = JSON.parse(fs.readFileSync(packagePath, "utf-8"));

    expect(pkg.scripts).toHaveProperty("backend:local:start");
    expect(pkg.scripts).toHaveProperty("backend:local:stop");
    expect(pkg.scripts).toHaveProperty("backend:local:status");
    expect(pkg.scripts).toHaveProperty("stack:local:start");
    expect(pkg.scripts).toHaveProperty("stack:local:stop");
  });

  test("backend start script binds to port 4000 and records a pid file", () => {
    const scriptPath = path.resolve(__dirname, "..", "..", "scripts", "start-local-backend.ps1");
    const source = fs.readFileSync(scriptPath, "utf-8");

    expect(source).toContain("LocalPort 4000");
    expect(source).toContain("backend.pid");
    expect(source).toContain("backend.out.log");
    expect(source).toContain("src/index.js");
  });
});
