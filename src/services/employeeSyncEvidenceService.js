import Employee from "../models/Employee.js";
import { PayRate, SyncLog } from "../models/sql/index.js";
import { IntegrationEventStore } from "../repositories/integrationStore.js";
import { OUTBOX_ENABLED } from "../config.js";

const normalizeEmployeeId = (value) => String(value || "").trim();

const normalizeCurrencyValue = (value) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
};

const buildSourceStage = (employee) => {
    if (!employee) {
        return {
            status: "ABSENT",
            label: "Source removed",
            detail: "No MongoDB source record is present for this employee ID.",
            updatedAt: null,
            payRate: null,
        };
    }

    return {
        status: "PRESENT",
        label: "Source saved",
        detail: "MongoDB source row is present.",
        updatedAt: employee.updatedAt || employee.createdAt || null,
        payRate: normalizeCurrencyValue(employee.payRate),
    };
};

const buildQueueStage = ({ latestEvent, latestSync }) => {
    if (!latestEvent) {
        if (!OUTBOX_ENABLED) {
            return {
                status: "BYPASSED",
                label: "Direct path",
                detail: "Outbox is disabled, so this write uses direct delivery.",
                correlationId: latestSync?.correlation_id || null,
                eventId: null,
                action: latestSync?.action || null,
                attempts: null,
                updatedAt: latestSync?.updatedAt || null,
                lastError: null,
            };
        }

        if (latestSync) {
            return {
                status: "BYPASSED",
                label: "Direct path",
                detail: "Payroll evidence exists without a queued outbox event.",
                correlationId: latestSync.correlation_id || null,
                eventId: null,
                action: latestSync.action || null,
                attempts: null,
                updatedAt: latestSync.updatedAt || latestSync.createdAt || null,
                lastError: null,
            };
        }

        return {
            status: "MISSING",
            label: "No queue evidence",
            detail: "No queued outbox event has been recorded for this employee yet.",
            correlationId: null,
            eventId: null,
            action: null,
            attempts: null,
            updatedAt: null,
            lastError: null,
        };
    }

    const queueStatusMap = {
        PENDING: {
            label: "Queued",
            detail: "Waiting for the outbox worker to dispatch.",
        },
        PROCESSING: {
            label: "Dispatching",
            detail: "The worker has claimed this outbox event.",
        },
        SUCCESS: {
            label: "Delivered",
            detail: "The outbox worker finished this dispatch.",
        },
        FAILED: {
            label: "Retry pending",
            detail: "The last dispatch failed and will retry.",
        },
        DEAD: {
            label: "Dead letter",
            detail: "Dispatch exhausted retries and needs operator action.",
        },
    };

    const resolvedStatus = queueStatusMap[latestEvent.status] || {
        label: latestEvent.status || "Unknown",
        detail: "Outbox status is available but not mapped to a lifecycle label.",
    };

    return {
        status: latestEvent.status || "UNKNOWN",
        label: resolvedStatus.label,
        detail: resolvedStatus.detail,
        correlationId: latestEvent.correlation_id || null,
        eventId: latestEvent.id ?? null,
        action: latestEvent.action || null,
        attempts: Number.isFinite(latestEvent.attempts) ? latestEvent.attempts : null,
        updatedAt: latestEvent.updatedAt || latestEvent.createdAt || null,
        lastError: latestEvent.last_error || null,
    };
};

const buildPayrollStage = ({
    currentPayroll,
    latestPayrollRecord,
    latestSync,
    sourceEmployee,
}) => {
    const sourcePayRate = normalizeCurrencyValue(sourceEmployee?.payRate);
    const payrollPayRate = normalizeCurrencyValue(currentPayroll?.pay_rate ?? latestPayrollRecord?.pay_rate);
    const latestPayType = String(currentPayroll?.pay_type || latestPayrollRecord?.pay_type || "").trim().toUpperCase();
    const latestSyncStatus = String(latestSync?.status || "").trim().toUpperCase();

    if (latestPayType === "TERMINATED") {
        return {
            status: "TERMINATED",
            label: "Payroll closed",
            detail: "The latest payroll record is terminated.",
            payRate: payrollPayRate,
            payType: latestPayType || null,
            effectiveDate: latestPayrollRecord?.effective_date || currentPayroll?.effective_date || null,
            syncStatus: latestSyncStatus || null,
            correlationId: latestSync?.correlation_id || null,
            updatedAt: latestPayrollRecord?.updatedAt || currentPayroll?.updatedAt || latestSync?.updatedAt || null,
            parity: "TERMINATED",
        };
    }

    if (currentPayroll) {
        const parity = sourcePayRate === null || payrollPayRate === null
            ? "UNAVAILABLE"
            : (sourcePayRate === payrollPayRate ? "MATCH" : "MISMATCH");
        const detail = parity === "MISMATCH"
            ? "Active payroll record does not match the source pay rate."
            : "Active payroll record is available.";

        return {
            status: parity === "MISMATCH" ? "DRIFT" : "CURRENT",
            label: parity === "MISMATCH" ? "Payroll drift" : "Payroll current",
            detail,
            payRate: payrollPayRate,
            payType: latestPayType || null,
            effectiveDate: currentPayroll.effective_date || null,
            syncStatus: latestSyncStatus || null,
            correlationId: latestSync?.correlation_id || null,
            updatedAt: currentPayroll.updatedAt || currentPayroll.createdAt || latestSync?.updatedAt || null,
            parity,
        };
    }

    if (latestSyncStatus === "FAILED") {
        return {
            status: "FAILED",
            label: "Payroll failed",
            detail: "Latest payroll delivery attempt failed.",
            payRate: payrollPayRate,
            payType: latestPayType || null,
            effectiveDate: latestPayrollRecord?.effective_date || null,
            syncStatus: latestSyncStatus,
            correlationId: latestSync?.correlation_id || null,
            updatedAt: latestSync.updatedAt || latestSync.createdAt || null,
            parity: "UNAVAILABLE",
        };
    }

    return {
        status: "MISSING",
        label: "Payroll pending",
        detail: "No active payroll record is available yet.",
        payRate: payrollPayRate,
        payType: latestPayType || null,
        effectiveDate: latestPayrollRecord?.effective_date || null,
        syncStatus: latestSyncStatus || null,
        correlationId: latestSync?.correlation_id || null,
        updatedAt: latestSync?.updatedAt || latestSync?.createdAt || null,
        parity: "UNAVAILABLE",
    };
};

