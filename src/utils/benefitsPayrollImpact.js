const DAY_IN_MS = 24 * 60 * 60 * 1000;
const padDatePart = (value) => String(value).padStart(2, "0");

const normalizeDateOnly = (value) => {
    if (!value) return null;
    if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
        const [year, month, day] = value.split("-").map((part) => Number.parseInt(part, 10));
        const date = new Date(year, month - 1, day);
        date.setHours(0, 0, 0, 0);
        return Number.isNaN(date.getTime()) ? null : date;
    }

    const date = value instanceof Date ? new Date(value) : new Date(String(value));
    if (Number.isNaN(date.getTime())) return null;
    date.setHours(0, 0, 0, 0);
    return date;
};

const toDateKey = (value) => {
    const date = normalizeDateOnly(value);
    if (!date) return null;
    return `${date.getFullYear()}-${padDatePart(date.getMonth() + 1)}-${padDatePart(date.getDate())}`;
};

const daysBetween = (later, earlier) => {
    if (!later || !earlier) return null;
    return Math.max(0, Math.round((later.getTime() - earlier.getTime()) / DAY_IN_MS));
};

export const serializeBenefitsImpactMeta = (meta = {}) => {
    return JSON.stringify({
        p: meta.primaryPlanName || null,
        pc: Number.isFinite(meta.changedPlanCount) ? meta.changedPlanCount : 1,
        a: Number.isFinite(meta.totalAnnualAmount) ? Number(meta.totalAnnualAmount.toFixed(2)) : 0,
        c: meta.latestChangeDate || null,
        e: meta.effectiveDate || null,
        i: meta.impactCode || "benefit_enrollment_update",
    });
};

export const buildBenefitsChangeMatchesFromRows = (rows = [], { now = new Date() } = {}) => {
    const today = normalizeDateOnly(now) || new Date();
    const grouped = new Map();

    for (const row of rows) {
        const employeeId = row?.employee_id;
        if (!employeeId) continue;

        const planName = String(
            row?.plan?.name || row?.plan_name || row?.planName || "Benefits Plan"
        ).trim();
        const amountPaid = Number.parseFloat(row?.amount_paid ?? 0) || 0;
        const changeDate = toDateKey(row?.last_change_date || row?.updatedAt || row?.effective_date);
        const effectiveDate = toDateKey(row?.effective_date);

        if (!grouped.has(employeeId)) {
            grouped.set(employeeId, []);
        }

        grouped.get(employeeId).push({
            employeeId,
            planName,
            amountPaid,
            changeDate,
            effectiveDate,
        });
    }

    return [...grouped.entries()].map(([employeeId, employeeRows]) => {
        const sortedRows = [...employeeRows].sort((left, right) => {
            const leftChange = left.changeDate || "";
            const rightChange = right.changeDate || "";
            if (leftChange !== rightChange) {
                return rightChange.localeCompare(leftChange);
            }
            return (right.effectiveDate || "").localeCompare(left.effectiveDate || "");
        });

        const latestRow = sortedRows[0];
        const planNames = [...new Set(sortedRows.map((row) => row.planName).filter(Boolean))];
        const changedPlanCount = planNames.length || 1;
        const totalAnnualAmount = sortedRows.reduce((sum, row) => sum + row.amountPaid, 0);
        const futureEffectiveDates = sortedRows
            .map((row) => normalizeDateOnly(row.effectiveDate))
            .filter((date) => date && date >= today)
            .sort((left, right) => left - right);
        const effectiveDate = futureEffectiveDates[0]
            ? toDateKey(futureEffectiveDates[0])
            : latestRow?.effectiveDate || null;
        const latestChangeDate = latestRow?.changeDate || null;
        const hasPositiveAmount = totalAnnualAmount > 0;
        const hasFutureEffectiveDate = Boolean(futureEffectiveDates[0] && futureEffectiveDates[0] > today);

        let impactCode = "benefit_enrollment_update";
        if (changedPlanCount > 1 && hasPositiveAmount) {
            impactCode = "multi_plan_payroll_update";
        } else if (changedPlanCount > 1) {
            impactCode = "multi_plan_update";
        } else if (hasPositiveAmount && hasFutureEffectiveDate) {
            impactCode = "scheduled_payroll_deduction";
        } else if (hasPositiveAmount) {
            impactCode = "payroll_deduction_update";
        }

        return {
            employeeId,
            sortDays: daysBetween(today, normalizeDateOnly(latestChangeDate)),
            latestChangeDate,
            effectiveDate,
            changedPlanCount,
            totalAnnualAmount,
            primaryPlanName: latestRow?.planName || "Benefits Plan",
            impactCode,
            extraData: serializeBenefitsImpactMeta({
                primaryPlanName: latestRow?.planName || "Benefits Plan",
                changedPlanCount,
                totalAnnualAmount,
                latestChangeDate,
                effectiveDate,
                impactCode,
            }),
        };
    });
};
