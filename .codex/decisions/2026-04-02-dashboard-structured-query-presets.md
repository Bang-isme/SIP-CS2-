# Decision: dashboard-structured-query-presets
Date: 2026-04-02
Status: accepted

## Context
Case Study 2 dashboard hardening for CEO Memo. Added preset-driven structured queries, saved local drilldown views, benefit-plan filter exposure, and executive action summarization while preserving current backend endpoints.

## Decision
Use client-side memo presets and saved drilldown views inside DrilldownModal, plus an Executive Action Center on the main dashboard, instead of introducing a new backend query catalog.

## Alternatives Considered
Alternative 1: build a shared backend preset catalog with user ownership and API CRUD. Alternative 2: add natural-language query parsing. Alternative 3: leave drilldown fully manual with no repeatable query shortcuts.

## Reasoning
The coursework need is fast, repeatable executive queries for demo and viva, not a multi-user reporting product. Client-side presets reuse the existing API contract, avoid auth/schema churn, and materially improve Case Study 2 defendability. The action center reduces operator guesswork by combining freshness, alert, and queue signals into explicit next steps.

## Consequences
(to be filled after implementation)
