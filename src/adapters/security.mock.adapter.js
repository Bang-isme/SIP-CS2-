/**
 * Security Mock Adapter
 * Demonstrates extensibility - a fake "Security Badge" system.
 * In a real scenario, this would call an external API.
 */

import BaseAdapter from './base.adapter.js';

export class SecurityMockAdapter extends BaseAdapter {
    constructor() {
        super('SecurityMockAdapter');
    }

    async sync(employeeData, action) {
        const employeeId = employeeData.employeeId || employeeData._id?.toString();
        const employeeName = `${employeeData.firstName || ''} ${employeeData.lastName || ''}`.trim();

        // Simulate async operation
        await new Promise(resolve => setTimeout(resolve, 50));

        switch (action) {
            case 'CREATE':
                console.log(`[${this.name}] 🪪 Badge PROVISIONED for ${employeeName} (ID: ${employeeId})`);
                break;
            case 'UPDATE':
                console.log(`[${this.name}] 🔄 Badge DATA UPDATED for ${employeeName} (ID: ${employeeId})`);
                break;
            case 'DELETE':
                console.log(`[${this.name}] 🚫 Badge REVOKED for ${employeeName} (ID: ${employeeId})`);
                break;
        }

        return { success: true, message: `Badge ${action} simulated` };
    }

    async healthCheck() {
        // Mock system is always "healthy"
        return { healthy: true, message: 'Security Badge System (Mock) OK' };
    }
}

export default SecurityMockAdapter;
