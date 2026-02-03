# Case Study 5 - Network / DR / Security Plan

> Last Updated: 2026-02-03

## 1) Mục tiêu
- Đề xuất kiến trúc mạng, vùng bảo mật, DR strategy, RTO/RPO.

## 2) Kiến trúc mạng (đề xuất)
- Frontend Vite -> Backend API (DMZ).
- Backend kết nối MongoDB + MySQL trong private subnet.
- Tách mạng theo tier: public, app, data.

### Network Diagram (ASCII)
```
Internet
  |
 [WAF / LB]
  |
 [DMZ] ----> [Frontend (Vite)]
  |
 [APP SUBNET] ----> [Backend API]
  |
 [DATA SUBNET] ----> [MongoDB] [MySQL]
  |
 [MONITORING] ----> [Logs / Metrics / Alerts]
```

## 3) Security & Authentication
- JWT cho API.
- TLS cho toàn bộ kết nối ngoài.
- Principle of least privilege cho DB user.

### Security Controls Checklist
- IAM: phân quyền theo role, admin-only cho integrations.
- Secrets: rotation định kỳ, không lưu plaintext.
- Audit logging: ghi log truy cập admin, retry, export.
- Network ACL: chỉ allow service-to-service cần thiết.
- Backup encryption: AES256 cho snapshot.

## 4) Backup & DR
- RPO: 24h (batch) hoặc 1h (nếu có incremental).
- RTO: 4h (demo), có thể giảm khi triển khai production.
- Mongo: snapshot hàng ngày.
- MySQL: binlog + snapshot.

### DR Runbook (Doc)
1. Xác nhận sự cố và phạm vi ảnh hưởng.
2. Freeze writes (read-only mode nếu cần).
3. Restore snapshot gần nhất (Mongo/MySQL).
4. Replay binlog để giảm data loss.
5. Verify data integrity (checksum, counts).
6. Mở lại hệ thống và giám sát.

### Safe DR Rehearsal (Non-destructive)
- Script: `SIP_CS/scripts/dr-rehearsal-safe.js`
- Output report: `SIP_CS/Memory/DR/dr_rehearsal_safe_YYYY-MM-DD.json`
- Mục tiêu: kiểm tra số lượng dữ liệu và ghi nhận thời gian kiểm chứng.

#### Kết quả rehearsal gần nhất (2026-02-03)
- Report: `Memory/DR/dr_rehearsal_safe_2026-02-03.json`
- Duration: ~1.7s
- Mongo employees: 500,000
- MySQL:
  - integration_events: 2
  - sync_logs: 8
  - earnings_summary: 20
  - vacation_summary: 20
  - benefits_summary: 14
  - alert_employees: 160,661

### Template Sections
#### backup_policy.example
```
backup_frequency: daily
incremental_frequency: hourly
retention_days: 30
encryption: AES256
storage_location: s3://company-backups/payroll
verify_after_backup: true
restore_test_frequency: quarterly
```

#### dr_runbook_template
```
incident_owner:
escalation_path:
freeze_writes_steps:
restore_steps:
validation_steps:
rollback_steps:
```

#### security_baseline_template
```
tls_min_version: "1.2"
db_user_least_privilege: true
admin_actions_audited: true
secrets_rotation_days: 90
backup_encryption: AES256
```

### DR Test Plan
- Restore dry-run mỗi quý.
- Simulate DB outage và đo RTO/RPO.
- Verify dữ liệu sau restore (count + checksum).

### Artifacts (Files)
- `docs/templates/backup_policy.example.yml`
- `docs/templates/dr_runbook_template.md`
- `docs/templates/security_baseline_template.yml`

## 5) Availability Strategy
- Mục tiêu: duy trì dịch vụ liên tục và giảm downtime.
- Mô hình đề xuất: active-passive (giai đoạn đầu), active-active (giai đoạn mở rộng).
- Health checks + auto failover ở tầng LB.
- DB replication: Mongo replica set, MySQL primary/replica.
- Cơ chế graceful degradation khi dịch vụ phụ lỗi.
- Alignment với RTO/RPO đã đặt ra.

## 6) Băng thông & ưu tiên dịch vụ
- Ưu tiên luồng API quan trọng (dashboard, sync).
- Tách traffic nội bộ và traffic public.

## 7) Gaps
- Chưa triển khai hạ tầng thật.
- Chưa có kiểm thử DR end-to-end.
- Availability strategy mới ở mức tài liệu.
