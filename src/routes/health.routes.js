import { Router } from "express";
import mongoose from "mongoose";
import sequelize from "../mysqlDatabase.js";
import { checkIntegrationHealth } from "../services/syncService.js";

const router = Router();

/**
 * GET /api/health
 * Health check endpoint for monitoring and deployment verification
 */
router.get("/", async (req, res) => {
    const health = {
        status: "ok",
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        services: {}
    };

    // Check MongoDB
    try {
        const mongoState = mongoose.connection.readyState;
        health.services.mongodb = {
            status: mongoState === 1 ? "connected" : "disconnected",
            state: ["disconnected", "connected", "connecting", "disconnecting"][mongoState]
        };
    } catch (error) {
        health.services.mongodb = { status: "error", message: error.message };
    }

    // Check MySQL
    try {
        await sequelize.authenticate();
        health.services.mysql = { status: "connected" };
    } catch (error) {
        health.services.mysql = { status: "error", message: error.message };
    }

    // Determine overall status
    const allHealthy = Object.values(health.services).every(s => s.status === "connected");
    health.status = allHealthy ? "healthy" : "degraded";

    const statusCode = allHealthy ? 200 : 503;
    res.status(statusCode).json(health);
});

/**
 * GET /api/health/integrations
 * Case Study 4: Check health of all integration adapters
 */
router.get("/integrations", async (req, res) => {
    try {
        const integrationHealth = await checkIntegrationHealth();
        const allHealthy = integrationHealth.every(i => i.healthy);

        res.json({
            status: allHealthy ? "healthy" : "degraded",
            timestamp: new Date().toISOString(),
            integrations: integrationHealth
        });
    } catch (error) {
        res.status(500).json({ status: "error", message: error.message });
    }
});

/**
 * GET /api/health/ready
 * Readiness probe - is the app ready to serve traffic?
 */
router.get("/ready", async (req, res) => {
    try {
        // Quick checks
        const mongoOk = mongoose.connection.readyState === 1;
        await sequelize.authenticate();

        if (mongoOk) {
            res.json({ ready: true });
        } else {
            res.status(503).json({ ready: false, reason: "MongoDB not connected" });
        }
    } catch (error) {
        res.status(503).json({ ready: false, reason: error.message });
    }
});

/**
 * GET /api/health/live
 * Liveness probe - is the app running?
 */
router.get("/live", (req, res) => {
    res.json({ alive: true, uptime: process.uptime() });
});

export default router;
