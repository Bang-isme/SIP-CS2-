import React from 'react';
import './StatCard.css';

const StatCard = ({ title, value, subtext, icon, trend, loading }) => {
    if (loading) {
        return (
            <div className="stat-card skeleton-stat">
                <div className="skeleton-icon"></div>
                <div className="skeleton-content">
                    <div className="skeleton-line sm"></div>
                    <div className="skeleton-line lg"></div>
                </div>
            </div>
        );
    }

    const isPositive = trend === 'up';
    const isNegative = trend === 'down';
    const trendClass = isPositive ? 'text-success' : (isNegative ? 'text-danger' : 'text-muted');

    return (
        <div className="stat-card">
            <div className="stat-icon-wrapper">
                <span className="stat-icon">{icon}</span>
            </div>
            <div className="stat-content">
                <h3 className="stat-title">{title}</h3>
                <div className="stat-value">{value}</div>
                {subtext && <div className={`stat-subtext ${trendClass}`}>{subtext}</div>}
            </div>
        </div>
    );
};

export default StatCard;
