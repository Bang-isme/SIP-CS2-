import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe("demo evidence pack builder contract", () => {
  test("package.json exposes a one-command evidence builder", () => {
    const packagePath = path.resolve(__dirname, "..", "..", "package.json");
    const pkg = JSON.parse(fs.readFileSync(packagePath, "utf-8"));

    expect(pkg.scripts).toHaveProperty("demo:evidence:build");
    expect(pkg.scripts["demo:evidence:build"]).toContain("build-demo-evidence-pack.mjs");
  });

  test("builder script runs verification gates, prepares demo data, and writes a dated pack", () => {
    const scriptSource = fs.readFileSync(
      path.resolve(__dirname, "..", "..", "scripts", "build-demo-evidence-pack.mjs"),
      "utf-8",
    );

    expect(scriptSource).toContain("buildEvidenceBundleDir");
    expect(scriptSource).toContain("getEvidenceBundleTargets");
    expect(scriptSource).toContain('["run", "verify:backend"]');
    expect(scriptSource).toContain('["run", "verify:frontend"]');
    expect(scriptSource).toContain('["run", "verify:case3"]');
    expect(scriptSource).toContain('["run", "verify:case4:operations-demo"]');
    expect(scriptSource).toContain('["run", "case3:stack:start"]');
    expect(scriptSource).toContain('["run", "case3:stack:stop"]');
    expect(scriptSource).toContain('["run", "demo:dashboard:prepare"]');
    expect(scriptSource).toContain("DASHBOARD_DEMO_PREP_OUTPUT_PATH");
    expect(scriptSource).toContain("CASE3_SKIP_OPERATIONS_DEMO_SMOKE");
    expect(scriptSource).toContain("DEMO_EVIDENCE_USE_RUNNING_STACK");
    expect(scriptSource).toContain("DEMO_EVIDENCE_SKIP_VERIFY_CASE3");
    expect(scriptSource).toContain("capture-demo-evidence.mjs");
    expect(scriptSource).toContain("DEMO_EVIDENCE_SKIP_CAPTURE");
    expect(scriptSource).toContain("evidence-summary.json");
    expect(scriptSource).toContain("README.md");
    expect(scriptSource).toContain('"cmd.exe"');
    expect(scriptSource).toContain('["/d", "/s", "/c", "npm"');
  });
});
