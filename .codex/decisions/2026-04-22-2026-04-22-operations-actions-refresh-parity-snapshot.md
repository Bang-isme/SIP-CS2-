# Decision: 2026-04-22-operations-actions-refresh-parity-snapshot
Date: 2026-04-22
Status: accepted

## Context
During the live audit of the Operations page after Priorities A-D, the panel already refreshed queue events and metrics after retry, recover, and replay, but the SA-vs-Payroll parity snapshot remained stale until a later poll or manual refresh. The refinement closes that loop so the panel behaves more like a real operator console.

## Decision
After retry, recover, and replay actions in the Operations panel, refresh the parity snapshot alongside queue metrics instead of leaving SA-to-Payroll reconciliation stale until the next manual or timed check.

## Alternatives Considered
Refresh only queue events and metrics after operator actions; rely on the 120-second parity poll; require the operator to hit Refresh operations manually after every recovery action.

## Reasoning
An operator action changes the delivery path immediately, so keeping the parity card stale weakens the trustworthiness of the Operations surface. Refreshing reconciliation together with the queue keeps the operator panel internally consistent without pretending to be realtime, because the code still uses an explicit force refresh only after deliberate actions.

## Consequences
- The Operations panel now behaves more like a coherent operator console: queue state and parity evidence move together after deliberate recovery actions.
- Frontend coverage now verifies that `retry`, `recover`, and `replay` trigger a forced reconciliation refresh.
- The implementation still avoids fake realtime claims, because background polling remains bounded and parity force-refresh is reserved for explicit operator actions.
