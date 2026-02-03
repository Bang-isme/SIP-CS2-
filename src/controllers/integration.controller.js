import { IntegrationEvent } from "../models/sql/index.js";
import { Op } from "sequelize";

const normalizeStatus = (status) => {
    if (!status) return null;
    const upper = String(status).toUpperCase();
    const allowed = ["PENDING", "PROCESSING", "SUCCESS", "FAILED", "DEAD"];
    return allowed.includes(upper) ? upper : null;
};

export const listIntegrationEvents = async (req, res) => {
    try {
        const status = normalizeStatus(req.query.status);
        const limit = Math.min(Math.max(parseInt(req.query.limit) || 50, 1), 500);
        const page = Math.max(parseInt(req.query.page) || 1, 1);
        const offset = (page - 1) * limit;

        const where = {};
        if (status) where.status = status;

        const [total, events] = await Promise.all([
            IntegrationEvent.count({ where }),
            IntegrationEvent.findAll({
                where,
                order: [["createdAt", "DESC"]],
                limit,
                offset,
                raw: true,
            }),
        ]);

        res.json({
            success: true,
            data: events,
            meta: {
                total,
                page,
                limit,
                pages: Math.ceil(total / limit),
            },
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

export const retryIntegrationEvent = async (req, res) => {
    try {
        const { id } = req.params;
        const event = await IntegrationEvent.findByPk(id);
        if (!event) {
            return res.status(404).json({ success: false, message: "Event not found" });
        }

        await IntegrationEvent.update(
            {
                status: "PENDING",
                attempts: 0,
                last_error: null,
                next_run_at: null,
            },
            { where: { id } }
        );

        res.json({ success: true, message: "Event queued for retry" });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

export const retryDeadIntegrationEvents = async (_req, res) => {
    try {
        const [count] = await IntegrationEvent.update(
            {
                status: "PENDING",
                attempts: 0,
                last_error: null,
                next_run_at: null,
            },
            { where: { status: "DEAD" } }
        );

        res.json({ success: true, message: `Re-queued ${count} dead events` });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

export const replayIntegrationEvents = async (req, res) => {
    try {
        const {
            status,
            entityType,
            entityId,
            fromDays,
            fromDate,
        } = req.body || {};

        const allowedStatuses = ["FAILED", "DEAD"];
        const normalizedStatus = normalizeStatus(status);
        const statuses = normalizedStatus ? [normalizedStatus] : allowedStatuses;

        const where = {
            status: { [Op.in]: statuses },
        };

        if (entityType) {
            where.entity_type = String(entityType);
        }
        if (entityId) {
            where.entity_id = String(entityId);
        }

        let since = null;
        if (fromDate) {
            const parsed = new Date(fromDate);
            if (!Number.isNaN(parsed.getTime())) since = parsed;
        } else if (fromDays !== undefined && fromDays !== null) {
            const days = Number(fromDays);
            if (!Number.isNaN(days) && days >= 0) {
                since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
            }
        }
        if (since) {
            where.createdAt = { [Op.gte]: since };
        }

        const [count] = await IntegrationEvent.update(
            {
                status: "PENDING",
                attempts: 0,
                last_error: null,
                next_run_at: null,
            },
            { where }
        );

        res.json({
            success: true,
            message: `Re-queued ${count} events`,
            data: { count },
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
