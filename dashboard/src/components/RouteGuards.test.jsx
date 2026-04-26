import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import AuthContext from '../contexts/AuthContext';
import ProtectedRoute from './ProtectedRoute';
import PublicRoute from './PublicRoute';

const renderWithAuth = (ui, authValue) => {
  return render(
    <AuthContext.Provider value={authValue}>
      <MemoryRouter initialEntries={['/target']}>
        <Routes>
          <Route path="/login" element={<div>Login screen</div>} />
          <Route path="/dashboard" element={<div>Dashboard shell</div>} />
          <Route path="/target" element={ui} />
        </Routes>
      </MemoryRouter>
    </AuthContext.Provider>,
  );
};

describe('route guards', () => {
  it('keeps protected routes in a loading state during session bootstrap', () => {
    renderWithAuth(
      <ProtectedRoute>
        <div>Secure page</div>
      </ProtectedRoute>,
      {
        authenticated: false,
        profileLoading: true,
      },
    );

    expect(screen.getByText(/Loading secure session/i)).toBeInTheDocument();
  });

  it('redirects protected routes only after bootstrap finishes', () => {
    renderWithAuth(
      <ProtectedRoute>
        <div>Secure page</div>
      </ProtectedRoute>,
      {
        authenticated: false,
        profileLoading: false,
      },
    );

    expect(screen.getByText(/Login screen/i)).toBeInTheDocument();
  });

  it('keeps public routes in a loading state during session bootstrap', () => {
    renderWithAuth(
      <PublicRoute>
        <div>Public page</div>
      </PublicRoute>,
      {
        authenticated: false,
        profileLoading: true,
      },
    );

    expect(screen.getByText(/Checking session/i)).toBeInTheDocument();
  });

  it('redirects signed-in users away from public routes after bootstrap', () => {
    renderWithAuth(
      <PublicRoute>
        <div>Public page</div>
      </PublicRoute>,
      {
        authenticated: true,
        profileLoading: false,
      },
    );

    expect(screen.getByText(/Dashboard shell/i)).toBeInTheDocument();
  });
});
