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
    /* Logic: Explicitly handle neutral/no trend */
    const trendClass = isPositive ? 'text-success' : (isNegative ? 'text-danger' : 'text-muted');

    return (
        <div className="stat-card">
            {/* 1. Header Row: Title & Icon */}
            <div className="stat-header-row">
                <span className="stat-title">{title}</span>
                <div className="stat-icon-wrapper">
                    {icon}
                </div>
            </div>

            {/* 2. Primary Value */}
            <div className="stat-value">
                {value}
            </div>

            {/* 3. Footer Context (Trend) */}
            {subtext && (
                <div className={`stat-subtext ${trendClass}`}>
                    {subtext}
                </div>
            )}
        </div>
    );
};

export default StatCard;
