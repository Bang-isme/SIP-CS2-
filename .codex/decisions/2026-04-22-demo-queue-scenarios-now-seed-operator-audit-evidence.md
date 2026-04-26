# Decision: 2026-04-22-demo-queue-scenarios-now-seed-operator-audit-evidence
Date: 2026-04-22
Status: accepted

## Context
The Operations page now exposes queue-level audit history, but the existing demo queue scripts only seeded event statuses. That meant the new audit surface was technically correct yet often empty during a live walkthrough unless an operator manually performed retry/replay/recover actions first.

## Decision
Extend the queue demo scenario seeding so warning and critical queue states also create matching operator audit entries and align `last_operator_*` fields on representative demo events.

## Alternatives Considered
Leave audit panels empty until a live operator action occurs; add a separate audit-only seed script; hardcode fake audit rows in the frontend; document the gap and rely on verbal explanation during demo.

## Reasoning
The purpose of the queue demo is not only to show backlog severity. It should show the whole operator story: queue pressure, recovery controls, parity evidence, and operator audit evidence together. Seeding realistic audit history in the same scenario gives a much stronger and more honest demo because the UI is showing real backend records, just pre-arranged for the walkthrough.

## Consequences
- `demo-integration-queue-scenario.js` now seeds operator audit records for representative pending, failed, and dead demo events.
- Demo queue cleanup removes both events and their linked audit records.
- The warning/critical demo flow is now strong enough to show `Audit` in Operations immediately after refresh.
- Backend verification remains green, and runtime smoke confirms the seeded audit route is queryable through the live API.
