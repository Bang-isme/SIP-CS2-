# Case Study 3 - Test Plan

## Objective
Verify data consistency between HR (MongoDB) and Payroll (MySQL) systems.

---

## Test Environment

| Component | Technology | URL |
|-----------|------------|-----|
| Backend | Node.js/Express | http://localhost:4000 |
| HR Database | MongoDB | mongodb://localhost:27017 |
| Payroll Database | MySQL | localhost:3306 |
| API Client | Postman/curl | - |

---

## Test Cases

### TC-01: Create Employee - Normal Flow

**Precondition**: Both databases online

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | POST /api/employee with valid data | 201 Created |
| 2 | Check MongoDB | Employee document exists |
| 3 | Check MySQL sync_log | Status = SUCCESS |
| 4 | Check MySQL pay_rates | Record created |

**Payload**:
```json
{
  "employeeId": "EMP999999",
  "firstName": "Test",
  "lastName": "User",
  "gender": "Male",
  "employmentType": "Full-time",
  "isShareholder": false,
  "payRate": 50000
}
```

---

### TC-02: Create Employee - MySQL Down

**Precondition**: MySQL service stopped

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Stop MySQL service | Service down |
| 2 | POST /api/employee | 201 Created |
| 3 | Check response | sync.status = "PENDING" |
| 4 | Check MongoDB | Employee exists |
| 5 | Start MySQL | Service up |
| 6 | POST /api/sync/retry | Sync completes |
| 7 | Check sync_log | Status = SUCCESS |

---

### TC-03: Update Employee - Sync PayRate

**Precondition**: Employee exists in both systems

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | PUT /api/employee/:id with payRate change | 200 OK |
| 2 | Check MongoDB | payRate updated |
| 3 | Check MySQL pay_rates | pay_rate updated |
| 4 | Check sync_log | Action = UPDATE, Status = SUCCESS |

---

### TC-04: Delete Employee - Preserve History

**Precondition**: Employee has earnings history

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | DELETE /api/employee/:id | 200 OK |
| 2 | Check MongoDB | Employee deleted |
| 3 | Check MySQL earnings | Records PRESERVED |
| 4 | Check sync_log | Action = DELETE logged |

---

### TC-05: Sync Status API

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | GET /api/sync/status | 200 OK |
| 2 | Check response | Shows PENDING, SUCCESS, FAILED counts |
| 3 | Check healthScore | 0-100 value |

**Expected Response**:
```json
{
  "success": true,
  "data": {
    "PENDING": 0,
    "SUCCESS": 15,
    "FAILED": 0,
    "total": 15,
    "healthScore": 100
  }
}
```

---

### TC-06: Sync Logs API

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | GET /api/sync/logs | 200 OK |
| 2 | GET /api/sync/logs?status=FAILED | Only FAILED logs |
| 3 | Check log fields | entity_type, entity_id, action, status |

---

### TC-07: Retry Failed Syncs

**Precondition**: At least one FAILED sync exists

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | GET /api/sync/logs?status=FAILED | Count > 0 |
| 2 | Ensure MySQL is up | Service running |
| 3 | POST /api/sync/retry | 200 OK |
| 4 | Check response | retried, succeeded, failed counts |
| 5 | GET /api/sync/logs?status=FAILED | Count decreased |

---

## Performance Tests

| Test | Metric | Target |
|------|--------|--------|
| Single sync latency | Time from MongoDB save to sync_log SUCCESS | < 500ms |
| Batch retry | 100 failed syncs retry time | < 30s |
| Concurrent creates | 10 parallel POST requests | All succeed |

---

## Verification Queries

### MongoDB - Check Employee
```javascript
db.employees.findOne({ employeeId: "EMP999999" })
```

### MySQL - Check SyncLog
```sql
SELECT * FROM sync_log 
WHERE entity_id = 'EMP999999' 
ORDER BY createdAt DESC 
LIMIT 1;
```

### MySQL - Check PayRate
```sql
SELECT * FROM pay_rates 
WHERE employee_id = 'EMP999999';
```

---

## Test Results Summary

| Test Case | Status | Notes |
|-----------|--------|-------|
| TC-01 | ⬜ | |
| TC-02 | ⬜ | |
| TC-03 | ⬜ | |
| TC-04 | ⬜ | |
| TC-05 | ⬜ | |
| TC-06 | ⬜ | |
| TC-07 | ⬜ | |

---

## Sign-off

| Role | Name | Date | Signature |
|------|------|------|-----------|
| Developer | | | |
| Tester | | | |
| Instructor | | | |
