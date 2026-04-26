# Decision: 2026-04-22-browser-audit-priority-session-restore-and-smoke-gate
Date: 2026-04-22
Status: accepted

## Context
Evidence came from Playwright CLI sessions on 2026-04-22 against the local three-service stack. SPA navigation across Overview, Analytics, Operations, and Manage Employees works, but hard reload/direct-route restore is not reliable. Console logs showed failed POST /api/auth/refresh during reload, and the app returned to /login. Overview and Operations visuals are materially improved, but session persistence remains the biggest remaining gap versus a production-near system.

## Decision
After live Playwright browser audit, prioritize fixing session restore/deep-link persistence first, then add a browser-level smoke verification gate for login, reload persistence, and critical dashboard routes.

## Alternatives Considered
Keep focusing on UI density polish first; prioritize another operator-facing panel without fixing reload/deep-link auth; rely only on unit/integration/frontend gates without a browser flow gate.

## Reasoning
The browser audit exposed a production-relevant gap that code-level and component-level gates did not catch: after sign-in, reloading or navigating directly to a protected route can drop the operator back to login while the app logs a failed auth refresh. That is a higher-value fix than more visual polish because it affects basic trust in the workspace as a real operating surface. Once fixed, a browser smoke gate has the highest leverage for preventing this class of regression.

## Consequences
(to be filled after implementation)
