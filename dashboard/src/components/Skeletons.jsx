import React from 'react';
import './Skeleton.css';

export const SkeletonCard = () => (
    <div className="skeleton-card">
        <div className="skeleton-header"></div>
        <div className="skeleton-content"></div>
    </div>
);

export const SkeletonChart = () => (
    <div className="skeleton-chart-container">
        <div className="skeleton-bar" style={{ height: '60%' }}></div>
        <div className="skeleton-bar" style={{ height: '80%' }}></div>
        <div className="skeleton-bar" style={{ height: '40%' }}></div>
        <div className="skeleton-bar" style={{ height: '90%' }}></div>
        <div className="skeleton-bar" style={{ height: '50%' }}></div>
    </div>
);

export const SkeletonList = () => (
    <div className="skeleton-list">
        <div className="skeleton-row"></div>
        <div className="skeleton-row"></div>
        <div className="skeleton-row"></div>
    </div>
);
