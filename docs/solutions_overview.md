# Tổng Quan Các Giải Pháp Đã Triển Khai (Case Study 1-5)

> **Phiên bản**: 1.0  
> **Cập nhật**: 2026-02-05

---

## Mục Lục

1. [Tổng Quan Kiến Trúc](#1-tổng-quan-kiến-trúc)
2. [Case Study 1: The Proposal](#2-case-study-1-the-proposal)
3. [Case Study 2: Dashboard (Pre-aggregation)](#3-case-study-2-dashboard-pre-aggregation)
4. [Case Study 3: Integrated System (Sync Service)](#4-case-study-3-integrated-system-sync-service)
5. [Case Study 4: Fully Integrated System (Middleware)](#5-case-study-4-fully-integrated-system-middleware)
6. [Case Study 5: Network / DR / Security](#6-case-study-5-network--dr--security)
7. [Scripts & Công Cụ Hỗ Trợ](#7-scripts--công-cụ-hỗ-trợ)
8. [Hướng Dẫn Vận Hành](#8-hướng-dẫn-vận-hành)

---

## 1. Tổng Quan Kiến Trúc

### 1.1 Dual-Database Architecture

Hệ thống sử dụng **kiến trúc hybrid database**:

| Database | Vai trò | Dữ liệu |
|----------|---------|---------|
| **MongoDB** | HR System (Source of Truth) | Employees, Departments, Alerts, Users |
| **MySQL** | Payroll System + Summary Tables | Earnings, Vacation, Benefits, Pay Rates, Summary/Aggregation tables |

### 1.2 Data Flow Tổng Quát

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           DATA FLOW                                     │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  [MongoDB HR]  ◄──────┐                                                │
│       │               │                                                 │
│       ▼               │ Sync Service                                   │
│  [API CRUD]  ─────────┼──────────► [MySQL Payroll]                     │
│       │               │                                                 │
│       │               │                                                 │
│       ▼               │                                                 │
│  [Outbox Events] ─────┘                                                │
│       │                                                                 │
│       ▼                                                                 │
│  [Batch Aggregation] ───► [Summary Tables] ───► [Dashboard APIs]       │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Case Study 1: The Proposal

### 2.1 Mục Tiêu
Đề xuất giải pháp tích hợp 2 hệ thống HR (MongoDB) và Payroll (MySQL) mà không thay đổi legacy systems.

### 2.2 Hai Phương Án Được Đề Xuất

#### Phương án A: Presentation-style Integration (Pre-aggregation)
- **Ý tưởng**: Chạy batch tổng hợp dữ liệu vào summary tables, không thay đổi hệ thống legacy
- **Triển khai**: Case Study 2
- **File chính**: `scripts/aggregate-dashboard.js`

#### Phương án B: Functional Integration (Near Real-time Sync)
- **Ý tưởng**: Dữ liệu nhập 1 lần, sync gần real-time qua middleware
- **Triển khai**: Case Study 3 + 4
- **File chính**: `src/services/syncService.js`, `src/registry/ServiceRegistry.js`

### 2.3 Artifacts
- Proposal doc: `docs/case_study_1_proposal.md`
- ADR: `Memory/Decisions/architecture_decisions.md`

---

## 3. Case Study 2: Dashboard (Pre-aggregation)

### 3.1 Mục Tiêu
Dashboard tích hợp cho lãnh đạo với:
- Summary KPIs (Earnings, Vacation, Benefits)
- Drill-down chi tiết
- Alerts theo loại (Anniversary, Vacation, Benefits, Birthday)
- Export CSV

### 3.2 Giải Pháp: Batch Aggregation

#### 3.2.1 Script Chính: `aggregate-dashboard.js`

**Chức năng**:
```
node scripts/aggregate-dashboard.js [year]
```

**Các bước thực hiện**:

1. **Aggregate Earnings**
   - Đọc earnings từ MySQL theo năm hiện tại + năm trước
   - Group by: department, gender, ethnicity, employmentType, shareholder
   - Lưu vào `EarningsSummary` table
   - Update snapshot `annualEarnings` trong MongoDB Employee (cho filter nhanh)
   - Lưu `EarningsEmployeeYear` để hỗ trợ drilldown

2. **Aggregate Vacation**
   - Đọc vacation_records từ MySQL
   - Group by các dimension tương tự earnings
   - Lưu vào `VacationSummary` table

3. **Aggregate Benefits**
   - Đọc employee_benefits + benefits_plans từ MySQL
   - Phân loại theo shareholder/non-shareholder
   - Tính average paid per plan
   - Lưu vào `BenefitsSummary` table

4. **Aggregate Alerts**
   - Xử lý 4 loại alert:
     - **Anniversary**: Nhân viên có ngày kỷ niệm vào công ty trong N ngày tới
     - **Vacation**: Nhân viên có vacation days vượt threshold
     - **Benefits Change**: Nhân viên có thay đổi benefits trong N ngày gần đây
     - **Birthday**: Nhân viên có sinh nhật trong **tháng hiện tại** (strict logic)
   - Lưu summary count vào `AlertsSummary`
   - Lưu chi tiết employees vào `AlertEmployee` (pagination lớn)

#### 3.2.2 Khi Nào Chạy Batch?

| Tình huống | Cách xử lý |
|------------|------------|
| **Hằng ngày** | Cron job chạy vào mỗi đêm để cập nhật summary |
| **Sau import dữ liệu lớn** | Chạy thủ công để đảm bảo summary chính xác |
| **Sau thay đổi alert config** | Chạy lại để tính toán alert mới |
| **Demo/testing** | Chạy thủ công để có dữ liệu |

> **Quan trọng**: Nếu số liệu trên Dashboard không cập nhật, kiểm tra xem batch đã chạy chưa!

#### 3.2.3 Summary Tables (MySQL)

| Table | Mục đích |
|-------|----------|
| `EarningsSummary` | Tổng earnings theo group type (department, gender, etc.) |
| `VacationSummary` | Tổng vacation days theo group type |
| `BenefitsSummary` | Avg benefits theo plan + shareholder status |
| `AlertsSummary` | Số lượng employees match mỗi loại alert |
| `AlertEmployee` | Chi tiết employees trong mỗi alert (pagination) |
| `EarningsEmployeeYear` | Snapshot earnings mỗi employee/năm (drilldown nhanh) |

#### 3.2.4 Performance Optimizations

1. **Cursor-based Processing**
   - Stream employees theo batch (5000/batch) để tránh memory overflow
   - Phù hợp với 500k+ records

2. **Snapshot trong MongoDB**
   - `annualEarnings` + `annualEarningsYear` được lưu trực tiếp trong Employee document
   - Cho phép filter `minEarnings` mà không cần cross-DB join

3. **Bulk Operations**
   - `bulkWrite` cho MongoDB updates
   - `bulkCreate` cho MySQL inserts
   - Giảm round-trips đáng kể

4. **Hybrid Summary Totals**
   - Fast mode trả count nhanh
   - Nếu COUNT <= 10,000, chạy nền để cập nhật total chính xác
   - UI hiện `--` nếu total chưa sẵn sàng

5. **CSV Export Streaming**
   - Dùng stream để tránh memory issues với exports lớn

### 3.3 APIs

| Endpoint | Chức năng |
|----------|-----------|
| `GET /api/dashboard/earnings` | Summary earnings by group |
| `GET /api/dashboard/vacation` | Summary vacation by group |
| `GET /api/dashboard/benefits` | Summary benefits by plan |
| `GET /api/dashboard/drilldown` | Chi tiết employees với filters |
| `GET /api/dashboard/drilldown/export` | Export CSV |
| `GET /api/alerts/triggered` | Danh sách alerts đang active |
| `GET /api/alerts/:type/employees` | Chi tiết employees trong alert |

### 3.4 Frontend Components

| Component | File |
|-----------|------|
| Dashboard Page | `dashboard/src/pages/Dashboard.jsx` |
| Alerts Panel | `dashboard/src/components/AlertsPanel.jsx` |
| Drilldown Modal | `dashboard/src/components/DrilldownModal.jsx` |

---

## 4. Case Study 3: Integrated System (Sync Service)

### 4.1 Mục Tiêu
- Data entered once trong HR (MongoDB)
- Near real-time sync sang Payroll (MySQL)
- Eventual consistency với retry và logging

### 4.2 Giải Pháp: Sync Service + Adapters

#### 4.2.1 Luồng Dữ Liệu

```
[Employee CRUD API] 
       │
       ▼
[SyncService.syncEmployeeToAll()] 
       │
       ▼
[ServiceRegistry.getIntegrations()]
       │
       ▼
[Adapter.sync()] ───► [SyncLog] (SUCCESS/FAILED)
```

#### 4.2.2 SyncService (`src/services/syncService.js`)

**Chức năng chính**:
- `syncEmployeeToPayroll(employeeId, action, employeeData)`: Broadcast sync đến tất cả adapters
- `syncEmployeeToAll`: Alias của function trên
- `retryFailedSyncs()`: Retry các sync log FAILED
- `getSyncStatus(entityType, entityId)`: Lấy status sync cuối cùng
- `checkIntegrationHealth()`: Kiểm tra health tất cả integrations

**Đặc điểm**:
- Không biết về adapters cụ thể → trừu tượng hóa qua ServiceRegistry
- Dùng `Promise.allSettled` để sync song song đến nhiều targets
- Aggregate results từ tất cả adapters

#### 4.2.3 ServiceRegistry (`src/registry/ServiceRegistry.js`)

**Vai trò**: Centralized Integration Management

**Cách hoạt động**:
1. Đọc danh sách integrations từ `config/integrations.js`
2. Lazy-load adapters tương ứng
3. Cung cấp interface thống nhất cho SyncService

**Config file** (`src/config/integrations.js`):
```javascript
export const activeIntegrations = [
    'payroll',        // MySQL Payroll System
    'securityMock',   // Mock Security Badge System
];
```

**Thêm integration mới**:
1. Tạo adapter file trong `src/adapters/`
2. Thêm tên vào `adapterMap` trong ServiceRegistry
3. Thêm tên vào `activeIntegrations` trong config

#### 4.2.4 Adapters (`src/adapters/`)

**Base Adapter** (`base.adapter.js`):
```javascript
class BaseAdapter {
    constructor(name) { this.name = name; }
    async sync(data, action) { /* override */ }
    async healthCheck() { /* override */ }
}
```

**Payroll Adapter** (`payroll.adapter.js`):
- Sync employees sang MySQL PayRate table
- CREATE: Tạo PayRate record
- UPDATE: Cập nhật PayRate
- DELETE: Soft delete (set pay_type = 'TERMINATED')
- Dùng transaction để đảm bảo atomicity
- Tạo SyncLog cho mỗi operation

**Security Mock Adapter** (`security.mock.adapter.js`):
- Demo adapter cho hệ thống Security Badge
- Simulate success/fail để test

### 4.3 SyncLog Table

| Column | Mô tả |
|--------|-------|
| `source_system` | Hệ thống nguồn (HR_MongoDB) |
| `target_system` | Hệ thống đích (Payroll_MySQL) |
| `entity_type` | Loại entity (employee) |
| `entity_id` | ID của entity |
| `action` | CREATE/UPDATE/DELETE |
| `status` | PENDING/SUCCESS/FAILED/RESOLVED |
| `error_message` | Lỗi nếu có |
| `retry_count` | Số lần đã retry |

### 4.4 Retry Mechanism

**Luồng retry**:
1. `retryFailedSyncs()` đọc SyncLog với status = FAILED
2. Group by entity_id để tránh xử lý duplicate
3. Với mỗi entity, fetch fresh data từ MongoDB
4. Gọi `syncEmployeeToAll` với action = UPDATE
5. Nếu success → update status = RESOLVED
6. Nếu fail → increment retry_count

**APIs**:
- `POST /api/sync/retry`: Retry tất cả failed syncs
- `GET /api/sync/status`: Tổng quan sync status
- `GET /api/sync/logs`: Danh sách sync logs

### 4.5 Giới Hạn Hiện Tại
- Eventual consistency (không phải strong consistency)
- Chưa có message queue
- Chưa có 2-phase commit (2PC)

---

## 5. Case Study 4: Fully Integrated System (Middleware)

### 5.1 Mục Tiêu
- Middleware chính thức
- Single-system appearance
- Mở rộng tích hợp dễ dàng

### 5.2 Giải Pháp: Outbox Pattern + Worker

#### 5.2.1 Outbox Pattern

**Ý tưởng**: Thay vì sync trực tiếp, CRUD operations sẽ:
1. Ghi vào MongoDB (atomic)
2. Tạo IntegrationEvent trong MySQL (Outbox)
3. Worker xử lý events async

**Ưu điểm**:
- Tách biệt business logic và sync logic
- Có thể replay events nếu cần
- Visibility vào queue status
- Retry với backoff tự động

#### 5.2.2 IntegrationEvent Table (Outbox)

| Column | Mô tả |
|--------|-------|
| `entity_type` | employee, department, etc. |
| `entity_id` | ID của entity |
| `action` | CREATE/UPDATE/DELETE |
| `payload` | JSON data để sync |
| `status` | PENDING/PROCESSING/SUCCESS/FAILED/DEAD |
| `attempts` | Số lần đã thử |
| `next_run_at` | Thời điểm retry tiếp theo |
| `last_error` | Lỗi gần nhất |
| `processed_at` | Thời điểm xử lý thành công |

#### 5.2.3 Integration Event Service (`src/services/integrationEventService.js`)

**Functions**:

1. **`enqueueIntegrationEvent({ entityType, entityId, action, payload })`**
   - Tạo event với status = PENDING

2. **`processPendingIntegrationEvents()`**
   - Đọc events PENDING/FAILED với next_run_at <= now
   - Claim event bằng cách set status = PROCESSING
   - Gọi `syncEmployeeToAll()`
   - Nếu success → status = SUCCESS
   - Nếu fail → status = FAILED + backoff + increment attempts
   - Nếu attempts >= MAX_ATTEMPTS → status = DEAD

**Backoff Strategy**:
```javascript
const getBackoffMs = (attempts) => {
    const baseMs = 5000;
    const exp = Math.max(attempts - 1, 0);
    return Math.min(60000, baseMs * Math.pow(2, exp));
};
// attempts 1 → 5s, 2 → 10s, 3 → 20s, 4 → 40s, 5+ → 60s (cap)
```

#### 5.2.4 Worker (`src/workers/integrationEventWorker.js`)

**Cách hoạt động**:
- Chạy background poll với interval (default 5000ms)
- Gọi `processPendingIntegrationEvents()` mỗi interval
- Enable/disable qua env `OUTBOX_ENABLED`

**Config**:
```
OUTBOX_ENABLED=true
OUTBOX_POLL_INTERVAL_MS=5000
OUTBOX_BATCH_SIZE=10
OUTBOX_MAX_ATTEMPTS=5
```

#### 5.2.5 Integration Events APIs (Admin-only)

| Endpoint | Chức năng |
|----------|-----------|
| `GET /api/integrations/events` | Danh sách events với filters |
| `POST /api/integrations/events/retry/:id` | Retry 1 event cụ thể |
| `POST /api/integrations/events/retry-dead` | Retry tất cả DEAD events |
| `POST /api/integrations/events/replay` | Replay events theo filter (entity/date/status) |

#### 5.2.6 Integration Queue UI

**Component**: `dashboard/src/components/IntegrationEventsPanel.jsx`

**Features**:
- Filter theo status (PENDING/FAILED/DEAD/SUCCESS)
- View event details
- Retry single event
- Retry all DEAD events

### 5.3 Kiến Trúc Lớn (Design-only)

Mô tả kiến trúc production-ready với Event Broker:

```
Client → API → Outbox → Broker (Kafka/RabbitMQ) → Consumer → SyncLog → Target Systems
                 ↓                    ↓
                 └──────────────────► DLQ (on failures)
```

**Thành phần**:
- **Event Broker**: Kafka/RabbitMQ cho throughput cao
- **Consumer Groups**: Xử lý song song theo domain
- **DLQ (Dead Letter Queue)**: Lưu FAILED events lâu dài
- **Observability**: Metrics (queue lag, retry count, p95 latency)

> *Lưu ý*: Kiến trúc này chỉ ở mức design, chưa triển khai trong code.

### 5.4 Demo Script

```bash
node scripts/demo-integration-events.js
```
Tạo sample FAILED/DEAD events để test UI và retry flows.

---

## 6. Case Study 5: Network / DR / Security

### 6.1 Mục Tiêu
- Kiến trúc mạng bảo mật
- Disaster Recovery strategy (RTO/RPO)
- Security controls

### 6.2 Network Architecture (Đề xuất)

```
Internet
   │
  [WAF / LB]
   │
  [DMZ] ────► [Frontend (Vite)]
   │
  [APP SUBNET] ────► [Backend API]
   │
  [DATA SUBNET] ────► [MongoDB] [MySQL]
   │
  [MONITORING] ────► [Logs / Metrics / Alerts]
```

**Tách mạng theo tier**:
- **Public tier**: WAF, Load Balancer
- **DMZ**: Frontend static files
- **App tier**: Backend API servers
- **Data tier**: Databases (private)
- **Monitoring**: Logs, metrics (isolated)

### 6.3 Security Controls

| Category | Implementation |
|----------|----------------|
| **Authentication** | JWT tokens |
| **Transport** | TLS 1.2+ cho tất cả connections |
| **Authorization** | Role-based (admin-only cho integrations) |
| **Database** | Least privilege per user |
| **Secrets** | Rotation 90 ngày, không plaintext |
| **Audit** | Log admin actions, retry, export |
| **Backup** | AES256 encryption |

### 6.4 Backup & DR Strategy

#### 6.4.1 Targets

| Metric | Value |
|--------|-------|
| **RPO** (Recovery Point Objective) | 24h (batch) hoặc 1h (incremental) |
| **RTO** (Recovery Time Objective) | 4h (demo), có thể giảm khi production |

#### 6.4.2 Backup Strategy

**MongoDB**:
- Daily snapshots
- Có thể thêm incremental backup mỗi giờ

**MySQL**:
- Daily snapshots + binlog continuous
- Cho phép point-in-time recovery

#### 6.4.3 DR Runbook (Tóm tắt)

1. **Xác nhận sự cố**: Phạm vi ảnh hưởng
2. **Freeze writes**: Read-only mode nếu cần
3. **Restore snapshot**: Mongo + MySQL từ backup gần nhất
4. **Replay binlog**: Giảm data loss
5. **Verify integrity**: Checksum, counts
6. **Resume operations**: Mở lại hệ thống + giám sát

### 6.5 Safe DR Rehearsal

**Script**: `scripts/dr-rehearsal-safe.js`

**Chức năng**:
- Non-destructive
- Đếm records trong tất cả tables
- Ghi report vào `Memory/DR/dr_rehearsal_safe_YYYY-MM-DD.json`
- Không thay đổi dữ liệu

**Chạy**:
```bash
node scripts/dr-rehearsal-safe.js
```

### 6.6 Availability Strategy (Design-only)

| Phase | Model |
|-------|-------|
| **Giai đoạn đầu** | Active-Passive |
| **Mở rộng** | Active-Active |

**Components**:
- Health checks + auto failover ở LB
- MongoDB: Replica Set
- MySQL: Primary/Replica replication
- Graceful degradation khi service phụ lỗi

### 6.7 Templates

| File | Mục đích |
|------|----------|
| `docs/templates/backup_policy.example.yml` | Template backup policy |
| `docs/templates/dr_runbook_template.md` | Template DR runbook |
| `docs/templates/security_baseline_template.yml` | Template security controls |

---

## 7. Scripts & Công Cụ Hỗ Trợ

### 7.1 Production Scripts

| Script | Mục đích | Khi dùng |
|--------|----------|----------|
| `aggregate-dashboard.js` | Batch aggregation | Hằng ngày hoặc sau import |
| `seed.js` | Seed sample data | Setup môi trường dev/demo |
| `dr-rehearsal-safe.js` | DR rehearsal | Kiểm tra backup quarterly |

### 7.2 Debug Scripts

| Script | Mục đích |
|--------|----------|
| `debug-alert-config.js` | Kiểm tra alert configuration |
| `debug-alert-counts.js` | Debug số lượng alerts |
| `debug_min_earnings.js` | Debug minEarnings filter |
| `test-drilldown-performance.js` | Test performance của drilldown |

### 7.3 Fix Scripts

| Script | Mục đích |
|--------|----------|
| `fix-alert-duplicates.js` | Xóa duplicate alert configs |
| `fix_earnings_table.js` | Fix earnings data issues |

### 7.4 Demo Scripts

| Script | Mục đích |
|--------|----------|
| `demo-integration-events.js` | Tạo sample integration events |
| `setup-test-user.js` | Tạo test user cho development |

---

## 8. Hướng Dẫn Vận Hành

### 8.1 Quy Trình Hằng Ngày

1. **Kiểm tra Dashboard**: Số liệu có cập nhật không?
2. **Kiểm tra Alerts**: Có alerts mới không?
3. **Kiểm tra Integration Queue**: Có FAILED/DEAD events không?

### 8.2 Sau Khi Import Dữ Liệu Lớn

```bash
# 1. Chạy batch aggregation
node scripts/aggregate-dashboard.js 2026

# 2. Kiểm tra summary tables có data
# Truy cập Dashboard và verify số liệu
```

### 8.3 Xử Lý Integration Failures

1. **Kiểm tra Integration Queue UI**: Xem events FAILED/DEAD
2. **Xem error message**: Identify root cause
3. **Fix issue** (network, DB connection, etc.)
4. **Retry**: Click retry trong UI hoặc gọi API

### 8.4 Troubleshooting Common Issues

| Vấn đề | Giải pháp |
|--------|-----------|
| Dashboard không có data | Chạy `aggregate-dashboard.js` |
| Alerts không đúng số lượng | Kiểm tra alert config + chạy lại batch |
| Drilldown chậm | Kiểm tra `EarningsEmployeeYear` table có data không |
| Integration fail | Kiểm tra DB connection + adapter health |
| DEAD events nhiều | Kiểm tra target system có up không |

### 8.5 Monitoring Checklist

- [ ] Dashboard loads trong < 2 giây
- [ ] Drilldown với limit lớn < 10 giây
- [ ] Integration Queue không có DEAD events tồn đọng
- [ ] Alerts hiển thị đủ 4 loại
- [ ] CSV export hoạt động

---

## Phụ Lục A: Environment Variables

```env
# Database
MONGODB_URI=mongodb://localhost:27017/sip_cs
MYSQL_HOST=localhost
MYSQL_DATABASE=payroll
MYSQL_USER=root
MYSQL_PASSWORD=password

# Outbox Worker
OUTBOX_ENABLED=true
OUTBOX_POLL_INTERVAL_MS=5000
OUTBOX_BATCH_SIZE=10
OUTBOX_MAX_ATTEMPTS=5

# Server
PORT=3000
JWT_SECRET=your-secret-key
```

## Phụ Lục B: File Structure Overview

```
SIP_CS/
├── src/
│   ├── adapters/              # Integration adapters
│   ├── config/                # integrations.js
│   ├── controllers/           # API controllers
│   ├── models/                # MongoDB models
│   │   └── sql/              # MySQL models + summary tables
│   ├── registry/              # ServiceRegistry
│   ├── routes/                # API routes
│   ├── services/              # syncService, integrationEventService
│   └── workers/               # integrationEventWorker
├── scripts/                   # Batch scripts
├── dashboard/                 # Frontend React app
├── docs/                      # Documentation
│   └── templates/            # Config templates
└── Memory/                    # Artifacts (ADR, DR reports)
```

---

> **Tài liệu này tổng hợp tất cả giải pháp đã triển khai từ Case Study 1-5. Đọc kết hợp với các file chi tiết trong `docs/` để hiểu sâu hơn từng phần.**
