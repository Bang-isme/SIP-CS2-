import { useState } from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import DrilldownModal from './DrilldownModal';
import { exportDrilldownCsv, getDepartments, getDrilldown } from '../services/api';

vi.mock('../services/api', () => ({
  getDrilldown: vi.fn(),
  getDepartments: vi.fn(),
  exportDrilldownCsv: vi.fn(),
}));

vi.mock('react-window', () => ({
  FixedSizeList: ({ itemCount, children }) => (
    <div>
      {Array.from({ length: itemCount }).map((_, index) => (
        <div key={index}>{children({ index, style: {} })}</div>
      ))}
    </div>
  ),
}));

const baseResponse = {
  data: [],
  meta: { total: 0, pages: 1 },
  summary: {
    count: 0,
    totalEarnings: 0,
    totalBenefits: 0,
    totalVacation: 0,
    partial: false,
  },
};

function DrilldownHarness() {
  const [open, setOpen] = useState(false);
  return (
    <div>
      <button type="button" onClick={() => setOpen(true)}>Open Drilldown</button>
      {open && <DrilldownModal filters={{ context: 'earnings' }} onClose={() => setOpen(false)} />}
    </div>
  );
}

describe('DrilldownModal behavior', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getDepartments.mockResolvedValue(['Engineering']);
    getDrilldown.mockResolvedValue(baseResponse);
  });

  it('closes on Escape and restores focus to trigger', async () => {
    const user = userEvent.setup();
    render(<DrilldownHarness />);

    const trigger = screen.getByRole('button', { name: /Open Drilldown/i });
    await user.click(trigger);

    expect(await screen.findByRole('dialog')).toBeInTheDocument();
    await user.keyboard('{Escape}');

    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
    expect(trigger).toHaveFocus();
  });

  it('shows inline export error instead of browser alert', async () => {
    const user = userEvent.setup();
    exportDrilldownCsv.mockRejectedValue({
      response: { data: { message: 'Export failed for current filter.' } },
    });

    render(<DrilldownHarness />);
    await user.click(screen.getByRole('button', { name: /Open Drilldown/i }));
    await screen.findByRole('dialog');
    await user.click(screen.getByRole('button', { name: /Export current filtered records to CSV/i }));

    expect(await screen.findByText(/Export failed for current filter/i)).toBeInTheDocument();
  });
});
