import { processPendingIntegrationEvents } from "../services/integrationEventService.js";
import { OUTBOX_ENABLED, OUTBOX_POLL_INTERVAL_MS } from "../config.js";

let isRunning = false;
let intervalId = null;

export const startIntegrationEventWorker = () => {
    if (!OUTBOX_ENABLED) {
        console.log("[OutboxWorker] OUTBOX_ENABLED=false. Worker not started.");
        return;
    }
    if (intervalId) return;

    const runOnce = async () => {
        if (isRunning) return;
        isRunning = true;
        try {
            await processPendingIntegrationEvents();
        } catch (error) {
            console.error("[OutboxWorker] error:", error.message);
        } finally {
            isRunning = false;
        }
    };

    runOnce();
    intervalId = setInterval(runOnce, OUTBOX_POLL_INTERVAL_MS);
    console.log(`[OutboxWorker] Started. Interval=${OUTBOX_POLL_INTERVAL_MS}ms`);
};

export default {
    startIntegrationEventWorker,
};
