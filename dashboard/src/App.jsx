import { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import PublicRoute from './components/PublicRoute';
import './App.css';

const Login = lazy(() => import('./pages/Login'));
const Register = lazy(() => import('./pages/Register'));
const DashboardLayout = lazy(() => import('./layouts/DashboardLayout'));
const OverviewPage = lazy(() => import('./pages/OverviewPage'));
const AnalyticsPage = lazy(() => import('./pages/AnalyticsPage'));
const AnalyticsDrilldownPage = lazy(() => import('./pages/AnalyticsDrilldownPage'));
const AlertsPage = lazy(() => import('./pages/AlertsPage'));
const IntegrationPage = lazy(() => import('./pages/IntegrationPage'));
const AdminEmployeesPage = lazy(() => import('./pages/AdminEmployeesPage'));
const AdminUsersPage = lazy(() => import('./pages/AdminUsersPage'));

function RouteFallback({ label = 'Loading page' }) {
  return (
    <div className="app-route-fallback" role="status" aria-live="polite">
      <div className="app-route-fallback__bar app-route-fallback__bar--title" />
      <div className="app-route-fallback__bar app-route-fallback__bar--meta" />
      <div className="app-route-fallback__grid">
        <div className="app-route-fallback__card app-route-fallback__card--tall" />
        <div className="app-route-fallback__card" />
      </div>
      <span className="sr-only">{label}</span>
    </div>
  );
}

function AuthRouteFallback({ label = 'Loading page' }) {
  return (
    <div className="app-loading-shell" role="status" aria-live="polite">
      <div className="app-loading-card">
        <span className="app-loading-spinner"></span>
        <span>{label}</span>
      </div>
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route
            path="/login"
            element={
              <PublicRoute>
                <Suspense fallback={<AuthRouteFallback label="Loading sign in" />}>
                  <Login />
                </Suspense>
              </PublicRoute>
            }
          />
          <Route
            path="/register"
            element={
              <PublicRoute>
                <Suspense fallback={<AuthRouteFallback label="Loading registration" />}>
                  <Register />
                </Suspense>
              </PublicRoute>
            }
          />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Suspense fallback={<RouteFallback label="Loading dashboard shell" />}>
                  <DashboardLayout />
                </Suspense>
              </ProtectedRoute>
            }
          >
            <Route
              index
              element={(
                <Suspense fallback={<RouteFallback label="Loading executive overview" />}>
                  <OverviewPage />
                </Suspense>
              )}
            />
            <Route
              path="analytics"
              element={(
                <Suspense fallback={<RouteFallback label="Loading analytics page" />}>
                  <AnalyticsPage />
                </Suspense>
              )}
            />
            <Route
              path="analytics/drilldown"
              element={(
                <Suspense fallback={<RouteFallback label="Loading analytics drilldown page" />}>
                  <AnalyticsDrilldownPage />
                </Suspense>
              )}
            />
            <Route
              path="alerts"
              element={(
                <Suspense fallback={<RouteFallback label="Loading alert review page" />}>
                  <AlertsPage />
                </Suspense>
              )}
            />
            <Route
              path="integration"
              element={(
                <Suspense fallback={<RouteFallback label="Loading integration queue page" />}>
                  <IntegrationPage />
                </Suspense>
              )}
            />
            <Route
              path="admin/employees"
              element={(
                <Suspense fallback={<RouteFallback label="Loading employee administration page" />}>
                  <AdminEmployeesPage />
                </Suspense>
              )}
            />
            <Route
              path="admin/users"
              element={(
                <Suspense fallback={<RouteFallback label="Loading user administration page" />}>
                  <AdminUsersPage />
                </Suspense>
              )}
            />
          </Route>
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
