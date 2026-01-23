/**
 * Base Adapter Interface
 * All integration adapters must implement this interface.
 */

export class BaseAdapter {
    constructor(name) {
        this.name = name;
    }

    /**
     * Sync employee data to external system.
     * @param {Object} employeeData - Employee data from MongoDB.
     * @param {string} action - 'CREATE' | 'UPDATE' | 'DELETE'.
     * @returns {Promise<{success: boolean, message: string}>}
     */
    async sync(employeeData, action) {
        throw new Error(`sync() not implemented in ${this.name}`);
    }

    /**
     * Health check for the external system.
     * @returns {Promise<{healthy: boolean, message: string}>}
     */
    async healthCheck() {
        throw new Error(`healthCheck() not implemented in ${this.name}`);
    }
}

export default BaseAdapter;
