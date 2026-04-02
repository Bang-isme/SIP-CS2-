const currencyFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 0,
});

const formatDateLabel = (value) => {
  if (!value) return '';
  const date = /^\d{4}-\d{2}-\d{2}$/.test(String(value))
    ? new Date(
      Number.parseInt(String(value).slice(0, 4), 10),
      Number.parseInt(String(value).slice(5, 7), 10) - 1,
      Number.parseInt(String(value).slice(8, 10), 10),
    )
    : new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

export const parseBenefitsImpactMeta = (value) => {
  if (!value) return null;
  if (typeof value === 'object') return value;
  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === 'object' ? parsed : null;
  } catch {
    return null;
  }
};

export const formatBenefitsImpactChip = (value) => {
  const meta = parseBenefitsImpactMeta(value);
  if (!meta) return String(value || 'Payroll impact');

  const label = Number(meta.pc) > 1 ? `${meta.pc} plans` : (meta.p || 'Benefits');
  const annualAmount = Number(meta.a);
  if (Number.isFinite(annualAmount) && annualAmount > 0) {
    return `${label} | ${currencyFormatter.format(annualAmount)}/yr`;
  }
  return `${label} | updated`;
};

export const formatBenefitsImpactReason = (value) => {
  const meta = parseBenefitsImpactMeta(value);
  if (!meta) return String(value || 'Benefits update');

  const effectiveLabel = formatDateLabel(meta.e);
  const changedLabel = formatDateLabel(meta.c);
  const planCount = Number(meta.pc) || 1;

  switch (meta.i) {
    case 'scheduled_payroll_deduction':
      return effectiveLabel
        ? `Deduction update effective ${effectiveLabel}`
        : 'Scheduled payroll deduction update';
    case 'payroll_deduction_update':
      return changedLabel
        ? `Payroll deduction updated ${changedLabel}`
        : 'Payroll deduction updated';
    case 'multi_plan_payroll_update':
      return `${planCount} payroll-impacting plan updates`;
    case 'multi_plan_update':
      return `${planCount} plan updates recorded`;
    default:
      return changedLabel
        ? `Benefits enrollment updated ${changedLabel}`
        : 'Benefits enrollment updated';
  }
};
