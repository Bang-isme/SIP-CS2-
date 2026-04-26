# Demo Data Structures Reference - Bang Tra Cuu Nhanh

> Nhom 11 | Cap nhat: 2026-04-15
> Muc tieu: mo file nay khi demo hoac Q&A can chi nhanh ownership du lieu, service boundary, collection/table, va cac bien cau hinh quan trong.

---

## 1. Kien truc du lieu theo service

### 1.1 SA Service

- Vai tro: source system cho employee, auth, user, va integration outbox.
- Port mac dinh: `4000`
- Datastore chinh:
  - MongoDB cho `employees`, `users`, `roles`, `alerts`, `integration_events`, `integration_event_audits`
- Worker so huu:
  - Mongo outbox worker
- Runtime note:
  - `SA` hien tai boot voi `requireMySQL: false`; service nay khong can MySQL de nhan request CRUD va quan ly outbox.

### 1.2 Payroll Service

- Vai tro: downstream payroll system doc-luong rieng, co internal write path va read-only public API.
- Port mac dinh: `4100`
- Datastore chinh:
  - MySQL cho `pay_rates`, `sync_log`
- Public UI:
  - Payroll console static phuc vu demo
- Worker:
  - Khong chay outbox worker

### 1.3 Dashboard Service

- Vai tro: reporting system cho Case Study 2.
- Port mac dinh: `4200`
- Datastore chinh:
  - MongoDB cho employee, alert, auth context
  - MySQL cho summary/read-model va drilldown
- Worker so huu:
  - Dashboard aggregation worker

### 1.4 Integration boundary hien tai

- Luong chinh: `SA write -> Mongo outbox -> worker -> Payroll internal API -> Payroll MySQL`
- Boundary quan trong:
  - `SA` khong con ghi thang bang `pay_rates` hoac `sync_log`
  - `Payroll` tu so huu write path cua MySQL qua internal endpoint
  - `Dashboard` la service reporting rieng, khong dong vai tro middleware sync

---

## 2. MongoDB Collections dang dung that

### 2.1 `employees` - `src/models/Employee.js`

Nguon du lieu nhan su chinh cho SA.

Field quan trong:

| Field | Type | Ghi chu |
|---|---|---|
| `employeeId` | String, unique | Ma nhan vien human-readable |
| `firstName`, `lastName` | String | Ten nhan vien |
| `gender` | Enum | `Male`, `Female`, `Other` |
| `employmentType` | Enum | `Full-time`, `Part-time` |
| `departmentId` | ObjectId | Tham chieu phong ban |
| `hireDate`, `birthDate` | Date | Dung cho anniversary/birthday alerts |
| `vacationDays` | Number | Dung cho vacation alert |
| `payRate` | Number | Muc luong hien tai phia SA |
| `annualEarnings`, `annualEarningsYear` | Number | Gia tri duoc tong hop de ho tro dashboard |
| `createdAt`, `updatedAt` | Date | Timestamp |

### 2.2 `departments` - `src/models/Department.js`

Danh muc phong ban phuc vu employee editor, dashboard filter, va grouping.

### 2.3 `alerts` - `src/models/Alert.js`

Alert definitions va acknowledgement state cho dashboard.

Field can nho:

| Field | Type | Ghi chu |
|---|---|---|
| `name` | String | Ten alert |
| `type` | Enum | `anniversary`, `birthday`, `vacation`, `benefits_change` |
| `threshold` | Number | Nguong kich hoat |
| `isActive` | Boolean | Bat/tat alert |
| `acknowledgement` | Object | Owner, note, stale-review metadata phuc vu action center |

### 2.4 `users` - `src/models/User.js`

Tai khoan dang nhap cho SA va Dashboard.

Field can nho:

| Field | Type | Ghi chu |
|---|---|---|
| `username`, `email` | String | Dinh danh user |
| `password` | String | Hash bang bcrypt |
| `roles` | Array<ObjectId> | Tham chieu `roles` |
| `tokens` | Array | Session persistence cho SA auth mode `persistent` |

