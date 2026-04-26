import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { spawn } from "node:child_process";
import {
  buildEvidenceBundleDir,
  formatEvidenceDate,
  getEvidenceBundleTargets,
  getEvidenceScreenshotTargets,
} from "../src/utils/demoEvidenceCapturePlan.js";

const repoRoot = process.cwd();
const evidenceDate = process.env.EVIDENCE_DATE_STAMP || formatEvidenceDate();
const bundleDir = process.env.DEMO_EVIDENCE_OUTPUT_DIR
  || buildEvidenceBundleDir(repoRoot, evidenceDate);
const targets = getEvidenceBundleTargets(bundleDir);
const screenshotTargets = getEvidenceScreenshotTargets(targets.screenshotsDir);
const expectedSummaryFile = "evidence-summary.json";
const expectedReadmeFile = "README.md";
const saBaseUrl = process.env.SA_PUBLIC_API_BASE_URL || "http://127.0.0.1:4000/api";
const dashboardHealthUrl = process.env.DASHBOARD_HEALTH_URL || "http://127.0.0.1:4200/api/health/live";
const payrollHealthUrl = process.env.PAYROLL_HEALTH_URL || "http://127.0.0.1:4100/api/health/live";
const adminEmail = process.env.ADMIN_EMAIL || "admin@localhost";
const adminPassword = process.env.ADMIN_PASSWORD || "admin_dev";

const softCaptureFailurePatterns = [
  "playwright-core is not installed",
  "No local Chrome/Edge executable was found",
];
const skipVerifyBackend = process.env.DEMO_EVIDENCE_SKIP_VERIFY_BACKEND === "1";
const skipVerifyFrontend = process.env.DEMO_EVIDENCE_SKIP_VERIFY_FRONTEND === "1";
const skipVerifyCase3 = process.env.DEMO_EVIDENCE_SKIP_VERIFY_CASE3 === "1";
const skipVerifyCase4 = process.env.DEMO_EVIDENCE_SKIP_VERIFY_CASE4 === "1";
const useRunningStack = process.env.DEMO_EVIDENCE_USE_RUNNING_STACK === "1";

const resolveSpawnSpec = (command, args) => {
  if (process.platform === "win32" && command === "npm") {
    return {
      command: "cmd.exe",
      args: ["/d", "/s", "/c", "npm", ...args],
    };
  }

  return { command, args };
};

const ensureDir = async (dirPath) => {
  await fs.mkdir(dirPath, { recursive: true });
};

const pathExists = async (filePath) => {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
};

const writeStepNote = async (filePath, message) => {
  await ensureDir(path.dirname(filePath));
  await fs.writeFile(filePath, `${message}\n`, "utf8");
};

const markCommandSummary = async (summary, key, logPath, note) => {
  const status = (await pathExists(logPath)) ? "reused" : "skipped";
  if (status === "skipped") {
    await writeStepNote(logPath, note);
  }
  summary.commands[key] = { status, logPath };
};

if (path.basename(targets.summary) !== expectedSummaryFile) {
  throw new Error(`Evidence pack summary target must be ${expectedSummaryFile}.`);
}

if (path.basename(targets.readme) !== expectedReadmeFile) {
  throw new Error(`Evidence pack README target must be ${expectedReadmeFile}.`);
}

const runCommand = async (
  label,
  command,
  args,
  { cwd = repoRoot, env = {}, logPath } = {},
) => {
  if (!logPath) {
    throw new Error(`Missing log path for ${label}`);
  }

  await ensureDir(path.dirname(logPath));
  const spawnSpec = resolveSpawnSpec(command, args);

  return new Promise((resolve, reject) => {
    const child = spawn(spawnSpec.command, spawnSpec.args, {
      cwd,
      env: { ...process.env, ...env },
      stdio: ["ignore", "pipe", "pipe"],
    });

    let output = "";
    const chunks = [];

    const writeChunk = async (chunk) => {
      const text = chunk.toString();
      output += text;
      chunks.push(text);
    };

    child.stdout.on("data", (chunk) => {
      process.stdout.write(chunk);
      void writeChunk(chunk);
    });

    child.stderr.on("data", (chunk) => {
      process.stderr.write(chunk);
      void writeChunk(chunk);
    });

    child.on("error", async (error) => {
      await fs.writeFile(logPath, `${output}${error.stack || error.message}`, "utf8");
      reject(error);
    });

    child.on("close", async (code) => {
      await fs.writeFile(logPath, chunks.join(""), "utf8");
      if (code === 0) {
        resolve({ code, output });
      } else {
        reject(new Error(`${label} failed with exit code ${code}.\n${output}`));
      }
    });
  });
};

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const waitForHealthyService = async (url, label, timeoutMs = 30000) => {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const response = await fetch(url);
      if (response.ok) {
        return;
      }
    } catch {
      // Service not ready yet.
    }
    await wait(1000);
  }

  throw new Error(`${label} did not become healthy at ${url} within ${timeoutMs}ms.`);
};

