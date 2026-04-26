import {
  FiBell,
  FiCalendar,
  FiDollarSign,
  FiHeart,
} from 'react-icons/fi';
import StatCard from './StatCard';
import { formatCurrency, formatCurrencyCompact } from '../utils/formatters';

const formatMoney = formatCurrency;
const formatNum = (value) => new Intl.NumberFormat('en-US', {
  notation: 'compact',
  maximumFractionDigits: 1,
}).format(value || 0);

export default function KPIGrid({
  stats,
  loadingEarnings,
  loadingVacation,
  loadingBenefits,
  loadingAlerts,
  earningsError,
  vacationError,
  benefitsError,
  alertsError,
  onRetryEarnings,
  onRetryVacation,
  onRetryBenefits,
  onRetryAlerts,
}) {
  return (
    <section className="kpi-grid">
      <StatCard
        title="Total Payroll"
        value={formatCurrencyCompact(stats.earnings.value)}
        icon={<FiDollarSign size={16} />}
        subtext={`${stats.earnings.trend > 0 ? '+' : ''}${stats.earnings.trend.toFixed(1)}% vs LY`}
        trend={stats.earnings.trend >= 0 ? 'up' : 'down'}
        loading={loadingEarnings}
        error={earningsError}
        onRetry={onRetryEarnings}
      />
      <StatCard
        title="Vacation Days"
        value={`${formatNum(stats.vacation.value)} days`}
        icon={<FiCalendar size={16} />}
        subtext={`${stats.vacation.trend > 0 ? '+' : ''}${stats.vacation.trend.toFixed(1)}% vs LY`}
        trend={stats.vacation.trend <= 0 ? 'up' : 'neutral'}
        loading={loadingVacation}
        error={vacationError}
        onRetry={onRetryVacation}
      />
      <StatCard
        title="Benefits Avg"
        value={formatMoney(stats.benefits.value)}
        icon={<FiHeart size={16} />}
        subtext={stats.benefits.subtext === 'Per Employee / Year' ? 'Per employee' : stats.benefits.subtext}
        trend={stats.benefits.trend}
        loading={loadingBenefits}
        error={benefitsError}
        onRetry={onRetryBenefits}
      />
      <StatCard
        title="Alerts"
        value={formatNum(stats.alerts.categories)}
        icon={<FiBell size={16} />}
        subtext={`${formatNum(stats.alerts.affected)} affected`}
        trend={stats.alerts.categories > 0 ? 'down' : 'up'}
        loading={loadingAlerts}
        error={alertsError}
        onRetry={onRetryAlerts}
      />
    </section>
  );
}
