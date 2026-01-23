# Backup & Recovery Strategy - SIP-CS System

## Overview
This document outlines the disaster recovery (DR) plan for the SIP-CS Executive Dashboard, addressing data protection and system recovery scenarios.

---

## 1. Data Classification

| Data Store | Type | Criticality | Recovery Priority |
|------------|------|-------------|-------------------|
| **MongoDB (HR)** | Synchronized cache | Medium | P2 - Can be rebuilt |
| **MySQL (Payroll)** | Legacy source of truth | **High** | P1 - Must protect |
| **Dashboard Config** | Application settings | Low | P3 - Redeploy |

---

## 2. Backup Strategy

### 2.1 MongoDB (HR Data)
```
Schedule: Daily at 02:00 UTC
Method: mongodump --gzip --archive
Retention: 7 days rolling
Storage: Secure backup server (off-site)
```

### 2.2 MySQL (Payroll - Legacy)
```
Schedule: Daily at 01:00 UTC (before MongoDB sync)
Method: mysqldump with transaction logs
Retention: 30 days (compliance requirement)
Storage: Encrypted backup with off-site replication
```

### 2.3 Application Code
```
Strategy: Git repository (already versioned)
Recovery: git clone + npm install
```

---

## 3. Recovery Scenarios

### Scenario A: Dashboard Server Failure (Q36)
**Impact**: Dashboard unavailable, but legacy systems unaffected.

**Recovery Steps**:
1. Provision new server (VM or container)
2. Deploy application from Git
3. Configure environment variables
4. Run `npm run sync:full` to rebuild MongoDB from MySQL
5. Verify dashboard loads with current data

**RTO**: 2-4 hours  
**RPO**: 0 (data rebuilt from legacy source)

### Scenario B: MongoDB Corruption
**Impact**: Dashboard shows stale/no data.

**Recovery Steps**:
1. Stop application server
2. Restore from latest `mongodump` OR
3. Run full resync from MySQL (preferred for latest data)
4. Restart application

**RTO**: 1-2 hours  
**RPO**: 24 hours (if restoring from backup)

### Scenario C: MySQL (Legacy) Failure
**Impact**: **Critical** - Source of truth unavailable.

**Recovery Steps**:
1. Activate DBA team (legacy system owners)
2. Restore from daily backup + transaction logs
3. Verify data integrity
4. Resume middleware sync operations

**RTO**: 4-8 hours (depends on legacy team)  
**RPO**: Based on transaction log frequency

---

## 4. Key Principle: Dashboard is NOT Source of Truth

> The Dashboard **reads from** and **syncs with** legacy systems.  
> It does **not store** authoritative data.  
> If the Dashboard is lost, it can be **rebuilt entirely** from MySQL.

This design choice directly addresses Q36: *"Server dashboard sập thì sao?"*  
**Answer**: Rebuild + resync from legacy. No data loss.

---

## 5. Testing Schedule

| Test Type | Frequency | Owner |
|-----------|-----------|-------|
| Backup verification | Weekly | DevOps |
| MongoDB restore drill | Monthly | DevOps |
| Full DR simulation | Quarterly | IT + Dev |

---

## 6. Contact List

| Role | Responsibility |
|------|----------------|
| DevOps Lead | Backup execution, server provisioning |
| DBA Team | Legacy MySQL recovery |
| Dev Team | Application deployment, sync verification |
