/**
 * Simple In-Memory Cache for Dashboard Aggregations
 * Since dashboard is READ-ONLY, we can cache results aggressively.
 * Cache is invalidated on server restart or manually via API.
 */

import logger from "./logger.js";

class DashboardCache {
    constructor() {
        this.cache = new Map();
        this.ttl = 5 * 60 * 1000; // 5 minutes TTL
    }

    getKey(endpoint, params) {
        return `${endpoint}:${JSON.stringify(params)}`;
    }

    get(endpoint, params) {
        const key = this.getKey(endpoint, params);
        const cached = this.cache.get(key);

        if (!cached) return null;

        // Check TTL
        if (Date.now() - cached.timestamp > this.ttl) {
            this.cache.delete(key);
            return null;
        }

        logger.debug("DashboardCache", "Cache hit", { endpoint });
        return cached.data;
    }

    set(endpoint, params, data) {
        const key = this.getKey(endpoint, params);
        this.cache.set(key, {
            data,
            timestamp: Date.now()
        });
        logger.debug("DashboardCache", "Cache set", { endpoint });
    }

    clear() {
        this.cache.clear();
        logger.info("DashboardCache", "Cache cleared");
    }

    // Stats for debugging
    stats() {
        return {
            size: this.cache.size,
            keys: [...this.cache.keys()]
        };
    }
}

// Singleton instance
const dashboardCache = new DashboardCache();

export default dashboardCache;
