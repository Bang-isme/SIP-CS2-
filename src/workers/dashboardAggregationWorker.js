import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
    DASHBOARD_AGGREGATION_ENABLED,
    DASHBOARD_AGGREGATION_INTERVAL_MS,
    DASHBOARD_AGGREGATION_ON_START,
    DASHBOARD_AGGREGATION_SKIP_SNAPSHOT,
    DASHBOARD_AGGREGATION_STOP_TIMEOUT_MS,
    DASHBOARD_AGGREGATION_TARGET_YEAR,
    DASHBOARD_FRESHNESS_THRESHOLD_MINUTES,
} from "../config.js";
import {
    BenefitsSummary,
    EarningsSummary,
    VacationSummary,
} from "../models/sql/index.js";
import logger from "../utils/logger.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "../../");
const aggregationScript = path.resolve(repoRoot, "scripts/aggregate-dashboard.js");

let intervalId = null;
let isRunning = false;
let activeChild = null;
let activeRunPromise = null;

const getLatestComputedAt = async ({ Model, where = undefined }) => {
    const row = await Model.findOne({
        ...(where ? { where } : {}),
        order: [["computed_at", "DESC"]],
        raw: true,
    });
    if (!row?.computed_at) {
        return null;
    }
    const computedAt = new Date(row.computed_at);
    return Number.isNaN(computedAt.getTime()) ? null : computedAt;
};

const inspectDashboardFreshness = async () => {
    const [earningsAt, vacationAt, benefitsAt] = await Promise.all([
        getLatestComputedAt({
            Model: EarningsSummary,
            where: { year: DASHBOARD_AGGREGATION_TARGET_YEAR },
        }),
        getLatestComputedAt({
            Model: VacationSummary,
            where: { year: DASHBOARD_AGGREGATION_TARGET_YEAR },
        }),
        getLatestComputedAt({
            Model: BenefitsSummary,
        }),
    ]);

    const datasets = {
        earnings: earningsAt,
        vacation: vacationAt,
        benefits: benefitsAt,
    };
    const staleDatasets = [];

    Object.entries(datasets).forEach(([dataset, computedAt]) => {
        if (!computedAt) {
            staleDatasets.push({ dataset, reason: "missing" });
            return;
        }

        const staleMinutes = Math.max(
            0,
            Math.round((Date.now() - computedAt.getTime()) / 60000),
        );
        if (staleMinutes > DASHBOARD_FRESHNESS_THRESHOLD_MINUTES) {
            staleDatasets.push({ dataset, reason: "stale", staleMinutes });
        }
    });

    return {
        needsRefresh: staleDatasets.length > 0,
        staleDatasets,
        datasets,
    };
};

const relayStream = (stream, level) => {
    let buffer = "";
    stream.setEncoding("utf8");
    stream.on("data", (chunk) => {
        buffer += chunk;
        const lines = buffer.split(/\r?\n/);
        buffer = lines.pop() ?? "";
        for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed) continue;
            if (level === "error") {
                logger.error("DashboardAggregationWorker", trimmed, null);
            } else {
                logger.info("DashboardAggregationWorker", trimmed);
            }
        }
    });
    stream.on("end", () => {
        const trimmed = buffer.trim();
        if (!trimmed) return;
        if (level === "error") {
            logger.error("DashboardAggregationWorker", trimmed, null);
        } else {
            logger.info("DashboardAggregationWorker", trimmed);
        }
    });
};

const stopChildProcess = async (child, reason = "shutdown") => {
    if (!child || child.exitCode !== null) {
        return;
    }

    await new Promise((resolve) => {
        let settled = false;
        let timeoutId = null;
        const finish = () => {
            if (settled) return;
            settled = true;
            if (timeoutId) {
                clearTimeout(timeoutId);
            }
            resolve();
        };

        child.once("close", finish);
        child.once("error", finish);

        try {
            child.kill("SIGTERM");
        } catch {
            finish();
            return;
        }

        timeoutId = setTimeout(() => {
            if (child.exitCode === null) {
                logger.warn("DashboardAggregationWorker", "Dashboard aggregation process did not exit after SIGTERM; escalating to SIGKILL.", {
                    reason,
                    timeoutMs: DASHBOARD_AGGREGATION_STOP_TIMEOUT_MS,
                });
                try {
                    child.kill("SIGKILL");
                } catch {
                    finish();
                }
            } else {
                finish();
            }
        }, DASHBOARD_AGGREGATION_STOP_TIMEOUT_MS);
        timeoutId.unref?.();
    });
};