const buildOverallStage = ({
    sourceStage,
    queueStage,
    payrollStage,
}) => {
    if (
        queueStage.status === "FAILED"
        || queueStage.status === "DEAD"
        || payrollStage.status === "FAILED"
        || payrollStage.status === "DRIFT"
        || (sourceStage.status === "ABSENT" && payrollStage.status === "CURRENT")
    ) {
        return {
            status: "attention",
            label: "Needs attention",
            detail: "The latest source-to-payroll evidence is not fully aligned.",
            requiresAttention: true,
        };
    }

    if (
        queueStage.status === "PENDING"
        || queueStage.status === "PROCESSING"
        || payrollStage.status === "MISSING"
    ) {
        return {
            status: "pending",
            label: "Sync in flight",
            detail: "Source write is recorded, but downstream evidence is still catching up.",
            requiresAttention: false,
        };
    }

    if (sourceStage.status === "ABSENT" && payrollStage.status === "TERMINATED") {
        return {
            status: "healthy",
            label: "Delete synced",
            detail: "Source removal and payroll close-out both have evidence.",
            requiresAttention: false,
        };
    }

    return {
        status: "healthy",
        label: "Payroll synced",
        detail: "Source, queue, and payroll evidence are aligned.",
        requiresAttention: false,
    };
};

export const buildEmployeeSyncEvidenceSnapshot = async (employeeIdInput) => {
    const employeeId = normalizeEmployeeId(employeeIdInput);

    const [sourceEmployee, queueEvents, payrollHistory, syncLogs] = await Promise.all([
        Employee.findOne({ employeeId }).lean(),
        IntegrationEventStore.findAll({
            where: {
                entity_type: "employee",
                entity_id: employeeId,
            },
            order: [["createdAt", "DESC"]],
            limit: 5,
        }),
        PayRate.findAll({
            where: { employee_id: employeeId },
            order: [["effective_date", "DESC"], ["id", "DESC"]],
            limit: 10,
        }),
        SyncLog.findAll({
            where: {
                entity_type: "employee",
                entity_id: employeeId,
            },
            order: [["createdAt", "DESC"]],
            limit: 10,
        }),
    ]);

    if (!sourceEmployee && queueEvents.length === 0 && payrollHistory.length === 0 && syncLogs.length === 0) {
        return null;
    }

    const latestEvent = queueEvents[0] || null;
    const latestSync = syncLogs[0] || null;
    const currentPayroll = payrollHistory.find((record) => Boolean(record.is_active)) || null;
    const latestPayrollRecord = payrollHistory[0] || null;

    const source = buildSourceStage(sourceEmployee);
    const queue = buildQueueStage({ latestEvent, latestSync });
    const payroll = buildPayrollStage({
        currentPayroll,
        latestPayrollRecord,
        latestSync,
        sourceEmployee,
    });
    const overall = buildOverallStage({ sourceStage: source, queueStage: queue, payrollStage: payroll });

    return {
        employeeId,
        checkedAt: new Date().toISOString(),
        overall,
        source,
        queue,
        payroll,
        meta: {
            outboxEnabled: OUTBOX_ENABLED,
            queueEventCount: queueEvents.length,
            syncLogCount: syncLogs.length,
            lastCorrelationId: queue.correlationId || payroll.correlationId || null,
        },
    };
};

export default {
    buildEmployeeSyncEvidenceSnapshot,
};
