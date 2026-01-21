import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

function BenefitsChart({ data }) {
  // Transform data for comparison chart
  const chartData = Object.entries(data.byPlan).map(([name, values]) => ({
    name: name.length > 15 ? name.substring(0, 15) + '...' : name,
    fullName: name,
    shareholder: Math.round(values.shareholder.average),
    nonShareholder: Math.round(values.nonShareholder.average),
  }));

  const formatCurrency = (value) => {
    return `$${value.toLocaleString()}`;
  };

  // Overall averages
  const overallShareholder = Math.round(data.byShareholder.shareholder.average);
  const overallNonShareholder = Math.round(data.byShareholder.nonShareholder.average);

  return (
    <div className="benefits-container">
      <div className="benefits-summary">
        <div className="summary-card shareholder">
          <span className="summary-label">Avg. Shareholder Benefits</span>
          <span className="summary-value text-success">{formatCurrency(overallShareholder)}</span>
          <span className="summary-count">{data.byShareholder.shareholder.count} enrollments</span>
        </div>
        <div className="summary-card non-shareholder">
          <span className="summary-label">Avg. Non-Shareholder Benefits</span>
          <span className="summary-value text-primary">{formatCurrency(overallNonShareholder)}</span>
          <span className="summary-count">{data.byShareholder.nonShareholder.count} enrollments</span>
        </div>
      </div>

      <h4>Average Benefits Paid by Plan</h4>
      <ResponsiveContainer width="100%" height={240}>
        <BarChart data={chartData} layout="vertical">
          <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" horizontal={true} vertical={false} />
          <XAxis
            type="number"
            tickFormatter={formatCurrency}
            tick={{ fontSize: 11, fill: 'var(--color-text-tertiary)' }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            type="category"
            dataKey="name"
            width={120}
            tick={{ fontSize: 11, fill: 'var(--color-text-secondary)' }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip
            cursor={{ fill: 'var(--color-bg-subtle)' }}
            contentStyle={{
              borderRadius: '8px',
              border: 'none',
              boxShadow: 'var(--shadow-lg)'
            }}
            formatter={(value) => formatCurrency(value)}
            labelFormatter={(label) => chartData.find(d => d.name === label)?.fullName || label}
          />
          <Legend iconType="circle" />
          <Bar dataKey="shareholder" name="Shareholders" fill="var(--color-success)" radius={[0, 4, 4, 0]} barSize={20} />
          <Bar dataKey="nonShareholder" name="Non-Shareholders" fill="var(--color-primary-500)" radius={[0, 4, 4, 0]} barSize={20} />
        </BarChart>
      </ResponsiveContainer>

      <style>{`
        .benefits-container { margin-top: 0; display: flex; flex-direction: column; gap: var(--space-4); }
        .benefits-summary {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: var(--space-4);
        }
        .summary-card {
          padding: var(--space-4);
          border-radius: var(--radius-md);
          text-align: center;
          background: var(--color-bg-subtle);
          border: 1px solid transparent;
          transition: all 0.2s;
        }
        .summary-card:hover {
            border-color: var(--color-border);
            background: var(--color-bg-body);
            box-shadow: var(--shadow-sm);
        }
        
        .summary-label {
          display: block;
          font-size: var(--font-size-xs);
          color: var(--color-text-secondary);
          margin-bottom: var(--space-1);
          text-transform: uppercase;
          font-weight: 600;
        }
        .summary-value {
          display: block;
          font-size: var(--font-size-xl);
          font-weight: 700;
        }
        .text-success { color: var(--color-success); }
        .text-primary { color: var(--color-primary-600); }
        
        .summary-count {
          display: block;
          font-size: var(--font-size-xs);
          color: var(--color-text-tertiary);
          margin-top: var(--space-1);
        }
        .benefits-container h4 {
          font-size: var(--font-size-xs);
          color: var(--color-text-secondary);
          margin: 0;
          text-transform: uppercase;
          font-weight: 600;
        }
      `}</style>
    </div>
  );
}

export default BenefitsChart;
