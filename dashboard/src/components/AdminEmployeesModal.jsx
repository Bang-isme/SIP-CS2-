import {
  memo,
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  FiEdit2,
  FiPlus,
  FiRefreshCw,
  FiSearch,
  FiShield,
  FiTrash2,
  FiUsers,
  FiX,
} from 'react-icons/fi';
import {
  createEmployeeRecord,
  deleteEmployeeRecord,
  getEmployeeEditorOptions,
  getEmployeeSyncEvidence,
  getEmployeesPage,
  updateEmployeeRecord,
} from '../services/api';
import { getErrorMessage, formatTimestamp, formatCurrency } from '../utils/formatters';
import { useToast } from '../contexts/ToastContext';
import { useDashboardPageChrome } from '../contexts/PageChromeContext';
import './AdminEmployeesModal.css';

const DEFAULT_EMPLOYMENT_TYPES = ['Full-time', 'Part-time'];
const DEFAULT_GENDERS = ['Male', 'Female', 'Other'];
const PAGE_SIZE_OPTIONS = [12, 20, 50, 100];
const EMPLOYEE_ID_MAX_LENGTH = 100;

const buildEmptyDraft = ({
  employmentTypes = DEFAULT_EMPLOYMENT_TYPES,
} = {}) => ({
  employeeId: '',
  firstName: '',
  lastName: '',
  gender: '',
  ethnicity: '',
  employmentType: employmentTypes[0] || 'Full-time',
  isShareholder: false,
  departmentId: '',
  hireDate: '',
  birthDate: '',
  vacationDays: '',
  paidToDate: '',
  paidLastYear: '',
  payRate: '',
  payRateId: '',
});


const toDateInputValue = (value) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toISOString().slice(0, 10);
};

const buildDraftFromEmployee = (
  employee,
  { employmentTypes = DEFAULT_EMPLOYMENT_TYPES } = {},
) => ({
  employeeId: employee?.employeeId || '',
  firstName: employee?.firstName || '',
  lastName: employee?.lastName || '',
  gender: employee?.gender || '',
  ethnicity: employee?.ethnicity || '',
  employmentType: employee?.employmentType || employmentTypes[0] || 'Full-time',
  isShareholder: Boolean(employee?.isShareholder),
  departmentId: employee?.departmentId ? String(employee.departmentId) : '',
  hireDate: toDateInputValue(employee?.hireDate),
  birthDate: toDateInputValue(employee?.birthDate),
  vacationDays: employee?.vacationDays ?? '',
  paidToDate: employee?.paidToDate ?? '',
  paidLastYear: employee?.paidLastYear ?? '',
  payRate: employee?.payRate ?? '',
  payRateId: employee?.payRateId ?? '',
});

const compactPayload = (draft, { includeEmployeeId = true } = {}) => {
  const payload = {
    ...(includeEmployeeId ? { employeeId: draft.employeeId.trim() } : {}),
    firstName: draft.firstName.trim(),
    lastName: draft.lastName.trim() || undefined,
    gender: draft.gender || undefined,
    ethnicity: draft.ethnicity.trim() || undefined,
    employmentType: draft.employmentType || 'Full-time',
    isShareholder: Boolean(draft.isShareholder),
    departmentId: draft.departmentId || undefined,
    hireDate: draft.hireDate
      ? new Date(`${draft.hireDate}T00:00:00.000Z`).toISOString()
      : undefined,
    birthDate: draft.birthDate
      ? new Date(`${draft.birthDate}T00:00:00.000Z`).toISOString()
      : undefined,
    vacationDays:
      draft.vacationDays === '' ? undefined : Number(draft.vacationDays),
    paidToDate: draft.paidToDate === '' ? undefined : Number(draft.paidToDate),
    paidLastYear:
      draft.paidLastYear === '' ? undefined : Number(draft.paidLastYear),
    payRate: draft.payRate === '' ? undefined : Number(draft.payRate),
    payRateId: draft.payRateId === '' ? undefined : Number(draft.payRateId),
  };

  return Object.fromEntries(
    Object.entries(payload).filter(([, value]) => value !== undefined),
  );
};

