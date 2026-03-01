import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import './BenefitsChart.css';

function BenefitsChart({ data, onDrilldown }) {
  // Transform data for comparison chart
  const chartData = Object.entries(data.byPlan).map(([name, values]) => ({
    name,
    shareholder: Math.round(values.shareholder.average),
    nonShareholder: Math.round(values.nonShareholder.average),
  }));

  const formatCurrency = (value) => {
    return `$${value.toLocaleString()}`;
  };
  const formatCount = (value) => Number(value || 0).toLocaleString();

  // Overall averages
  const overallShareholder = Math.round(data.byShareholder.shareholder.average);
  const overallNonShareholder = Math.round(data.byShareholder.nonShareholder.average);

  return (
    <div className="benefits-container">
      <div className="benefits-summary">
        <div className="summary-card shareholder">
          <span className="summary-label">Avg. Shareholder Benefits</span>
          <span className="summary-value text-success">{formatCurrency(overallShareholder)}</span>
          <span className="summary-count">{formatCount(data.byShareholder.shareholder.count)} enrollments</span>
        </div>
        <div className="summary-card non-shareholder">
          <span className="summary-label">Avg. Non-Shareholder Benefits</span>
          <span className="summary-value text-primary">{formatCurrency(overallNonShareholder)}</span>
          <span className="summary-count">{formatCount(data.byShareholder.nonShareholder.count)} enrollments</span>
        </div>
      </div>

      <h4>Average Benefits Paid by Plan</h4>
      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={chartData} layout="vertical">
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f5" horizontal={true} vertical={false} />
          <XAxis
            type="number"
            tickFormatter={formatCurrency}
            tick={{ fontSize: 11, fill: 'var(--color-text-secondary)' }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            type="category"
            dataKey="name"
            width={170}
            tick={{ fontSize: 11, fill: 'var(--color-text-secondary)' }}
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
          <Legend iconType="circle" wrapperStyle={{ fontSize: 11, color: 'var(--color-text-secondary)', paddingTop: 4 }} />
          <Bar
            dataKey="shareholder"
            name="Shareholders"
            fill="#0d9488"
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
            dataKey="nonShareholder"
            name="Non-Shareholders"
            fill="#8b5cf6"
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

export default BenefitsChart;


