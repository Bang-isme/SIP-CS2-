/**
 * Security Mock Adapter
 * Demonstrates extensibility - a fake "Security Badge" system.
 * In a real scenario, this would call an external API.
 */

import BaseAdapter from "./base.adapter.js";
import logger from "../utils/logger.js";

export class SecurityMockAdapter extends BaseAdapter {
    constructor() {
        super("SecurityMockAdapter");
    }

    async sync(employeeData, action) {
        const employeeId = employeeData.employeeId || employeeData._id?.toString();
        const employeeName = `${employeeData.firstName || ""} ${employeeData.lastName || ""}`.trim();

        // Simulate async operation
        await new Promise((resolve) => setTimeout(resolve, 50));

        switch (action) {
            case "CREATE":
                logger.info(this.name, "Badge provisioned (mock)", { employeeId, employeeName, action });
                break;
            case "UPDATE":
                logger.info(this.name, "Badge data updated (mock)", { employeeId, employeeName, action });
                break;
            case "DELETE":
                logger.info(this.name, "Badge revoked (mock)", { employeeId, employeeName, action });
                break;
        }

        return { success: true, message: `Badge ${action} simulated` };
    }

    async healthCheck() {
        // Mock system is always "healthy"
        return { healthy: true, message: "Security Badge System (Mock) OK" };
    }
}

export default SecurityMockAdapter;
