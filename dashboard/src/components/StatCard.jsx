import React from 'react';
import './StatCard.css';

const StatCard = ({ title, value, subtext, icon, trend, loading, error, onRetry }) => {
    const resolveTone = (label = '') => {
        const normalized = label.toLowerCase();
        if (normalized.includes('payroll')) return 'earnings';
        if (normalized.includes('vacation')) return 'vacation';
        if (normalized.includes('benefits')) return 'benefits';
        if (normalized.includes('action')) return 'alerts';
        return 'neutral';
    };

    const tone = resolveTone(title);

    if (loading) {
        return (
            <div className={`stat-card stat-card--${tone} skeleton-stat`}>
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
            <div className={`stat-card stat-card--${tone} stat-card-error`}>
                <div className="stat-header-row">
                    <div className="stat-headline">
                        <h3 className="stat-title">{title}</h3>
                        <span className="stat-signal">Needs retry</span>
                    </div>
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
    const trendClass = isPositive ? 'text-success' : (isNegative ? 'text-danger' : 'text-muted');
    const trendSignal = isPositive ? 'Rising' : (isNegative ? 'Watch' : 'Stable');

    return (
        <div className={`stat-card stat-card--${tone}`}>
            <div className="stat-header-row">
                <div className="stat-headline">
                    <h3 className="stat-title">{title}</h3>
                    <span className={`stat-signal ${trendClass}`}>{trendSignal}</span>
                </div>
                <div className="stat-icon-wrapper">
                    {icon}
                </div>
            </div>

            <div className="stat-value-wrap">
                <div className="stat-value">
                    {value}
                </div>
            </div>

            {subtext && (
                <div className={`stat-subtext ${trendClass}`}>
                    {subtext}
                </div>
            )}
        </div>
    );
};

export default StatCard;
