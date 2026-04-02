# Decision: Local Mongo Runtime on Drive D

Date: 2026-04-03
Status: accepted

## Context

Atlas free tier had reached storage quota and blocked token persistence, which broke signin stability and made it unsuitable for the coursework target dataset size.

The machine also lacked Docker and a preinstalled MongoDB service, so the replacement needed to work without admin-heavy infrastructure changes.

## Decision

1. Install MongoDB Community Server from the official zip distribution into `D:\MongoDB\Server\8.2`.
2. Install `mongosh` from the official zip distribution into `D:\MongoDB\shell`.
3. Keep all runtime state on `D:`:
   - `dbPath`
   - logs
   - pid file
   - config
4. Change backend `.env` to local Mongo.
5. Preserve Atlas credentials in `.env.atlas.backup`.
6. Add repo scripts to start, stop, and clone Mongo data locally.
7. Clone the current Atlas Mongo data into local Mongo.

## Why

- This removes Atlas quota as an operational blocker.
- It keeps the environment reproducible for large local datasets.
- It avoids depending on admin-only Windows service installation for day-to-day work.

## Consequences

Positive:
- Login works again with persistent token storage.
- Mongo data is now local to the machine and no longer capped by Atlas free tier.
- The repo now has operational scripts for local Mongo lifecycle and cloning.

Trade-off:
- Local Mongo must be started explicitly after reboot unless a user-level automation/service is added later.

## Evidence

- `D:\MongoDB\mongod.conf`
- `scripts/start-local-mongo.ps1`
- `scripts/stop-local-mongo.ps1`
- `scripts/clone-mongo-to-local.js`
- `.env`
- `.env.atlas.backup`
- `docs/local_mongo_setup.md`