const parseDateField = (value) => {
  if (!value) return null;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const validateNonNegativeNumber = ({
  field,
  label,
  value,
  errors,
  integer = false,
}) => {
  if (value === '') return;
  const parsed = Number(value);

  if (!Number.isFinite(parsed)) {
    errors[field] = `${label} must be a valid number.`;
    return;
  }

  if (parsed < 0) {
    errors[field] = `${label} cannot be negative.`;
    return;
  }

  if (integer && !Number.isInteger(parsed)) {
    errors[field] = `${label} must be a whole number.`;
  }
};

const validateEmployeeDraft = (draft, { requireEmployeeId = true } = {}) => {
  const errors = {};
  const employeeId = draft.employeeId.trim();
  const firstName = draft.firstName.trim();
  const birthDate = parseDateField(draft.birthDate);
  const hireDate = parseDateField(draft.hireDate);

  if (requireEmployeeId && !employeeId) {
    errors.employeeId = 'Employee ID is required.';
  } else if (employeeId && employeeId.length > EMPLOYEE_ID_MAX_LENGTH) {
    errors.employeeId = `Employee ID must be at most ${EMPLOYEE_ID_MAX_LENGTH} characters.`;
  }

  if (!firstName) {
    errors.firstName = 'First name is required.';
  }

  if (draft.birthDate && !birthDate) {
    errors.birthDate = 'Birth date must be a valid date.';
  }

  if (draft.hireDate && !hireDate) {
    errors.hireDate = 'Hire date must be a valid date.';
  }

  if (birthDate && hireDate && birthDate >= hireDate) {
    const message = 'Birth date must be earlier than hire date.';
    errors.birthDate = message;
    errors.hireDate = message;
  }

  validateNonNegativeNumber({
    field: 'vacationDays',
    label: 'Vacation days',
    value: draft.vacationDays,
    errors,
    integer: true,
  });
  validateNonNegativeNumber({
    field: 'payRate',
    label: 'Pay rate',
    value: draft.payRate,
    errors,
  });
  validateNonNegativeNumber({
    field: 'payRateId',
    label: 'Pay rate ID',
    value: draft.payRateId,
    errors,
    integer: true,
  });
  validateNonNegativeNumber({
    field: 'paidToDate',
    label: 'Paid to date',
    value: draft.paidToDate,
    errors,
  });
  validateNonNegativeNumber({
    field: 'paidLastYear',
    label: 'Paid last year',
    value: draft.paidLastYear,
    errors,
  });

  return errors;
};

const buildSyncStageMeta = (stage, type) => {
  if (!stage) return [];

  if (type === 'source') {
    return [
      stage.updatedAt ? `Updated ${formatTimestamp(stage.updatedAt)}` : null,
      stage.payRate != null ? `Pay ${formatCurrency(stage.payRate)}` : null,
    ].filter(Boolean);
  }

  if (type === 'queue') {
    return [
      stage.eventId != null ? `Event #${stage.eventId}` : null,
      stage.action || null,
      Number.isFinite(stage.attempts) ? `${stage.attempts} attempt${stage.attempts === 1 ? '' : 's'}` : null,
      stage.updatedAt ? formatTimestamp(stage.updatedAt) : null,
    ].filter(Boolean);
  }

  return [
    stage.payRate != null ? `Pay ${formatCurrency(stage.payRate)}` : null,
    stage.payType ? stage.payType : null,
    stage.syncStatus ? `Sync ${stage.syncStatus}` : null,
    stage.effectiveDate ? `Effective ${formatTimestamp(stage.effectiveDate)}` : null,
  ].filter(Boolean);
};

const EmployeeTablePanel = memo(function EmployeeTablePanel({
  variant,
  employees,
  departments,
  loadingList,
  allowMutations,
  searchInput,
  onSearchChange,
  departmentFilter,
  onDepartmentFilterChange,
  typeFilter,
  onTypeFilterChange,
  employmentTypes,
  loadingOptions,
  onNewEmployee,
  selectedEmployeeId,
  deletingId,
  onEditEmployee,
  onDeleteEmployee,
  page,
  pageSize,
  pageCount,
  totalRecords,
  visibleStart,
  visibleEnd,
  onPageSizeChange,
  onPageChange,
}) {
  const departmentMap = useMemo(
    () => new Map(departments.map((department) => [department._id, department])),
    [departments],
  );

  return (
    <section
      className={`employee-admin-table-panel${
        variant === 'page' ? ' employee-admin-table-panel--page' : ''
      }`}
      data-testid="employee-admin-table-panel"
    >
      <div
        className={`employee-admin-toolbar${
          variant === 'page' ? ' employee-admin-toolbar--page' : ''
        }`}
      >
        <label className="employee-admin-search">
          <FiSearch size={14} />
          <input
            type="search"
            placeholder="Search employee ID or name"
            value={searchInput}
            onChange={(event) => onSearchChange(event.target.value)}
          />
        </label>

        <select
          className={`employee-admin-filter ${departmentFilter ? 'active' : ''}`}
          value={departmentFilter}
          onChange={(event) => onDepartmentFilterChange(event.target.value)}
          disabled={loadingOptions}
          aria-label="Filter employees by department"
        >
          <option value="">All Departments</option>
          {departments.map((department) => (
            <option key={department._id} value={department._id}>
              {department.name} ({department.code})
            </option>
          ))}
        </select>

        <select
          className={`employee-admin-filter ${typeFilter ? 'active' : ''}`}
          value={typeFilter}
          onChange={(event) => onTypeFilterChange(event.target.value)}
          aria-label="Filter employees by employment type"
        >
          <option value="">All Types</option>
          {employmentTypes.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>

        {allowMutations && (
          <button
            type="button"
            className="employee-admin-new-btn"
            onClick={onNewEmployee}
          >
            <FiPlus size={14} />
            New Employee
          </button>
        )}
      </div>

      <div className="employee-admin-table-shell">
        {loadingList ? (
          <div className="employee-admin-state">
            <FiRefreshCw size={14} className="spin" />
            <span>Loading employees...</span>
          </div>
        ) : employees.length === 0 ? (
          <div className="employee-admin-state">
            <span>No employees found for the current source filters.</span>
          </div>
        ) : (
          <table className="employee-admin-table">
            <colgroup>
              <col className="employee-admin-col employee-admin-col--index" />
              <col className="employee-admin-col employee-admin-col--employee" />
              <col className="employee-admin-col employee-admin-col--department" />
              <col className="employee-admin-col employee-admin-col--role" />
              <col className="employee-admin-col employee-admin-col--status" />
              <col className="employee-admin-col employee-admin-col--compensation" />
              {allowMutations ? (
                <col className="employee-admin-col employee-admin-col--actions" />
              ) : null}
            </colgroup>
            <thead>
              <tr>
                <th className="employee-admin-column employee-admin-column--index">#</th>
                <th className="employee-admin-column employee-admin-column--employee">Employee</th>
                <th className="employee-admin-column employee-admin-column--department">Department</th>
                <th className="employee-admin-column employee-admin-column--role">Role Info</th>
                <th className="employee-admin-column employee-admin-column--status">Status</th>
                <th className="employee-admin-column employee-admin-column--compensation">Compensation</th>
                {allowMutations && <th className="employee-admin-column employee-admin-column--actions">Actions</th>}
              </tr>
            </thead>
            <tbody>
              {employees.map((employee, index) => {
                const isSelected = employee._id === selectedEmployeeId;
                const department = departmentMap.get(
                  String(employee.departmentId || ''),
                );
                const deleteDisabled =
                  deletingId && deletingId !== employee._id;

                return (
                  <tr key={employee._id} className={isSelected ? 'selected' : ''}>
                    <td className="employee-admin-index employee-admin-column employee-admin-column--index">
                      {(page - 1) * pageSize + index + 1}
                    </td>
                    <td className="employee-admin-column employee-admin-column--employee">
                      {allowMutations ? (
                        <button
                          type="button"
                          className="employee-admin-row-link is-actionable"
                          onClick={() => onEditEmployee(employee)}
                          title="Open employee editor"
                        >
                          <div className="employee-admin-employee-cell">
                            <div className="employee-admin-avatar">
                              {(employee.firstName?.[0] || 'E')}
                              {(employee.lastName?.[0] || 'M')}
                            </div>
                            <div>
                              <div className="employee-admin-name">
                                {employee.firstName} {employee.lastName}
                              </div>
                              <div className="employee-admin-id">
                                {employee.employeeId}
                              </div>
                            </div>
                          </div>
                        </button>
                      ) : (
                        <div className="employee-admin-row-link is-static">
                          <div className="employee-admin-employee-cell">
                            <div className="employee-admin-avatar">
                              {(employee.firstName?.[0] || 'E')}
                              {(employee.lastName?.[0] || 'M')}
                            </div>
                            <div>
                              <div className="employee-admin-name">
                                {employee.firstName} {employee.lastName}
                              </div>
                              <div className="employee-admin-id">
                                {employee.employeeId}
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </td>
                    <td className="employee-admin-column employee-admin-column--department">
                      <span className="employee-admin-pill">
                        {department
                          ? `${department.name} (${department.code})`
                          : 'Unassigned'}
                      </span>
                    </td>
                    <td className="employee-admin-column employee-admin-column--role">
                      <div className="employee-admin-meta">
                        <span>{employee.gender || 'Unknown'}</span>
                        <span className="dot">-</span>
                        <span>{employee.ethnicity || 'Unknown'}</span>
                      </div>
                    </td>
                    <td className="employee-admin-column employee-admin-column--status">
                      <span
                        className={`employee-admin-status ${
                          employee.employmentType === 'Full-time'
                            ? 'success'
                            : 'warning'
                        }`}
                      >
                        {employee.employmentType || 'Unknown'}
                      </span>
                      {employee.isShareholder && (
                        <span className="employee-admin-shareholder">
                          Shareholder
                        </span>
                      )}
                    </td>
                    <td className="employee-admin-column employee-admin-column--compensation">
                      <div className="employee-admin-comp">
                        <strong>{formatCurrency(employee.payRate)}</strong>
                        <span>
                          Last year {formatCurrency(employee.paidLastYear)}
                        </span>
                      </div>
                    </td>
                    {allowMutations && (
                      <td className="employee-admin-column employee-admin-column--actions">
                        <div className="employee-admin-row-actions">
                          <button
                            type="button"
                            className="employee-admin-row-btn"
                            onClick={() => onEditEmployee(employee)}
                          >
                            <FiEdit2 size={13} />
                            Edit
                          </button>
                          <button
                            type="button"
                            className="employee-admin-row-btn danger"
                            onClick={() => onDeleteEmployee(employee)}
                            disabled={
                              Boolean(deleteDisabled) ||
                              deletingId === employee._id
                            }
                          >
                            <FiTrash2 size={13} />
                            {deletingId === employee._id
                              ? 'Deleting...'
                              : 'Delete'}
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      <div
        className={`employee-admin-pagination${
          variant === 'page' ? ' employee-admin-pagination--page' : ''
        }`}
      >
        <div className="employee-admin-page-size">
          <span>Rows</span>
          <select
            value={pageSize}
            onChange={(event) => onPageSizeChange(Number(event.target.value))}
            aria-label="Rows per page"
          >
            {PAGE_SIZE_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </div>

        <div className="employee-admin-pagination-summary">
          <span>
            Showing {visibleStart.toLocaleString('en-US')}-
            {visibleEnd.toLocaleString('en-US')} of{' '}
            {totalRecords.toLocaleString('en-US')} source employees
          </span>
          <span className="employee-admin-page-info">
            Page
            <input
              type="number"
              min="1"
              max={pageCount || 1}
              value={page}
              onChange={(event) => {
                const nextPage = Number(event.target.value);
                if (
                  Number.isFinite(nextPage) &&
                  nextPage >= 1 &&
                  nextPage <= (pageCount || 1)
                ) {
                  onPageChange(nextPage);
                }
              }}
              aria-label="Current employee source page"
            />
            of {(pageCount || 1).toLocaleString('en-US')}
          </span>
          <div className="employee-admin-pagination-actions">
            <button
              type="button"
              onClick={() => onPageChange(Math.max(1, page - 1))}
              disabled={page <= 1 || loadingList}
            >
              Previous
            </button>
            <button
              type="button"
              onClick={() => onPageChange(Math.min(pageCount || page, page + 1))}
              disabled={page >= (pageCount || 1) || loadingList}
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </section>
  );
});

const EmployeeSyncEvidencePanel = memo(function EmployeeSyncEvidencePanel({
  syncFeedback,
  syncEvidence,
  syncEvidenceError,
  loadingSyncEvidence,
  onRefreshEvidence,
}) {
  if (!syncFeedback && !syncEvidence && !syncEvidenceError && !loadingSyncEvidence) {
    return null;
  }

  const evidenceStages = syncEvidence
    ? [
        { key: 'source', title: 'Source', stage: syncEvidence.source },
        { key: 'queue', title: 'Queue', stage: syncEvidence.queue },
        { key: 'payroll', title: 'Payroll', stage: syncEvidence.payroll },
      ]
    : [];

  return (
    <section className="employee-admin-evidence-card" aria-live="polite">
      <div className="employee-admin-evidence-head">
        <div>
          <span className="employee-admin-evidence-kicker">Delivery evidence</span>
          {syncEvidence?.employeeId && (
            <span className="employee-admin-evidence-entity">
              {syncEvidence.employeeId}
            </span>
          )}
          <div className="employee-admin-evidence-title-row">
            <strong>{syncEvidence?.overall?.label || 'Checking sync evidence'}</strong>
            {syncEvidence?.overall?.status && (
              <span className={`employee-admin-evidence-status status-${syncEvidence.overall.status}`}>
                {syncEvidence.overall.status}
              </span>
            )}
          </div>
          <p>
            {syncEvidenceError
              || syncEvidence?.overall?.detail
              || 'Pulling source, queue, and payroll evidence for this employee.'}
          </p>
        </div>
        <div className="employee-admin-evidence-actions">
          {syncEvidence?.checkedAt && (
            <span className="employee-admin-evidence-checked">
              Checked {formatTimestamp(syncEvidence.checkedAt)}
            </span>
          )}
          <button
            type="button"
            className="employee-admin-secondary-btn"
            onClick={onRefreshEvidence}
            disabled={loadingSyncEvidence}
          >
            <FiRefreshCw size={13} className={loadingSyncEvidence ? 'spin' : ''} />
            {loadingSyncEvidence ? 'Refreshing...' : 'Refresh evidence'}
          </button>
        </div>
      </div>

      {syncFeedback && (
        <div className={`employee-admin-sync-card status-${String(syncFeedback.status || '').toLowerCase()}`}>
          <div className="employee-admin-sync-top">
            <strong>Latest write: {syncFeedback.status || 'Unknown'}</strong>
            <span>{syncFeedback.mode || 'Unknown mode'}</span>
          </div>
          <p>{syncFeedback.detail || syncFeedback.message || 'Latest write acknowledgement is unavailable.'}</p>
          <div className="employee-admin-sync-meta">
            <span>Consistency: {syncFeedback.consistency || 'Unknown'}</span>
            {syncFeedback.correlationId && (
              <span>Correlation: {syncFeedback.correlationId}</span>
            )}
          </div>
        </div>
      )}

      {syncEvidence && (
        <div className="employee-admin-evidence-grid">
          {evidenceStages.map(({ key, title, stage }) => (
            <article key={key} className={`employee-admin-evidence-stage stage-${String(stage?.status || '').toLowerCase()}`}>
              <div className="employee-admin-evidence-stage-head">
                <span className="employee-admin-evidence-stage-title">{title}</span>
                <span className="employee-admin-evidence-stage-label">{stage?.label || 'Unavailable'}</span>
              </div>
              <p>{stage?.detail || 'No stage detail available.'}</p>
              <div className="employee-admin-evidence-stage-meta">
                {buildSyncStageMeta(stage, key).map((item) => (
                  <span key={`${key}-${item}`}>{item}</span>
                ))}
              </div>
              {key === 'queue' && stage?.lastError && (
                <span className="employee-admin-evidence-stage-warning">{stage.lastError}</span>
              )}
            </article>
          ))}
        </div>
      )}
    </section>
  );
});

const EmployeeEditorPanel = memo(function EmployeeEditorPanel({
  variant,
  mode,
  employee,
  employmentTypes,
  genders,
  departments,
  nextEmployeeId,
  loadingOptions,
  saving,
  deleting,
  syncFeedback,
  syncEvidence,
  syncEvidenceError,
  loadingSyncEvidence,
  onSubmit,
  onDelete,
  onHide,
  onSwitchToCreate,
  onRefreshEvidence,
}) {
  const isEditing = mode === 'edit' && Boolean(employee);
  const isPage = variant === 'page';
  const [draft, setDraft] = useState(() =>
    isEditing
      ? buildDraftFromEmployee(employee, { employmentTypes })
      : buildEmptyDraft({ employmentTypes }),
  );
  const [fieldErrors, setFieldErrors] = useState({});
  const formId = useId();

  const renderFieldError = useCallback(
    (field) =>
      fieldErrors[field] ? (
        <span id={`employee-admin-error-${field}`} className="employee-admin-field-error">
          {fieldErrors[field]}
        </span>
      ) : null,
    [fieldErrors],
  );

  const getFieldState = useCallback(
    (field) => ({
      className: `employee-admin-field${fieldErrors[field] ? ' has-error' : ''}`,
      describedBy: fieldErrors[field] ? `employee-admin-error-${field}` : undefined,
      invalid: Boolean(fieldErrors[field]),
    }),
    [fieldErrors],
  );

  const handleFieldChange = useCallback((field, value) => {
    setDraft((current) => ({
      ...current,
      [field]: value,
    }));
    setFieldErrors((current) => {
      if (!current[field] && !['birthDate', 'hireDate'].includes(field)) {
        return current;
      }
      const next = { ...current };
      delete next[field];
      if (field === 'birthDate' || field === 'hireDate') {
        delete next.birthDate;
        delete next.hireDate;
      }
      return next;
    });
  }, []);

  const resetDraft = useCallback(() => {
    setDraft(
      isEditing
        ? buildDraftFromEmployee(employee, { employmentTypes })
        : buildEmptyDraft({ employmentTypes }),
    );
    setFieldErrors({});
  }, [employee, employmentTypes, isEditing]);

  const handleSubmit = useCallback(
    async (event) => {
      event.preventDefault();
      const nextErrors = validateEmployeeDraft(draft, {
        requireEmployeeId: isEditing,
      });
      if (Object.keys(nextErrors).length > 0) {
        setFieldErrors(nextErrors);
        return;
      }
      const shouldReset = await onSubmit(
        compactPayload(draft, { includeEmployeeId: false }),
        { isEditing },
      );
      if (shouldReset) {
        setDraft(buildEmptyDraft({ employmentTypes }));
        setFieldErrors({});
      }
    },
    [draft, employmentTypes, isEditing, onSubmit],
  );

  return (
    <aside
      className={`employee-admin-editor-panel${
        variant === 'page' ? ' employee-admin-editor-panel--page' : ''
      }`}
      data-testid="employee-admin-editor-panel"
    >
      <div
        className={`employee-admin-editor-head${
          variant === 'page' ? ' employee-admin-editor-head--page' : ''
        }`}
      >
        <div>
          <h3>{isEditing ? `Edit ${employee?.employeeId || 'Employee'}` : 'Create Employee'}</h3>
          <p>
            {isEditing
              ? isPage
                ? 'Update the source row and save the downstream payroll sync.'
                : 'Update the source row first, then dispatch an UPDATE sync to downstream payroll integration.'
              : isPage
                ? 'Create a source row and queue downstream payroll sync.'
                : 'Create a new HR source row. The backend writes to MongoDB first, then dispatches a CREATE sync.'}
          </p>
          {isEditing && isPage && (
            <span className="employee-admin-editor-note">
              Employee ID stays locked because Payroll uses it as the downstream integration key.
            </span>
          )}
        </div>
        <div className="employee-admin-editor-actions">
          {isEditing && (
            <button
              type="button"
              className="employee-admin-secondary-btn"
              onClick={onSwitchToCreate}
            >
              Switch to Create
            </button>
          )}
          <button
            type="button"
            className="employee-admin-secondary-btn"
            onClick={onHide}
          >
            Hide Editor
          </button>
        </div>
      </div>

      <div
        className={`employee-admin-editor-body${
          isPage ? ' employee-admin-editor-body--page' : ''
        }`}
      >
        <EmployeeSyncEvidencePanel
          syncFeedback={syncFeedback}
          syncEvidence={syncEvidence}
          syncEvidenceError={syncEvidenceError}
          loadingSyncEvidence={loadingSyncEvidence}
          onRefreshEvidence={onRefreshEvidence}
        />

        <form
          id={formId}
          className={`employee-admin-form${
            isPage ? ' employee-admin-form--page' : ''
          }`}
          onSubmit={handleSubmit}
        >
        {Object.keys(fieldErrors).length > 0 && (
          <div className="employee-admin-form-error" role="alert">
            Fix the highlighted fields before saving this employee record.
          </div>
        )}

        <div className="employee-admin-form-grid">
          <label className={`${getFieldState('employeeId').className}${isEditing ? ' is-locked' : ''}`}>
            <span>Employee ID</span>
            <input
              type="text"
              value={isEditing ? draft.employeeId : nextEmployeeId}
              readOnly
              spellCheck={false}
              disabled={isEditing}
              placeholder={isEditing ? '' : 'Assigned automatically on save'}
              aria-invalid={getFieldState('employeeId').invalid}
              aria-describedby={getFieldState('employeeId').describedBy}
            />
            {isEditing && !isPage && (
              <span className="employee-admin-field-help">
                Employee ID stays locked after creation because Payroll uses it as the downstream integration key.
              </span>
            )}
            {!isEditing && (
              <span className="employee-admin-field-help">
                Employee ID is assigned automatically when the record is created, then stays locked for downstream payroll sync.
              </span>
            )}
            {renderFieldError('employeeId')}
          </label>

          <label className={getFieldState('firstName').className}>
            <span>First Name</span>
            <input
              type="text"
              value={draft.firstName}
              onChange={(event) =>
                handleFieldChange('firstName', event.target.value)
              }
              required
              spellCheck={false}
              aria-invalid={getFieldState('firstName').invalid}
              aria-describedby={getFieldState('firstName').describedBy}
            />
            {renderFieldError('firstName')}
          </label>

          <label className="employee-admin-field">
            <span>Last Name</span>
            <input
              type="text"
              value={draft.lastName}
              onChange={(event) =>
                handleFieldChange('lastName', event.target.value)
              }
              spellCheck={false}
            />
          </label>

          <label className="employee-admin-field">
            <span>Department</span>
            <select
              value={draft.departmentId}
              onChange={(event) =>
                handleFieldChange('departmentId', event.target.value)
              }
              disabled={loadingOptions}
            >
              <option value="">Unassigned</option>
              {departments.map((department) => (
                <option key={department._id} value={department._id}>
                  {department.name} ({department.code})
                </option>
              ))}
            </select>
          </label>

          <label className="employee-admin-field">
            <span>Employment Type</span>
            <select
              value={draft.employmentType}
              onChange={(event) =>
                handleFieldChange('employmentType', event.target.value)
              }
            >
              {employmentTypes.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>

          <label className="employee-admin-field">
            <span>Gender</span>
            <select
              value={draft.gender}
              onChange={(event) => handleFieldChange('gender', event.target.value)}
            >
              <option value="">Unspecified</option>
              {genders.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>

          <label className="employee-admin-field">
            <span>Ethnicity</span>
            <input
              type="text"
              value={draft.ethnicity}
              onChange={(event) =>
                handleFieldChange('ethnicity', event.target.value)
              }
              spellCheck={false}
            />
          </label>

          <label className={getFieldState('hireDate').className}>
            <span>Hire Date</span>
            <input
              type="date"
              value={draft.hireDate}
              onChange={(event) =>
                handleFieldChange('hireDate', event.target.value)
              }
              aria-invalid={getFieldState('hireDate').invalid}
              aria-describedby={getFieldState('hireDate').describedBy}
            />
            {renderFieldError('hireDate')}
          </label>

          <label className={getFieldState('birthDate').className}>
            <span>Birth Date</span>
            <input
              type="date"
              value={draft.birthDate}
              onChange={(event) =>
                handleFieldChange('birthDate', event.target.value)
              }
              aria-invalid={getFieldState('birthDate').invalid}
              aria-describedby={getFieldState('birthDate').describedBy}
            />
            {renderFieldError('birthDate')}
          </label>

          <label className={getFieldState('vacationDays').className}>
            <span>Vacation Days</span>
            <input
              type="number"
              min="0"
              step="1"
              value={draft.vacationDays}
              onChange={(event) =>
                handleFieldChange('vacationDays', event.target.value)
              }
              aria-invalid={getFieldState('vacationDays').invalid}
              aria-describedby={getFieldState('vacationDays').describedBy}
            />
            {renderFieldError('vacationDays')}
          </label>

          <label className={getFieldState('payRate').className}>
            <span>Pay Rate</span>
            <input
              type="number"
              min="0"
              step="0.01"
              value={draft.payRate}
              onChange={(event) =>
                handleFieldChange('payRate', event.target.value)
              }
              aria-invalid={getFieldState('payRate').invalid}
              aria-describedby={getFieldState('payRate').describedBy}
            />
            {renderFieldError('payRate')}
          </label>

          <label className={getFieldState('payRateId').className}>
            <span>Pay Rate ID</span>
            <input
              type="number"
              min="0"
              step="1"
              value={draft.payRateId}
              onChange={(event) =>
                handleFieldChange('payRateId', event.target.value)
              }
              aria-invalid={getFieldState('payRateId').invalid}
              aria-describedby={getFieldState('payRateId').describedBy}
            />
            {renderFieldError('payRateId')}
          </label>

          <label className={getFieldState('paidToDate').className}>
            <span>Paid To Date</span>
            <input
              type="number"
              min="0"
              step="0.01"
              value={draft.paidToDate}
              onChange={(event) =>
                handleFieldChange('paidToDate', event.target.value)
              }
              aria-invalid={getFieldState('paidToDate').invalid}
              aria-describedby={getFieldState('paidToDate').describedBy}
            />
            {renderFieldError('paidToDate')}
          </label>

          <label className={getFieldState('paidLastYear').className}>
            <span>Paid Last Year</span>
            <input
              type="number"
              min="0"
              step="0.01"
              value={draft.paidLastYear}
              onChange={(event) =>
                handleFieldChange('paidLastYear', event.target.value)
              }
              aria-invalid={getFieldState('paidLastYear').invalid}
              aria-describedby={getFieldState('paidLastYear').describedBy}
            />
            {renderFieldError('paidLastYear')}
          </label>
        </div>

        <label className="employee-admin-toggle">
          <input
            type="checkbox"
            checked={draft.isShareholder}
            onChange={(event) =>
              handleFieldChange('isShareholder', event.target.checked)
            }
          />
          <span>Employee is a shareholder</span>
        </label>

        <div className="employee-admin-footnote">
          {employee
            ? `Last updated: ${formatTimestamp(employee.updatedAt)}`
            : 'New records are written to MongoDB first, then dispatched to downstream sync.'}
        </div>

        </form>
      </div>

      <div className="employee-admin-form-actions">
        <button
          type="button"
          className="employee-admin-secondary-btn"
          onClick={resetDraft}
        >
          Reset
        </button>
        {isEditing && (
          <button
            type="button"
            className="employee-admin-danger-btn"
            onClick={onDelete}
            disabled={deleting}
          >
            {deleting ? 'Deleting...' : 'Delete Employee'}
          </button>
        )}
        <button
          type="submit"
          form={formId}
          className="employee-admin-primary-btn"
          disabled={saving}
        >
          {saving ? 'Saving...' : isEditing ? 'Save Employee' : 'Create Employee'}
        </button>
      </div>
    </aside>
  );
});

function AdminEmployeesModal({
  onClose,
  onMutationComplete,
  allowMutations = false,
  variant = 'modal',
}) {
  const { notifyError, notifySuccess } = useToast();
  const { setPageRefreshConfig } = useDashboardPageChrome();
  const isModal = variant === 'modal';
  const [employees, setEmployees] = useState([]);
  const [pagination, setPagination] = useState({
    total: 0,
    page: 1,
    limit: 20,
    pages: 1,
  });
  const [departments, setDepartments] = useState([]);
  const [employmentTypes, setEmploymentTypes] = useState(
    DEFAULT_EMPLOYMENT_TYPES,
  );
  const [genders, setGenders] = useState(DEFAULT_GENDERS);
  const [nextEmployeeId, setNextEmployeeId] = useState('');
  const [loadingList, setLoadingList] = useState(true);
  const [loadingOptions, setLoadingOptions] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState('');
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [syncFeedback, setSyncFeedback] = useState(null);
  const [syncEvidence, setSyncEvidence] = useState(null);
  const [syncEvidenceError, setSyncEvidenceError] = useState('');
  const [loadingSyncEvidence, setLoadingSyncEvidence] = useState(false);
  const [evidenceEmployeeId, setEvidenceEmployeeId] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [searchInput, setSearchInput] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [selectedEmployeeId, setSelectedEmployeeId] = useState('');
  const [editorMode, setEditorMode] = useState('hidden');

  const modalRef = useRef(null);
  const closeButtonRef = useRef(null);
  const lastFocusedElementRef = useRef(null);
  const pageModeTitle = isModal ? 'Employee Source Manager' : 'Employee source records';
  const pageModeDescription = isModal
    ? 'Review source records first. Create, edit, and delete actions stay behind super-admin access.'
    : 'Search the HR source-of-truth, update employee data, and monitor downstream sync from one workspace.';

  const selectedEmployee = useMemo(
    () => employees.find((employee) => employee?._id === selectedEmployeeId) || null,
    [employees, selectedEmployeeId],
  );
  const editorVisible = allowMutations && editorMode !== 'hidden';
  const visibleStart = pagination.total === 0 ? 0 : (page - 1) * pageSize + 1;
  const visibleEnd =
    pagination.total === 0 ? 0 : Math.min(page * pageSize, pagination.total);

  const clearMessages = useCallback(() => {
    setError('');
    setSuccessMessage('');
    setSyncFeedback(null);
  }, []);

  const clearSyncEvidence = useCallback(() => {
    setSyncEvidence(null);
    setSyncEvidenceError('');
    setEvidenceEmployeeId('');
  }, []);

  const loadEmployees = useCallback(
    async ({
      nextPage,
      nextSearch,
      nextDepartment,
      nextEmploymentType,
      nextPageSize,
      silent = false,
    }) => {
      if (silent) {
        setRefreshing(true);
      } else {
        setLoadingList(true);
      }
      setError('');

      try {
        const response = await getEmployeesPage({
          page: nextPage,
          limit: nextPageSize,
          search: nextSearch,
          departmentId: nextDepartment,
          employmentType: nextEmploymentType,
        });

        const rows = Array.isArray(response?.data) ? response.data : [];
        setEmployees(rows);
        setPagination({
          total: response?.pagination?.total || 0,
          page: response?.pagination?.page || nextPage,
          limit: response?.pagination?.limit || nextPageSize,
          pages: response?.pagination?.pages || 1,
        });

        if (
          selectedEmployeeId &&
          !rows.some((employee) => employee?._id === selectedEmployeeId)
        ) {
          setSelectedEmployeeId('');
          if (editorMode === 'edit') {
            setEditorMode('hidden');
            clearSyncEvidence();
          }
        }
      } catch (fetchError) {
        setEmployees([]);
        setPagination((current) => ({
          ...current,
          total: 0,
          pages: 1,
        }));
        const message = getErrorMessage(fetchError, 'Unable to load employees');
        setError(message);
        notifyError('Employee source load failed', message);
      } finally {
        if (silent) {
          setRefreshing(false);
        } else {
          setLoadingList(false);
        }
      }
    },
    [clearSyncEvidence, editorMode, notifyError, selectedEmployeeId],
  );

  const loadOptions = useCallback(async () => {
    setLoadingOptions(true);
    setError('');

    try {
      const response = await getEmployeeEditorOptions();
      const responseDepartments = Array.isArray(response?.data?.departments)
        ? response.data.departments
        : [];
      const responseEnums = response?.data?.enums || {};

      setDepartments(responseDepartments);
      setEmploymentTypes(
        Array.isArray(responseEnums.employmentType) &&
          responseEnums.employmentType.length > 0
          ? responseEnums.employmentType
          : DEFAULT_EMPLOYMENT_TYPES,
      );
      setGenders(
        Array.isArray(responseEnums.gender) && responseEnums.gender.length > 0
          ? responseEnums.gender
          : DEFAULT_GENDERS,
      );
      setNextEmployeeId(response?.data?.nextEmployeeId || '');
    } catch (optionsError) {
      setDepartments([]);
      setEmploymentTypes(DEFAULT_EMPLOYMENT_TYPES);
      setGenders(DEFAULT_GENDERS);
      setNextEmployeeId('');
      const message = getErrorMessage(optionsError, 'Unable to load employee editor options');
      setError(message);
      notifyError('Employee editor setup failed', message);
    } finally {
      setLoadingOptions(false);
    }
  }, [notifyError]);

  const loadSyncEvidence = useCallback(
    async (employeeId, { silent = false, suppressToast = false } = {}) => {
      const normalizedEmployeeId = String(employeeId || '').trim();

      if (!normalizedEmployeeId) {
        clearSyncEvidence();
        return;
      }

      setEvidenceEmployeeId(normalizedEmployeeId);
      setSyncEvidenceError('');
      setLoadingSyncEvidence(true);

      try {
        const response = await getEmployeeSyncEvidence(normalizedEmployeeId);
        setSyncEvidence(response?.data || null);
      } catch (fetchError) {
        const message = getErrorMessage(fetchError, 'Unable to load sync evidence');
        setSyncEvidence(null);
        setSyncEvidenceError(message);
        if (!silent && !suppressToast) {
          notifyError('Employee sync evidence failed', message);
        }
      } finally {
        setLoadingSyncEvidence(false);
      }
    },
    [clearSyncEvidence, notifyError],
  );

  useEffect(() => {
    void loadOptions();
  }, [loadOptions]);

  useEffect(() => {
    void loadEmployees({
      nextPage: page,
      nextSearch: debouncedSearch,
      nextDepartment: departmentFilter,
      nextEmploymentType: typeFilter,
      nextPageSize: pageSize,
      silent: page !== 1 || Boolean(debouncedSearch || departmentFilter || typeFilter),
    });
  }, [
    debouncedSearch,
    departmentFilter,
    loadEmployees,
    page,
    pageSize,
    typeFilter,
  ]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchInput.trim());
    }, 250);

    return () => clearTimeout(timer);
  }, [searchInput]);

  useEffect(() => {
    if (!isModal) {
      return undefined;
    }
    lastFocusedElementRef.current = document.activeElement;
    closeButtonRef.current?.focus();

    return () => {
      if (
        lastFocusedElementRef.current &&
        typeof lastFocusedElementRef.current.focus === 'function'
      ) {
        lastFocusedElementRef.current.focus();
      }
    };
  }, [isModal]);

  const handleSearchChange = useCallback((value) => {
    setPage(1);
    setSearchInput(value);
  }, []);

  const handleDepartmentFilterChange = useCallback((value) => {
    setPage(1);
    setDepartmentFilter(value);
  }, []);

  const handleTypeFilterChange = useCallback((value) => {
    setPage(1);
    setTypeFilter(value);
  }, []);

  const handlePageSizeChange = useCallback((value) => {
    setPage(1);
    setPageSize(value);
  }, []);

  const handlePageChange = useCallback((value) => {
    setPage(value);
  }, []);

  const openCreatePanel = useCallback(() => {
    setEditorMode('create');
    setSelectedEmployeeId('');
    clearMessages();
    clearSyncEvidence();
  }, [clearMessages, clearSyncEvidence]);

  const closeEditorPanel = useCallback(() => {
    setEditorMode('hidden');
    setSelectedEmployeeId('');
    clearMessages();
    clearSyncEvidence();
  }, [clearMessages, clearSyncEvidence]);

  const handleEdit = useCallback(
    (employee) => {
      if (!allowMutations) return;
      setEditorMode('edit');
      setSelectedEmployeeId(employee?._id || '');
      clearMessages();
      setSyncEvidence(null);
      setSyncEvidenceError('');
      setEvidenceEmployeeId(String(employee?.employeeId || '').trim());
    },
    [allowMutations, clearMessages],
  );

  const handleRefresh = useCallback(async () => {
    clearMessages();
    await Promise.allSettled([
      loadOptions(),
      loadEmployees({
        nextPage: page,
        nextSearch: debouncedSearch,
        nextDepartment: departmentFilter,
        nextEmploymentType: typeFilter,
        nextPageSize: pageSize,
        silent: true,
      }),
      evidenceEmployeeId
        ? loadSyncEvidence(evidenceEmployeeId, { silent: true, suppressToast: true })
        : Promise.resolve(),
    ]);
  }, [
    clearMessages,
    debouncedSearch,
    departmentFilter,
    evidenceEmployeeId,
    loadEmployees,
    loadOptions,
    loadSyncEvidence,
    page,
    pageSize,
    typeFilter,
  ]);

  useEffect(() => {
    if (isModal) {
      return undefined;
    }

    setPageRefreshConfig({
      label: 'Refresh employees',
      refreshing: loadingList || loadingOptions || refreshing || saving || loadingSyncEvidence,
      onRefresh: handleRefresh,
    });

    return () => {
      setPageRefreshConfig(null);
    };
  }, [
    handleRefresh,
    isModal,
    loadingList,
    loadingOptions,
    loadingSyncEvidence,
    refreshing,
    saving,
    setPageRefreshConfig,
  ]);

  useEffect(() => {
    if (!editorVisible || editorMode !== 'edit') {
      return undefined;
    }

    const employeeId = String(selectedEmployee?.employeeId || '').trim();
    if (!employeeId) {
      return undefined;
    }

    void loadSyncEvidence(employeeId, { suppressToast: true });
    return undefined;
  }, [editorMode, editorVisible, loadSyncEvidence, selectedEmployee?.employeeId]);

  useEffect(() => {
    if (!editorVisible || !evidenceEmployeeId) {
      return undefined;
    }

    const overallStatus = String(syncEvidence?.overall?.status || '').toLowerCase();
    const queueStatus = String(syncEvidence?.queue?.status || '').toUpperCase();
    const shouldPoll = overallStatus === 'pending'
      || queueStatus === 'PENDING'
      || queueStatus === 'PROCESSING';

    if (!shouldPoll) {
      return undefined;
    }

    const timer = setTimeout(() => {
      void loadSyncEvidence(evidenceEmployeeId, {
        silent: true,
        suppressToast: true,
      });
    }, 4000);

    return () => clearTimeout(timer);
  }, [
    editorVisible,
    evidenceEmployeeId,
    loadSyncEvidence,
    syncEvidence?.overall?.status,
    syncEvidence?.queue?.status,
  ]);

  const handleSubmit = useCallback(
    async (payload, { isEditing }) => {
      if (!allowMutations) return false;

      setSaving(true);
      clearMessages();

      try {
        const response = isEditing
          ? await updateEmployeeRecord(selectedEmployeeId, payload)
          : await createEmployeeRecord(payload);

        setSyncFeedback(response?.sync || null);
        const employeeIdLabel =
          response?.data?.employeeId ||
          selectedEmployee?.employeeId ||
          nextEmployeeId ||
          'the selected employee';
        const successText = `${isEditing ? 'Updated' : 'Created'} employee ${
          employeeIdLabel
        }. ${response?.sync?.message || 'Source record saved.'}`;
        setSuccessMessage(successText);
        notifySuccess(
          isEditing ? 'Employee updated' : 'Employee created',
          successText,
        );

        await loadEmployees({
          nextPage: page,
          nextSearch: debouncedSearch,
          nextDepartment: departmentFilter,
          nextEmploymentType: typeFilter,
          nextPageSize: pageSize,
          silent: true,
        });

        if (response?.data?.employeeId || selectedEmployee?.employeeId) {
          await loadSyncEvidence(
            response?.data?.employeeId || selectedEmployee?.employeeId,
            { silent: true, suppressToast: true },
          );
        }

        if (!isEditing) {
          await loadOptions();
        }

        if (typeof onMutationComplete === 'function') {
          await onMutationComplete();
        }

        return !isEditing;
      } catch (submitError) {
        const message = getErrorMessage(
          submitError,
          `Unable to ${isEditing ? 'update' : 'create'} employee`,
        );
        setError(message);
        notifyError(
          isEditing ? 'Employee update failed' : 'Employee creation failed',
          message,
        );
        return false;
      } finally {
        setSaving(false);
      }
    },
    [
      allowMutations,
      clearMessages,
      debouncedSearch,
      departmentFilter,
      loadEmployees,
      onMutationComplete,
      page,
      pageSize,
      loadOptions,
      loadSyncEvidence,
      nextEmployeeId,
      selectedEmployee,
      selectedEmployeeId,
      typeFilter,
      notifyError,
      notifySuccess,
    ],
  );

  const handleDelete = useCallback(
    async (employee) => {
      if (!allowMutations || !employee?._id) return;

      const confirmed = window.confirm(
        `Delete employee ${employee.employeeId} from the HR source system? This will also dispatch a downstream DELETE sync.`,
      );

      if (!confirmed) return;

      setDeletingId(employee._id);
      clearMessages();

      try {
        const response = await deleteEmployeeRecord(employee._id);
        const nextPage = employees.length === 1 && page > 1 ? page - 1 : page;

        setSyncFeedback(response?.sync || null);
        await loadSyncEvidence(employee.employeeId, {
          silent: true,
          suppressToast: true,
        });
        const successText = `${employee.employeeId} deleted. ${
          response?.sync?.message || 'Delete dispatched.'
        }`;
        setSuccessMessage(successText);
        notifySuccess('Employee deleted', successText);

        if (selectedEmployeeId === employee._id) {
          setSelectedEmployeeId('');
          setEditorMode('hidden');
        }

        if (nextPage !== page) {
          setPage(nextPage);
        } else {
          await loadEmployees({
            nextPage,
            nextSearch: debouncedSearch,
            nextDepartment: departmentFilter,
            nextEmploymentType: typeFilter,
            nextPageSize: pageSize,
            silent: true,
          });
        }

        if (typeof onMutationComplete === 'function') {
          await onMutationComplete();
        }
      } catch (deleteError) {
        const message = getErrorMessage(deleteError, 'Unable to delete employee');
        setError(message);
        notifyError('Employee deletion failed', message);
      } finally {
        setDeletingId('');
      }
    },
    [
      allowMutations,
      clearMessages,
      debouncedSearch,
      departmentFilter,
      employees.length,
      loadEmployees,
      onMutationComplete,
      page,
      pageSize,
      selectedEmployeeId,
      typeFilter,
      loadSyncEvidence,
      notifyError,
      notifySuccess,
    ],
  );

  const handleModalKeyDown = useCallback(
    (event) => {
      if (!isModal) return;
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose?.();
        return;
      }

      if (event.key !== 'Tab' || !modalRef.current) return;
      const focusableElements = modalRef.current.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
      );
      if (focusableElements.length === 0) return;

      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];

      if (event.shiftKey && document.activeElement === firstElement) {
        event.preventDefault();
        lastElement.focus();
      } else if (!event.shiftKey && document.activeElement === lastElement) {
        event.preventDefault();
        firstElement.focus();
      }
    },
    [isModal, onClose],
  );

  const content = (
      <div
        ref={modalRef}
        className={`employee-admin-card${isModal ? '' : ' employee-admin-card--page'}`}
        data-testid="employee-admin-card"
        role={isModal ? 'dialog' : 'region'}
        aria-modal={isModal ? 'true' : undefined}
        aria-labelledby="employee-admin-title"
        onKeyDown={handleModalKeyDown}
      >
        <div className="employee-admin-header">
          <div>
            <h2 id="employee-admin-title">{pageModeTitle}</h2>
            <p>
              {pageModeDescription}
            </p>
          </div>

          <div className="employee-admin-header-actions">
            <button
              type="button"
              className="employee-admin-refresh-btn"
              onClick={handleRefresh}
              disabled={refreshing || loadingList || saving}
            >
              <FiRefreshCw size={14} className={refreshing ? 'spin' : ''} />
              {refreshing ? 'Refreshing...' : 'Refresh'}
            </button>
            {isModal && (
              <button
                ref={closeButtonRef}
                type="button"
                className="employee-admin-close-btn"
                aria-label="Close employee source manager"
                onClick={() => onClose?.()}
              >
                <FiX size={16} />
              </button>
            )}
          </div>
        </div>

        <div
          className={`employee-admin-summary${
            isModal ? '' : ' employee-admin-summary--page'
          }`}
        >
          <span>
            <FiUsers size={14} />
            Total employees: {pagination.total.toLocaleString('en-US')}
          </span>
          <span>
            <FiShield size={14} />
            {allowMutations
              ? 'Super-admin write access'
              : 'Read-only viewer mode'}
          </span>
          <span>Sync mode: Source write + downstream dispatch</span>
        </div>

        {error && (
          <div className="employee-admin-inline-message error">{error}</div>
        )}
        {!error && successMessage && (
          <div className="employee-admin-inline-message success">
            {successMessage}
          </div>
        )}

        <div
          className={`employee-admin-workspace ${
            editorVisible ? 'editor-open' : ''
          }${isModal ? '' : ' employee-admin-workspace--page'}`}
          data-testid="employee-admin-workspace"
        >
          <EmployeeTablePanel
            variant={variant}
            employees={employees}
            departments={departments}
            loadingList={loadingList}
            allowMutations={allowMutations}
            searchInput={searchInput}
            onSearchChange={handleSearchChange}
            departmentFilter={departmentFilter}
            onDepartmentFilterChange={handleDepartmentFilterChange}
            typeFilter={typeFilter}
            onTypeFilterChange={handleTypeFilterChange}
            employmentTypes={employmentTypes}
            loadingOptions={loadingOptions}
            onNewEmployee={openCreatePanel}
            selectedEmployeeId={selectedEmployeeId}
            deletingId={deletingId}
            onEditEmployee={handleEdit}
            onDeleteEmployee={handleDelete}
            page={page}
            pageSize={pageSize}
            pageCount={pagination.pages || 1}
            totalRecords={pagination.total}
            visibleStart={visibleStart}
            visibleEnd={visibleEnd}
            onPageSizeChange={handlePageSizeChange}
            onPageChange={handlePageChange}
          />

          {editorVisible && (
            <EmployeeEditorPanel
              variant={variant}
              key={editorMode === 'edit' ? `edit-${selectedEmployeeId}` : 'create'}
              mode={editorMode}
              employee={selectedEmployee}
              employmentTypes={employmentTypes}
              genders={genders}
                departments={departments}
              nextEmployeeId={nextEmployeeId}
              loadingOptions={loadingOptions}
              saving={saving}
              deleting={Boolean(deletingId && selectedEmployeeId === deletingId)}
              syncFeedback={syncFeedback}
              syncEvidence={syncEvidence}
              syncEvidenceError={syncEvidenceError}
              loadingSyncEvidence={loadingSyncEvidence}
              onSubmit={handleSubmit}
              onDelete={() => handleDelete(selectedEmployee)}
              onHide={closeEditorPanel}
              onSwitchToCreate={openCreatePanel}
              onRefreshEvidence={() =>
                loadSyncEvidence(
                  syncEvidence?.employeeId
                    || evidenceEmployeeId
                    || selectedEmployee?.employeeId,
                  { suppressToast: false },
                )
              }
            />
          )}
        </div>
      </div>
  );

  if (!isModal) {
    return (
      <div
        className="employee-admin-page-shell"
        data-testid="employee-admin-page-shell"
      >
        {content}
      </div>
    );
  }

  return (
    <div className="employee-admin-overlay" role="presentation">
      {content}
    </div>
  );
}

export default AdminEmployeesModal;
