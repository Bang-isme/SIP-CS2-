# DR Runbook Template

## 1) Incident Overview
- Incident ID:
- Date/Time:
- Impacted systems:
- On-call owner:

## 2) Freeze Writes
- Steps to enable read-only mode:
- Validation checklist:

## 3) Restore Steps
1. Restore latest snapshot.
2. Replay binlog (if available).
3. Validate data integrity.

## 4) Validation
- Record counts:
- Checksums:
- API sanity tests:

## 5) Recovery Completion
- Re-enable writes:
- Monitor metrics:

## 6) Postmortem
- Root cause:
- Prevention steps:
