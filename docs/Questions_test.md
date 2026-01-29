## UI / UX (1–30)

Trong 10 giây đầu mở dashboard, có hiển thị ít nhất 3 KPI chính (Payroll, Vacation, Avg Benefits) không?

Các KPI có chú thích đơn vị (ví dụ: USD / per year) không?

Có hiển thị “Data as of <datetime>” ở góc rõ ràng không?

Các KPI có indicator trạng thái (normal/warning/critical) dựa trên threshold có thể cấu hình không?

Có tooltip giải thích công thức mỗi KPI (ví dụ: Total Payroll = base + bonuses) không?

Các chart có legend và axis labels rõ ràng không?

Chart có hiển thị giá trị khi hover (data point tooltip) không?

Các màu sử dụng có đủ contrast để đọc được không (contrast ratio)?

UI có kiểm tra accessibility cơ bản (tab order, screen reader labels) không?

Nếu user bị color-blind, legend vẫn phân biệt được (bằng shape/label) không?

Các filter (year, department, threshold) dễ tìm và có nút reset không?

Khi áp filter, có dòng “Filtered by: …” hiển thị rõ không?

Hành động Drill-down có affordance (cursor, hint) rõ ràng không?

Modal “View employees” có header hiển thị filter context và data_as_of không?

Modal có control pagination hiển thị tổng items và số trang chính xác không?

Button có trạng thái loading (spinner + disabled) khi gọi API không?

Nếu network chậm, UI có skeleton/loading placeholder không?

Empty state (không có dữ liệu) có thông báo thân thiện và gợi hành động không?

Error state (API fail) có banner & retry option không?

Mobile / responsive: Dashboard có breakpoints hợp lý không?

Table columns có thể sort & resize (hoặc responsive hide) không?

Search box rõ ràng là server-side search hay client-side?

Input validation (ví dụ threshold phải là số, year có định dạng) có cảnh báo người dùng không?

Modal có thể đóng bằng ESC và click nền hoạt động không?

Keyboard navigation: có thể điều hướng hàng trong bảng và mở actions bằng bàn phím không?

Accessible names / aria-labels cho buttons, inputs, modals có đầy đủ không?

Hiển thị date/time tuân theo locale hoặc có selector locale không?

Có link Help/Docs hoặc tooltip để giải thích metrics không?

Các CTA (ví dụ: Refresh) có confirmation nếu hành động tốn tài nguyên không?

UI có hiển thị thông tin audit (ai/bao giờ refresh) để truy vết không?

## Functional / Business Logic (31–70)

Khi Drill-down từ “Earnings by Dept” có trả về employees với các cột id, name, dept, earning không?

Kết hợp filters (dept + gender + ethnicity + min_earning) áp dụng theo logic AND đúng không?

Search theo name/ID trả về kết quả chính xác và không phân biệt hoa thường không?

“Employees with earning > X per year, grouped by dept” trả về grouped counts & sums chính xác không?

Logic tạo Alerts: employees thỏa rule xuất hiện đúng trong alert list không?

“Hire anniversary within N days” có bao gồm employees có hire_date trong cửa sổ ngày đó (inclusive) không?

“High vacation balance” dùng threshold theo policy công ty; threshold có thể cấu hình không?

Alert khi thay đổi benefit trigger chỉ xảy ra nếu flag salary-impact = true không?

Action trên alert (view record) mở đúng employee data không?

Pagination trên employee list trả về pageSize, page, totalItems đúng không?

Sort employees theo earning desc trả về những người thu nhập cao nhất trước không?

Filters được giữ nguyên khi chuyển trang (pagination retains filters) không?

Tổng các items trong drill-down có thể reconcile với summary (sum of items = summary row) không?

Aggregation có tôn trọng fiscal year vs calendar year nếu có yêu cầu không?

Nếu department đổi tên, historical summary sử dụng mapping lịch sử hay mapping hiện tại?

Trường data owner (createdBy/updatedBy) có trong audit khi sửa đổi không?

Soft delete vs hard delete: xóa mềm không ảnh hưởng summary cho đến khi re-aggregate chứ?

Export CSV/PDF cho drill-down chứa cùng số liệu như UI không?

Search hỗ trợ diacritics và unicode names không?

Filters hỗ trợ multi-select (ví dụ chọn nhiều department) không?

Drill-down tuân theo role-based visibility (các cột nhạy cảm bị che cho non-admin) không?

Alerts có level severity và sorting theo severity rồi date chứ?

Alerts có thể được acknowledged và trạng thái acknowledgment được lưu không?

Hệ thống cho cấu hình business holidays ảnh hưởng tới tính vacation không?

Khi tính average benefits có loại bỏ outliers theo config (ví dụ: top 1%) không?

Khi aggregate per-employee, duplicate payroll entries được xử lý (dedup) đúng không?

Khi employee chuyển department giữa năm, earnings được phân bổ như thế nào?

Nếu payroll có back-dated adjustments, summaries có được cập nhật trong lần aggregation tiếp theo không?

Khi làm manual correction cho 100 employees, đường dẫn propagation tới summaries được document chứ (manual rerun hay delta update)?

Drill-down hiển thị currency & rounding consistent với precision của summary không?

Filters employee status (active/terminated) áp dụng đúng vào summary khi cần không?

Employee confidentiality flags ngăn hiển thị fields nhạy cảm trong drill-down không?

Alerts cho birthday trong tháng hiện tại có tính timezone đúng cho hire/birthdate không?

UI hiển thị lý do/explanation cho mỗi alert item (ví dụ rule matched) không?

Thay đổi AlertsConfig trên UI được lưu vào config store và dùng cho các job chạy sau không?

Manager-level users chỉ thấy aggregated view cho team của họ không?

Nếu employee có multiple roles, logic split earnings được document và hiển thị rõ không?

Export drill-down tôn trọng RBAC (không export columns không được phép) không?

Có ghi metrics usage (view count) cho từng alert và drill-down không?

Khi schema summary thay đổi, backward compatibility hoặc migration được document không?

## Data Accuracy & Consistency (71–110)

Summary totals khớp SUM của raw payroll table theo cùng filters (bằng SQL để chứng minh) không?

Có checksum (hash) cho aggregation; rerun trả về cùng checksum nếu source không thay đổi không?

Row counts trước/sau aggregation được log để reconcile không?

Nếu mismatch vượt threshold, hệ thống flag inconsistency và notify data steward không?

Batch job ghi runtime, processed rows, skipped rows, error rows vào logs không?

Aggregation xử lý null/zero nhất quán (ví dụ: missing benefit amount được tính là 0 hay exclude) không?

Aggregation dùng cùng currency; multi-currency được convert hay xử lý rõ ràng không?

Cách tính vacation days phù hợp HR policy (ví dụ prorate cho part-time) không?

Kiểm tra completeness của ethnicity: % employees thiếu ethnicity có được flag không?

Boundary của aggregation window (inclusive/exclusive) được document và consistent không?

Khi source có corrections, có thể chạy delta-only job để cập nhật summaries idempotently không?

Nếu source có duplicates, dedup rule được áp dụng và document không?

Aggregation xử lý large integers tránh overflow hoặc loss of precision không?

Chính sách rounding (round/ceil/floor) được áp dụng nhất quán giữa summary & drill-down không?

Normalization timezone trước khi group by date được thực hiện hay chưa (ví dụ hire_date across zones)?

Schema definition cho summary tables có types và constraints được document không?

Khi employee terminated, summaries phản ánh termination date rules đúng không?

Nếu payroll có retroactive adjustments, aggregation phân loại chúng vào đúng period không?

Data lineage: mỗi giá trị summary liên kết ngược tới source queries/pipelines không?

Data anonymization/pseudonymization có áp cho test/export không?

Summaries bao gồm count of employees dùng trong averaging để phát hiện sample nhỏ không?

Edge-case employee với zero hours được include/exclude thế nào? Document rõ không?

Nếu có mismatch giữa hai aggregates do filter khác nhau, có tool diff hỗ trợ không?

Aggregation tuân theo company rounding/currency formatting policies không?

Có reconciliation report (summary vs raw) tự động sau aggregation không?

Aggregation logic có unit tests cover boundary conditions không?

Nếu DST/timezone shift xảy ra, historical aggregations vẫn nhất quán không?

Data quality metrics (null %, duplicate %, outlier %) có được tính và lưu không?

Khi mapping ethnicity thay đổi (merge categories), historical summaries được preserve hay migrate không?

Summary update transactionality: không để summary tables ở trạng thái partial khi job fail chứ?