const runAggregation = async (reason, targetYear = DASHBOARD_AGGREGATION_TARGET_YEAR) => {
    if (isRunning) {
        logger.info("DashboardAggregationWorker", "Skipping aggregation tick because a run is already active.", {
            reason,
        });
        return activeRunPromise;
    }

    isRunning = true;
    const args = [aggregationScript, String(targetYear)];
    if (DASHBOARD_AGGREGATION_SKIP_SNAPSHOT) {
        args.push("--skip-snapshot");
    }

    logger.info("DashboardAggregationWorker", "Starting dashboard aggregation run", {
        reason,
        intervalMs: DASHBOARD_AGGREGATION_INTERVAL_MS,
        targetYear,
        skipSnapshot: DASHBOARD_AGGREGATION_SKIP_SNAPSHOT,
    });

    activeRunPromise = new Promise((resolve) => {
        const child = spawn(process.execPath, args, {
            cwd: repoRoot,
            env: process.env,
            stdio: ["ignore", "pipe", "pipe"],
        });
        activeChild = child;

        relayStream(child.stdout, "info");
        relayStream(child.stderr, "error");

        let settled = false;
        const finish = (code = child.exitCode) => {
            if (settled) return;
            settled = true;
            activeChild = null;
            if (code === 0) {
                logger.info("DashboardAggregationWorker", "Dashboard aggregation run completed", {
                    reason,
                    exitCode: code,
                });
            } else {
                logger.error("DashboardAggregationWorker", "Dashboard aggregation run exited with failure", null, {
                    reason,
                    exitCode: code,
                });
            }
            resolve();
        };

        child.once("error", (error) => {
            logger.error("DashboardAggregationWorker", "Failed to spawn dashboard aggregation process", error);
            finish(-1);
        });

        child.once("close", (code) => {
            finish(code);
        });
    });

    try {
        await activeRunPromise;
    } finally {
        activeRunPromise = null;
        isRunning = false;
    }
};

export const runDashboardAggregationNow = async (reasonOrOptions = "manual") => {
    const options = typeof reasonOrOptions === "string"
        ? { reason: reasonOrOptions }
        : (reasonOrOptions || {});
    const {
        reason = "manual",
        targetYear = DASHBOARD_AGGREGATION_TARGET_YEAR,
    } = options;
    await runAggregation(reason, targetYear);
};

export const warmDashboardAggregationOnStartup = async ({
    reason = "startup",
} = {}) => {
    if (!DASHBOARD_AGGREGATION_ENABLED) {
        logger.info("DashboardAggregationWorker", "Skipping startup aggregation warm-up because the worker is disabled.");
        return { started: false, reason: "disabled" };
    }

    if (!DASHBOARD_AGGREGATION_ON_START) {
        logger.info("DashboardAggregationWorker", "Skipping startup aggregation warm-up because run-on-start is disabled.");
        return { started: false, reason: "run_on_start_disabled" };
    }

    const freshness = await inspectDashboardFreshness();
    if (!freshness.needsRefresh) {
        logger.info("DashboardAggregationWorker", "Dashboard summaries are already fresh enough; startup aggregation not needed.", {
            thresholdMinutes: DASHBOARD_FRESHNESS_THRESHOLD_MINUTES,
            targetYear: DASHBOARD_AGGREGATION_TARGET_YEAR,
        });
        return { started: false, reason: "fresh", freshness };
    }

    logger.info("DashboardAggregationWorker", "Dashboard summaries are stale or missing; running startup aggregation.", {
        reason,
        thresholdMinutes: DASHBOARD_FRESHNESS_THRESHOLD_MINUTES,
        targetYear: DASHBOARD_AGGREGATION_TARGET_YEAR,
        staleDatasets: freshness.staleDatasets,
    });
    await runDashboardAggregationNow({
        reason,
        targetYear: DASHBOARD_AGGREGATION_TARGET_YEAR,
    });
    return { started: true, reason: "refreshed", freshness };
};

export const startDashboardAggregationWorker = () => {
    if (!DASHBOARD_AGGREGATION_ENABLED) {
        logger.info("DashboardAggregationWorker", "DASHBOARD_AGGREGATION_ENABLED=false. Worker not started.");
        return;
    }

    if (intervalId) return;

    intervalId = setInterval(() => {
        void runAggregation("interval");
    }, DASHBOARD_AGGREGATION_INTERVAL_MS);
    intervalId.unref?.();

    logger.info("DashboardAggregationWorker", "Started dashboard aggregation worker", {
        intervalMs: DASHBOARD_AGGREGATION_INTERVAL_MS,
        targetYear: DASHBOARD_AGGREGATION_TARGET_YEAR,
        runOnStart: DASHBOARD_AGGREGATION_ON_START,
        skipSnapshot: DASHBOARD_AGGREGATION_SKIP_SNAPSHOT,
    });
};

export const stopDashboardAggregationWorker = async () => {
    if (intervalId) {
        clearInterval(intervalId);
        intervalId = null;
    }
    if (activeChild && activeChild.exitCode === null) {
        logger.info("DashboardAggregationWorker", "Stopping active dashboard aggregation process.");
        await stopChildProcess(activeChild);
    }
    if (activeRunPromise) {
        await activeRunPromise;
    }
    isRunning = false;
};

export default {
    runDashboardAggregationNow,
    warmDashboardAggregationOnStartup,
    startDashboardAggregationWorker,
    stopDashboardAggregationWorker,
};
