import { useCallback } from 'react';
import EarningsChart from './EarningsChart';
import VacationChart from './VacationChart';
import BenefitsChart from './BenefitsChart';
import { SkeletonChart } from './Skeletons';

export default function ChartsSection({
  earnings,
  vacation,
  benefits,
  departmentScope,
  loadingEarnings,
  loadingVacation,
  loadingBenefits,
  earningsError,
  vacationError,
  benefitsError,
  earningsFreshness,
  vacationFreshness,
  benefitsFreshness,
  onRetryEarnings,
  onRetryVacation,
  onRetryBenefits,
  onDrilldown,
  onContextDrilldown,
}) {
  const formatMoney = (value) => Number(value || 0).toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  });

  const buildScopedSeries = (source, filterKey) => {
    return Object.entries(source || {}).map(([name, values]) => ({
      name,
      current: Number(values?.current || 0),
      previous: Number(values?.previous || 0),
      filters: { [filterKey]: name },
    }));
  };

  const analyticsInsights = (() => {
    const insights = [];

    if (departmentScope) {
      const earningsRows = buildScopedSeries(earnings?.byEmploymentType, 'employmentType');
      const fallbackEarningsRows = earningsRows.length > 0 ? earningsRows : buildScopedSeries(earnings?.byGender, 'gender');
      const totalCurrentPayroll = fallbackEarningsRows.reduce((sum, item) => sum + item.current, 0);
      if (fallbackEarningsRows.length > 0) {
        const topSegment = [...fallbackEarningsRows].sort((left, right) => right.current - left.current)[0];
        const sharePct = totalCurrentPayroll > 0 ? (topSegment.current / totalCurrentPayroll) * 100 : 0;
        insights.push({
          key: 'earnings-concentration-scoped',
          eyebrow: 'Payroll concentration',
          subject: topSegment.name,
          metric: `${sharePct.toFixed(1)}% of payroll`,
          note: `${formatMoney(topSegment.current)} current payroll`,
          actionLabel: 'Open payroll concentration drilldown',
          actionText: 'Open payroll',
          filters: {
            context: 'earnings',
            ...topSegment.filters,
          },
        });

        const strongestDelta = [...fallbackEarningsRows]
          .map((row) => ({ ...row, diff: row.current - row.previous }))
          .sort((left, right) => Math.abs(right.diff) - Math.abs(left.diff))[0];
        if (strongestDelta) {
          insights.push({
            key: 'earnings-movement-scoped',
            eyebrow: 'YoY movement',
            subject: strongestDelta.name,
            metric: `${strongestDelta.diff >= 0 ? '+' : '-'}${formatMoney(Math.abs(strongestDelta.diff))} YoY`,
            note: strongestDelta.diff >= 0 ? 'Largest increase vs PY' : 'Largest decline vs PY',
            actionLabel: 'Open movement drilldown',
            actionText: 'Open movement',
            filters: {
              context: 'earnings',
              ...strongestDelta.filters,
            },
            tone: strongestDelta.diff >= 0 ? 'positive' : 'warning',
          });
        }
      }

      const vacationRows = buildScopedSeries(vacation?.byEmploymentType, 'employmentType');
      const fallbackVacationRows = vacationRows.length > 0
        ? vacationRows
        : buildScopedSeries(vacation?.byGender, 'gender');
      const totalVacation = fallbackVacationRows.reduce((sum, item) => sum + item.current, 0);
      if (fallbackVacationRows.length > 0) {
        const topSegment = [...fallbackVacationRows].sort((left, right) => right.current - left.current)[0];
        const sharePct = totalVacation > 0 ? (topSegment.current / totalVacation) * 100 : 0;
        insights.push({
          key: 'vacation-scoped',
          eyebrow: 'Time-off exposure',
          subject: topSegment.name,
          metric: `${sharePct.toFixed(1)}% of time off`,
          note: `${topSegment.current.toLocaleString('en-US')} days current load`,
          actionLabel: 'Open time-off drilldown',
          actionText: 'Open time off',
          filters: {
            context: 'vacation',
            ...topSegment.filters,
          },
          tone: sharePct >= 35 ? 'warning' : 'neutral',
        });
      }

      const benefitsRows = Object.entries(benefits?.byPlan || {}).map(([name, values]) => {
        const shareholderTotal = Number(values?.shareholder?.totalPaid || 0);
        const nonShareholderTotal = Number(values?.nonShareholder?.totalPaid || 0);
        return {
          name,
          totalImpact: shareholderTotal + nonShareholderTotal,
          enrollmentCount: Number(values?.shareholder?.count || 0) + Number(values?.nonShareholder?.count || 0),
        };
      });
      if (benefitsRows.length > 0) {
        const topPlan = [...benefitsRows].sort((left, right) => right.totalImpact - left.totalImpact)[0];
        insights.push({
          key: 'benefits-scoped',
          eyebrow: 'Benefits driver',
          subject: topPlan.name,
          metric: `${formatMoney(topPlan.totalImpact)} total paid`,
          note: `${topPlan.enrollmentCount.toLocaleString('en-US')} enrollments`,
          actionLabel: 'Open benefits impact drilldown',
          actionText: 'Open benefits',
          filters: {
            context: 'benefits',
            benefitPlan: topPlan.name,
          },
        });
      }

      return insights.slice(0, 3);
    }

    const earningsRows = Object.entries(earnings?.byDepartment || {}).map(([name, values]) => ({
      name,
      current: Number(values?.current || 0),
      previous: Number(values?.previous || 0),
    }));
    const totalCurrentPayroll = earningsRows.reduce((sum, item) => sum + item.current, 0);
    if (earningsRows.length > 0) {
      const topDepartment = [...earningsRows].sort((left, right) => right.current - left.current)[0];
      const sharePct = totalCurrentPayroll > 0 ? (topDepartment.current / totalCurrentPayroll) * 100 : 0;
      insights.push({
        key: 'earnings-concentration',
        eyebrow: 'Payroll concentration',
        subject: topDepartment.name,
        metric: `${sharePct.toFixed(1)}% of payroll`,
        note: `${formatMoney(topDepartment.current)} current payroll`,
        actionLabel: 'Open payroll concentration drilldown',
        actionText: 'Open payroll',
        filters: {
          context: 'earnings',
          department: topDepartment.name,
        },
      });

      const strongestDelta = [...earningsRows]
        .map((row) => ({ ...row, diff: row.current - row.previous }))
        .sort((left, right) => Math.abs(right.diff) - Math.abs(left.diff))[0];
      if (strongestDelta) {
        insights.push({
          key: 'earnings-movement',
          eyebrow: 'YoY movement',
          subject: strongestDelta.name,
          metric: `${strongestDelta.diff >= 0 ? '+' : '-'}${formatMoney(Math.abs(strongestDelta.diff))} YoY`,
          note: strongestDelta.diff >= 0 ? 'Largest increase vs PY' : 'Largest decline vs PY',
          actionLabel: 'Open movement drilldown',
          actionText: 'Open movement',
          filters: {
            context: 'earnings',
            department: strongestDelta.name,
          },
          tone: strongestDelta.diff >= 0 ? 'positive' : 'warning',
        });
      }
    }

    const vacationRows = Object.entries(vacation?.byDepartment || {}).map(([name, values]) => ({
      name,
      current: Number(values?.current || 0),
      previous: Number(values?.previous || 0),
    }));
    const totalVacation = vacationRows.reduce((sum, item) => sum + item.current, 0);
    if (vacationRows.length > 0) {
      const topDepartment = [...vacationRows].sort((left, right) => right.current - left.current)[0];
      const sharePct = totalVacation > 0 ? (topDepartment.current / totalVacation) * 100 : 0;
      insights.push({
        key: 'vacation',
        eyebrow: 'Time-off exposure',
        subject: topDepartment.name,
        metric: `${sharePct.toFixed(1)}% of time off`,
        note: `${topDepartment.current.toLocaleString('en-US')} days current load`,
        actionLabel: 'Open time-off drilldown',
        actionText: 'Open time off',
        filters: {
          context: 'vacation',
          department: topDepartment.name,
        },
        tone: sharePct >= 35 ? 'warning' : 'neutral',
      });
    }

    const benefitsRows = Object.entries(benefits?.byPlan || {}).map(([name, values]) => {
      const shareholderTotal = Number(values?.shareholder?.totalPaid || 0);
      const nonShareholderTotal = Number(values?.nonShareholder?.totalPaid || 0);
      const shareholderAverage = Number(values?.shareholder?.average || 0);
      const nonShareholderAverage = Number(values?.nonShareholder?.average || 0);
      return {
        name,
        totalImpact: shareholderTotal + nonShareholderTotal,
        gap: Math.abs(shareholderAverage - nonShareholderAverage),
        enrollmentCount: Number(values?.shareholder?.count || 0) + Number(values?.nonShareholder?.count || 0),
      };
    });
    if (benefitsRows.length > 0) {
      const topPlan = [...benefitsRows].sort((left, right) => right.totalImpact - left.totalImpact)[0];
      insights.push({
        key: 'benefits',
        eyebrow: 'Benefits driver',
        subject: topPlan.name,
        metric: `${formatMoney(topPlan.totalImpact)} total paid`,
        note: `${topPlan.enrollmentCount.toLocaleString('en-US')} enrollments`,
        actionLabel: 'Open benefits impact drilldown',
        actionText: 'Open benefits',
        filters: {
          context: 'benefits',
          benefitPlan: topPlan.name,
        },
      });
    }

    return insights.slice(0, 3);
  })();
  const drilldownLabel = 'Open drilldown';
  const openEarningsContext = useCallback(() => onContextDrilldown('earnings'), [onContextDrilldown]);
  const openVacationContext = useCallback(() => onContextDrilldown('vacation'), [onContextDrilldown]);
  const openBenefitsContext = useCallback(() => onContextDrilldown('benefits'), [onContextDrilldown]);
  const handleEarningsDrilldown = useCallback(
    (filters) => onDrilldown({ ...filters, context: 'earnings' }),
    [onDrilldown],
  );
  const handleVacationDrilldown = useCallback(
    (filters) => onDrilldown({ ...filters, context: 'vacation' }),
    [onDrilldown],
  );
  const handleBenefitsDrilldown = useCallback(
    (filters) => onDrilldown({ ...filters, context: 'benefits' }),
    [onDrilldown],
  );

  return (
    <div className="decision-column">
      {analyticsInsights.length > 0 && (
        <section className="analytics-insights-strip" aria-label="Quick checks">
          <div className="analytics-insights-strip__header">
            <h3>Quick checks</h3>
            {departmentScope ? (
              <span className="analytics-insights-strip__caption">{departmentScope} scope</span>
            ) : null}
          </div>
          {analyticsInsights.map((insight) => (
            <article
              key={insight.key}
              className={`analytics-insight-card${insight.tone ? ` analytics-insight-card--${insight.tone}` : ''}`}
            >
              <span className="analytics-insight-card__eyebrow">{insight.eyebrow}</span>
              <strong>{insight.subject}</strong>
              <span className="analytics-insight-card__metric">{insight.metric}</span>
              <small>{insight.note}</small>
              {insight.actionLabel ? (
                <button
                  type="button"
                  className="analytics-insight-card__action"
                  aria-label={insight.actionLabel}
                  onClick={() => onDrilldown(insight.filters)}
                >
                  {insight.actionText || 'Open'}
                </button>
              ) : null}
            </article>
          ))}
        </section>
      )}
      <div className="card earnings-section">
          <div className="card-header">
            <div>
              <h2>Earnings</h2>
            </div>
          <div className="card-header-actions">
            <span className={`freshness-badge ${earningsFreshness.css}`} title={earningsFreshness.tooltip}>
              {earningsFreshness.label}
            </span>
            <button
              className="panel-link"
              onClick={openEarningsContext}
              disabled={loadingEarnings || Boolean(earningsError) || !earnings}
            >
              {drilldownLabel}
            </button>
          </div>
          </div>
        {loadingEarnings ? (
          <SkeletonChart variant="primary" />
        ) : earningsError ? (
          <div className="panel-state panel-state-error">
            <p>{earningsError}</p>
            <button className="panel-action" onClick={onRetryEarnings} disabled={loadingEarnings}>
              Retry
            </button>
          </div>
        ) : earnings ? (
          <EarningsChart
            data={earnings}
            departmentScope={departmentScope}
            onDrilldown={handleEarningsDrilldown}
          />
        ) : (
          <div className="panel-state panel-state-empty">
            <p>No earnings data available for the current view. Refresh the summaries or narrow the drilldown scope.</p>
            <button className="panel-action" onClick={onRetryEarnings} type="button">
              Refresh Earnings
            </button>
          </div>
        )}
      </div>

      <section className="charts-grid-secondary">
        <div className="card vacation-section">
          <div className="card-header">
            <div>
              <h2>Time Off</h2>
            </div>
            <div className="card-header-actions">
              <span className={`freshness-badge ${vacationFreshness.css}`} title={vacationFreshness.tooltip}>
                {vacationFreshness.label}
              </span>
              <button
                className="panel-link"
                onClick={openVacationContext}
                disabled={loadingVacation || Boolean(vacationError) || !vacation}
              >
                {drilldownLabel}
              </button>
            </div>
          </div>
          {loadingVacation ? (
            <SkeletonChart />
          ) : vacationError ? (
            <div className="panel-state panel-state-error">
              <p>{vacationError}</p>
              <button className="panel-action" onClick={onRetryVacation} disabled={loadingVacation}>
                Retry
              </button>
            </div>
        ) : vacation ? (
          <VacationChart
            data={vacation}
            departmentScope={departmentScope}
            onDrilldown={handleVacationDrilldown}
          />
        ) : (
          <div className="panel-state panel-state-empty">
            <p>No time-off data is available for this period. Try refreshing or switching the reporting year.</p>
            <button className="panel-action" onClick={onRetryVacation} type="button">
              Refresh Time Off
            </button>
          </div>
        )}
        </div>

        <div className="card benefits-section">
          <div className="card-header">
            <div>
              <h2>Benefits</h2>
            </div>
            <div className="card-header-actions">
              <span className={`freshness-badge ${benefitsFreshness.css}`} title={benefitsFreshness.tooltip}>
                {benefitsFreshness.label}
              </span>
              <button
                className="panel-link"
                onClick={openBenefitsContext}
                disabled={loadingBenefits || Boolean(benefitsError) || !benefits}
              >
                {drilldownLabel}
              </button>
            </div>
          </div>
          {loadingBenefits ? (
            <SkeletonChart />
          ) : benefitsError ? (
            <div className="panel-state panel-state-error">
              <p>{benefitsError}</p>
              <button className="panel-action" onClick={onRetryBenefits} disabled={loadingBenefits}>
                Retry
              </button>
            </div>
        ) : benefits ? (
          <BenefitsChart
            data={benefits}
            departmentScope={departmentScope}
            onDrilldown={handleBenefitsDrilldown}
          />
        ) : (
          <div className="panel-state panel-state-empty">
            <p>No benefits data is available for this period. Refresh the snapshot or reopen drilldown with a narrower scope.</p>
            <button className="panel-action" onClick={onRetryBenefits} type="button">
              Refresh Benefits
            </button>
          </div>
        )}
        </div>
      </section>
    </div>
  );
}
