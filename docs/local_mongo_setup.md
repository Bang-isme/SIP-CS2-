# Local Mongo Setup on Drive D

> Last Updated: 2026-04-03

## Purpose

Use a local MongoDB runtime on `D:` instead of Atlas free tier when the dataset is too large for `512 MB` quota or when auth token writes must remain reliable.

## Layout

- Server binaries: `D:\MongoDB\Server\8.2`
- Shell binaries: `D:\MongoDB\shell`
- Data path: `D:\MongoDB\data\db`
- Logs: `D:\MongoDB\log\mongod.log`
- Runtime PID file: `D:\MongoDB\run\mongod.pid`
- Config: `D:\MongoDB\mongod.conf`

## App Configuration

- Active backend env: [`.env`](D:/SIP_CS%202/SIP_CS/.env)
- Atlas backup env: [`.env.atlas.backup`](D:/SIP_CS%202/SIP_CS/.env.atlas.backup)
- Active local URI: `mongodb://127.0.0.1:27017/apicompany`

## Start / Stop

From repo root:

```powershell
npm run mongo:local:start
npm run mongo:local:stop
```

## Clone Atlas to Local

If `.env.atlas.backup` exists, clone all Mongo collections into local:

```powershell
npm run mongo:local:clone
```

The clone script:
- reads source from `.env.atlas.backup` by default
- writes to local Mongo
- drops target collections before copy
- recreates indexes best-effort

## Verify

```powershell
node scripts/seed-admin.js
```

Then verify login:

```powershell
@'
const signin = await fetch("http://localhost:4000/api/auth/signin", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ email: "admin@localhost", password: "admin_dev" }),
});
console.log(await signin.json());
'@ | node --experimental-vm-modules -
```

## Recommended 500k Local Baseline

For the coursework-scale local dataset, use this order:

```powershell
node scripts/seed.js --profile enterprise --total 500000 --batch 5000
node scripts/aggregate-dashboard.js
node scripts/repair-cross-db-consistency.js
```

Expected baseline after a clean enterprise seed on local:
- Mongo `employees`: `500000`
- Mongo `departments`: `8`
- MySQL `vacation_records`: `500000`
- MySQL `employee_benefits`: `500000`
- MySQL `pay_rates`: `500000`
- MySQL `earnings_employee_year`: `849977` for the current enterprise distribution

## Notes

- This setup avoids Atlas free-tier quota blocking token persistence.
- `ALLOW_STATELESS_JWT_FALLBACK` should stay `0` in normal local mode.
- Atlas clone is optional. The current recommended local baseline is the seeded `500000`-employee dataset above.
- `scripts/seed.js` now writes SQL batch rows inside a transaction, so a failed batch no longer leaves partial writes across `earnings`, `vacation_records`, `employee_benefits`, and `pay_rates`.
