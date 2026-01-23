# Test Plan - SIP-CS Executive Dashboard

## 1. Overview
This document defines the testing strategy for the SIP-CS Executive Dashboard, prepared **before development** as required by Case Study 2 guidelines.

---

## 2. Test Scope

| Component | In Scope | Out of Scope |
|-----------|----------|--------------|
| Dashboard API | ✅ All endpoints | Legacy MySQL internals |
| Dashboard UI | ✅ Core widgets | CSS pixel-perfect |
| Sync Service | ✅ HR ↔ Payroll sync | Two-phase locking |
| Adapters | ✅ Payroll, Mock | Future SAP adapter |

---

## 3. Test Types

### 3.1 Unit Tests
- **Target**: Individual functions (e.g., `formatCurrency`, data transformations)
- **Tool**: Jest
- **Coverage Goal**: 60% for services

### 3.2 Integration Tests
- **Target**: API endpoints with mocked auth
- **Tool**: Jest + Supertest
- **Location**: `tests/integration/`
- **Key Tests**:
  - `/api/dashboard/earnings` returns correct summary
  - `/api/dashboard/drilldown` supports filters and search
  - `/api/dashboard/departments` returns dynamic list

### 3.3 Manual UI Tests
- **Target**: Dashboard visual correctness
- **Approach**: Checklist-based manual testing

---

## 4. Test Cases (Integration)

| ID | Endpoint | Test Case | Expected |
|----|----------|-----------|----------|
| T01 | GET /earnings | Valid year param | 200 + earnings data |
| T02 | GET /earnings | No auth token | 403 |
| T03 | GET /drilldown | Filter by dept name | Filtered results |
| T04 | GET /drilldown | Search by name | Matching employees |
| T05 | GET /drilldown | Invalid dept | Empty array |
| T06 | GET /departments | No params | Sorted dept list |
| T07 | GET /benefits | No params | Grouped by plan |

---

## 5. Test Data

| Source | Data | Purpose |
|--------|------|---------|
| MongoDB | 500k+ Employees | Performance testing |
| MySQL | Payroll records | Sync verification |
| Fixtures | Mock employees | Unit tests |

---

## 6. Entry/Exit Criteria

### Entry Criteria (Start Testing)
- [ ] API server runs without errors
- [ ] Database connections successful
- [ ] Test fixtures loaded

### Exit Criteria (Release Ready)
- [ ] All T01-T07 tests pass
- [ ] No critical bugs open
- [ ] Performance: Dashboard loads < 3s

---

## 7. Test Schedule

| Phase | Activity | Duration |
|-------|----------|----------|
| 1 | Write test cases | 1 day |
| 2 | Implement integration tests | 2 days |
| 3 | Execute & fix | 1 day |
| 4 | Final regression | 0.5 day |

---

## 8. Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Slow DB queries | Tests timeout | Use indexed queries |
| Auth mocking fails | Tests blocked | Pre-configure mock middleware |
| Flaky async tests | False failures | Add proper awaits/timeouts |