Aggregation hỗ trợ incremental mode (chỉ xử lý changed rows) để cải thiện runtime không?

Column-level lineage (who/what/when) có sẵn cho auditing không?

Aggregation loại trừ payroll test data có flag is_test không?

Aggregation xử lý negative payroll adjustments đúng (deduction) không?

Nếu source timezone unknown, aggregation flag ambiguous dates cho review không?

Nếu data stale vượt SLA, UI highlight stale status rõ ràng không?

Nếu Mongo vs MySQL disagree, precedence rules đã document không?

Unit tests kiểm tra sum of drill-down = summary department totals không?

Nếu data skew (một dept chiếm đa số earnings), có alerts cho outliers không?

Aggregation xử lý employees with multiple currencies theo convert vs separate được document không?

Performance / Scalability (111–150)

Sau pre-aggregation, full dashboard load time dưới SLA đã định (ví dụ <2s) không?

Cache HIT requests trả dưới 100ms ổn định trong load tests không?

First load sau cache miss nằm trong threshold chấp nhận được (ví dụ <5s) không?

Backend memory usage ổn định sau 10 heavy requests (không OOM) không?

Hệ thống hỗ trợ 100 concurrent users với average response trong SLA không?

Pagination query page size 20 trả trong <300ms trong env performance không?

Search by name/ID dùng indexed fields; benchmark sub-200ms có được không?

Batch job runtime predictable và kết thúc trong maintenance window (ví dụ nightly) không?

Cache stampede protection (lock/jitter/request coalescing) đã implement không?

Hệ thống có thể scale horizontally (stateless API) mà không gặp session sticky issues không?

DB connection pool sizing phù hợp, không exhaust dưới load không?

Aggregation job được parallelize an toàn mà không contention hoặc excessive IO không?

CDN dùng cho static assets để giảm frontend load không?

Browser perceived render time đo được và chấp nhận (<1.5s trên 3G simulated) không?

API endpoints hỗ trợ compression (gzip) cho large payloads không?

Large drill-down exports được stream thay vì load toàn bộ vào memory không?

Load test scenario gồm 100 users click drill-downs khác nhau; SLA có được đáp ứng không?

Metrics cho P95/P99 latencies được thu thập và thresholds định nghĩa không?

Autoscaling trigger dựa trên meaningful metrics (CPU, queue length) không?

Throttling applied cho expensive endpoints để preserve stability không?

Circuit breaker cho downstream DB failures tồn tại không?

Indexes cho frequent queries đã review; missing index alerts tồn tại không?

Pagination dùng seek-based cho large offsets để tránh slow OFFSET scans không?

DB read replicas dùng cho analytics reads để offload primary không?

Query plans được analyze, heavy queries optimized (không full table scans) không?

Aggregation job hỗ trợ chunking/batching để tránh memory spikes không?

Caching granularity: per-widget vs global cache đã validate không?

Backend monitored cho event loop blocking (Node) không?

Message queue (nếu dùng) support required throughput cho near-real-time updates không?

Nếu traffic spike, có plan graceful degradation (giảm refresh rate) không?

Hot partitions/shards detect và mitigation strategy có không?

Database maintenance (reindex, vacuum) có schedule không?

Long-running queries được log & alerted không?

Response size limits enforced để tránh client overload không?

Client-side virtualization cho large tables để tránh rendering lag không?

Dùng approximate counts cho initial UI rồi refine exact counts để cải thiện perceived speed không?

Background prefetch warming cho likely widgets được implement không?

Benchmarks include worst-case filter combinations để đảm bảo performance margin không?

Integration tests include performance assertions for critical endpoints không?

Rate limits documented & enforced cho API consumers không?

## Security & Privacy (151–180)

Tất cả protected endpoints yêu cầu Bearer token và validate scopes/roles chứ?

Passwords lưu hashed với secure algorithm (bcrypt/argon2) và salt chứ?

Tokens có expiry hợp lý và mechanism refresh được document không?

Có cơ chế revocation cho compromised tokens không?

PII fields nhạy cảm được mask/omit khi không authorized không?

RBAC implemented: admin vs manager vs HR vs viewer roles được enforce server-side không?

Access logs lưu user id, action, timestamp cho audit không?

CSRF protection cho state-changing operations trên browser clients có không?

CORS policy locked to allowed origins cho production không?

Rate limiting per IP/user để mitigate brute-force có không?

