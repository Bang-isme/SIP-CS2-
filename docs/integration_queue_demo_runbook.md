# Integration Queue Demo Runbook (60-90s)

> Purpose: show Case Study 4 middleware behavior end-to-end with clear visible states.

## 1. Preconditions

- Split stack is running:
  - `npm run case3:stack:start`
- Signed in with an admin-capable account
- Dashboard is open through Dashboard Service

---

## 2. Quick Scenarios

Run one command before opening or refreshing the dashboard:

```powershell
npm run demo:queue:warning
```

Or:

```powershell
npm run demo:queue:critical
```

Cleanup after demo:

```powershell
npm run demo:queue:cleanup
```

---

## 3. What To Show On Screen

1. Open `Integration Exceptions`.
2. Point to:
   - `Queue Warning` or `Queue Critical`
   - KPI values: `Backlog`, `Actionable`, `Oldest Pending`
   - status chips for event states
3. Filter `FAILED` or `DEAD`.
4. Click `Retry` on one row.
5. Use `Retry DEAD (All)` for bulk recovery.
6. Use `Replay Filters` once to demonstrate controlled replay.
7. Refresh and show queue moving toward `Healthy`.

---

## 4. Mapping To Case Study 4

- Middleware-lite:
  - MongoDB-backed outbox
  - worker polling
  - retry and replay flow
- Manage-by-exception:
  - queue-level risk is visible in UI
- Operational control:
  - per-item retry
  - bulk retry
  - filtered replay
  - stuck-processing recovery

---

## 5. Notes

- Demo rows use `EMP_DEMO_QUEUE_*` IDs.
- `PENDING` and `FAILED` demo rows are held with future `next_run_at` so they remain visible during demo.
- This runbook is for queue behavior only; Payroll ownership evidence should still be shown separately in the Payroll console when defending Case 3.

---

## 6. One-Command Flow

```powershell
npm run demo:queue:flow
```

Short rehearsal example:

```powershell
npm run demo:queue:flow -- 5 5
```
