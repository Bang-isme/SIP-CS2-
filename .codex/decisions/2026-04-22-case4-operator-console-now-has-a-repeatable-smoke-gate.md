# Decision: 2026-04-22-case4-operator-console-now-has-a-repeatable-smoke-gate
Date: 2026-04-22
Status: accepted

## Context
After surfacing parity and audit evidence in the Operations page, the remaining realism gap was verification. The repo had strong backend, frontend, and case3 gates, but Case 4 still relied on "open the page and inspect it" instead of a repeatable smoke path that proved queue severity, parity, and operator audit evidence together.

## Decision
Add a dedicated `verify:case4:operations-demo` smoke script and include it in `verify:case3` by default.

## Alternatives Considered
Leave the Case 4 demo as a manual walkthrough; rely on unit tests plus docs; add a browser-only smoke gate; keep the script separate from `verify:case3`.

## Reasoning
The highest-value improvement was to make the operator console verifiable with the same discipline already applied to auth restore and stack health. A dedicated smoke script can seed demo queue state, validate parity, perform an operator retry, and confirm audit evidence without needing browser automation or visual interpretation.

## Consequences
- `verify:case4:operations-demo` now proves the warning queue scenario, parity snapshot, retry path, and audit trail together.
- `verify:case3` is stronger because it now covers:
  - service health
  - end-to-end source/downstream sync
  - browser auth restore
  - operator-console smoke for Case 4
- Docs can now honestly claim that the operator console path is repeatably verified, not only visually demonstrated.
