# Problem-Solution Mapping (Chi Tiết Vấn Đề → Giải Pháp)

> **Phiên bản**: 1.0  
> **Cập nhật**: 2026-02-05

Tài liệu này trình bày **từng vấn đề nhỏ** và **giải pháp tương ứng**, phân loại theo:
- **CEO Memo**: Yêu cầu từ phía lãnh đạo/business
- **Developer**: Vấn đề kỹ thuật cần giải quyết

---

## Mục Lục

1. [CEO Memo Requirements → Solutions](#1-ceo-memo-requirements--solutions)
2. [Developer Technical Problems → Solutions](#2-developer-technical-problems--solutions)
3. [Cross-cutting Concerns](#3-cross-cutting-concerns)

---

## 1. CEO Memo Requirements → Solutions

### 1.1 Summary Dashboard với Multiple Dimensions

| Yêu cầu CEO | Vấn đề cụ thể | Giải pháp | File liên quan |
|-------------|---------------|-----------|----------------|
| Xem tổng earnings theo shareholder/gender/ethnicity/emp-type/department | Dữ liệu nằm rải rác ở 2 DB, query real-time quá chậm với 500k+ records | **Pre-aggregation vào Summary Tables** - Batch script tổng hợp trước, API chỉ đọc summary | `aggregate-dashboard.js` → `EarningsSummary` |
| So sánh current year vs previous year | Cần join nhiều bảng và tính toán phức tạp | **Parallel aggregation** - Tính đồng thời 2 năm, lưu `current_total` + `previous_total` trong cùng 1 row | `aggregate-dashboard.js` lines 86-98 |
| Vacation days theo phân loại | Tương tự earnings, query chậm | **VacationSummary table** - Cùng pattern với earnings | `aggregate-dashboard.js` → `VacationSummary` |
| Average benefits theo plan + shareholder | Cần cross-DB join (Mongo shareholder + MySQL benefits) | **Shareholder Set in Memory** - Load shareholders từ Mongo vào Set, loop qua MySQL benefits | `aggregate-dashboard.js` → `BenefitsSummary` |

---

### 1.2 Drill-down từ Summary vào Chi Tiết

| Yêu cầu CEO | Vấn đề cụ thể | Giải pháp | File liên quan |
|-------------|---------------|-----------|----------------|
| Click vào chart/KPI để xem danh sách employees cụ thể | Summary không có danh sách chi tiết, cần query lại | **DrilldownModal + Paginated API** - Frontend mở modal, gọi API với filters | `DrilldownModal.jsx`, `dashboard.controller.js` |
| Filter theo department, shareholder, gender, etc. | Query phức tạp với nhiều filter combinations | **Dynamic MongoDB Query Builder** - Xây query object dựa trên params | `dashboard.controller.js` → `buildDrilldownQuery()` |
| Filter theo minEarnings (VD: employees earning > $50k) | Earnings ở MySQL, employees ở MongoDB → cross-DB join | **Snapshot annualEarnings trong MongoDB** - Batch cập nhật `annualEarnings` field trong Employee document | `aggregate-dashboard.js` lines 122-132 |
| Export danh sách ra CSV | Response lớn có thể crash browser | **Stream CSV Export** - Server stream response, không load all in memory | `dashboard.controller.js` → `/drilldown/export` |

---

### 1.3 Drilldown Performance (500k+ records)

| Yêu cầu CEO | Vấn đề cụ thể | Giải pháp | File liên quan |
|-------------|---------------|-----------|----------------|
| Drilldown phải nhanh | Query 500k employees quá chậm | **Phân tầng performance strategy** | |
| | Limit nhỏ (< 1000) | Normal query với pagination | `dashboard.controller.js` |
| | Limit lớn (>= 1000) | **Bulk mode** - Skip enrichment, return basic data | `dashboard.controller.js` `bulk=1` |
| | Count total | **Fast summary mode** - Chỉ trả count, không tính sum | `dashboard.controller.js` `summary=fast` |
| | Hybrid accuracy | **Background full calculation** - Nếu count <= 10k, chạy nền lấy sum chính xác | `dashboard.controller.js` |

---

### 1.4 Alerts / Manage-by-Exception

| Yêu cầu CEO | Vấn đề cụ thể | Giải pháp | File liên quan |
|-------------|---------------|-----------|----------------|
| Anniversary alerts (vào công ty N ngày tới) | Cần tính ngày anniversary và so với today | **Alert type: anniversary** - Loop employees, tính daysUntil | `aggregate-dashboard.js` lines 448-484 |
| High vacation alerts (> threshold days) | Query đơn giản nhưng cần persist | **Alert type: vacation** - Query `vacationDays > threshold` | `aggregate-dashboard.js` lines 486-510 |
| Benefits change alerts (thay đổi trong N ngày) | Cần track last_change_date | **Alert type: benefits_change** - Query MySQL `last_change_date >= cutoff` | `aggregate-dashboard.js` lines 513-551 |
| Birthday alerts (sinh nhật tháng này) | CEO muốn strict "tháng hiện tại", không phải 30 ngày tới | **Strict current month logic** - Check `birthDate.getMonth() === currentMonth` | `aggregate-dashboard.js` lines 553-594 |
| Xem danh sách employees trong mỗi alert | Lưu trong AlertsSummary có limit | **AlertEmployee table** - Lưu chi tiết riêng, không limit | `AlertEmployee.js`, `alerts.controller.js` |
| Pagination với 10k+ employees per alert | JSON array trong AlertsSummary quá lớn | **Separate AlertEmployee table** - Pagination từ MySQL, không load all | `alerts.controller.js` → `/:type/employees` |

---

### 1.5 Ad-hoc Queries

| Yêu cầu CEO | Vấn đề cụ thể | Giải pháp | File liên quan |
|-------------|---------------|-----------|----------------|
| Query employees earning > X | CEO muốn quick filters | **Quick Buttons + minEarnings filter** - UI buttons ($0, $25k, $50k, $100k) | Dashboard.jsx, DrilldownModal.jsx |
| Export kết quả | Cần download data | **CSV Export endpoint** | `dashboard.controller.js` |
| *Natural language query* | *Chưa triển khai* | *PARTIAL - Chưa có NL query engine* | - |

---

### 1.6 Không Thay Đổi Legacy Systems

| Yêu cầu CEO | Vấn đề cụ thể | Giải pháp | File liên quan |
|-------------|---------------|-----------|----------------|
| Giữ nguyên HR MongoDB | Có thể thêm fields, không alter schema | **Thêm derived fields** - `annualEarnings`, `annualEarningsYear` | `Employee.js` |
| Giữ nguyên Payroll MySQL | Có thể thêm tables, không alter existing | **Thêm summary tables** - EarningsSummary, VacationSummary, etc. | `models/sql/` |
| Presentation-style integration | Không cần middleware phức tạp | **Batch aggregation** - Read from both DBs, write to summary | `aggregate-dashboard.js` |

---

## 2. Developer Technical Problems → Solutions

### 2.1 Performance với Large Dataset (500k+ records)

| Vấn đề Developer | Chi tiết | Giải pháp | File liên quan |
|------------------|----------|-----------|----------------|
| Memory overflow khi load all employees | 500k records = ~2GB memory | **Cursor-based streaming** - MongoDB cursor với batchSize | `aggregate-dashboard.js` line 111-114 |
| Slow bulk writes | Individual inserts quá chậm | **bulkWrite + bulkCreate** - Batch 5000 records mỗi lần | `aggregate-dashboard.js` lines 129-132 |
| Cross-DB join impossible | MongoDB + MySQL không join được | **Pre-compute vào same DB** - Snapshot earnings vào Mongo, summary vào MySQL | `aggregate-dashboard.js` |
| API response timeout | Drilldown query timeout | **Pagination + Limit + Bulk mode** - Phân tầng strategy | `dashboard.controller.js` |

---

### 2.2 Data Consistency (Near Real-time Sync)

| Vấn đề Developer | Chi tiết | Giải pháp | File liên quan |
|------------------|----------|-----------|----------------|
| Employee created in Mongo nhưng chưa có trong MySQL | Sync delay hoặc failure | **SyncService broadcast** - Gọi tất cả adapters khi CRUD | `syncService.js` |
| Adapter failure không được track | Mất data nếu không log | **SyncLog table** - Log mọi sync operation với status | `SyncLog.js`, `payroll.adapter.js` |
| Retry failed syncs | Cần mechanism tự động retry | **retryFailedSyncs()** - Query FAILED logs, retry với fresh data | `syncService.js` lines 77-167 |
| Không biết service nào đang active | Hard-code adapter list không flexible | **ServiceRegistry** - Dynamic load adapters từ config | `ServiceRegistry.js` |
| Thêm integration mới phải sửa nhiều file | Coupling cao | **Adapter pattern + Config-driven** - Chỉ cần thêm 1 adapter file + 1 dòng config | `integrations.js` |

---

### 2.3 Sync Reliability (Outbox Pattern)

| Vấn đề Developer | Chi tiết | Giải pháp | File liên quan |
|------------------|----------|-----------|----------------|
| Sync trực tiếp có thể fail giữa chừng | Data in Mongo, sync failed → inconsistent | **Outbox Pattern** - Ghi event vào outbox, worker xử lý async | `IntegrationEvent.js` |
| Worker crash mất event | Memory-only queue không persist | **IntegrationEvent MySQL table** - Persist events, survive restart | `IntegrationEvent.js` |
| Retry storm khi target down | Retry liên tục làm overload | **Exponential backoff** - 5s → 10s → 20s → 40s → 60s cap | `integrationEventService.js` lines 9-13 |
| Event stuck trong queue mãi | Retry vô hạn không tốt | **Max attempts + DEAD status** - Sau N lần, chuyển DEAD | `integrationEventService.js` line 66 |
| Không biết queue status | No visibility | **Admin APIs + UI** - `/api/integrations/events` + IntegrationEventsPanel | `integrations.routes.js` |
| Cần replay old events | Debug hoặc fix data | **Replay API** - Filter by entity/date/status, re-enqueue | `integrations.routes.js` |

---

### 2.4 Extensibility (Adding New Integrations)

| Vấn đề Developer | Chi tiết | Giải pháp | File liên quan |
|------------------|----------|-----------|----------------|
| Tightly coupled sync logic | syncService biết về từng target | **Adapter abstraction** - BaseAdapter interface | `base.adapter.js` |
| Hard-coded adapter list | Sửa code để thêm/bỏ | **Config file** - `integrations.js` chỉ cần edit array | `integrations.js` |
| Different sync logic per target | Payroll vs Security vs Analytics | **Separate adapters** - Mỗi target có adapter riêng | `payroll.adapter.js`, `security.mock.adapter.js` |
| Health check per integration | Cần biết target có up không | **healthCheck() method** - Mỗi adapter implement riêng | `ServiceRegistry.healthCheckAll()` |

---

### 2.5 Alerts Configuration

| Vấn đề Developer | Chi tiết | Giải pháp | File liên quan |
|------------------|----------|-----------|----------------|
| Hard-coded alert thresholds | Không thay đổi được runtime | **Alert MongoDB collection** - Configurable thresholds | `Alert.js` |
| Duplicate alert configs | Có thể tạo nhiều config cùng type | **fix-alert-duplicates.js** - Script xóa duplicates | `scripts/fix-alert-duplicates.js` |
| Alert count không match drilldown | Summary count vs actual count | **Re-run batch** - Đồng bộ hóa data | `aggregate-dashboard.js` |

---

### 2.6 Debugging & Troubleshooting

| Vấn đề Developer | Chi tiết | Giải pháp | File liên quan |
|------------------|----------|-----------|----------------|
| minEarnings filter không hoạt động | Không biết snapshot có data không | **debug_min_earnings.js** - Check snapshot data | `scripts/debug_min_earnings.js` |
| Alert counts sai | Không biết aggregation đúng không | **debug-alert-counts.js** - So sánh real-time vs aggregated | `scripts/debug-alert-counts.js` |
| Drilldown chậm | Không biết bottleneck ở đâu | **test-drilldown-performance.js** - Benchmark với metrics | `scripts/test-drilldown-performance.js` |
| Audit data integrity | Cần verify data consistency | **audit-data.js** - Check data across DBs | `scripts/audit-data.js` |

---

## 3. Cross-cutting Concerns

### 3.1 Operational Concerns

| Concern | Vấn đề | Giải pháp | Ai là stakeholder |
|---------|--------|-----------|-------------------|
| Data freshness | Summary cũ không reflect changes | **Batch schedule** - Cron job hằng ngày hoặc trigger sau import | CEO (data accuracy), Dev (operations) |
| Error visibility | Failures không được biết | **SyncLog + IntegrationEvents** - Persistent logs + Admin UI | Dev (debugging), CEO (reliability) |
| Recovery time | Bao lâu để restore sau failure | **DR Runbook + Safe Rehearsal** - Documented process + test script | CEO (business continuity), Dev (operations) |

---

### 3.2 Security Concerns

| Concern | Vấn đề | Giải pháp | Ai là stakeholder |
|---------|--------|-----------|-------------------|
| Unauthorized access | Anyone có thể xem data | **JWT authentication** - Token-based auth | CEO (compliance), Dev (security) |
| Admin-only operations | Retry/replay cần restrict | **Admin-only routes** - Role check middleware | CEO (governance), Dev (security) |
| Audit trail | Cần biết ai làm gì khi nào | **Logging** - Log admin actions, exports, retries | CEO (compliance), Dev (debugging) |

---

### 3.3 Availability Concerns

| Concern | Vấn đề | Giải pháp | Ai là stakeholder |
|---------|--------|-----------|-------------------|
| Dashboard always available | DB down = no dashboard | **Summary tables survive** - Pre-computed, still readable | CEO (business) |
| Sync can fail gracefully | Target down không crash system | **Adapter isolation + retry** - Each adapter independent | Dev (reliability) |
| Backups | Data loss prevention | **Daily snapshots + binlog** - RPO 24h target | CEO (business), Dev (operations) |

---

## 4. Tổng Hợp: CEO Memo vs Developer Mapping

### 4.1 Bảng Tổng Hợp

| # | CEO Memo Requirement | Technical Problem(s) | Solution(s) | Dev Concern Addressed |
|---|---------------------|---------------------|-------------|----------------------|
| 1 | Summary by multiple dimensions | Cross-DB aggregation slow | Pre-aggregation batch | Performance, scalability |
| 2 | Compare current vs previous year | Complex join logic | Parallel compute, single row | Simplicity, accuracy |
| 3 | Drill-down into details | Query complexity | Paginated API + filters | Performance, UX |
| 4 | minEarnings filter | Cross-DB join impossible | Snapshot in Mongo | Performance, data locality |
| 5 | Alerts by type | Runtime calculation slow | Pre-aggregated AlertsSummary | Performance, freshness |
| 6 | View alert employees | Large list pagination | AlertEmployee table | Scalability, UX |
| 7 | Birthday = current month | Original logic was 30-day window | Strict month check | Accuracy, CEO expectation |
| 8 | Export CSV | Large payload crash | Stream response | Memory, reliability |
| 9 | Keep legacy unchanged | Integration without alteration | Summary tables only | Risk reduction, compatibility |
| 10 | Single-system appearance | Multi-DB complexity | SyncService + Adapters | Abstraction, maintainability |
| 11 | Near real-time sync | Sync failures lose data | Outbox + Worker | Reliability, recoverability |
| 12 | Network/DR/Security | Production readiness | Documented plans + scripts | Compliance, operability |

---

### 4.2 Solution → Problem Trace

Mỗi giải pháp giải quyết vấn đề nào?

#### Pre-aggregation Batch (`aggregate-dashboard.js`)
```
CEO Problems Solved:
├── Summary earnings/vacation/benefits by group ✓
├── Current vs Previous year comparison ✓
├── Alerts pre-calculation ✓
└── minEarnings filter (via snapshot) ✓

Developer Problems Solved:
├── Cross-DB join impossible ✓
├── Query performance with 500k records ✓
├── Memory management (cursor streaming) ✓
└── Bulk write efficiency ✓
```

#### SyncService + Adapters
```
CEO Problems Solved:
├── Data entered once ✓
├── Near real-time availability ✓
└── Single-system appearance ✓

Developer Problems Solved:
├── Coupling between systems reduced ✓
├── Extensibility for new integrations ✓
├── Health check per target ✓
└── Consistent sync interface ✓
```

#### Outbox Pattern + Worker
```
CEO Problems Solved:
├── Reliability (no lost events) ✓
├── Visibility into queue status ✓
└── Recovery from failures ✓

Developer Problems Solved:
├── Atomic writes (Mongo + Outbox) ✓
├── Retry with backoff ✓
├── Dead letter handling ✓
└── Replay capability ✓
```

#### AlertEmployee Table
```
CEO Problems Solved:
├── View all employees in alert ✓
├── Pagination with 10k+ records ✓
└── Search within alert ✓

Developer Problems Solved:
├── JSON array size limit ✓
├── Memory efficiency ✓
└── Query performance ✓
```

#### Summary Tables Pattern
```
CEO Problems Solved:
├── Dashboard loads instantly ✓
├── No impact on legacy queries ✓
└── Predictable performance ✓

Developer Problems Solved:
├── Read/write separation ✓
├── Idempotent batch runs ✓
└── Easy cache invalidation (re-run batch) ✓
```

---

## 5. Implementation Sequence

Thứ tự giải quyết từng vấn đề:

### Phase 1: Foundation (Case 2)
1. **Summary Tables Schema** → Cho phép pre-aggregation
2. **Batch Script** → Tính toán và lưu summary
3. **Dashboard APIs** → Đọc từ summary
4. **DrilldownModal** → Chi tiết với filters

### Phase 2: Alerts (Case 2 extended)
5. **Alert Configuration** → Cho phép config thresholds
6. **AlertsSummary + AlertEmployee** → Pre-computed alerts
7. **AlertsPanel UI** → Hiển thị và drilldown

### Phase 3: Real-time Sync (Case 3)
8. **SyncLog Table** → Track sync status
9. **BaseAdapter** → Interface abstraction
10. **PayrollAdapter** → MySQL sync implementation
11. **SyncService** → Orchestration layer

### Phase 4: Middleware (Case 4)
12. **IntegrationEvent Table** → Outbox pattern
13. **IntegrationEventService** → Enqueue + process
14. **IntegrationEventWorker** → Background polling
15. **Admin APIs** → Monitor + retry

### Phase 5: Extensibility (Case 4 extended)
16. **ServiceRegistry** → Dynamic adapter loading
17. **integrations.js** → Config-driven
18. **SecurityMockAdapter** → Demo second integration

### Phase 6: Operations (Case 5)
19. **DR Documentation** → Runbook + templates
20. **Safe Rehearsal Script** → Non-destructive testing
21. **Debug Scripts** → Troubleshooting tools

---

> **Kết luận**: Mỗi giải pháp trong codebase đều giải quyết một hoặc nhiều vấn đề cụ thể. Tài liệu này giúp trace từ yêu cầu CEO → vấn đề kỹ thuật → giải pháp code → file implementation.