### 2.5 `roles` - `src/models/Role.js`

Role su dung trong repo:

- `user`
- `moderator`
- `admin`
- `super_admin`

### 2.6 `integration_events` - `src/models/IntegrationEvent.js`

Day la **active outbox** cua SA. Collection nay nam trong MongoDB, khong nam o MySQL.

| Field | Type | Ghi chu |
|---|---|---|
| `id` | Number, unique | Sequence id de demo de trace |
| `entity_type` | String | Hien tai chu yeu la `employee` |
| `entity_id` | String | Thuong la `employeeId` |
| `action` | Enum | `CREATE`, `UPDATE`, `DELETE` |
| `payload` | Mixed | Snapshot gui cho worker |
| `correlation_id` | String | ID de trace suot workflow |
| `status` | Enum | `PENDING`, `PROCESSING`, `SUCCESS`, `FAILED`, `DEAD` |
| `attempts` | Number | So lan da thu |
| `last_error` | String | Loi gan nhat |
| `next_run_at` | Date | Backoff retry |
| `processed_at` | Date | Luc xu ly xong |
| `last_operator_action` | String | `retry`, `replay`, `recover-stuck`, ... |
| `last_operator_actor_id` | String | Ai vua thao tac |
| `last_operator_request_id` | String | Request id gan operator action |
| `last_operator_at` | Date | Thoi diem operator action |
| `createdAt`, `updatedAt` | Date | Timestamp |

Trang thai vong doi:

```text
PENDING -> PROCESSING -> SUCCESS
   |           |
   |           -> FAILED -> DEAD
   \--------------------/
```

### 2.7 `integration_event_audits` - `src/models/IntegrationEventAudit.js`

Audit trail cho operator action tren outbox.

| Field | Type | Ghi chu |
|---|---|---|
| `id` | Number, unique | Sequence id |
| `integration_event_id` | Number | Tham chieu event theo `id` |
| `operator_action` | String | `retry`, `replay`, `recover-stuck` |
| `operator_actor_id` | String | User thuc hien |
| `operator_request_id` | String | Request id cua thao tac |
| `source_status` | Enum/null | Trang thai truoc khi thao tac |
| `target_status` | Enum/null | Trang thai sau khi thao tac |
| `details` | Mixed | Payload audit |
| `createdAt`, `updatedAt` | Date | Timestamp |

---

## 3. MySQL Tables dang dung that

### 3.1 `pay_rates` - `src/models/sql/PayRate.js`

Bang lich su pay rate cua Payroll system.

```sql
id             INT AUTO_INCREMENT PRIMARY KEY
employee_id    VARCHAR(50) NOT NULL
pay_rate       DECIMAL(10,2) NOT NULL DEFAULT 0
pay_type       ENUM('HOURLY','SALARY','COMMISSION','TERMINATED')
effective_date DATE NOT NULL
is_active      TINYINT(1) NOT NULL DEFAULT 1
createdAt      DATETIME
updatedAt      DATETIME
```

Nguyen tac:

- `Payroll` ghi vao bang nay qua internal mutation service.
- Update pay rate se deactivate row dang active va tao row moi.
- Delete employee se tao record `TERMINATED` de de phong ho ve payroll history.

### 3.2 `sync_log` - `src/models/sql/SyncLog.js`

Bang evidence cho luong dong bo vao Payroll.

| Field | Type | Ghi chu |
|---|---|---|
| `id` | Integer PK | Auto increment |
| `entity_type` | String | Hien tai la `employee` |
| `entity_id` | String | `employeeId` hoac Mongo `_id` string |
| `correlation_id` | String | Trace id xuyen service |
| `action` | Enum | `CREATE`, `UPDATE`, `DELETE` |
| `status` | Enum | `PENDING`, `SUCCESS`, `FAILED` |
| `error_message` | Text | Loi neu sync fail |
| `retry_count` | Integer | So lan retry ghi nhan cho target sync log |
| `completed_at` | Date | Khi xu ly xong |
| `createdAt`, `updatedAt` | Date | Timestamp |

