import { useState } from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import DrilldownModal from './DrilldownModal';
import {
  exportDrilldownCsv,
  getBenefitsSummary,
  getDepartments,
  getDrilldown,
} from '../services/api';

vi.mock('../services/api', () => ({
  getDrilldown: vi.fn(),
  getDepartments: vi.fn(),
  getBenefitsSummary: vi.fn(),
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

function BenefitsDrilldownHarness() {
  const [open, setOpen] = useState(false);
  return (
    <div>
      <button type="button" onClick={() => setOpen(true)}>Open Benefits Drilldown</button>
      {open && (
        <DrilldownModal
          filters={{ context: 'benefits', benefitPlan: 'Standard' }}
          onClose={() => setOpen(false)}
        />
      )}
    </div>
  );
}

describe('DrilldownModal behavior', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.localStorage.clear();
    getDepartments.mockResolvedValue(['Engineering']);
    getBenefitsSummary.mockResolvedValue({
      data: {
        byPlan: {
          Standard: { shareholder: { average: 4000 } },
          Premium: { shareholder: { average: 5200 } },
        },
      },
    });
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

  it('renders benefits context with benefits metric column and no min earnings filter', async () => {
    const user = userEvent.setup();
    getDrilldown.mockResolvedValue({
      data: [
        {
          _id: 'emp-1',
          employeeId: 'EMP001',
          firstName: 'Amy',
          lastName: 'Adams',
          department: 'Engineering',
          gender: 'Female',
          ethnicity: 'Asian',
          employmentType: 'Full-time',
          isShareholder: true,
          benefitCost: 2500,
        },
      ],
      meta: { total: 1, pages: 1 },
      summary: {
        count: 1,
        totalEarnings: 0,
        totalBenefits: 2500,
        totalVacation: 0,
        partial: false,
      },
    });

    render(<BenefitsDrilldownHarness />);
    await user.click(screen.getByRole('button', { name: /Open Benefits Drilldown/i }));

    await screen.findByRole('dialog');
    expect(screen.queryByLabelText(/Minimum earnings/i)).not.toBeInTheDocument();
    expect(screen.getByLabelText(/Benefit plan filter/i)).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: /Benefits Cost/i })).toBeInTheDocument();
    expect(screen.getAllByText(/\$2[,.]500/).length).toBeGreaterThanOrEqual(2);
  });

  it('applies recommended earnings preset to the drilldown query', async () => {
    const user = userEvent.setup();
    render(<DrilldownHarness />);

    await user.click(screen.getByRole('button', { name: /Open Drilldown/i }));
    await screen.findByRole('dialog');
    await user.click(screen.getByRole('button', { name: /Open Quick Views/i }));
    await user.click(screen.getByRole('button', { name: /High Earners > \$100k/i }));

    await waitFor(() => {
      expect(getDrilldown).toHaveBeenLastCalledWith(
        expect.objectContaining({ minEarnings: '100000' }),
        expect.any(Object),
      );
    });
  });

  it('saves and reapplies a custom drilldown preset', async () => {
    const user = userEvent.setup();
    render(<DrilldownHarness />);

    await user.click(screen.getByRole('button', { name: /Open Drilldown/i }));
    await screen.findByRole('dialog');

    await user.selectOptions(screen.getByLabelText(/Department filter/i), 'Engineering');
    await user.selectOptions(screen.getByLabelText(/Employment type filter/i), 'Part-time');
    await user.click(screen.getByRole('button', { name: /Open Quick Views/i }));
    await user.click(screen.getByRole('button', { name: /Open Saved Views/i }));
    await user.type(screen.getByLabelText(/Preset name/i), 'Operations Focus');
    await user.click(screen.getByRole('button', { name: /Save View/i }));

    expect(await screen.findByText(/Saved preset "Operations Focus"\./i)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /^Clear All$/i }));
    await user.click(screen.getByRole('button', { name: /^Operations Focus$/i }));

    expect(screen.getByLabelText(/Department filter/i)).toHaveValue('Engineering');
    expect(screen.getByLabelText(/Employment type filter/i)).toHaveValue('Part-time');
  });

  it('updates benefits drilldown when benefit plan filter changes', async () => {
    const user = userEvent.setup();
    render(<BenefitsDrilldownHarness />);

    await user.click(screen.getByRole('button', { name: /Open Benefits Drilldown/i }));
    await screen.findByRole('dialog');
    await user.selectOptions(screen.getByLabelText(/Benefit plan filter/i), 'Premium');

    await waitFor(() => {
      expect(getDrilldown).toHaveBeenLastCalledWith(
        expect.objectContaining({ benefitPlan: 'Premium', context: 'benefits' }),
        expect.any(Object),
      );
    });
  });
});
