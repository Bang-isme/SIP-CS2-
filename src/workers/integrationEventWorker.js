import { processPendingIntegrationEvents } from "../services/integrationEventService.js";
import { OUTBOX_ENABLED, OUTBOX_POLL_INTERVAL_MS, OUTBOX_STOP_TIMEOUT_MS } from "../config.js";
import logger from "../utils/logger.js";

let isRunning = false;
let intervalId = null;
let activeRunPromise = null;

export const startIntegrationEventWorker = () => {
    if (!OUTBOX_ENABLED) {
        logger.info("OutboxWorker", "OUTBOX_ENABLED=false. Worker not started.");
        return;
    }
    if (intervalId) return;

    const runOnce = async () => {
        if (isRunning) return;
        isRunning = true;
        activeRunPromise = (async () => {
            try {
                await processPendingIntegrationEvents();
            } catch (error) {
                logger.error("OutboxWorker", "Worker iteration failed", error);
            } finally {
                isRunning = false;
            }
        })();
        try {
            await activeRunPromise;
        } finally {
            activeRunPromise = null;
        }
    };

    runOnce();
    intervalId = setInterval(runOnce, OUTBOX_POLL_INTERVAL_MS);
    intervalId.unref?.();
    logger.info("OutboxWorker", "Started integration event worker", {
        intervalMs: OUTBOX_POLL_INTERVAL_MS,
    });
};

export const stopIntegrationEventWorker = async () => {
    if (intervalId) {
        clearInterval(intervalId);
        intervalId = null;
    }

    if (activeRunPromise) {
        const timedOut = await Promise.race([
            activeRunPromise.then(() => false),
            new Promise((resolve) => {
                const timeoutId = setTimeout(() => resolve(true), OUTBOX_STOP_TIMEOUT_MS);
                timeoutId.unref?.();
            }),
        ]);

        if (timedOut) {
            logger.warn("OutboxWorker", "Timed out while waiting for active worker iteration to finish during shutdown.", {
                timeoutMs: OUTBOX_STOP_TIMEOUT_MS,
            });
        }
    }

    isRunning = false;
    activeRunPromise = null;
    logger.info("OutboxWorker", "Stopped integration event worker");
};

export default {
    startIntegrationEventWorker,
    stopIntegrationEventWorker,
};
