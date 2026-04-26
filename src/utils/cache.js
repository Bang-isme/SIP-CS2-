/**
 * Simple In-Memory Cache for Dashboard Aggregations
 * Since dashboard is READ-ONLY, we can cache results aggressively.
 * Cache is invalidated on server restart or manually via API.
 */

import logger from "./logger.js";

const parsePositiveInteger = (value, fallback) => {
    const parsed = Number.parseInt(value, 10);
    return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
};

const DEFAULT_TTL_MS = 5 * 60 * 1000;
const DEFAULT_MAX_ENTRIES = 250;
const DEFAULT_SWEEP_INTERVAL_MS = 60 * 1000;

export class DashboardCache {
    constructor(options = {}) {
        this.now = typeof options.now === "function" ? options.now : () => Date.now();
        this.ttl = parsePositiveInteger(
            options.ttl ?? process.env.DASHBOARD_CACHE_TTL_MS,
            DEFAULT_TTL_MS,
        );
        this.maxEntries = parsePositiveInteger(
            options.maxEntries ?? process.env.DASHBOARD_CACHE_MAX_ENTRIES,
            DEFAULT_MAX_ENTRIES,
        );
        this.sweepIntervalMs = parsePositiveInteger(
            options.sweepIntervalMs ?? process.env.DASHBOARD_CACHE_SWEEP_INTERVAL_MS,
            Math.min(this.ttl, DEFAULT_SWEEP_INTERVAL_MS),
        );
        this.cache = new Map();
        this.sweepTimer = null;
        if (options.autoStart !== false) {
            this.startSweeper();
        }
    }

    getKey(endpoint, params) {
        return `${endpoint}:${JSON.stringify(params)}`;
    }

    isExpired(cached, now = this.now()) {
        return now - cached.timestamp > this.ttl;
    }

    startSweeper() {
        if (this.sweepTimer) return;

        this.sweepTimer = setInterval(() => {
            const removed = this.pruneExpired();
            if (removed > 0) {
                logger.debug("DashboardCache", "Expired entries pruned", { removed });
            }
        }, this.sweepIntervalMs);

        if (typeof this.sweepTimer.unref === "function") {
            this.sweepTimer.unref();
        }
    }

    stop() {
        if (!this.sweepTimer) return;
        clearInterval(this.sweepTimer);
        this.sweepTimer = null;
    }

    pruneExpired(now = this.now()) {
        let removed = 0;
        for (const [key, cached] of this.cache.entries()) {
            if (this.isExpired(cached, now)) {
                this.cache.delete(key);
                removed += 1;
            }
        }
        return removed;
    }

    evictOverflow() {
        let removed = 0;
        while (this.cache.size > this.maxEntries) {
            const oldestKey = this.cache.keys().next().value;
            if (!oldestKey) break;
            this.cache.delete(oldestKey);
            removed += 1;
        }

        if (removed > 0) {
            logger.debug("DashboardCache", "Evicted oldest entries to enforce cache size", {
                removed,
                maxEntries: this.maxEntries,
            });
        }
    }

    get(endpoint, params) {
        const key = this.getKey(endpoint, params);
        const cached = this.cache.get(key);

        if (!cached) return null;

        // Check TTL
        if (this.isExpired(cached)) {
            this.cache.delete(key);
            return null;
        }

        // Promote the key so overflow eviction behaves like a simple LRU.
        this.cache.delete(key);
        this.cache.set(key, cached);

        logger.debug("DashboardCache", "Cache hit", { endpoint });
        return cached.data;
    }

    set(endpoint, params, data) {
        const key = this.getKey(endpoint, params);
        this.pruneExpired();
        if (this.cache.has(key)) {
            this.cache.delete(key);
        }
        this.cache.set(key, {
            data,
            timestamp: this.now()
        });
        this.evictOverflow();
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
            keys: [...this.cache.keys()],
            ttlMs: this.ttl,
            maxEntries: this.maxEntries,
            sweepIntervalMs: this.sweepIntervalMs,
        };
    }
}

// Singleton instance
const dashboardCache = new DashboardCache();

export default dashboardCache;
