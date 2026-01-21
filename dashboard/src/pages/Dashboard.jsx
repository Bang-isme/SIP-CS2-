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
import './Dashboard.css';

function Dashboard({ onLogout }) {
    const [earnings, setEarnings] = useState(null);
    const [vacation, setVacation] = useState(null);
    const [benefits, setBenefits] = useState(null);
    const [alerts, setAlerts] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [drilldown, setDrilldown] = useState(null);
    const currentYear = new Date().getFullYear();

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        try {
            const [earningsRes, vacationRes, benefitsRes, alertsRes] = await Promise.all([
                getEarningsSummary(currentYear),
                getVacationSummary(currentYear),
                getBenefitsSummary(),
                getTriggeredAlerts(),
            ]);

            setEarnings(earningsRes.data);
            setVacation(vacationRes.data);
            setBenefits(benefitsRes.data);
            setAlerts(alertsRes.data);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleLogout = () => {
        logout();
        onLogout();
    };

    const handleDrilldown = (filters) => {
        setDrilldown(filters);
    };

    if (loading) {
        return (
            <div className="loading">
                <div className="spinner"></div>
                <p>Loading dashboard data...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="error-page">
                <h2>Error loading data</h2>
                <p>{error}</p>
                <button onClick={loadData}>Retry</button>
            </div>
        );
    }

    return (
        <div className="dashboard">
            <header className="dashboard-header">
                <div className="header-left">
                    <h1>🏢 HR Payroll Dashboard</h1>
                    <span className="subtitle">Senior Management View • Read-Only</span>
                </div>
                <div className="header-right">
                    <span className="year-badge">Year: {currentYear}</span>
                    <button onClick={loadData} className="refresh-btn">🔄 Refresh</button>
                    <button onClick={handleLogout} className="logout-btn">Logout</button>
                </div>
            </header>

            <div className="dashboard-grid">
                {/* System Indicator */}
                <div className="system-indicator">
                    <div className="system-box hr">
                        <span className="icon">📊</span>
                        <span className="label">HR System</span>
                        <span className="db">MongoDB</span>
                    </div>
                    <div className="system-box payroll">
                        <span className="icon">💰</span>
                        <span className="label">Payroll System</span>
                        <span className="db">MySQL</span>
                    </div>
                </div>

                {/* Row 1: Earnings Summary */}
                <div className="card earnings-card">
                    <h2>💵 Total Earnings by Department</h2>
                    <p className="card-desc">Current Year vs Previous Year</p>
                    {earnings && <EarningsChart data={earnings} onDrilldown={handleDrilldown} />}
                </div>

                {/* Row 2: Vacation & Benefits */}
                <div className="card vacation-card">
                    <h2>🏖️ Vacation Days Summary</h2>
                    <p className="card-desc">By Shareholder Status, Gender & Employment Type</p>
                    {vacation && <VacationChart data={vacation} onDrilldown={handleDrilldown} />}
                </div>

                <div className="card benefits-card">
                    <h2>🏥 Benefits by Plan</h2>
                    <p className="card-desc">Average Paid: Shareholders vs Non-Shareholders</p>
                    {benefits && <BenefitsChart data={benefits} />}
                </div>

                {/* Row 3: Alerts */}
                <div className="card alerts-card">
                    <h2>🔔 Active Alerts</h2>
                    <p className="card-desc">Management Alerts & Notifications</p>
                    {alerts && <AlertsPanel alerts={alerts} />}
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
