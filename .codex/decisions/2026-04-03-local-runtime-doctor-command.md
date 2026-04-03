# 2026-04-03 - Local runtime doctor command

## Context

- Demo readiness now depends on multiple local concerns at once:
  - Mongo local reachable
  - MySQL reachable
  - required MySQL migrations applied
  - backend health endpoints responding
  - 500k local dataset baseline still present
  - runtime hints for Mongo service/autostart
- These checks existed, but they were spread across multiple commands and easy to forget.

## Decision

Add a single local preflight command:

- `npm run doctor:local`

Implementation:
- `scripts/local-runtime-doctor.js`

It reports:
- MongoDB connectivity and core collection counts
- MySQL migration readiness and key table counts
- backend `live` and `ready` health responses
- local Mongo runtime hints:
  - `SIPLocalMongoDB` Windows service
  - `SIPLocalMongoDBAutostart` scheduled task

## Why

- Makes pre-demo verification fast and repeatable.
- Gives one clear place to look before assuming the dashboard/backend is broken.
- Supports the new local-runtime operating model built around Mongo on `D:\MongoDB`.
