# Risk Management & Defer Plan - SIP-CS Project

## 1. Purpose
This document identifies project risks and defines which features can be deferred if schedule issues arise, as required by Case Study 2 guidelines.

---

## 2. Feature Priority Matrix

| Priority | Feature | Deferrable? | Justification |
|----------|---------|-------------|---------------|
| **P0** | Earnings Summary Widget | ❌ No | CEO's primary requirement |
| **P0** | Vacation Summary Widget | ❌ No | CEO's primary requirement |
| **P0** | Benefits Summary Widget | ❌ No | CEO's primary requirement |
| **P0** | Drill-down by Department | ❌ No | Core question: "Who earns over X?" |
| **P1** | Alerts Panel | ⚠️ Partial | Could show static list first |
| **P1** | Interactive Charts (click) | ✅ Yes | Enhancement, not core |
| **P2** | Server-side Search | ✅ Yes | Client-side fallback exists |
| **P2** | Dynamic Departments | ✅ Yes | Hardcode fallback exists |
| **P3** | Mobile Responsive | ✅ Yes | Desktop-first is acceptable |

---

## 3. Risk Register

| ID | Risk | Probability | Impact | Mitigation | Owner |
|----|------|-------------|--------|------------|-------|
| R01 | Legacy DB schema unknown | Medium | High | Assume standard tables, document assumptions | Dev |
| R02 | 500k records too slow | Medium | High | Pre-aggregation, summary tables | Dev |
| R03 | Sync failures | Low | Medium | SyncLog + Retry mechanism | Dev |
| R04 | Auth integration issues | Low | Medium | Mock auth for testing | Dev |
| R05 | Time overrun | Medium | High | Defer P2/P3 features | PM |

---

## 4. Contingency Plan

### If 1 Week Behind Schedule:
1. Defer P3 features (Mobile responsive)
2. Simplify Alerts Panel (static list only)
3. Keep client-side search

### If 2 Weeks Behind Schedule:
1. All above +
2. Defer P2 features (Server-side search, Dynamic depts)
3. Remove interactive chart clicks (drill-down via filters only)

### If 3+ Weeks Behind Schedule:
1. All above +
2. Reduce to MVP: 3 summary widgets + basic drill-down
3. Document remaining features as "Future Roadmap"

---

## 5. Change Control Process

Any new feature request must:
1. Be evaluated against current schedule
2. Identify which existing feature it displaces (if any)
3. Get explicit approval before implementation

> **Principle**: "CEO không trả tiền cho tính năng thừa chưa được duyệt."

---

## 6. Dependencies

| Dependency | Type | Risk if Unavailable |
|------------|------|---------------------|
| MongoDB Atlas | External | Use local MongoDB |
| MySQL Legacy | Internal | Required - no alternative |
| Node.js 18+ | Runtime | Must be available |

---

## 7. Sign-off

| Role | Name | Date |
|------|------|------|
| Developer | [Team] | [Date] |
| Reviewer | [Instructor] | [Date] |
