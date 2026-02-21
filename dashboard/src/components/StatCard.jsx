import React from 'react';
import './StatCard.css';

const StatCard = ({ title, value, subtext, icon, trend, loading, error, onRetry }) => {
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

    if (error) {
        return (
            <div className="stat-card stat-card-error">
                <div className="stat-header-row">
                    <h3 className="stat-title">{title}</h3>
                    <div className="stat-icon-wrapper">
                        {icon}
                    </div>
                </div>

                <h4 className="stat-error-title">Unavailable</h4>
                <div className="stat-error-message">{error}</div>
                {onRetry && (
                    <button className="stat-retry-btn" onClick={onRetry}>
                        Retry
                    </button>
                )}
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
                <h3 className="stat-title">{title}</h3>
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