Luu y:

- Tai lieu nay co y de theo **model thuc te hien tai**.
- Khong coi `source_system` va `target_system` la contract bang bat buoc trong phan Q&A, vi model active hien tai khong khai bao hai cot do.

### 3.3 Raw reporting tables

Nhung bang nay cap du lieu cho dashboard va demo reporting:

| Bang | Muc dich |
|---|---|
| `earnings` | Thu nhap raw theo nhan vien/nam |
| `vacation_records` | Ban ghi ngay nghi |
| `benefits_plans` | Danh muc phuc loi |
| `employee_benefits` | Mapping nhan vien -> goi phuc loi |

### 3.4 Pre-aggregation / read-model tables

Bang tong hop de Dashboard Service doc nhanh:

| Bang | Muc dich |
|---|---|
| `earnings_summary` | Tong hop thu nhap theo nam va phong ban |
| `earnings_employee_year` | Tong hop thu nhap theo nhan vien cho drilldown |
| `vacation_summary` | Tong hop vacation |
| `benefits_summary` | Tong hop benefits |
| `alerts_summary` | Tong hop so luong alert |
| `alert_employees` | Chi tiet nhan vien match alert |

### 3.5 `_schema_migrations`

Bang noi bo de theo doi migration MySQL da duoc ap dung.

Luu y quan trong:

- Day la migration tracker cho schema dang dung that.
- `integration_events` va `integration_event_audits` khong con la schema active trong MySQL readiness narrative.

---

## 4. API surface can nho khi bi hoi

### 4.1 SA Service

Public endpoints chinh:

- `POST /api/auth/signin`
- `POST /api/auth/logout`
- `GET /api/auth/me`
- `GET /api/employee`
- `POST /api/employee`
- `PUT /api/employee/:id`
- `DELETE /api/employee/:id`
- `GET /api/integrations/events/*`
- `POST /api/integrations/events/retry/:id`
- `POST /api/integrations/events/replay`

### 4.2 Payroll Service

Read-only public endpoints:

- `GET /api/payroll/config`
- `GET /api/payroll/health`
- `GET /api/payroll/pay-rates`
- `GET /api/payroll/pay-rates/:employeeId`
- `GET /api/payroll/sync-log`
- `GET /api/payroll/sync-log/:employeeId`

Internal endpoints:

- `GET /api/payroll/internal/health`
- `POST /api/payroll/internal/sync`

### 4.3 Dashboard Service

Public endpoints chinh:

- `GET /api/dashboard/earnings`
- `GET /api/dashboard/vacation`
- `GET /api/dashboard/benefits`
- `GET /api/dashboard/executive-brief`
- `GET /api/dashboard/drilldown`
- `GET /api/dashboard/drilldown/export`
- `GET /api/alerts/triggered`
- `POST /api/alerts/:id/acknowledge`

---

## 5. Sync va auth envelope can nho khi Q&A

### 5.1 Employee mutation response

Khi SA tao/sua/xoa employee, response tra ve:

```json
{
  "success": true,
  "data": {
    "employeeId": "EMP-2026-0501"
  },
  "sync": {
    "status": "QUEUED | SUCCESS | FAILED",
    "mode": "OUTBOX | DIRECT | DIRECT_FALLBACK",
    "consistency": "EVENTUAL | AT_RISK",
    "requiresAttention": false,
    "message": "..."
  }
}
```

Giai thich ngan:

- Demo path binh thuong: `QUEUED + OUTBOX + EVENTUAL`
- Neu enqueue gap loi, controller van co direct fallback de tranh mat kha nang dong bo
- `correlationId` la gia tri quan trong nhat de trace tu SA sang Payroll

### 5.2 Auth mode theo service

