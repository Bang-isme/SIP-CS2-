import React from 'react';
import './Skeleton.css';

export const SkeletonCard = () => (
    <div className="skeleton-card">
        <div className="skeleton-header"></div>
        <div className="skeleton-content"></div>
    </div>
);

export const SkeletonChart = ({ variant = 'default' }) => (
    <div className={`skeleton-chart-shell skeleton-chart-shell--${variant}`}>
        <div className="skeleton-chart-shell__summary">
            <div className="skeleton-chart-shell__stat"></div>
            <div className="skeleton-chart-shell__stat"></div>
        </div>
        <div className="skeleton-chart-container">
            <div className="skeleton-bar" style={{ height: '60%' }}></div>
            <div className="skeleton-bar" style={{ height: '80%' }}></div>
            <div className="skeleton-bar" style={{ height: '40%' }}></div>
            <div className="skeleton-bar" style={{ height: '90%' }}></div>
            <div className="skeleton-bar" style={{ height: '50%' }}></div>
        </div>
        <div className="skeleton-chart-shell__footer">
            <div className="skeleton-chart-shell__line"></div>
            <div className="skeleton-chart-shell__line skeleton-chart-shell__line--short"></div>
        </div>
    </div>
);

export const SkeletonList = () => (
    <div className="skeleton-list">
        <div className="skeleton-row"></div>
        <div className="skeleton-row"></div>
        <div className="skeleton-row"></div>
    </div>
);
