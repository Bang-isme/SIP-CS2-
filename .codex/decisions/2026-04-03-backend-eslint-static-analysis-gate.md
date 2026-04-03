# Decision: Backend ESLint static-analysis gate

- Date: 2026-04-03
- Scope: backend quality gate

## Context

Backend `npm run lint` was previously only a syntax pass implemented by `scripts/lint-backend.js`. That was useful as a fast baseline, but it could not catch runtime hazards such as `no-undef`, unreachable code, or duplicate keys.

## Decision

- Keep the existing syntax pass as `lint:syntax` for a cheap parser-level gate.
- Add a real ESLint stage as `lint:static`.
- Make `npm run lint` execute both stages in order.
- Start with a deliberately narrow ESLint rule set focused on runtime-safety signals:
  - `no-undef`
  - `no-unreachable`
  - `no-dupe-keys`
  - `no-self-assign`
  - `no-constant-condition` with loop exceptions
- Expand that baseline immediately after the first pass to include:
  - `no-unused-vars`
  - `no-empty`
- After the cleanup pass, tighten the gate one step more with:
  - `eqeqeq`
  - `no-useless-catch`

## Rationale

- This improves backend reliability without opening a large style-only cleanup track.
- The repo already contains many docs/memory/runtime scripts, so a strict style rollout would create noise and slow delivery.
- A narrow safety-first config is a better fit for coursework/demo hardening.
- The first ESLint dry-run exposed only a small, high-signal cleanup set (unused imports/helpers, empty catch blocks, dead route imports), which confirmed the repo is ready for these additional non-style rules.
- `eqeqeq` and `no-useless-catch` added further signal without surfacing new debt, so they are cheap wins for the ongoing backend quality bar.

## Consequences

- Backend lint is now materially stronger than syntax-only checks.
- The remaining quality-gap message in docs should move from "add ESLint" to "expand ESLint/static analysis further if desired".
- Future tightening can add rules incrementally once the team wants a stricter code-quality bar.
