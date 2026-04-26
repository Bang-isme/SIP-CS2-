import './AnalyticsFilterBar.css';

const buildYearOptions = (selectedYear) => {
  const calendarYear = new Date().getFullYear();
  const startYear = Math.max(calendarYear - 4, selectedYear - 2);
  const years = new Set();

  for (let year = calendarYear; year >= startYear; year -= 1) {
    years.add(year);
  }
  years.add(selectedYear);

  return [...years].sort((left, right) => right - left);
};

export default function AnalyticsFilterBar({
  currentYear,
  onYearChange,
  departments = [],
  departmentScope = '',
  onDepartmentScopeChange,
  onClearScope,
}) {
  const yearOptions = buildYearOptions(currentYear);
  const hasScope = Boolean(departmentScope);

  return (
    <section className="analytics-filter-bar" aria-label="Analytics filters">
      <div className="analytics-filter-bar__row">
        <div className="analytics-filter-bar__group">
          <label className="analytics-filter-bar__field">
            <span className="analytics-filter-bar__label">Year</span>
            <span className="analytics-filter-bar__select-shell">
              <select
                aria-label="Reporting year"
                value={currentYear}
                onChange={(event) => onYearChange?.(Number(event.target.value))}
              >
                {yearOptions.map((year) => (
                  <option key={year} value={year}>
                    FY {year}
                  </option>
                ))}
              </select>
            </span>
          </label>

          <label className="analytics-filter-bar__field analytics-filter-bar__field--wide">
            <span className="analytics-filter-bar__label">Scope</span>
            <span className="analytics-filter-bar__select-shell">
              <select
                aria-label="Analytics scope"
                value={departmentScope}
                onChange={(event) => onDepartmentScopeChange?.(event.target.value)}
              >
                <option value="">All departments</option>
                {departments.map((department) => (
                  <option key={department} value={department}>
                    {department}
                  </option>
                ))}
              </select>
            </span>
          </label>
        </div>

        {hasScope && (
          <div className="analytics-filter-bar__meta">
            <div className="analytics-filter-bar__scope-strip is-active" role="status" aria-live="polite">
              <div className="analytics-filter-bar__scope-copy">
                <span className="analytics-filter-bar__scope-title">{departmentScope} scope</span>
              </div>
            </div>
            <div className="analytics-filter-bar__actions">
              <button type="button" className="analytics-filter-bar__secondary" onClick={onClearScope}>
                Clear scope
              </button>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
