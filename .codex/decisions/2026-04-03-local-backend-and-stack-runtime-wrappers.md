# 2026-04-03 - Local backend and stack runtime wrappers

## Context

- Local Mongo runtime is now stable enough for the 500k baseline.
- `doctor:local` showed that backend availability was still an operational gap when the Node server was not already running.
- Starting backend manually in an ad-hoc terminal is easy to forget before demo or quality checks.

## Decision

Add dedicated PowerShell wrappers and package scripts for backend-only and full-stack local operation:

- `npm run backend:local:start`
- `npm run backend:local:status`
- `npm run backend:local:stop`
- `npm run stack:local:start`
- `npm run stack:local:stop`

Implementation:
- `scripts/start-local-backend.ps1`
- `scripts/stop-local-backend.ps1`
- `scripts/backend-local-status.ps1`
- `scripts/start-local-stack.ps1`
- `scripts/stop-local-stack.ps1`

## Why

- Gives one consistent operator workflow for demo and viva.
- Makes `doctor:local` much more useful because backend health can now be recovered by a single obvious command.
- Keeps runtime artifacts inside `run/`, which is already ignored from git.
