/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext } from 'react';

export const DashboardDataContext = createContext(null);
export const DashboardOverviewContext = createContext(null);
export const DashboardAnalyticsContext = createContext(null);
export const DashboardAlertsContext = createContext(null);
export const DashboardIntegrationContext = createContext(null);

export function useDashboardContext() {
  const ctx = useContext(DashboardDataContext);
  if (!ctx) {
    throw new Error('useDashboardContext must be used within DashboardDataContext.Provider');
  }
  return ctx;
}

export function useDashboardOverviewSlice() {
  const slice = useContext(DashboardOverviewContext);
  const fallback = useContext(DashboardDataContext);
  if (slice) {
    return slice;
  }
  if (fallback) {
    return fallback;
  }
  throw new Error('useDashboardOverviewSlice must be used within DashboardDataContext.Provider');
}

export function useDashboardAnalyticsSlice() {
  const slice = useContext(DashboardAnalyticsContext);
  const fallback = useContext(DashboardDataContext);
  if (slice) {
    return slice;
  }
  if (fallback) {
    return fallback;
  }
  throw new Error('useDashboardAnalyticsSlice must be used within DashboardDataContext.Provider');
}

export function useDashboardAlertsSlice() {
  const slice = useContext(DashboardAlertsContext);
  const fallback = useContext(DashboardDataContext);
  if (slice) {
    return slice;
  }
  if (fallback) {
    return fallback;
  }
  throw new Error('useDashboardAlertsSlice must be used within DashboardDataContext.Provider');
}

export function useDashboardIntegrationSlice() {
  const slice = useContext(DashboardIntegrationContext);
  const fallback = useContext(DashboardDataContext);
  if (slice) {
    return slice;
  }
  if (fallback) {
    return fallback;
  }
  throw new Error('useDashboardIntegrationSlice must be used within DashboardDataContext.Provider');
}

export default DashboardDataContext;
