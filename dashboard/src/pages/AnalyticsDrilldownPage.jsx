import { Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import DrilldownModal from '../components/DrilldownModal';
import {
  clearDrilldownSearch,
  parseDrilldownFilters,
  toSearchString,
} from '../utils/drilldownRoute';

export default function AnalyticsDrilldownPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const filters = parseDrilldownFilters(searchParams);
  const baseSearch = toSearchString(clearDrilldownSearch(searchParams));

  if (!filters) {
    return <Navigate to={{ pathname: '/dashboard/analytics', search: baseSearch }} replace />;
  }

  return (
    <div className="dashboard-page-stack dashboard-page-stack--drilldown">
      <DrilldownModal
        variant="page"
        filters={filters}
        onClose={() => navigate({ pathname: '/dashboard/analytics', search: baseSearch })}
      />
    </div>
  );
}
