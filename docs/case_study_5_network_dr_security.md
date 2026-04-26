# Case Study 5 - Network, DR, and Security

> Last Updated: 2026-04-14

## Honest Status

Case Study 5 remains partially implemented.

What is implemented in code/runtime:

- service separation by process and port
- shared JWT model across services
- role-based authorization on protected APIs
- health/readiness probes per service
- local operational scripts for startup and verification
- non-destructive `Case 5` readiness snapshot via `npm run case5:readiness:safe`

What is still mostly documentation or rehearsal level:

- real network segmentation rollout
- multi-host deployment
- production-grade DR orchestration
- real failover between regions/sites

## Readiness-Safe Evidence

The repo now includes a non-destructive readiness report:

```powershell
npm run case5:readiness:safe
```

What it captures:

- per-service live/ready health if `SA`, `Payroll`, and `Dashboard` are running
- MySQL schema readiness and missing migrations/tables
- Mongo/MySQL connectivity posture
- auth/security posture flags such as cookie mode and secret separation

What it does not claim:

- real DR failover
- multi-region routing
- production network segmentation rollout
- HA orchestration

## What Improved After The Refactor

The move from one runtime to three services improves the security and operations story because:

- service boundaries are explicit
- health endpoints are per service
- auth is centralized in SA instead of duplicated
- demo questions about system boundaries are easier to answer

## What To Claim

Safe claim:

- "We improved runtime separation, shared auth, and operational visibility, but Case Study 5 is still partial and not a full production DR implementation."
- "We also added a readiness-safe audit artifact so Case Study 5 has runnable operational evidence instead of only static documentation."

Unsafe claim:

- "We already implemented full disaster recovery and production network architecture."
