# Test Plan - Advanced Quality Assurance

> Last Updated: 2026-04-15

## Overview
This document describes the advanced quality suite used to verify:
- Availability
- Runtime boundary separation
- Local transaction and integrity behavior
- Extensibility
- Maintainability
- Code quality
- Data integrity

Important scope note:
- The suite does **not** prove full ACID across MongoDB + MySQL.
- The `ACID1-ACID3` labels remain as legacy test IDs inside `tests/advanced/quality.test.js`, but their real scope is local `SyncLog` transaction/increment behavior.

## Test Categories

### Availability Tests
| Test ID | Description | Criteria |
|---|---|---|
| A1 | Health endpoint response time | < 100ms in local test profile |
| A2 | Concurrent request handling | 10 parallel requests succeed |
| A3 | Empty filter handling | Returns success structure |
| A4 | Health check structure | Returns message + version |

### Runtime Boundary Tests
| Test ID | Description | Criteria |
|---|---|---|
| R1 | Split entrypoints exist | `sa-server`, `payroll-server`, `dashboard-server` are present |
| R2 | SA dependency boundary | SA can boot without MySQL |
| R3 | Payroll dependency boundary | Payroll can boot without Mongo |
| R4 | Dashboard auth mode | Dashboard uses stateless service auth mode |

### Local Transaction / Integrity Tests
| Legacy ID | Actual Scope | What is being checked |
|---|---|---|
| ACID1 | Local rollback behavior | Rollback prevents persisted `SyncLog` row |
| ACID2 | Local status update flow | Valid create/update state transitions |
| ACID3 | Local concurrent increment safety | `retry_count` increments are not corrupted |

### Extensibility Tests
| Test ID | Description | Criteria |
|---|---|---|
| E1 | Config lists integrations | Array of adapter names |
| E2 | Adapter files exist | Base + payroll adapters present |
| E3 | Config-only extension pattern | Integration config remains string-based |
| E4 | BaseAdapter interface | `sync()`, `healthCheck()`, `name` exist |

### Maintainability Tests
| Test ID | Description | Criteria |
|---|---|---|
| M1 | API response structure | `success` + `data` shape present |
| M2 | Validation responses | 4xx + message field on invalid mutation |
| M3 | Model timestamps | Timestamp metadata exists |
| M4 | Domain separation | Controllers remain separated by concern |

### Code Quality Tests
| Test ID | Description | Criteria |
|---|---|---|
| Q1 | Config exports | Required config values available |
| Q2 | SyncService isolation | No direct adapter hard-coupling |
| Q3 | Registry pattern | Registry-based integration handling |
| Q4 | Debug hygiene | No banned debug artifacts in critical paths |

### Data Integrity Tests
| Test ID | Description | Criteria |
|---|---|---|
| D1 | Departments consistency | Repeat calls stay consistent |
| D2 | Pagination support | `page` + `limit` meta exists |
| D3 | Search filtering | Filtered results do not exceed total |

## Running Tests

```bash
$env:NODE_OPTIONS='--experimental-vm-modules'; npx jest tests/advanced/quality.test.js -c tests/jest.config.js --forceExit
```

For the architecture-level runtime gate, also run:

```powershell
npm run verify:case3
```

## Interpretation Guide
- Passing this suite means the codebase has a healthy advanced quality baseline for coursework.
- It should be presented as:
  - availability checks
  - runtime boundary checks
  - local integrity checks
  - extensibility and maintainability checks
- It should **not** be presented as proof of distributed ACID guarantees.
