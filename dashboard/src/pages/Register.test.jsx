import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { vi } from 'vitest';
import Register from './Register';
import { register as registerApi } from '../services/api';

vi.mock('../services/api', () => ({
  register: vi.fn(),
}));

function LoginDestination() {
  const location = useLocation();
  return (
    <div>
      <span>Login destination</span>
      <span data-testid="login-notice">{location.state?.notice || 'none'}</span>
    </div>
  );
}

function renderRegister() {
  render(
    <MemoryRouter initialEntries={['/register']}>
      <Routes>
        <Route path="/register" element={<Register />} />
        <Route path="/login" element={<LoginDestination />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('Register page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useRealTimers();
    vi.unstubAllEnvs();
  });

  it('shows an access-provisioned state when self-signup is disabled', () => {
    vi.stubEnv('VITE_ENABLE_SELF_SIGNUP', '0');
    renderRegister();

    expect(screen.getByText(/Access is provisioned by an administrator/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Back to sign in/i })).toHaveAttribute('href', '/login');
    expect(screen.queryByRole('button', { name: /Create Account/i })).not.toBeInTheDocument();
  });

  it('submits signup payload with user role and redirects to login when self-signup is enabled', async () => {
    vi.stubEnv('VITE_ENABLE_SELF_SIGNUP', '1');
    const user = userEvent.setup();
    const setTimeoutSpy = vi.spyOn(window, 'setTimeout');
    registerApi.mockResolvedValue({ success: true });
    renderRegister();

    fireEvent.change(screen.getByLabelText(/Username/i), { target: { value: 'newuser' } });
    fireEvent.change(screen.getByLabelText(/Email Address/i), { target: { value: 'newuser@example.com' } });
    fireEvent.change(screen.getByLabelText(/Password/i), { target: { value: 'secret123' } });
    await user.click(screen.getByRole('button', { name: /Create Account/i }));

    await waitFor(() => {
      expect(registerApi).toHaveBeenCalledWith(
        'newuser',
        'newuser@example.com',
        'secret123',
        ['user'],
      );
    });

    expect(screen.getByText(/Registration successful!/i)).toBeInTheDocument();

    const redirectTimerCall = setTimeoutSpy.mock.calls.find(([, delay]) => delay === 2000);
    expect(redirectTimerCall).toBeDefined();

    await act(async () => {
      redirectTimerCall[0]();
    });

    expect(screen.getByText(/Login destination/i)).toBeInTheDocument();
    expect(screen.getByTestId('login-notice')).toHaveTextContent('Registration successful! Please sign in.');
    setTimeoutSpy.mockRestore();
  });

  it('shows inline error when registration fails', async () => {
    vi.stubEnv('VITE_ENABLE_SELF_SIGNUP', '1');
    const user = userEvent.setup();
    registerApi.mockRejectedValue({
      response: { data: { message: 'Email already exists' } },
    });
    renderRegister();

    fireEvent.change(screen.getByLabelText(/Username/i), { target: { value: 'newuser' } });
    fireEvent.change(screen.getByLabelText(/Email Address/i), { target: { value: 'newuser@example.com' } });
    fireEvent.change(screen.getByLabelText(/Password/i), { target: { value: 'secret123' } });
    await user.click(screen.getByRole('button', { name: /Create Account/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Email already exists');
    expect(screen.queryByText(/Login destination/i)).not.toBeInTheDocument();
  });

  it('blocks submit when the password is too short', async () => {
    vi.stubEnv('VITE_ENABLE_SELF_SIGNUP', '1');
    const user = userEvent.setup();
    renderRegister();

    fireEvent.change(screen.getByLabelText(/Username/i), { target: { value: 'newuser' } });
    fireEvent.change(screen.getByLabelText(/Email Address/i), { target: { value: 'newuser@example.com' } });
    fireEvent.change(screen.getByLabelText(/Password/i), { target: { value: 'short' } });
    await user.click(screen.getByRole('button', { name: /Create Account/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Password must be at least 8 characters.');
    expect(registerApi).not.toHaveBeenCalled();
  });
});
