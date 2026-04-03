# 2026-04-03 - Local Mongo Windows service autostart

## Context

- The project now relies on local Mongo at `D:\MongoDB` for the 500k-record coursework baseline.
- Manual startup (`npm run mongo:local:start`) works, but it is easy to forget before demo, backend startup, or integration tests.
- Forgetting to start `mongod` causes degraded tests and `ECONNREFUSED 127.0.0.1:27017`.

## Decision

Use a dedicated Windows service for local Mongo:

- Service name: `SIPLocalMongoDB`
- Display name: `SIP Local MongoDB`
- Startup type: `Automatic`
- Config file: `D:\MongoDB\mongod.conf`

Supporting changes:
- `scripts/install-local-mongo-service.ps1`
- `scripts/uninstall-local-mongo-service.ps1`
- `scripts/mongo-service-status.ps1`
- `scripts/start-local-mongo.ps1` now starts the service if installed
- `scripts/stop-local-mongo.ps1` now stops the service if installed
- `package.json` exposes `mongo:local:service:install|uninstall|status`

## Why

- Reduces operator error during demo and viva.
- Keeps local runtime behavior predictable across restart/boot cycles.
- Preserves backward compatibility: manual process mode still works if the service is not installed.

## Expected workflow

1. Install once with `npm run mongo:local:service:install`
2. Verify with `npm run mongo:local:service:status`
3. After that, local Mongo should come back automatically on boot
4. Existing `mongo:local:start` and `mongo:local:stop` remain safe wrappers

## Fallback

If service registration is blocked because the shell is not elevated:

- install scheduled-task autostart with `npm run mongo:local:autostart:install`
- verify with `npm run mongo:local:autostart:status`

This fallback still removes the need to remember a manual Mongo start before demo or test runs.
