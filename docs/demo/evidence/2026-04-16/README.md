# Final Demo Evidence Pack - 2026-04-16

This is the canonical live proof bundle for the current `SA / Payroll / Dashboard` runtime.

## Scope

This bundle proves:

- the repo runs as three separate services on separate ports
- backend and frontend quality gates pass on the current codebase
- `verify:case3` passes end-to-end on a clean owned stack
- Dashboard reaches `Ready for Memo`
- a source employee created in `SA` appears in the downstream Payroll UI and API

## Command Evidence

- Backend gate: [`logs/verify-backend.log`](./logs/verify-backend.log)
- Frontend gate: [`logs/verify-frontend.log`](./logs/verify-frontend.log)
- Case 3 end-to-end gate: [`logs/verify-case3.log`](./logs/verify-case3.log)
- Stack startup used for visual capture: [`logs/case3-stack-start.log`](./logs/case3-stack-start.log)
- Freeze re-check for the combined gate: [`logs/verify-all-freeze.log`](./logs/verify-all-freeze.log)
- Safe Case 5 readiness snapshot: [`../../../../Memory/DR/case5_readiness_safe_2026-04-16T11-40-32-179Z.json`](../../../../Memory/DR/case5_readiness_safe_2026-04-16T11-40-32-179Z.json)

## Visual Evidence

- SA source system home: [`screenshots/sa-home.png`](./screenshots/sa-home.png)
- Dashboard executive overview: [`screenshots/dashboard-ready-for-memo.png`](./screenshots/dashboard-ready-for-memo.png)
- Payroll downstream proof: [`screenshots/payroll-record.png`](./screenshots/payroll-record.png)

## Data Evidence

- Created evidence employee and downstream sync result: [`data/evidence-employee.json`](./data/evidence-employee.json)
- Browser capture metadata and file map: [`screenshots/capture-metadata.json`](./screenshots/capture-metadata.json)

## Evidence Summary

- Capture timestamp:
  - browser evidence: `2026-04-16T07:05:31.218Z`
  - employee creation proof: `2026-04-16T06:18:31.907Z`
- Evidence employee ID: `EVID-1776320310671`
- Source create sync result:
  - `status=QUEUED`
  - `mode=OUTBOX`
  - `consistency=EVENTUAL`
  - `requiresAttention=false`
  - `correlationId=36351438-82de-44c1-a7b6-912325a1868f`
- Downstream Payroll proof:
  - `payRate=72.25`
  - `payType=HOURLY`
  - latest sync `status=SUCCESS`
  - same correlation ID is visible in Payroll sync evidence
- Dashboard proof:
  - `Ready for Memo`
  - all core datasets current
  - `3 categories already owned`
  - `0 actionable events`

## Notes

- `verify:case3` now enforces a clean owned stack before it runs, instead of silently reusing whatever happens to be listening on the demo ports.
- `case3:stack:start` is the preferred runtime path for manual demo rehearsal and screenshot capture.
- `verify:case3` is a preflight gate, not the command to keep the demo tabs alive.
- `verify:all` now self-manages the local Mongo precondition for backend verification.
- `backend:local:start` still assumes Mongo is already available, so it is not the preferred demo startup path.
