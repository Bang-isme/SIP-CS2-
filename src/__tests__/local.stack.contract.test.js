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
    expect(pkg.scripts).toHaveProperty("mongo:local:foreground");
    expect(pkg.scripts).toHaveProperty("case3:stack:interactive");
    expect(pkg.scripts).toHaveProperty("verify:case3:mongo-recovery");
    expect(pkg.scripts).toHaveProperty("case5:readiness:safe");
    expect(pkg.scripts).toHaveProperty("verify:case4:operations-demo");
    expect(pkg.scripts["verify:backend"]).toContain("verify-backend-safe.ps1");
  });

  test("backend start script delegates SA startup to the shared case3 service launcher", () => {
    const scriptPath = path.resolve(__dirname, "..", "..", "scripts", "start-local-backend.ps1");
    const launcherPath = path.resolve(__dirname, "..", "..", "scripts", "start-case3-service.ps1");
    const source = fs.readFileSync(scriptPath, "utf-8");
    const launcher = fs.readFileSync(launcherPath, "utf-8");

    expect(source).toContain('-Name "SA"');
    expect(source).toContain('-EntryPoint "src/sa-server.js"');
    expect(launcher).toContain("LocalPort $Port");
    expect(launcher).toContain('$serviceKey.pid');
    expect(launcher).toContain('$serviceKey.preexisting');
    expect(launcher).toContain('$serviceKey.out.log');
  });

  test("case3 stop script preserves preexisting listeners instead of killing any process on the port", () => {
    const startLauncherPath = path.resolve(__dirname, "..", "..", "scripts", "start-case3-service.ps1");
    const stopLauncherPath = path.resolve(__dirname, "..", "..", "scripts", "stop-case3-service.ps1");
    const startLauncher = fs.readFileSync(startLauncherPath, "utf-8");
    const stopLauncher = fs.readFileSync(stopLauncherPath, "utf-8");

    expect(startLauncher).toContain("preexisting PID");
    expect(startLauncher).toContain("Get-ProcessCommandLine");
    expect(stopLauncher).toContain('$($Name.ToLower()).preexisting');
    expect(stopLauncher).toContain("Get-ExpectedEntryPointForService");
    expect(stopLauncher).toContain("via command-line ownership match");
    expect(stopLauncher).toContain("left it untouched");
  });

  test("case3 verification script enforces a clean owned stack before running the end-to-end gate", () => {
    const verifyScriptPath = path.resolve(__dirname, "..", "..", "scripts", "verify-case3-stack.ps1");
    const startStackScriptPath = path.resolve(__dirname, "..", "..", "scripts", "start-case3-stack.ps1");
    const verifyScript = fs.readFileSync(verifyScriptPath, "utf-8");
    const startStackScript = fs.readFileSync(startStackScriptPath, "utf-8");

    expect(verifyScript).toContain('scripts\\stop-case3-stack.ps1');
    expect(verifyScript).toContain("Get-OccupiedCase3Ports");
    expect(verifyScript).toContain("to be free after managed shutdown");
    expect(verifyScript).toContain('scripts\\verify-case3-mongo-recovery.ps1');
    expect(verifyScript).toContain("CASE3_SKIP_MONGO_RECOVERY_SMOKE");
    expect(verifyScript).toContain("/api/health/ready");
    expect(verifyScript).toContain('scripts\\verify-case4-operations-demo.ps1');
    expect(verifyScript).toContain("CASE3_SKIP_OPERATIONS_DEMO_SMOKE");
    expect(startStackScript).toContain("Wait-ForReadyService");
    expect(startStackScript).toContain("/api/health/ready");
  });

  test("local mongo start script uses a configurable timeout and surfaces mongod log detail on startup failure", () => {
    const mongoScriptPath = path.resolve(__dirname, "..", "..", "scripts", "start-local-mongo.ps1");
    const mongoScript = fs.readFileSync(mongoScriptPath, "utf-8");

    expect(mongoScript).toContain("MONGO_LOCAL_START_TIMEOUT_SECONDS");
    expect(mongoScript).toContain("Get-MongoStartupFailureDetail");
    expect(mongoScript).toContain("Recent mongod.log lines:");
    expect(mongoScript).toContain("did not start listening on port 27017 within");
  });

  test("interactive runtime scripts distinguish foreground log-following from background launchers", () => {
    const mongoForegroundPath = path.resolve(__dirname, "..", "..", "scripts", "start-local-mongo-foreground.ps1");
    const interactiveStackPath = path.resolve(__dirname, "..", "..", "scripts", "start-case3-interactive.ps1");
    const readmePath = path.resolve(__dirname, "..", "..", "README.md");

    const mongoForeground = fs.readFileSync(mongoForegroundPath, "utf-8");
    const interactiveStack = fs.readFileSync(interactiveStackPath, "utf-8");
    const readme = fs.readFileSync(readmePath, "utf-8");

    expect(mongoForeground).toContain("Get-Content -Path $Path -Tail 20 -Wait");
    expect(mongoForeground).toContain('& $mongod "--config" $config');
    expect(interactiveStack).toContain("Start-InteractiveWindow");
    expect(interactiveStack).toContain("npm run sa:start");
    expect(interactiveStack).toContain("npm run payroll:start");
    expect(interactiveStack).toContain("npm run dashboard:start");
    expect(readme).toContain("Foreground service starts for separate terminals and live logs");
    expect(readme).toContain("background launcher");
  });

  test("backend verification script manages Mongo preconditions without killing preexisting listeners", () => {
    const verifyBackendPath = path.resolve(__dirname, "..", "..", "scripts", "verify-backend-safe.ps1");
    const verifyBackendScript = fs.readFileSync(verifyBackendPath, "utf-8");

    expect(verifyBackendScript).toContain("Test-MongoListening");
    expect(verifyBackendScript).toContain('scripts\\start-local-mongo.ps1');
    expect(verifyBackendScript).toContain('scripts\\stop-local-mongo.ps1');
    expect(verifyBackendScript).toContain('$startedManagedMongo');
    expect(verifyBackendScript).toContain('MongoDB local already listening on port');
  });

  test("service entrypoints keep the split runtime dependency boundaries", () => {
    const saServerPath = path.resolve(__dirname, "..", "..", "src", "sa-server.js");
    const payrollServerPath = path.resolve(__dirname, "..", "..", "src", "payroll-server.js");
    const dashboardServerPath = path.resolve(__dirname, "..", "..", "src", "dashboard-server.js");

    const saServerSource = fs.readFileSync(saServerPath, "utf-8");
    const payrollServerSource = fs.readFileSync(payrollServerPath, "utf-8");
    const dashboardServerSource = fs.readFileSync(dashboardServerPath, "utf-8");

    expect(saServerSource).toContain("requireMySQL: false");
    expect(payrollServerSource).toContain("requireMongo: false");
    expect(dashboardServerSource).toContain("initAuthSeed: false");
  });
});
