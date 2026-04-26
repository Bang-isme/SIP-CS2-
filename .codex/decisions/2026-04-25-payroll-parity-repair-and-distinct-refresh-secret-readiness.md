# Decision: Payroll parity repair and distinct refresh secret readiness
Date: 2026-04-25
Status: accepted

## Context
Implemented during final reliability pass for the individual SSO homework. Verification includes backend gate, frontend gate, Case 3 end-to-end sync/recovery, Case 4 operations smoke, Case 5 readiness, and Playwright dashboard route audit.

## Decision
Keep Dashboard, SA, and Payroll operationally aligned by exposing an admin-only reconciliation repair action for extra active Payroll rows, and keep access JWT and refresh JWT secrets distinct in local readiness.

## Alternatives Considered
Leave parity drift as report-only; manually patch Payroll rows in MySQL; downgrade Sequelize to satisfy npm audit; keep REFRESH_SECRET falling back to SECRET in development.

## Reasoning
Report-only parity was safe but not operational enough for a realistic system. The repair action is bounded, audited, and deactivates orphan active pay-rate rows by creating terminated history instead of deleting evidence. Sequelize downgrade was rejected because npm audit suggested a major downgrade; overriding uuid to 14.0.0 keeps production audit clean, with a Jest-only shim for test runtime compatibility. Distinct refresh secrets better match the SSO security model and Case 5 readiness evidence.

## Consequences
(to be filled after implementation)
