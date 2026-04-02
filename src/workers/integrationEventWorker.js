import { processPendingIntegrationEvents } from "../services/integrationEventService.js";
import { OUTBOX_ENABLED, OUTBOX_POLL_INTERVAL_MS } from "../config.js";
import logger from "../utils/logger.js";

let isRunning = false;
let intervalId = null;

export const startIntegrationEventWorker = () => {
    if (!OUTBOX_ENABLED) {
        logger.info("OutboxWorker", "OUTBOX_ENABLED=false. Worker not started.");
        return;
    }
    if (intervalId) return;

    const runOnce = async () => {
        if (isRunning) return;
        isRunning = true;
        try {
            await processPendingIntegrationEvents();
        } catch (error) {
            logger.error("OutboxWorker", "Worker iteration failed", error);
        } finally {
            isRunning = false;
        }
    };

    runOnce();
    intervalId = setInterval(runOnce, OUTBOX_POLL_INTERVAL_MS);
    logger.info("OutboxWorker", "Started integration event worker", {
        intervalMs: OUTBOX_POLL_INTERVAL_MS,
    });
};

export default {
    startIntegrationEventWorker,
};
