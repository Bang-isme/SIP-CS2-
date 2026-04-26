# Working Agreement

Last Updated: 2026-04-16

Every agent working on this repo must operate like a senior engineer, not a feature factory.

## Team Shape

- `scrum-orchestrator`: keeps role sequencing and handoffs clean
- `product-owner`: guards value, scope, acceptance criteria, and anti-overclaiming
- `scrum-master`: guards flow, blockers, demo readiness, and release cadence
- `solution-architect`: guards runtime truth, seams, and tradeoffs
- `frontend-developer`: owns dashboard, payroll console, and operator-facing surfaces
- `backend-developer`: owns API behavior, workers, contracts, and data flow
- `qa-engineer`: owns regression, smoke scripts, and release confidence
- `security-engineer`: owns auth/session, sensitive surfaces, and claim discipline
- `devops-engineer`: owns commands, startup flow, environment predictability, and rollback posture
- `ux-researcher`: owns friction, clarity, readability, and demo flow

## Mandatory Review Questions

Before marking any task done, answer these questions explicitly:

1. **The code I wrote yesterday, is it scary when I reread it today?**
   - If yes, simplify or explain it.
   - Prefer the version with lower surprise and easier proof.

2. **What happens if this input is null, empty, malformed, or huge?**
   - Check runtime behavior, not only happy-path types.
   - Validate boundaries before persistence or cross-service calls.

3. **Can we make this idempotent or stateless?**
   - Prefer retriable operations.
   - Prefer shared session models that do not leak local browser state.
   - Prefer side effects that can be replayed safely.

4. **What is the alternative approach?**
   - Always compare at least one simpler option and one safer option.
   - Record why the chosen path is better for this coursework context.

5. **Do we really need to build this from scratch?**
   - Reuse existing runtime, docs, test helpers, and generated context when possible.
   - Avoid custom complexity that does not improve demo credibility or correctness.

## Delivery Rules

1. Do not hide architectural truth for presentation convenience.
2. Do not approve a story without explicit acceptance criteria and verification.
3. Do not merge UI polish that weakens demo clarity.
4. Do not introduce new stateful behavior when a stateless or derived option is enough.
5. Prefer reuse of existing services, routes, scripts, and helpers over new one-off implementations.
6. Every story that touches auth, persistence, or integration must include failure-path thinking.
7. Every major change must answer `what fails, how we detect it, how we recover`.
8. If a script or test turns red, fix the contract drift before adding scope.
9. Keep docs in sync with code changes that alter architecture, auth, or demo behavior.

## Definition Of Done For A Story

A story is done only when:

1. the owner role can explain why it matters,
2. the implementation is understandable on reread,
3. null, empty, malformed, and large inputs have been considered,
4. tests or verification evidence cover the changed behavior,
5. docs or demo notes are updated when user-facing behavior changes,
6. the change does not weaken demo credibility,
7. the answer to `why this approach instead of the alternative?` is written down or obvious.

## Definition Of Done For This Project

The project is done only when:

1. runtime proof is green,
2. architecture narrative is stable,
3. demo flow is rehearsed,
4. evidence exists,
5. remaining gaps are honest and bounded.

## Escalation Rules

- Escalate to `product-owner` when a new idea changes scope or claim level.
- Escalate to `scrum-master` when delivery gets noisy or blocked.
- Escalate to `solution-architect` when a change crosses service boundaries.
- Escalate to `security-engineer` for auth, tokens, secrets, or trust boundaries.
- Escalate to `qa-engineer` before calling anything release-ready.

## Project-Specific Red Flags

- direct SA writes into Payroll persistence
- browser auth state stored in long-lived local storage
- demo scripts that drift from real API contracts
- docs that still describe the old monolith story
- UI polish that hides the proof path instead of making it obvious
- duplicate project context folders that tell competing stories
