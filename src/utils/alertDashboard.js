const ALERT_TYPE_META = Object.freeze({
  anniversary: { label: "Anniversaries", severity: "Low", severityRank: 1 },
  vacation: { label: "High Vacation Balance", severity: "High", severityRank: 3 },
  benefits_change: { label: "Benefits Payroll Impact", severity: "Medium", severityRank: 2 },
  birthday: { label: "Birthday Alert", severity: "Low", severityRank: 1 },
});

const ALERT_FOLLOW_UP_PRIORITY = Object.freeze({
  unassigned: 3,
  stale: 2,
  owned: 1,
});

export const buildAlertAcknowledgement = ({ alertConfig, summaryRow }) => {
  if (!alertConfig?.acknowledgedAt || !alertConfig?.acknowledgedBy) {
    return null;
  }

  const acknowledgedUser = alertConfig.acknowledgedBy;
  const acknowledgedSummaryAt = alertConfig.acknowledgedSummaryAt
    ? new Date(alertConfig.acknowledgedSummaryAt).getTime()
    : null;
  const currentSummaryAt = summaryRow?.computed_at
    ? new Date(summaryRow.computed_at).getTime()
    : null;
  const acknowledgedCount = Number.isFinite(Number(alertConfig.acknowledgedCount))
    ? Number(alertConfig.acknowledgedCount)
    : null;
  const currentCount = Number(summaryRow?.employee_count || 0);

  const needsReview = Boolean(
    (currentSummaryAt && acknowledgedSummaryAt && currentSummaryAt > acknowledgedSummaryAt)
    || (acknowledgedCount !== null && currentCount !== acknowledgedCount)
  );

  return {
    status: needsReview ? "stale" : "current",
    needsReview,
    note: alertConfig.acknowledgementNote || "",
    acknowledgedAt: alertConfig.acknowledgedAt,
    acknowledgedCount,
    acknowledgedSummaryAt: alertConfig.acknowledgedSummaryAt || null,
    currentCount,
    currentSummaryAt: summaryRow?.computed_at || null,
    acknowledgedBy: {
      _id: acknowledgedUser._id,
      username: acknowledgedUser.username || null,
      email: acknowledgedUser.email || null,
    },
  };
};

export const buildLatestAlertSummaryMap = (summaryRows = []) => {
  const summaryMap = new Map();

  for (const row of summaryRows) {
    const current = summaryMap.get(row.alert_type);
    const rowTime = row?.computed_at ? new Date(row.computed_at).getTime() : 0;
    const currentTime = current?.computed_at ? new Date(current.computed_at).getTime() : 0;

    if (!current || rowTime >= currentTime) {
      summaryMap.set(row.alert_type, row);
    }
  }

  return summaryMap;
};

export const buildAlertFollowUpSnapshot = (activeAlerts = [], summaryRows = []) => {
  const summaryMap = buildLatestAlertSummaryMap(summaryRows);

  const items = activeAlerts
    .map((alertConfig) => {
      const summaryRow = summaryMap.get(alertConfig.type);
      const count = Number(summaryRow?.employee_count || 0);

      if (count <= 0) {
        return null;
      }

      const meta = ALERT_TYPE_META[alertConfig.type] || {};
      const acknowledgement = buildAlertAcknowledgement({
        alertConfig,
        summaryRow,
      });
      const acknowledgedCount = Number(acknowledgement?.acknowledgedCount || 0);
      const status = acknowledgement?.needsReview
        ? "stale"
        : acknowledgement?.acknowledgedAt
          ? "owned"
          : "unassigned";

      let detail = "Owner note is current for this alert category.";
      if (status === "unassigned") {
        detail = "No owner note is recorded for the current alert snapshot.";
      } else if (status === "stale") {
        detail = acknowledgedCount > 0 && acknowledgedCount !== count
          ? `Alert volume moved from ${acknowledgedCount} to ${count} employees since the last note.`
          : "The current snapshot refreshed after the last acknowledgement.";
      } else if (acknowledgement?.note) {
        detail = acknowledgement.note;
      }

      const ownerLabel = acknowledgement?.acknowledgedBy?.username
        || acknowledgement?.acknowledgedBy?.email
        || "Unassigned";

      return {
        alertId: String(alertConfig?._id || `${alertConfig.type}-${count}`),
        type: alertConfig.type,
        label: meta.label || alertConfig.name || "Alert",
        severity: meta.severity || "Low",
        severityRank: meta.severityRank || 0,
        status,
        statusRank: ALERT_FOLLOW_UP_PRIORITY[status] || 0,
        count,
        detail,
        ownerLabel,
        acknowledgedAt: acknowledgement?.acknowledgedAt || null,
        actionLabel: status === "unassigned"
          ? "Assign Owner"
          : status === "stale"
            ? "Re-review Alert"
            : "Open Note",
        acknowledgement,
      };
    })
    .filter(Boolean)
    .sort((a, b) => {
      if (b.statusRank !== a.statusRank) return b.statusRank - a.statusRank;
      if (b.severityRank !== a.severityRank) return b.severityRank - a.severityRank;
      return b.count - a.count;
    });

  const queue = items.filter((item) => item.status !== "owned");

  return {
    items,
    queue,
    queuePreview: queue.slice(0, 3),
    needsAttentionCategories: queue.length,
    needsAttentionEmployees: queue.reduce((sum, item) => sum + item.count, 0),
    unassignedCategories: items.filter((item) => item.status === "unassigned").length,
    staleCategories: items.filter((item) => item.status === "stale").length,
    ownedCategories: items.filter((item) => item.status === "owned").length,
  };
};

export {
  ALERT_FOLLOW_UP_PRIORITY,
  ALERT_TYPE_META,
};
