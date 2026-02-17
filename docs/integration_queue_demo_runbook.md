# Integration Queue Demo Runbook (60-90s)

> Purpose: Show Case Study 4 middleware behavior end-to-end with clear states.

## 1) Preconditions
- Backend is running (`npm run dev` in `SIP_CS`).
- Dashboard is running (`npm run dev` in `SIP_CS/dashboard`).
- Logged in as admin account.

## 2) Quick Scenarios
Run one command before opening/refreshing the dashboard:

```bash
npm run demo:queue:warning
```

Or:

```bash
npm run demo:queue:critical
```

Cleanup after demo:

```bash
npm run demo:queue:cleanup
```

## 3) What To Show On Screen
1. Open `Integration Exceptions` panel.
2. Point to:
- `Queue Warning` or `Queue Critical` badge.
- KPI values: `Backlog`, `Actionable`, `Oldest Pending`.
- Status chips: `P`, `PR`, `F`, `D`, `S`.
3. Filter `FAILED` or `DEAD`.
4. Click `Retry` on one row, then `Retry DEAD (All)` for bulk recovery.
5. Use `Replay Filters` once to demonstrate controlled replay.
6. Refresh and show queue moving toward `Healthy`.

## 4) Mapping To Case Study 4
- Middleware-lite: Outbox + Worker + retry flow.
- Manage-by-exception: queue-level risk shown in UI.
- Operational control: per-item retry + bulk retry + filtered replay.

## 5) Notes
- Demo rows use `EMP_DEMO_QUEUE_*` IDs.
- `PENDING` and `FAILED` demo rows are held with future `next_run_at` so they stay visible during demo.

## 6) One-command Flow
```bash
npm run demo:queue:flow
```

Short rehearsal example:
```bash
npm run demo:queue:flow -- 5 5
```