Vulnerability scanning (SAST/DAST) part of CI pipeline không?

Secrets management: env vars không commit, secrets stored in vault không?

TLS enforced cho tất cả traffic; certs managed/rotated không?

Data at rest encrypted where required (DB-level or disk encryption) không?

PII retention policy (purge/archive) có defined & implemented không?

GDPR/PDPA compliance considered: right to be forgotten workflow có không?

Logging tránh lưu raw sensitive data (no full SSN in logs) chứ?

Incident response plan cho security incidents có document không?

Third-party libs up-to-date, không có critical CVEs không?

Admin panel protected behind VPN or tighter auth không?

Account lockout policy after repeated failed logins có không?

MFA enforced cho admin accounts không?

Password complexity & rotation policy defined không?

Audit trail immutable or tamper-evident logs cho compliance không?

Regular security reviews & pentesting scheduled không?

Upload/file handling sanitized để tránh RCE/injection không?

Dependency provenance tracked (SBOM) cho supply-chain security không?

Encryption keys rotated periodically & stored securely không?

Data minimization principle applied cho APIs (no overexposure) không?

Data breach plan & communication procedure defined không?

Alerts / Business Rules (181–200)

Alert definitions stored in config with versioning & audit trail không?

Alert thresholds editable via UI & validated before save không?

Alert engine có test harness để simulate events & verify outputs không?

Alerts có time windows để avoid flapping (e.g., sustained condition) không?

Alerts có thể be acknowledged by users và acknowledgement được log không?

Alerts có severity → mapped to SLA actions (e.g., P1 notify email + SMS) không?

Alert suppression rules (ví dụ: không notify duplicates trong X minutes) có không?

Alert history retained for analysis & export không?

Alert notifications templated & localized không?

Alert rules support exception lists (exclude certain employees) không?

Alert resolution workflow defined (owner, steps, resolution code) không?

Bulk alerts scalable (millions checks vs batch grouping) tested không?

Alerting integrates with incident management (PagerDuty, Slack) không?

Alerts test case included in CI to prevent regression không?

Alerts based on derived metrics (e.g., moving average) supported không?

Alerts have backfill behavior when data delayed (avoid retroactive false alerts) không?

Alerts rate-limited per user to avoid spam không?

Alert priority displayed visually on UI and used for sorting không?

Alerts include link to investigative drill-down with pre-applied filters không?

Alerts disabled/enabled persisted and respected across job runs không?

Operations, DevOps, Backup & Recovery, Monitoring (201–220)

Backup schedule cho DBs defined & tested (restore test performed) chưa?

RPO (data loss acceptable) và RTO (time to recover) documented cho HR/Payroll chứ?

Disaster recovery runbook exists with clear owner & steps không?

CI/CD pipeline chạy lint, unit tests, integration tests trước merge không?

Deployment có automated DB migrations with rollback capability không?

Monitoring covers key metrics: latency, error rate, GC, DB connections, queue lengths không?

Alerting on infra metrics (high error rate, high latency, low disk) configured không?

Log retention policy & centralized log aggregation (ELK/Cloud) implemented không?

Health checks & readiness probes dùng cho orchestration không?

Canary or phased rollout supported để giảm blast radius không?

Feature flags dùng để toggle risky features trong deploy không?

Observability: distributed tracing enabled cho cross-service correlation không?

Automated smoke tests post-deploy validate critical flows (signin, earnings summary) không?

Secrets rotation process in place cho prod credentials không?

Capacity planning documented & tested cho peak load scenarios không?

Cost monitoring (DB storage, egress) with alerts for budget thresholds có không?

Runbooks cho common ops tasks (clear cache, restart job) documented & accessible không?

Rollback plan rehearsed & deployment rollback automated if smoke fails không?

Postmortem process defined: RCA, timeline, action items tracked to closure không?

On-call roster & escalation path defined cho critical production incidents không?

Mình đã giữ lại tất cả các thuật ngữ chuyên ngành bằng tiếng Anh (ví dụ: KPI, API, Drill-down, pagination, cache, ETL, CI/CD, SLA, RPO, RTO, JWT, RBAC, PII, SSN, MFA, OLTP, OLAP, Adapter Pattern, pre-aggregation, batch job, v.v.) như yêu cầu để bạn dễ nhận diện keyword khi chuyển thành test case.
