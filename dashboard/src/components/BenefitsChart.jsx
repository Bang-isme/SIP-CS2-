import { memo, useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { formatDollar, formatCount } from '../utils/formatters';
import { getChartTheme } from '../utils/chartTheme';
import './BenefitsChart.css';

function BenefitsChart({ data, departmentScope = '', onDrilldown }) {
  const planRows = useMemo(() => {
    return Object.entries(data.byPlan).map(([name, values]) => ({
      name,
      shareholderAverage: Math.round(values.shareholder.average),
      nonShareholderAverage: Math.round(values.nonShareholder.average),
      shareholderImpact: Math.round(values.shareholder.totalPaid),
      nonShareholderImpact: Math.round(values.nonShareholder.totalPaid),
      shareholderTotal: Math.round(values.shareholder.totalPaid),
      nonShareholderTotal: Math.round(values.nonShareholder.totalPaid),
      shareholderCount: Number(values.shareholder.count || 0),
      nonShareholderCount: Number(values.nonShareholder.count || 0),
      totalImpact: Math.round(values.shareholder.totalPaid + values.nonShareholder.totalPaid),
      enrollmentCount: Number(values.shareholder.count || 0) + Number(values.nonShareholder.count || 0),
      gap: Math.abs(Math.round(values.shareholder.average) - Math.round(values.nonShareholder.average)),
    }));
  }, [data.byPlan]);
  const chartData = useMemo(() => [...planRows]
    .sort((left, right) => right.totalImpact - left.totalImpact)
    .slice(0, 5), [planRows]);

  const theme = useMemo(() => getChartTheme(), []);
  const formatCurrency = formatDollar;

  const overallShareholderTotal = useMemo(
    () => Math.round(data.byShareholder.shareholder.totalPaid),
    [data.byShareholder.shareholder.totalPaid],
  );
  const overallNonShareholderTotal = useMemo(
    () => Math.round(data.byShareholder.nonShareholder.totalPaid),
    [data.byShareholder.nonShareholder.totalPaid],
  );
  const overallShareholderAverage = useMemo(
    () => Math.round(data.byShareholder.shareholder.average),
    [data.byShareholder.shareholder.average],
  );
  const overallNonShareholderAverage = useMemo(
    () => Math.round(data.byShareholder.nonShareholder.average),
    [data.byShareholder.nonShareholder.average],
  );
  const highestImpactPlan = useMemo(
    () => [...planRows].sort((left, right) => right.totalImpact - left.totalImpact)[0] || null,
    [planRows],
  );
  const widestGapPlan = useMemo(
    () => [...planRows].sort((left, right) => right.gap - left.gap)[0] || null,
    [planRows],
  );
  const highestEnrollmentPlan = useMemo(
    () => [...planRows].sort((left, right) => right.enrollmentCount - left.enrollmentCount)[0] || null,
    [planRows],
  );
  const hasMeaningfulGap = Boolean(widestGapPlan && widestGapPlan.gap > 0);

  return (
    <div className="benefits-container">
      <div className="benefits-summary">
        <div className="summary-card shareholder">
          <span className="summary-label">Shareholder total</span>
          <span className="summary-value text-success">{formatCurrency(overallShareholderTotal)}</span>
          <span className="summary-count">
            {formatCount(data.byShareholder.shareholder.count)} enrollments | Avg {formatCurrency(overallShareholderAverage)}
          </span>
        </div>
        <div className="summary-card non-shareholder">
          <span className="summary-label">Non-shareholder total</span>
          <span className="summary-value text-primary">{formatCurrency(overallNonShareholderTotal)}</span>
          <span className="summary-count">
            {formatCount(data.byShareholder.nonShareholder.count)} enrollments | Avg {formatCurrency(overallNonShareholderAverage)}
          </span>
        </div>
        <div className="summary-card impact">
          <span className="summary-label">
            {departmentScope ? `Highest impact in ${departmentScope}` : 'Highest impact plan'}
          </span>
          <span className="summary-value summary-value--label text-primary">{highestImpactPlan?.name || '--'}</span>
          <span className="summary-count">
            {highestImpactPlan ? `${formatCurrency(highestImpactPlan.totalImpact)} total paid` : 'No plan data'}
          </span>
        </div>
      </div>

      <div className="benefits-insights" aria-label="Benefits insights">
        <button
          type="button"
          className="benefits-insight-card"
          onClick={() => highestEnrollmentPlan && onDrilldown?.({ benefitPlan: highestEnrollmentPlan.name })}
          aria-label={highestEnrollmentPlan ? `Open enrollment drilldown for ${highestEnrollmentPlan.name}` : 'No enrollment drilldown available'}
          disabled={!highestEnrollmentPlan}
        >
          <span className="benefits-insight-card__label">Plan driver</span>
          <strong>{highestEnrollmentPlan?.name || '--'}</strong>
          <small>
            {highestEnrollmentPlan
              ? `${formatCount(highestEnrollmentPlan.enrollmentCount)} enrollments | ${formatCurrency(highestEnrollmentPlan.totalImpact)} total paid${departmentScope ? ` in ${departmentScope}` : ''}`
              : 'No plan data'}
          </small>
        </button>
        <button
          type="button"
          className="benefits-insight-card benefits-insight-card--secondary"
          onClick={() => hasMeaningfulGap && widestGapPlan && onDrilldown?.({ benefitPlan: widestGapPlan.name })}
          aria-label={hasMeaningfulGap && widestGapPlan ? `Open gap drilldown for ${widestGapPlan.name}` : 'No gap drilldown available'}
          disabled={!hasMeaningfulGap}
        >
          <span className="benefits-insight-card__label">{hasMeaningfulGap ? 'Cost spread' : 'Spread status'}</span>
          <strong>{hasMeaningfulGap ? widestGapPlan?.name || '--' : 'Balanced averages'}</strong>
          <small>
            {hasMeaningfulGap && widestGapPlan
              ? `${formatCurrency(widestGapPlan.gap)} average spread between shareholder groups${departmentScope ? ` in ${departmentScope}` : ''}`
              : 'No material shareholder spread'}
          </small>
        </button>
      </div>

      <h4>{departmentScope ? `Plan payout snapshot in ${departmentScope}` : 'Plan payout snapshot'}</h4>
      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={chartData} layout="vertical">
          <CartesianGrid strokeDasharray="3 3" stroke={theme.gridStroke} horizontal={true} vertical={false} />
          <XAxis
            type="number"
            tickFormatter={formatCurrency}
            tick={{ fontSize: 12, fill: 'var(--color-text-secondary)' }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            type="category"
            dataKey="name"
            width={170}
            tick={{ fontSize: 12, fill: 'var(--color-text-secondary)' }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip
            cursor={{ fill: 'var(--color-bg-subtle)' }}
            contentStyle={{
              borderRadius: '10px',
              border: '1px solid var(--color-border)',
              background: 'var(--color-bg-card)',
              boxShadow: 'var(--shadow-lg)'
            }}
            formatter={(value) => formatCurrency(value)}
            labelFormatter={(label) => label}
          />
          <Legend iconType="circle" wrapperStyle={{ fontSize: 12, color: 'var(--color-text-secondary)', paddingTop: 6 }} />
          <Bar
            dataKey="shareholderImpact"
            name="Shareholder total"
            fill={theme.vacation}
            radius={[0, 4, 4, 0]}
            barSize={18}
            cursor="pointer"
            onClick={(data) => {
              if (onDrilldown && data && data.name) {
                onDrilldown({ benefitPlan: data.name, isShareholder: 'true' });
              }
            }}
          />
          <Bar
            dataKey="nonShareholderImpact"
            name="Non-shareholder total"
            fill={theme.benefits}
            radius={[0, 4, 4, 0]}
            barSize={18}
            cursor="pointer"
            onClick={(data) => {
              if (onDrilldown && data && data.name) {
                onDrilldown({ benefitPlan: data.name, isShareholder: 'false' });
              }
            }}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export default memo(BenefitsChart);
