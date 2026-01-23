import { Router } from "express";
import { verifyToken, isAdmin } from "../middlewares/authJwt.js";
import { SyncLog } from "../models/sql/index.js";
import { retryFailedSyncs, getSyncStatus } from "../services/syncService.js";
import { Op } from "sequelize";

const router = Router();

// All sync routes require authentication
router.use(verifyToken);

/**
 * GET /api/sync/status
 * Get overall sync health status
 */
router.get("/status", async (req, res) => {
    try {
        const stats = await SyncLog.findAll({
            attributes: [
                "status",
                [SyncLog.sequelize.fn("COUNT", SyncLog.sequelize.col("id")), "count"]
            ],
            group: ["status"],
            raw: true,
        });

        const statusMap = {
            PENDING: 0,
            SUCCESS: 0,
            FAILED: 0,
        };

        stats.forEach(s => {
            statusMap[s.status] = parseInt(s.count);
        });

        res.json({
            success: true,
            data: {
                ...statusMap,
                total: statusMap.PENDING + statusMap.SUCCESS + statusMap.FAILED,
                healthScore: statusMap.FAILED === 0 ? 100 :
                    Math.round((statusMap.SUCCESS / (statusMap.SUCCESS + statusMap.FAILED)) * 100),
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

/**
 * GET /api/sync/logs
 * Get recent sync logs
 */
router.get("/logs", async (req, res) => {
    try {
        const { status } = req.query;
        // Input validation: clamp limit between 1 and 500
        const limit = Math.min(Math.max(parseInt(req.query.limit) || 50, 1), 500);

        const where = {};
        if (status && ['PENDING', 'SUCCESS', 'FAILED'].includes(status)) {
            where.status = status;
        }

        const logs = await SyncLog.findAll({
            where,
            order: [["createdAt", "DESC"]],
            limit,
            raw: true,
        });

        res.json({ success: true, data: logs });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

/**
 * POST /api/sync/retry
 * Manually retry failed syncs (Admin only)
 */
router.post("/retry", isAdmin, async (req, res) => {
    try {
        const result = await retryFailedSyncs();
        res.json({ success: true, data: result });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

/**
 * GET /api/sync/entity/:type/:id
 * Get sync status for a specific entity
 */
router.get("/entity/:type/:id", async (req, res) => {
    try {
        const { type, id } = req.params;
        const log = await getSyncStatus(type, id);

        res.json({
            success: true,
            data: log || { message: "No sync record found" }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

export default router;
