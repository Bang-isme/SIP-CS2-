export const prepareDashboardDemo = async ({
  fetchActiveAlerts,
  getTriggeredAlertTypes,
  provisionAlertEvidence,
  refreshAlertAggregates,
  fetchTriggeredAlerts,
  acknowledgeAlert,
  fetchExecutiveBrief,
  note,
}) => {
  const activeAlerts = await fetchActiveAlerts();
  const activeAlertTypes = activeAlerts.map((item) => item.type).filter(Boolean);

  const triggeredBeforePrep = await getTriggeredAlertTypes();
  const missingTriggeredTypes = activeAlertTypes.filter((type) => !triggeredBeforePrep.has(type));

  const provisionedAlerts = [];
  let provisionedBenefitDemoEmployeeId = null;

  if (missingTriggeredTypes.length > 0) {
    for (const alertType of missingTriggeredTypes) {
      const config = activeAlerts.find((item) => item.type === alertType);
      const employeeId = await provisionAlertEvidence(alertType, config?.threshold);
      provisionedAlerts.push({ type: alertType, employeeId });
      if (alertType === "benefits_change") {
        provisionedBenefitDemoEmployeeId = employeeId;
      }
    }

    await refreshAlertAggregates();
  }

  const triggeredAfterPrep = await getTriggeredAlertTypes();
  const remainingMissingTypes = activeAlertTypes.filter((type) => !triggeredAfterPrep.has(type));
  if (remainingMissingTypes.length > 0) {
    throw new Error(`Dashboard demo is still missing active alert types: ${remainingMissingTypes.join(", ")}`);
  }

  const alertItems = await fetchTriggeredAlerts();
  const actionableAlerts = alertItems.filter((item) => {
    const count = Number(item?.count || 0);
    const acknowledgement = item?.alert?.acknowledgement;
    return count > 0 && item?.alert?._id && (!acknowledgement || acknowledgement.needsReview);
  });

  for (const item of actionableAlerts) {
    await acknowledgeAlert(item.alert._id, note);
  }

  const executiveBrief = await fetchExecutiveBrief();

  return {
    status: "ok",
    activeAlertTypes,
    missingTriggeredTypes,
    visibleAlertTypes: alertItems.map((item) => item?.alert?.type).filter(Boolean),
    provisionedAlerts,
    provisionedBenefitDemoEmployeeId,
    preparedAlerts: actionableAlerts.map((item) => ({
      alertId: item.alert._id,
      type: item.alert.type,
      count: Number(item.count || 0),
    })),
    executiveBrief: {
      freshness: executiveBrief?.data?.freshness?.global?.status || "unknown",
      actionCenter: executiveBrief?.data?.actionCenter?.status || "unknown",
      needsAttentionCategories: executiveBrief?.data?.alerts?.followUp?.needsAttentionCategories ?? null,
    },
  };
};
