# Decision: Case 3 Runtime Recovery And UI Signal Tightening

Date: 2026-04-24

## Context

The repo already had strong clean-start verification, but a live audit exposed two remaining credibility gaps:

- `Dashboard` did not reliably recover readiness after Mongo returned unless the process was restarted.
- Several operator-facing surfaces still felt generic or noisy even when the underlying logic was strong.

The goal for this iteration was to improve real runtime trust, not to redesign the system or add fake enterprise complexity.

## Decision

Use a narrow, evidence-driven uplift:

1. add shared Mongo reconnect behavior at the runtime layer
2. make `case3` startup and recovery checks depend on `/api/health/ready`
3. add a dedicated Mongo dependency recovery smoke
4. remove the most obvious generic/noisy UI signals on `Overview`, `Analytics`, `Manage Employees`, and `Payroll`
5. eliminate favicon-related browser noise for `SA` and `Payroll`

## Why

- Clean boot is not enough for a system that claims to feel operationally real.
- Readiness should mean dependency-usable, not merely “port is open”.
- UI credibility drops when operator surfaces repeat the same state or force columns into unreadable widths.
- Browser noise such as favicon 404s makes an otherwise solid runtime feel unfinished.

## Delivered

- Mongo reconnect scheduling in `src/database.js`
- `/favicon.ico` 204 handling in `src/apps/baseApp.js`
- ready-endpoint startup waits in `scripts/start-case3-stack.ps1`
- dedicated recovery smoke in `scripts/verify-case3-mongo-recovery.ps1`
- `verify:case3` wiring for recovery smoke in `scripts/verify-case3-stack.ps1`
- action-specific analytics quick-check labels in `dashboard/src/components/ChartsSection.jsx`
- less repetitive overview briefing in `dashboard/src/components/ExecutiveBrief.jsx`
- explicit internal scroll strategy for employee admin tables in `dashboard/src/components/AdminEmployeesModal.jsx` and `.css`
- signed-in proof-first weighting for Payroll console in `public/payroll-console/app.js`, `index.html`, and `styles.css`

## Verification

- `npm run lint`
- targeted backend contracts:
  - `src/__tests__/service.apps.test.js`
  - `src/__tests__/local.stack.contract.test.js`
  - `src/__tests__/runtime.hardening.contract.test.js`
- `npm --prefix dashboard run verify:frontend`
- `npm run verify:case3`
- browser audit on live runtime:
  - no console errors
  - no page errors
  - no favicon 404s
  - `Overview` no longer shows the old duplicated pill state
  - `Analytics` quick checks show action-specific CTA text
  - `Manage Employees` uses internal horizontal scroll on medium desktop
  - signed-in Payroll sessions prefer proof over auth narrative

## Honest Limit

`npm run verify:backend` full-suite reruns still hit intermittent environment timeout in this machine context, so the confidence for this iteration rests on targeted contracts plus `verify:case3` end-to-end rather than a fresh full-suite backend pass.
