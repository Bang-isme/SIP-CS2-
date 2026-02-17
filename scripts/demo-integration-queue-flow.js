/**
 * Integration Queue Demo Flow
 *
 * One-command demo sequence:
 * 1) warning
 * 2) critical
 * 3) cleanup
 *
 * Usage:
 *   node scripts/demo-integration-queue-flow.js
 *   node scripts/demo-integration-queue-flow.js 20 20
 *     - arg1: warning hold seconds (default 20)
 *     - arg2: critical hold seconds (default 20)
 */
import { spawn } from "node:child_process";
import { setTimeout as wait } from "node:timers/promises";

const toInt = (value, fallback) => {
    const parsed = parseInt(value, 10);
    return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
};

const warningSeconds = toInt(process.argv[2], 20);
const criticalSeconds = toInt(process.argv[3], 20);

const runScenario = (scenario) => new Promise((resolve, reject) => {
    const child = spawn(
        process.execPath,
        ["scripts/demo-integration-queue-scenario.js", scenario],
        { stdio: "inherit" }
    );
    child.on("exit", (code) => {
        if (code === 0) resolve();
        else reject(new Error(`Scenario '${scenario}' failed with code ${code}`));
    });
    child.on("error", reject);
});

const main = async () => {
    try {
        console.log("[DemoFlow] Step 1/3: WARNING state");
        await runScenario("warning");
        console.log(`[DemoFlow] Hold WARNING for ${warningSeconds}s (refresh dashboard now).`);
        await wait(warningSeconds * 1000);

        console.log("[DemoFlow] Step 2/3: CRITICAL state");
        await runScenario("critical");
        console.log(`[DemoFlow] Hold CRITICAL for ${criticalSeconds}s (show retry/replay now).`);
        await wait(criticalSeconds * 1000);

        console.log("[DemoFlow] Step 3/3: CLEANUP");
        await runScenario("cleanup");
        console.log("[DemoFlow] Completed.");
        process.exit(0);
    } catch (error) {
        console.error("[DemoFlow] Failed:", error.message);
        process.exit(1);
    }
};

main();
