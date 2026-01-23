/**
 * Service Registry
 * Case Study 4: Centralized Integration Management
 * 
 * Dynamically loads adapters based on config/integrations.js.
 * Provides a single entry point for the SyncService.
 */

import activeIntegrations from '../config/integrations.js';

// Adapter map - add new adapters here
const adapterMap = {
    payroll: () => import('../adapters/payroll.adapter.js').then(m => new m.PayrollAdapter()),
    securityMock: () => import('../adapters/security.mock.adapter.js').then(m => new m.SecurityMockAdapter()),
};

class ServiceRegistry {
    constructor() {
        this.adapters = [];
        this.initialized = false;
    }

    /**
     * Initialize the registry by loading active adapters.
     * Should be called once at app startup.
     */
    async initialize() {
        if (this.initialized) return;

        console.log('[ServiceRegistry] Initializing with integrations:', activeIntegrations);

        for (const name of activeIntegrations) {
            const loader = adapterMap[name];
            if (loader) {
                try {
                    const adapter = await loader();
                    this.adapters.push(adapter);
                    console.log(`[ServiceRegistry] ✓ Loaded adapter: ${adapter.name}`);
                } catch (error) {
                    console.error(`[ServiceRegistry] ✗ Failed to load adapter '${name}':`, error.message);
                }
            } else {
                console.warn(`[ServiceRegistry] ⚠ Unknown integration: '${name}' (no adapter found)`);
            }
        }

        this.initialized = true;
        console.log(`[ServiceRegistry] Ready with ${this.adapters.length} active integrations.`);
    }

    /**
     * Get all active integration adapters.
     * @returns {BaseAdapter[]}
     */
    getIntegrations() {
        return this.adapters;
    }

    /**
     * Run health checks on all adapters.
     * @returns {Promise<Object[]>}
     */
    async healthCheckAll() {
        const results = [];
        for (const adapter of this.adapters) {
            const result = await adapter.healthCheck();
            results.push({ adapter: adapter.name, ...result });
        }
        return results;
    }
}

// Singleton instance
export const serviceRegistry = new ServiceRegistry();
export default serviceRegistry;
