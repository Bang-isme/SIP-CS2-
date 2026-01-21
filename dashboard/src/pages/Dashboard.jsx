import { useState, useEffect } from 'react';
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
import './Dashboard.css';

function Dashboard({ onLogout }) {
    // Granular loading states
    const [earnings, setEarnings] = useState(null);
    const [loadingEarnings, setLoadingEarnings] = useState(true);

    const [vacation, setVacation] = useState(null);
    const [loadingVacation, setLoadingVacation] = useState(true);

    const [benefits, setBenefits] = useState(null);
    const [loadingBenefits, setLoadingBenefits] = useState(true);

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

        // Progressive Loading: Fetch each independently
        fetchEarnings();
        fetchVacation();
        fetchBenefits();
        fetchAlerts();
    };

    const fetchEarnings = async () => {
        try {
            const res = await getEarningsSummary(currentYear);
            setEarnings(res.data);
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
            // Alerts error handled quietly or global toast
            console.error("Alerts failed", err);
        } finally {
            setLoadingAlerts(false);
        }
    };

    const handleLogout = () => {
        logout();
        onLogout();
    };

    const handleDrilldown = (filters) => {
        setDrilldown(filters);
    };

    return (
        <div className="dashboard">
            <header className="dashboard-header">
                <div className="header-left">
                    <h1>
                        <span>🏢</span> HR & Payroll Analytics
                    </h1>
                    <span className="subtitle">Executive Overview • {currentYear}</span>
                </div>
                <div className="header-right">
                    <span className="year-badge">FY {currentYear}</span>
                    <button onClick={loadAllData} className="refresh-btn">
                        🔄 Refresh
                    </button>
                    <button onClick={handleLogout} className="logout-btn">
                        Sign Out
                    </button>
                </div>
            </header>

            <div className="dashboard-grid">
                {/* System Indicator */}
                <div className="system-indicator">
                    <div className="system-box hr">
                        <span className="icon">👥</span>
                        <div className="content">
                            <span className="label">HR System</span>
                            <span className="db">MongoDB Atlas</span>
                        </div>
                    </div>
                    <div className="system-box payroll">
                        <span className="icon">💳</span>
                        <div className="content">
                            <span className="label">Payroll System</span>
                            <span className="db">MySQL Database</span>
                        </div>
                    </div>
                </div>

                {/* Row 1: Earnings Summary */}
                <div className="card earnings-card">
                    <h2>Earnings Overview</h2>
                    <p className="card-desc">Total compensation distribution by department & year</p>
                    {loadingEarnings ? <SkeletonChart /> : (earnings && <EarningsChart data={earnings} onDrilldown={handleDrilldown} />)}
                </div>

                {/* Row 2: Vacation & Benefits */}
                <div className="card vacation-card">
                    <h2>Vacation Analysis</h2>
                    <p className="card-desc">Leave utilization trends</p>
                    {loadingVacation ? <SkeletonChart /> : (vacation && <VacationChart data={vacation} onDrilldown={handleDrilldown} />)}
                </div>

                <div className="card benefits-card">
                    <h2>Benefits Plan Distribution</h2>
                    <p className="card-desc">Average cost per employee group</p>
                    {loadingBenefits ? <SkeletonChart /> : (benefits && <BenefitsChart data={benefits} />)}
                </div>

                {/* Row 3: Alerts/Actions at bottom */}
                <div className="card alerts-card">
                    <h2>Action Items & Alerts</h2>
                    <p className="card-desc">Priority notifications requiring attention</p>
                    {loadingAlerts ? <SkeletonList /> : (alerts && <AlertsPanel alerts={alerts} />)}
                </div>
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
