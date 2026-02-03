import { useState, useEffect, useMemo } from 'react';
import {
 getEarningsSummary,
 getVacationSummary,
 getBenefitsSummary,
 getTriggeredAlerts,
 logout,
} from '../services/api';
import EarningsChart from '../components/EarningsChart';
import VacationChart from '../components/VacationChart';
import BenefitsChart from '../components/BenefitsChart';
import AlertsPanel from '../components/AlertsPanel';
import DrilldownModal from '../components/DrilldownModal';
import { SkeletonChart, SkeletonList } from '../components/Skeletons';
import StatCard from '../components/StatCard';
import IntegrationEventsPanel from '../components/IntegrationEventsPanel';
import { FiBell, FiCalendar, FiDollarSign, FiHeart } from 'react-icons/fi';
import './Dashboard.css';

function Dashboard({ onLogout }) {
 // Granular loading states
 const [earnings, setEarnings] = useState(null);
 const [loadingEarnings, setLoadingEarnings] = useState(true);
 const [earningsMeta, setEarningsMeta] = useState(null);

 const [vacation, setVacation] = useState(null);
 const [loadingVacation, setLoadingVacation] = useState(true);
 const [vacationMeta, setVacationMeta] = useState(null);

 const [benefits, setBenefits] = useState(null);
 const [loadingBenefits, setLoadingBenefits] = useState(true);
 const [benefitsMeta, setBenefitsMeta] = useState(null);

 const [alerts, setAlerts] = useState(null);
 const [loadingAlerts, setLoadingAlerts] = useState(true);

 const [drilldown, setDrilldown] = useState(null);
 const currentYear = new Date().getFullYear();

 useEffect(() => {
 loadAllData();
 }, []);

 const loadAllData = () => {
 setLoadingEarnings(true);
 setLoadingVacation(true);
 setLoadingBenefits(true);
 setLoadingAlerts(true);

 fetchEarnings();
 fetchVacation();
 fetchBenefits();
 fetchAlerts();
 };

 const fetchEarnings = async () => {
 try {
  const res = await getEarningsSummary(currentYear);
  setEarnings(res.data);
  setEarningsMeta(res.meta || null);
 } catch (err) {
  console.error("Earnings failed", err);
 } finally {
  setLoadingEarnings(false);
 }
 };

 const fetchVacation = async () => {
 try {
  const res = await getVacationSummary(currentYear);
  setVacation(res.data);
  setVacationMeta(res.meta || null);
 } catch (err) {
  console.error("Vacation failed", err);
 } finally {
  setLoadingVacation(false);
 }
 };

 const fetchBenefits = async () => {
 try {
  const res = await getBenefitsSummary();
  setBenefits(res.data);
  setBenefitsMeta(res.meta || null);
 } catch (err) {
  console.error("Benefits failed", err);
 } finally {
  setLoadingBenefits(false);
 }
 };

 const fetchAlerts = async () => {
 try {
  const res = await getTriggeredAlerts();
  setAlerts(res.data);
 } catch (err) {
  console.error("Alerts failed", err);
 } finally {
  setLoadingAlerts(false);
 }
 };

 // --- Client-Side Aggregations for KPI Cards ---
 const stats = useMemo(() => {
 // 1. Earnings
 const totalEarnings = earnings
  ? Object.values(earnings.byDepartment).reduce((acc, curr) => acc + curr.current, 0)
  : 0;
 const prevEarnings = earnings
  ? Object.values(earnings.byDepartment).reduce((acc, curr) => acc + curr.previous, 0)
  : 0;
 const earningsTrend = prevEarnings ? ((totalEarnings - prevEarnings) / prevEarnings) * 100 : 0;

 // 2. Vacation
 const totalVacation = vacation?.totals?.current || 0;
 const prevVacation = vacation?.totals?.previous || 0;
 const vacationTrend = prevVacation ? ((totalVacation - prevVacation) / prevVacation) * 100 : 0;

 // 3. Benefits (Avg per employee)
 const empCount = benefits
  ? (benefits.byShareholder.shareholder.count + benefits.byShareholder.nonShareholder.count)
  : 1;
 const totalBenefits = benefits
  ? (benefits.byShareholder.shareholder.totalPaid + benefits.byShareholder.nonShareholder.totalPaid)
  : 0;
 const avgBenefits = empCount ? totalBenefits / empCount : 0;
 // Benefits context logic: Hide subtext if we can't calculate meaningful delta or reference
 const benefitsSubtext = "Per Employee / Year";
 const benefitsTrend = "neutral";

 // 4. Alerts - Separate category count from total affected
 const alertCategories = alerts ? alerts.filter(a => a.count > 0).length : 0;
 const totalAffected = alerts ? alerts.reduce((acc, curr) => acc + curr.count, 0) : 0;

 return {
  earnings: { val: totalEarnings, trend: earningsTrend },
  vacation: { val: totalVacation, trend: vacationTrend },
  benefits: { val: avgBenefits, subtext: benefitsSubtext, trend: benefitsTrend },
  alerts: { categories: alertCategories, affected: totalAffected }
 };
 }, [earnings, vacation, benefits, alerts]);


 const handleLogout = () => {
 logout();
 onLogout();
 };

 const handleDrilldown = (filters) => {
 setDrilldown(filters);
 };

 const formatMoney = (n) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n);
 const formatNum = (n) => new Intl.NumberFormat('en-US').format(n);
 const formatUpdatedAt = (value) => {
  if (!value) return 'Unknown';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Unknown';
  return date.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
 };

 const lastUpdatedAt = useMemo(() => {
  const candidates = [earningsMeta?.updatedAt, vacationMeta?.updatedAt, benefitsMeta?.updatedAt]
   .filter(Boolean)
   .map((v) => new Date(v))
   .filter((d) => !Number.isNaN(d.getTime()));
  if (candidates.length === 0) return null;
  return new Date(Math.max(...candidates.map((d) => d.getTime()))).toISOString();
 }, [earningsMeta, vacationMeta, benefitsMeta]);

 return (
 <div className="dashboard-container">
  <header className="dashboard-header">
  <div className="header-left">
   <h1>
   <span>HQ</span> HR & Payroll Analytics
   </h1>
   <span className="subtitle">Executive Overview - FY {currentYear}</span>
   <span className="subtitle subtitle-meta">
    Data updated: {formatUpdatedAt(lastUpdatedAt)}
   </span>
  </div>
  <div className="header-right">
   <div className="system-status">
   <span className="dot online"></span> Systems Active
   </div>
   <button onClick={loadAllData} className="refresh-btn">
    Refresh
   </button>
   <button onClick={handleLogout} className="logout-btn">
   Sign Out
   </button>
  </div>
  </header>

  <div className="dashboard-content">
  {/* KPI Section */}
  <section className="kpi-grid">
   <StatCard
    title="Total Payroll YTD"
    value={formatMoney(stats.earnings.val)}
    icon={<FiDollarSign size={16} />}
    subtext={`${stats.earnings.trend > 0 ? '+' : ''}${stats.earnings.trend.toFixed(1)}% vs Last Year`}
    trend={stats.earnings.trend >= 0 ? 'up' : 'down'}
    loading={loadingEarnings}
   />
   <StatCard
    title="Total Vacation Days"
    value={`${formatNum(stats.vacation.val)} Days`}
    icon={<FiCalendar size={16} />}
    subtext={`${stats.vacation.trend > 0 ? '+' : ''}${stats.vacation.trend.toFixed(1)}% vs Last Year`}
    trend={stats.vacation.trend <= 0 ? 'up' : 'neutral'} // Less vacation usage isn't necessarily bad for company cost, but let's keep neutral
    loading={loadingVacation}
   />
   <StatCard
    title="Avg Benefits Cost"
    value={formatMoney(stats.benefits.val)}
    icon={<FiHeart size={16} />}
    subtext={stats.benefits.subtext}
    trend={stats.benefits.trend}
    loading={loadingBenefits}
   />
   <StatCard
    title="Action Items"
    value={`${stats.alerts.categories} Alerts`}
    icon={<FiBell size={16} />}
    subtext={`${formatNum(stats.alerts.affected)} employees affected`}
    trend={stats.alerts.categories > 0 ? 'down' : 'up'}
    loading={loadingAlerts}
   />
  </section>

  {/* Main Charts Architecture */}
  <section className="charts-grid-primary">
   {/* Row 1: Earnings (Main Focus) & Vacation */}
   <div className="card earnings-section">
   <div className="card-header">
    <h2>Earnings Overview</h2>
    <span className="card-subtitle">Distribution by Department</span>
   </div>
   {loadingEarnings ? <SkeletonChart /> : (earnings && <EarningsChart data={earnings} onDrilldown={(f) => handleDrilldown({ ...f, context: 'earnings' })} />)}
   </div>

   <div className="card vacation-section">
   <div className="card-header">
    <h2>Vacation Analysis</h2>
    <span className="card-subtitle">Usage Trends</span>
   </div>
   {loadingVacation ? <SkeletonChart /> : (vacation && <VacationChart data={vacation} onDrilldown={(f) => handleDrilldown({ ...f, context: 'vacation' })} />)}
   </div>
  </section>

  <section className="charts-grid-secondary">
   {/* Row 2: Benefits */}
   <div className="card benefits-section">
   <div className="card-header">
    <h2>Benefits Plan Distribution</h2>
    <span className="card-subtitle">Analyze cost efficiency</span>
   </div>
   {loadingBenefits ? <SkeletonChart /> : (benefits && <BenefitsChart data={benefits} onDrilldown={(f) => handleDrilldown({ ...f, context: 'benefits' })} />)}
   </div>

   {/* Alerts Panel */}
   <div className="card alerts-section">
    <div className="card-header">
     <h2>Action Items & Alerts</h2>
     <span className="badge-count">{stats.alerts.categories}</span>
    </div>
    {loadingAlerts ? <SkeletonList /> : (alerts && <AlertsPanel alerts={alerts} />)}
   </div>
  </section>

  <section className="charts-grid-tertiary">
   <div className="card integration-section">
    <div className="card-header">
     <h2>Integration Queue</h2>
     <span className="badge-count">Outbox</span>
    </div>
    <IntegrationEventsPanel />
   </div>
  </section>
  </div>

  {/* Drilldown Modal */}
  {drilldown && (
  <DrilldownModal
   filters={drilldown}
   onClose={() => setDrilldown(null)}
  />
  )}
 </div>
 );
}

export default Dashboard;