const signInAndResolveEmployeeId = async () => {
  const signInResponse = await fetch(`${saBaseUrl}/auth/signin`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: adminEmail,
      password: adminPassword,
    }),
  });

  if (!signInResponse.ok) {
    throw new Error(`Unable to sign in for evidence capture (${signInResponse.status}).`);
  }

  const signInBody = await signInResponse.json();
  const token = signInBody?.token || signInBody?.data?.token;
  if (!token) {
    throw new Error("Evidence capture sign-in succeeded without a token.");
  }

  const employeesResponse = await fetch(`${saBaseUrl}/employee?page=1&limit=1`, {
    headers: { "x-access-token": token },
  });

  if (!employeesResponse.ok) {
    throw new Error(`Unable to load employees for evidence capture (${employeesResponse.status}).`);
  }

  const employeesBody = await employeesResponse.json();
  const firstEmployeeId = employeesBody?.data?.[0]?.employeeId;
  if (!firstEmployeeId) {
    throw new Error("Unable to resolve a fallback employee id for evidence capture.");
  }

  return firstEmployeeId;
};

const buildReadme = (summary) => {
  const commandStatusLabel = (commandKey, passedText, skippedText) => {
    const status = summary.commands?.[commandKey]?.status;
    if (status === "passed" || status === "reused") {
      return `- ${passedText}`;
    }
    return `- ${skippedText}`;
  };

  const lines = [
    `# Demo Evidence Pack - ${summary.evidenceDate}`,
    "",
    "This bundle is the current proof pack for Case 2-4 on the live `SA / Payroll / Dashboard` runtime.",
    "",
    "## Scope",
    "",
    commandStatusLabel("verifyBackend", "backend verification passed", "backend verification skipped"),
    commandStatusLabel("verifyFrontend", "frontend verification passed", "frontend verification skipped"),
    commandStatusLabel("verifyCase3", "Case 3 stack gate passed", "Case 3 stack gate skipped"),
    commandStatusLabel("verifyCase4Operations", "Case 4 operator-console smoke passed", "Case 4 operator-console smoke skipped"),
    "- dashboard demo preparation report was captured",
    summary.capture.status === "captured"
      ? "- screenshots were captured"
      : `- screenshots were ${summary.capture.status}${summary.capture.reason ? ` (${summary.capture.reason})` : ""}`,
    "",
    "## Command Evidence",
    "",
    `- Backend gate: [logs/${path.basename(targets.verifyBackendLog)}](./logs/${path.basename(targets.verifyBackendLog)})`,
    `- Frontend gate: [logs/${path.basename(targets.verifyFrontendLog)}](./logs/${path.basename(targets.verifyFrontendLog)})`,
    `- Case 3 stack gate: [logs/${path.basename(targets.verifyCase3Log)}](./logs/${path.basename(targets.verifyCase3Log)})`,
    `- Case 4 operations smoke: [logs/${path.basename(targets.verifyCase4OperationsLog)}](./logs/${path.basename(targets.verifyCase4OperationsLog)})`,
    `- Stack startup for capture: [logs/${path.basename(targets.stackStartLog)}](./logs/${path.basename(targets.stackStartLog)})`,
    `- Demo preparation log: [logs/${path.basename(targets.demoPrepareLog)}](./logs/${path.basename(targets.demoPrepareLog)})`,
    `- Capture log: [logs/${path.basename(targets.captureLog)}](./logs/${path.basename(targets.captureLog)})`,
    "",
    "## Data Evidence",
    "",
    `- Demo preparation report: [data/${path.basename(targets.demoPrepareReport)}](./data/${path.basename(targets.demoPrepareReport)})`,
    `- Pack summary: [data/${path.basename(targets.summary)}](./data/${path.basename(targets.summary)})`,
  ];

  if (summary.capture.status === "captured") {
    lines.push(
      "",
      "## Visual Evidence",
      "",
      `- SA home: [screenshots/${path.basename(screenshotTargets.saHome)}](./screenshots/${path.basename(screenshotTargets.saHome)})`,
      `- Dashboard ready view: [screenshots/${path.basename(screenshotTargets.dashboardReady)}](./screenshots/${path.basename(screenshotTargets.dashboardReady)})`,
      `- Alerts review: [screenshots/${path.basename(screenshotTargets.alertsReview)}](./screenshots/${path.basename(screenshotTargets.alertsReview)})`,
      `- Alert settings: [screenshots/${path.basename(screenshotTargets.alertSettings)}](./screenshots/${path.basename(screenshotTargets.alertSettings)})`,
      `- Payroll proof: [screenshots/${path.basename(screenshotTargets.payrollRecord)}](./screenshots/${path.basename(screenshotTargets.payrollRecord)})`,
      `- Capture metadata: [screenshots/${path.basename(screenshotTargets.metadata)}](./screenshots/${path.basename(screenshotTargets.metadata)})`,
    );
  }

  lines.push(
    "",
    "## Summary",
    "",
    `- Generated at: \`${summary.generatedAt}\``,
    `- Evidence employee ID: \`${summary.evidenceEmployeeId || "not resolved"}\``,
    `- Dashboard demo readiness: \`${summary.demoPrepare?.executiveBrief?.actionCenter || "unknown"}\``,
    `- Dashboard freshness: \`${summary.demoPrepare?.executiveBrief?.freshness || "unknown"}\``,
    `- Visible alert types: \`${(summary.demoPrepare?.visibleAlertTypes || []).join(", ") || "none"}\``,
    "",
    "## Notes",
    "",
    "- `verify:case3` now includes browser auth smoke and the Case 4 operations smoke.",
    "- `demo:dashboard:prepare` is run again while the stack is live so the screenshots reflect the current alert/demo state.",
    "- Screenshot capture is optional and depends on local browser capture prerequisites.",
    "",
  );

  return `${lines.join("\n")}\n`;
};