| Service | Auth mode | Ghi chu |
|---|---|---|
| SA | `persistent` | JWT phai hop le va ton tai trong `User.tokens[]` |
| Payroll | `stateless` | Dung role claims trong JWT, khong can Mongo auth storage |
| Dashboard | `stateless` | Dung role claims trong JWT, nhung van can Mongo cho reporting context |

---

## 6. Bien cau hinh quan trong

### 6.1 Ports va internal routing

| Bien | Mac dinh | Ghi chu |
|---|---|---|
| `SA_PORT` | `4000` | Port SA service |
| `PAYROLL_PORT` | `4100` | Port Payroll service |
| `DASHBOARD_PORT` | `4200` | Port Dashboard service |
| `INTERNAL_SERVICE_SECRET` | required in prod | Secret bao ve internal service API |
| `ACTIVE_INTEGRATIONS` | `payroll` | Demo profile mac dinh |
| `SA_PUBLIC_API_BASE_URL` | `http://127.0.0.1:4000/api` | Base URL cho script/demo |
| `PAYROLL_INTERNAL_API_BASE_URL` | `http://127.0.0.1:4100/api/payroll/internal` | Internal route SA goi sang Payroll |

### 6.2 Outbox worker

| Bien | Mac dinh | Ghi chu |
|---|---|---|
| `OUTBOX_ENABLED` | `true` | Bat luong Mongo outbox |
| `OUTBOX_POLL_INTERVAL_MS` | `5000` | Chu ky poll worker |
| `OUTBOX_BATCH_SIZE` | `50` | So event moi batch |
| `OUTBOX_MAX_ATTEMPTS` | `5` | So lan retry truoc khi `DEAD` |
| `OUTBOX_PROCESSING_TIMEOUT_MS` | `900000` | Timeout de recover stuck event |
| `OUTBOX_STOP_TIMEOUT_MS` | `5000` | Graceful stop worker |

### 6.3 Dashboard aggregation va memo readiness

| Bien | Mac dinh trong `config.js` | Ghi chu |
|---|---|---|
| `DASHBOARD_AGGREGATION_ENABLED` | `isDevelopmentLike()` | `.env.example` set `true` de local demo tu warm summary |
| `DASHBOARD_AGGREGATION_ON_START` | `isDevelopmentLike()` | Warm summary luc start dashboard |
| `DASHBOARD_AGGREGATION_AWAIT_ON_START` | `false` | Co the bat de block startup cho den khi warm xong |
| `DASHBOARD_FRESHNESS_THRESHOLD_MINUTES` | `120` | Nguong fresh/stale trong executive brief |
| `CASE3_PREPARE_DASHBOARD_DEMO` | `1` | Chay script baseline alert ownership khi start stack |
| `DASHBOARD_DEMO_ALERT_NOTE` | demo note mac dinh | Ghi chu acknowledgement cho active alerts |

### 6.4 Frontend dashboard env

Trong `dashboard/.env.example`:

- `VITE_SA_API_BASE_URL=http://localhost:4000/api`
- `VITE_DASHBOARD_API_BASE_URL=http://localhost:4200/api`
- `VITE_PAYROLL_API_BASE_URL=http://localhost:4100/api`

Muc dich:

- Login va employee CRUD di qua SA
- Executive dashboard va alert review di qua Dashboard
- Payroll console la UI rieng, khong dung bundle React chinh

---

## 7. Cau chot de nho khi demo

Neu giang vien hoi rat nhanh:

1. Source-of-truth nam o dau?
   - `Employees`, `users`, `alerts`, va Mongo outbox deu nam o SA / MongoDB.
2. Payroll ownership nam o dau?
   - `pay_rates` va `sync_log` do Payroll Service so huu trong MySQL.
3. Event queue nam o dau?
   - `integration_events` va `integration_event_audits` nam o MongoDB, khong nam o MySQL.
4. Dashboard doc gi?
   - Doc MongoDB + MySQL read-model de phuc vu reporting.
5. Demo readiness hien tai duoc dam bao the nao?
   - `case3` stack warm summary va prepare alert ownership de executive brief len `Ready for Memo`.
