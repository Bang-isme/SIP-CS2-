import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import Login from './Login';
import { login as loginApi } from '../services/api';

vi.mock('../services/api', () => ({
  login: vi.fn(),
}));

describe('Login page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('submits credentials and triggers onLogin', async () => {
    const user = userEvent.setup();
    const onLogin = vi.fn();
    const onSwitchToRegister = vi.fn();
    loginApi.mockResolvedValue({ success: true });

    render(
      <Login
        onLogin={onLogin}
        onSwitchToRegister={onSwitchToRegister}
        sessionNotice="Session expired. Please sign in again."
      />,
    );

    expect(screen.getByText(/Session expired/i)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /Sign Up/i }));
    expect(onSwitchToRegister).toHaveBeenCalledTimes(1);

    await user.click(screen.getByRole('button', { name: /Sign In/i }));

    await waitFor(() => {
      expect(loginApi).toHaveBeenCalledTimes(1);
      expect(onLogin).toHaveBeenCalledTimes(1);
    });
  });
});
