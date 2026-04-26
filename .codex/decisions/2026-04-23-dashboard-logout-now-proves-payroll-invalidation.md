# Decision

- Date: 2026-04-23
- Topic: Symmetric browser-auth proof must include Dashboard logout invalidating Payroll

# Context

The browser auth smoke already proved:

- Dashboard sign-in restores protected Dashboard routes
- Dashboard session restores Payroll evidence
- Payroll sign-out invalidates Dashboard access

The remaining asymmetry was that the reverse logout direction was not explicitly
proven in the automated browser gate.

# Decision

Extend `scripts/verify-case3-browser-auth.ps1` so the Dashboard-first flow now:

1. signs into Dashboard
2. restores Payroll in the same browser context
3. signs out from Dashboard
4. reloads the open Payroll tab
5. asserts Payroll returns to the signed-out state with its sign-in prompt

# Why

This closes the last meaningful proof gap in the homework SSO story:

- one shared session across HR/Dashboard and Payroll
- restore in both directions
- logout propagation in both directions

That makes the claim materially stronger than a one-way demo.

# Verification

- `npm run verify:case3`

The run passed and now includes the new Dashboard logout -> Payroll invalidation proof.
