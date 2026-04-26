# Decision: compact-sa-payroll-operational-copy-policy
Date: 2026-04-21
Status: accepted

## Context
Implemented on 2026-04-21 while refactoring SA landing, Payroll static console, auth/session responses, employee sync state, integration operator messages, and payroll mutation responses to reduce wording and align FE/BE behavior.

## Decision
SA landing, Payroll console, and SA/Payroll operator-facing API responses should use compact operational copy: short primary messages for UI, optional detail in meta/logs, and layouts that prioritize actions and evidence over narrative demo text.

## Alternatives Considered
Keep existing narrative-heavy demo copy across SA and Payroll; only shorten frontend text while leaving backend messages verbose; collapse SA and Payroll explanations into the dashboard instead of keeping each runtime self-describing.

## Reasoning
The stack is being positioned as a real operating system, not a narrated case-study script. Compact copy improves scan speed, reduces repeated explanation across surfaces, and keeps backend contracts usable for UI without forcing long strings into notices, cards, or toasts. Rich detail still remains available in meta fields and logs for debugging or demo defense.

## Consequences
- SA service landing now behaves like a compact service gateway: tighter hero, shorter labels, smaller action surfaces, and reduced narrative copy.
- Payroll console now follows a more operator-like visual rhythm: denser layout, shorter notices, smaller readiness cards, and clearer `sign in -> lookup -> evidence` progression.
- SA/Payroll backend responses keep short primary messages while moving explanatory detail into `meta.detail` or `meta.hint`, which preserves debuggability without flooding UI text.
- Contract tests must prefer semantic assertions over exact long-form copy because this area will continue to optimize for compact operator language.
