# Case Study 1 - Proposal

> Last Updated: 2026-04-14

## Problem Statement

The coursework starts from a common enterprise situation:

- HR data lives in one operational system.
- Payroll data lives in another operational system.
- Management still needs one place to review the situation quickly.

The original weak point in this repo was runtime shape: the code behaved like one backend process talking to MongoDB and MySQL. That was enough for internal implementation, but weak for oral defense because it did not visibly demonstrate "System Integration".

## Candidate Options

### Option A - One combined backend with two databases

- Fastest to build.
- Easier to test locally.
- Weak for demo defense because the instructor can reasonably call it a modular monolith.

### Option B - Same repo, separate runtime systems

- Keep one repository and shared code.
- Split runtime into distinct systems with distinct ports and route ownership.
- Stronger for demo because system boundaries become visible without forcing a full microservice rewrite.

## Chosen Proposal

The chosen direction is `Option B`.

The repo now runs as:

- `SA / HR Service` on `4000`
- `Payroll Service` on `4100`
- `Dashboard Service` on `4200`

This keeps implementation scope realistic for coursework while making the demo architecture explicit.

## Why This Proposal Fits The Course

This proposal is strong enough for a system-integration course because it demonstrates:

- multiple systems with separate responsibilities
- shared authentication across systems
- source-to-target propagation
- reporting as a separate presentation layer
- operational controls for failure and retry

It avoids over-claiming microservice maturity while still moving far enough away from the "single app with two DBs" criticism.

## Proposed Functional Split

### SA / HR Service

- source-of-truth employee CRUD
- auth and role checks
- sync dispatch
- operator queue controls

### Payroll Service

- read-only downstream payroll evidence
- pay-rate history
- sync-log visibility
- standalone payroll console

### Dashboard Service

- executive summaries
- drilldown and export
- alert review
- memo-oriented reporting

## Key Tradeoff

This proposal does not aim for full microservice independence. Shared code and shared data access remain in the same repo. That tradeoff is intentional.

The deliverable target is:

- strong enough architecture to defend in class
- small enough change set to complete and verify locally

## Expected Deliverables

- three startable services
- service-specific health endpoints
- dashboard frontend rewired to SA + Dashboard APIs
- payroll console for downstream visibility
- updated documentation and demo scripts
