import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import AdminEmployeesModal from './AdminEmployeesModal';
import PageChromeContext from '../contexts/PageChromeContext';
import {
  createEmployeeRecord,
  getEmployeeSyncEvidence,
  getEmployeeEditorOptions,
  getEmployeesPage,
} from '../services/api';

vi.mock('../services/api', () => ({
  getEmployeesPage: vi.fn(),
  getEmployeeEditorOptions: vi.fn(),
  getEmployeeSyncEvidence: vi.fn(),
  createEmployeeRecord: vi.fn(),
  updateEmployeeRecord: vi.fn(),
  deleteEmployeeRecord: vi.fn(),
}));

describe('AdminEmployeesModal', () => {
  const onClose = vi.fn();
  const onMutationComplete = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    getEmployeeEditorOptions.mockResolvedValue({
      data: {
        departments: [
          { _id: 'dept-1', name: 'Engineering', code: 'ENG', isActive: true },
        ],
        enums: {
          gender: ['Male', 'Female', 'Other'],
          employmentType: ['Full-time', 'Part-time'],
        },
        nextEmployeeId: 'EMP000195',
      },
    });
    getEmployeesPage.mockResolvedValue({
      data: [
        {
          _id: 'emp-1',
          employeeId: 'EMP001',
          firstName: 'Amy',
          lastName: 'Tran',
          employmentType: 'Full-time',
          isShareholder: false,
          departmentId: 'dept-1',
        },
      ],
      pagination: {
        total: 1,
        page: 1,
        limit: 12,
        pages: 1,
      },
    });
    getEmployeeSyncEvidence.mockResolvedValue({
      data: {
        employeeId: 'EMP001',
        checkedAt: '2026-04-22T09:00:00.000Z',
        overall: {
          status: 'healthy',
          label: 'Payroll synced',
          detail: 'Source, queue, and payroll evidence are aligned.',
        },
        source: {
          status: 'PRESENT',
          label: 'Source saved',
          detail: 'MongoDB source row is present.',
          payRate: 118204,
          updatedAt: '2026-04-22T09:00:00.000Z',
        },
        queue: {
          status: 'SUCCESS',
          label: 'Delivered',
          detail: 'The outbox worker finished this dispatch.',
          eventId: 91,
          action: 'UPDATE',
          attempts: 1,
          updatedAt: '2026-04-22T09:00:01.000Z',
        },
        payroll: {
          status: 'CURRENT',
          label: 'Payroll current',
          detail: 'Active payroll record is available.',
          payRate: 118204,
          payType: 'SALARY',
          syncStatus: 'SUCCESS',
          effectiveDate: '2026-04-22T09:00:02.000Z',
        },
      },
    });
  });

  it('loads employee rows and editor options', async () => {
    render(
      <AdminEmployeesModal
        onClose={onClose}
        onMutationComplete={onMutationComplete}
        allowMutations
      />,
    );

    expect(await screen.findByText(/Employee Source Manager/i)).toBeInTheDocument();
    expect(await screen.findByText(/Amy Tran/i)).toBeInTheDocument();
    expect(screen.getAllByText(/Engineering/i).length).toBeGreaterThan(0);
    expect(getEmployeesPage).toHaveBeenCalledWith({
      page: 1,
      limit: 20,
      search: '',
      departmentId: '',
      employmentType: '',
    });
    expect(getEmployeeEditorOptions).toHaveBeenCalledTimes(1);
  });

  it('creates a new employee and shows sync feedback', async () => {
    createEmployeeRecord.mockResolvedValue({
      success: true,
      data: { employeeId: 'EMP000195' },
      sync: {
        status: 'QUEUED',
        mode: 'OUTBOX',
        message: 'Source record saved; integration event queued for async sync',
        correlationId: 'req-emp-195',
        consistency: 'EVENTUAL',
      },
    });

    render(
      <AdminEmployeesModal
        onClose={onClose}
        onMutationComplete={onMutationComplete}
        allowMutations
      />,
    );

    await screen.findByText(/Employee Source Manager/i);
    fireEvent.click(screen.getByRole('button', { name: /New Employee/i }));

    expect(screen.getByLabelText(/Employee ID/i)).toHaveValue('EMP000195');
    fireEvent.change(screen.getByLabelText(/First Name/i), { target: { value: 'Linh' } });
    fireEvent.click(screen.getByRole('button', { name: /Create Employee/i }));

    await waitFor(() => {
      expect(createEmployeeRecord).toHaveBeenCalledWith(expect.objectContaining({
        firstName: 'Linh',
        employmentType: 'Full-time',
        isShareholder: false,
      }));
    });
    expect(createEmployeeRecord).toHaveBeenCalledWith(
      expect.not.objectContaining({
        employeeId: expect.anything(),
      }),
    );

    expect(await screen.findByText(/Correlation: req-emp-195/i)).toBeInTheDocument();
    expect(onMutationComplete).toHaveBeenCalledTimes(1);
  });

  it('blocks submit and shows validation errors for invalid date order', async () => {
    render(
      <AdminEmployeesModal
        onClose={onClose}
        onMutationComplete={onMutationComplete}
        allowMutations
      />,
    );

    await screen.findByText(/Employee Source Manager/i);
    fireEvent.click(screen.getByRole('button', { name: /New Employee/i }));

    expect(screen.getByLabelText(/Employee ID/i)).toHaveValue('EMP000195');
    fireEvent.change(screen.getByLabelText(/First Name/i), {
      target: { value: 'Mai' },
    });
    fireEvent.change(screen.getByLabelText(/Birth Date/i), {
      target: { value: '2021-01-01' },
    });
    fireEvent.change(screen.getByLabelText(/Hire Date/i), {
      target: { value: '2020-01-01' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Create Employee/i }));

    await waitFor(() => {
      expect(
        screen.getAllByText(/Birth date must be earlier than hire date\./i),
      ).toHaveLength(2);
    });
    expect(createEmployeeRecord).not.toHaveBeenCalled();
  });

  it('keeps mutation controls hidden in read-only mode', async () => {
    render(<AdminEmployeesModal onClose={onClose} onMutationComplete={onMutationComplete} />);

    expect(await screen.findByText(/Employee Source Manager/i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /New Employee/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Create Employee/i })).not.toBeInTheDocument();
  });

  it('uses page-level workspace copy when rendered as a route surface', async () => {
    const setPageRefreshConfig = vi.fn();

    render(
      <PageChromeContext.Provider value={{ setPageRefreshConfig }}>
        <AdminEmployeesModal
          onClose={onClose}
          onMutationComplete={onMutationComplete}
          allowMutations
          variant="page"
        />
      </PageChromeContext.Provider>,
    );

    expect(await screen.findByText(/Employee source records/i)).toBeInTheDocument();
    expect(screen.getByText(/Search the HR source-of-truth/i)).toBeInTheDocument();
    expect(screen.queryByText(/Employee Source Manager/i)).not.toBeInTheDocument();
    expect(screen.getByTestId('employee-admin-page-shell')).toBeInTheDocument();
    expect(screen.getByTestId('employee-admin-card')).toHaveClass('employee-admin-card--page');
    expect(screen.getByTestId('employee-admin-workspace')).toHaveClass('employee-admin-workspace--page');
    expect(screen.getByTestId('employee-admin-table-panel')).toHaveClass('employee-admin-table-panel--page');
    expect(screen.queryByTestId('employee-admin-editor-panel')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /New Employee/i })).toBeInTheDocument();
    expect(screen.queryByText(/Page 1 of/i)).not.toBeInTheDocument();
    expect(setPageRefreshConfig).toHaveBeenCalledWith(expect.objectContaining({
      label: 'Refresh employees',
      refreshing: expect.any(Boolean),
      onRefresh: expect.any(Function),
    }));
  });

  it('shows a generated employee id in create mode and keeps it read-only', async () => {
    render(
      <AdminEmployeesModal
        onClose={onClose}
        onMutationComplete={onMutationComplete}
        allowMutations
      />,
    );

    await screen.findByText(/Employee Source Manager/i);
    fireEvent.click(screen.getByRole('button', { name: /New Employee/i }));

    await waitFor(() => {
      const employeeIdField = screen.getByLabelText(/Employee ID/i);
      expect(employeeIdField).toHaveValue('EMP000195');
      expect(employeeIdField).toHaveAttribute('readonly');
    });
    expect(
      screen.getByText(/Employee ID is assigned automatically when the record is created/i),
    ).toBeInTheDocument();
  });

  it('loads delivery evidence when an employee editor is opened', async () => {
    render(
      <AdminEmployeesModal
        onClose={onClose}
        onMutationComplete={onMutationComplete}
        allowMutations
      />,
    );

    fireEvent.click(await screen.findByRole('button', { name: /Amy Tran/i }));

    expect(await screen.findByText(/Delivery evidence/i)).toBeInTheDocument();
    expect(await screen.findByText(/Payroll synced/i)).toBeInTheDocument();
    expect(screen.getByText(/Source saved/i)).toBeInTheDocument();
    expect(screen.getByText(/Delivered/i)).toBeInTheDocument();
    expect(screen.getByText(/Payroll current/i)).toBeInTheDocument();
    expect(getEmployeeSyncEvidence).toHaveBeenCalledWith('EMP001');
  });
});
