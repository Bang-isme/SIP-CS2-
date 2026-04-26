# Decision: 2026-04-22-operations-audit-trail-surfaced-in-ui
Date: 2026-04-22
Status: accepted

## Context
The Operations page already showed queue health, parity, and recovery controls, but it still forced an operator to trust backend audit behavior without seeing that evidence in the UI. In a real operator console, a queue row should not only show its current status; it should also explain who last intervened, when, and with what scope.

## Decision
Surface integration event audit history directly inside the Operations panel as an on-demand audit trail per event, using the existing backend audit route instead of adding a separate page.

## Alternatives Considered
Keep audit history backend-only; add a separate audit screen; expose raw JSON details in the table itself; postpone audit visibility until after more UI polish work.

## Reasoning
The highest remaining ROI was to close the gap between backend operator integrity and frontend operator trust. The backend already records retry, retry-dead, replay, and recover-stuck actions with actor, request id, source status, target status, and scoped details. Surfacing that in place lets an operator answer "who changed this queue item and why?" without leaving Operations or reading logs.

## Consequences
- Operations now behaves more like a real operator console rather than a queue-only monitor.
- Each selected queue event can show the latest audit entries with action, timestamp, status transition, actor, request id, and scope details.
- Frontend coverage now verifies both successful audit rendering and inline audit failure handling.
- The change avoids adding a new route-level workflow because the evidence belongs exactly where the queue action happened.
