import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import Register from './Register';
import { register as registerApi } from '../services/api';

vi.mock('../services/api', () => ({
  register: vi.fn(),
}));

describe('Register page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useRealTimers();
  });

  it('submits signup payload with user role and redirects to login', async () => {
    const user = userEvent.setup();
    const onSwitchToLogin = vi.fn();
    const setTimeoutSpy = vi.spyOn(window, 'setTimeout');
    registerApi.mockResolvedValue({ success: true });

    render(<Register onSwitchToLogin={onSwitchToLogin} />);

    await user.type(screen.getByLabelText(/Username/i), 'newuser');
    await user.type(screen.getByLabelText(/Email Address/i), 'newuser@example.com');
    await user.type(screen.getByLabelText(/Password/i), 'secret123');
    await user.click(screen.getByRole('button', { name: /Sign Up/i }));

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
    const redirectCallback = redirectTimerCall[0];
    act(() => {
      redirectCallback();
    });

    expect(onSwitchToLogin).toHaveBeenCalledTimes(1);
    setTimeoutSpy.mockRestore();
  });

  it('shows inline error when registration fails', async () => {
    const user = userEvent.setup();
    const onSwitchToLogin = vi.fn();
    registerApi.mockRejectedValue({
      response: { data: { message: 'Email already exists' } },
    });

    render(<Register onSwitchToLogin={onSwitchToLogin} />);

    await user.type(screen.getByLabelText(/Username/i), 'newuser');
    await user.type(screen.getByLabelText(/Email Address/i), 'newuser@example.com');
    await user.type(screen.getByLabelText(/Password/i), 'secret123');
    await user.click(screen.getByRole('button', { name: /Sign Up/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Email already exists');
    expect(onSwitchToLogin).not.toHaveBeenCalled();
  });
});