const main = async () => {
  await Promise.all([
    ensureDir(targets.logsDir),
    ensureDir(targets.dataDir),
    ensureDir(targets.screenshotsDir),
  ]);

  const summary = {
    generatedAt: new Date().toISOString(),
    evidenceDate,
    bundleDir,
    commands: {},
    demoPrepare: null,
    evidenceEmployeeId: null,
    capture: {
      status: "skipped",
      reason: "not attempted",
    },
  };

  let stackStartedForCapture = false;

  try {
    if (skipVerifyBackend) {
      await markCommandSummary(
        summary,
        "verifyBackend",
        targets.verifyBackendLog,
        "Backend verification was skipped for this resume run.",
      );
    } else {
      await runCommand("verify:backend", "npm", ["run", "verify:backend"], {
        logPath: targets.verifyBackendLog,
      });
      summary.commands.verifyBackend = { status: "passed", logPath: targets.verifyBackendLog };
    }

    if (skipVerifyFrontend) {
      await markCommandSummary(
        summary,
        "verifyFrontend",
        targets.verifyFrontendLog,
        "Frontend verification was skipped for this resume run.",
      );
    } else {
      await runCommand("verify:frontend", "npm", ["run", "verify:frontend"], {
        logPath: targets.verifyFrontendLog,
      });
      summary.commands.verifyFrontend = { status: "passed", logPath: targets.verifyFrontendLog };
    }

    if (skipVerifyCase3) {
      await markCommandSummary(
        summary,
        "verifyCase3",
        targets.verifyCase3Log,
        "Case 3 verification was skipped for this resume run.",
      );
    } else {
      await runCommand("verify:case3", "npm", ["run", "verify:case3"], {
        logPath: targets.verifyCase3Log,
        env: {
          CASE3_SKIP_OPERATIONS_DEMO_SMOKE: "1",
        },
      });
      summary.commands.verifyCase3 = { status: "passed", logPath: targets.verifyCase3Log };
    }

    if (useRunningStack) {
      await writeStepNote(targets.stackStartLog, "Reused already-running Case 3 stack for evidence capture.");
    } else {
      await runCommand("case3:stack:start", "npm", ["run", "case3:stack:start"], {
        logPath: targets.stackStartLog,
      });
      stackStartedForCapture = true;
    }

    await waitForHealthyService(`${saBaseUrl}/health/live`, "SA");
    await waitForHealthyService(payrollHealthUrl, "Payroll");
    await waitForHealthyService(dashboardHealthUrl, "Dashboard");

    if (skipVerifyCase4) {
      await markCommandSummary(
        summary,
        "verifyCase4Operations",
        targets.verifyCase4OperationsLog,
        "Case 4 operations smoke was skipped for this resume run.",
      );
    } else {
      await runCommand("verify:case4:operations-demo", "npm", ["run", "verify:case4:operations-demo"], {
        logPath: targets.verifyCase4OperationsLog,
      });
      summary.commands.verifyCase4Operations = { status: "passed", logPath: targets.verifyCase4OperationsLog };
    }

    await runCommand("demo:dashboard:prepare", "npm", ["run", "demo:dashboard:prepare"], {
      logPath: targets.demoPrepareLog,
      env: {
        DASHBOARD_DEMO_PREP_OUTPUT_PATH: targets.demoPrepareReport,
      },
    });

    const demoPrepare = JSON.parse(await fs.readFile(targets.demoPrepareReport, "utf8"));
    summary.demoPrepare = demoPrepare;
    summary.evidenceEmployeeId = demoPrepare?.provisionedBenefitDemoEmployeeId
      || demoPrepare?.provisionedAlerts?.[0]?.employeeId
      || await signInAndResolveEmployeeId();

    if (process.env.DEMO_EVIDENCE_SKIP_CAPTURE === "1") {
      summary.capture = {
        status: "skipped",
        reason: "DEMO_EVIDENCE_SKIP_CAPTURE=1",
      };
      await fs.writeFile(targets.captureLog, "Screenshot capture skipped by environment flag.\n", "utf8");
    } else {
      try {
        await runCommand("capture-demo-evidence", "node", ["scripts/capture-demo-evidence.mjs"], {
          logPath: targets.captureLog,
          env: {
            EVIDENCE_DATE_STAMP: evidenceDate,
            EVIDENCE_OUTPUT_DIR: targets.screenshotsDir,
            EVIDENCE_EMPLOYEE_ID: summary.evidenceEmployeeId,
          },
        });
        summary.capture = {
          status: "captured",
          metadataPath: screenshotTargets.metadata,
        };
      } catch (error) {
        const reason = error.message || String(error);
        if (softCaptureFailurePatterns.some((pattern) => reason.includes(pattern))) {
          summary.capture = {
            status: "skipped",
            reason,
          };
        } else {
          throw error;
        }
      }
    }
  } finally {
    if (stackStartedForCapture) {
      try {
        await runCommand("case3:stack:stop", "npm", ["run", "case3:stack:stop"], {
          logPath: path.join(targets.logsDir, "case3-stack-stop.log"),
        });
      } catch (error) {
        process.stderr.write(`${error.message}\n`);
      }
    }

    await fs.writeFile(targets.summary, JSON.stringify(summary, null, 2), "utf8");
    await fs.writeFile(targets.readme, buildReadme(summary), "utf8");
  }

  process.stdout.write(`${JSON.stringify({
    status: "ok",
    bundleDir,
    evidenceEmployeeId: summary.evidenceEmployeeId,
    capture: summary.capture,
  }, null, 2)}\n`);
};

main().catch(async (error) => {
  process.stderr.write(`${error.stack || error.message || String(error)}\n`);
  process.exitCode = 1;
});
