import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import AlertSettingsModal from './AlertSettingsModal';

const notifySuccess = vi.fn();
const notifyError = vi.fn();
const getAlerts = vi.fn();
const createAlertConfig = vi.fn();
const updateAlertConfig = vi.fn();

vi.mock('../contexts/ToastContext', () => ({
  useToast: () => ({
    notifySuccess,
    notifyError,
  }),
}));

vi.mock('../hooks/useBodyScrollLock', () => ({
  default: () => {},
}));

vi.mock('../services/api', () => ({
  getAlerts: (...args) => getAlerts(...args),
  createAlertConfig: (...args) => createAlertConfig(...args),
  updateAlertConfig: (...args) => updateAlertConfig(...args),
}));

describe('AlertSettingsModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    getAlerts.mockResolvedValue({
      data: [
        {
          _id: 'alert-vacation-1',
          type: 'vacation',
          name: 'High Vacation Balance',
          threshold: 25,
          description: 'Current threshold note',
          isActive: true,
          updatedAt: '2026-04-17T10:17:00.000Z',
          createdBy: { username: 'admin' },
        },
      ],
    });

    updateAlertConfig.mockResolvedValue({
      success: true,
    });
  });

  it('preserves an explicit threshold of 0 when saving', async () => {
    const user = userEvent.setup();
    const onSaveSuccess = vi.fn().mockResolvedValue(undefined);

    render(<AlertSettingsModal onClose={vi.fn()} onSaveSuccess={onSaveSuccess} />);

    await user.click(await screen.findByRole('button', { name: /High Vacation Balance/i }));
    const thresholdInput = await screen.findByLabelText(/Vacation Days Threshold/i);
    await user.clear(thresholdInput);
    await user.type(thresholdInput, '0');

    await user.click(screen.getByRole('button', { name: /Save Changes/i }));

    await waitFor(() => {
      expect(updateAlertConfig).toHaveBeenCalledWith('alert-vacation-1', expect.objectContaining({
        threshold: 0,
      }));
    });
    expect(onSaveSuccess).toHaveBeenCalledTimes(1);
  });
});
