# Pre-Viva Sprint Backlog (FE -> BE -> Docs)

## Sprint Goal

Tang muc do "defensible" cua project truoc viva:

- Giam cac cho de bi thay bat loi vi UI/flow dang "giong complete" nhung thuc ra chua dung requirement
- Dong bo cach claim giua code, docs, test, va demo script
- Chuyen cach noi tu "full system da xong" sang "increment da chay duoc + backlog ro rang"

## Current Readiness Verdict

Trang thai hien tai:

- Case 2: manh nhat, demo tot
- Case 3: partial, nen bao ve theo huong eventual consistency
- Case 4: middleware-lite, partial
- Case 5: docs/rehearsal level
- Alert settings role split: DONE (`moderator/admin/super_admin` quan ly alerts; `admin/super_admin` van giu integration controls)

Quality gate da kiem tra:

- Backend: `npm run lint` PASS
- Backend: `npm test` PASS
- Backend: `npm run test:advanced` PASS
- Backend: `npm audit --omit=dev` PASS (`0 vulnerabilities`)
- Frontend: `npm run lint` PASS
- Frontend: `npm test` PASS
- Frontend: `npm run build` PASS
- Frontend: `npm audit --omit=dev` PASS
- Full workspace `npm audit` van con backlog o dev tooling (khong nen nham voi production deps)

---

## Recently Closed Before Viva

### 1. Re-verify Benefits Drilldown flow before viva

Status hien tai:

- DONE trong increment hien tai

Why it matters:

- Benefits la 1 trong 3 summary chinh cua CEO memo.
- Benefits drilldown truoc day la diem de bi hoi; increment hien tai da sua flow nay va gio can smoke-test lai de tranh edge case.

Evidence:

- `D:\SIP_CS 2\SIP_CS\dashboard\src\components\BenefitsChart.jsx`
- `D:\SIP_CS 2\SIP_CS\dashboard\src\components\DrilldownModal.jsx`

Preferred fix:

- Tao benefits-specific drilldown mode:
  - doi label cot cuoi tu `Earnings` thanh `Benefits`
  - render gia tri benefits/pay plan phu hop context
  - bo quick filter `minEarnings` khi dang o benefits context

Fallback neu khong kip:

- Tat nut `Open Drilldown` cho benefits
- Them note ro rang: `Benefits summary only in current increment`

Acceptance criteria:

- User phai thay dung benefits context trong modal/export
- Neu co edge case, nhom phai co fallback wording ro rang thay vi de UI sai nghia requirement

Owner:

- FE + BE

### 2. Verify alert lifecycle and refresh behavior

Status hien tai:

- DONE trong increment hien tai

Why it matters:

- Alert settings da duoc cai tien; diem can re-check truoc viva la refresh/clear behavior va targeted alert refresh path trong session hien tai.
- Day la cho rat de bi hoi vi CEO memo ghi management muon set alerts.

Evidence:

- `D:\SIP_CS 2\SIP_CS\src\controllers\alerts.controller.js`
- `D:\SIP_CS 2\SIP_CS\scripts\aggregate-dashboard.js`
- `D:\SIP_CS 2\SIP_CS\dashboard\src\components\AlertSettingsModal.jsx`

Fix list:

- Respect `isActive` khi create alert
- Neu khong con active alerts, aggregation van phai clear `AlertsSummary` va `AlertEmployee`
- Sau save alert, clear cache hoac refresh co chu dich
- Neu possible, them "Run aggregation now" admin action thay vi chi hien shell command

Acceptance criteria:

- Tao alert moi o state inactive thi khong bi ep active
- Tat het alerts va rerun aggregation thi dashboard khong con hien alert cu
- Save rule xong co cach ro rang de thay dashboard cap nhat

Owner:

- BE truoc, sau do FE

### 3. Verify integration queue stale-`PROCESSING` recovery

Status hien tai:

- DONE trong increment hien tai

Why it matters:

- Case 4 se mat diem neu thay hoi "worker chet giua chung thi sao?".
- Increment hien tai da bo sung timeout-based recovery; dieu can lam truoc viva la xac nhan monitor, button recover, va wording demo deu an khop.

Evidence:

- `D:\SIP_CS 2\SIP_CS\src\services\integrationEventService.js`
- `D:\SIP_CS 2\SIP_CS\src\controllers\integration.controller.js`

Fix list:

- Them stale-processing timeout
- Them duong recover cho stale `PROCESSING`
- Hien thi canh bao `stuck processing` trong monitor neu co

Acceptance criteria:

- Event `PROCESSING` qua nguong X phut duoc recover hoac duoc admin thao tac
- Queue monitor phan biet duoc `PROCESSING` healthy va `PROCESSING` bi ket

Owner:

- BE

### 4. Dong bo docs claim voi code that

Status hien tai:

- DONE trong increment hien tai

Why it matters:

- Thay chi can mo 2 file docs ra la thay nhom tu mau thuan.
- Day la loi "mat uy tin", du code co chay.

Evidence:

- `D:\SIP_CS 2\SIP_CS\docs\ceo_memo_acceptance_matrix.md`
- `D:\SIP_CS 2\SIP_CS\Memory\CaseProgress\case_study_progress.md`
- `D:\SIP_CS 2\SIP_CS\tests\advanced\quality.test.js`

Fix list:

- Doi `Case Study 3: COMPLETE` thanh wording trung thuc hon
- Sua language quanh `ACID PROPERTY TESTS` thanh local transaction/integrity tests
- Cap nhat security audit claim theo ket qua hien tai

Acceptance criteria:

- Tat ca docs chinh noi cung mot giong:
  - Case 2 implemented
  - Case 3 partial/eventual consistency
  - Case 4 partial
  - Case 5 docs-level

Owner:

- Docs + tech lead

---

## Remaining Focus If Time

Luu y:

- Muc 5 duoc giu lai nhu viva talking point vi day la fix moi dong va can nhan manh khi thuyet trinh.

### 5. Tach quyen "management can set alerts" khoi admin-only integration controls

Status hien tai:

- DONE trong increment hien tai

Why it matters:

- Memo noi management muon set alerts.
- Day la cho de bi hoi neu UI de moderator/manager khong cham duoc alert settings.

Suggested direction:

- Da tach role theo dung nghia hon:
  - `moderator/admin/super_admin` co the vao Alert Settings
  - `admin/super_admin` van la role cho integration retry/replay
- Khi bao ve, nhan manh day la su tach biet giua business alert control va operational recovery control

### 6. Lam dung nghia benefits-change alert

Status hien tai:

- DONE trong increment hien tai

Why it matters:

- Alert nay de bi bat loi neu chi hien "co thay doi gan day" ma khong noi ro payroll impact.

Suggested direction:

- Da doi sang payroll-impact cue ro rang hon:
  - alert chi tiet luu plan, annual paid amount, last change date, effective date, impact code
  - UI preview + modal hien ly do impact thay vi chi hien ngay thay doi

### 7. Bo sung test cho executive flows quan trong

Why it matters:

- FE test hien tai chu yeu test shell states.
- Alert modal, alerts panel, benefits flow, integration panel chua co test behavior rieng.

Suggested direction:

- Them test cho:
  - save alert config
  - disable all alerts
  - benefits drilldown behavior
  - integration replay/retry UI states

### 8. Verify employee mutation contract in viva flow

Why it matters:

- Day la diem de chung minh nhom hieu eventual consistency that, khong chi noi ly thuyet.
- Increment hien tai da doi validation/business-rule errors sang `400/409` va giu source success neu integration dispatch gap truc trac.

Suggested direction:

- Smoke-test nhanh create/update/delete voi 3 tinh huong: validation fail, duplicate `employeeId`, outbox fallback
- Khi demo hoac viva, chi ro `sync.status`, `mode`, `consistency`, `requiresAttention`

### 9. Separate production vs dev-tooling audit claims

Why it matters:

- Production dependency audit da sach sau dependency refresh.
- Full workspace audit van con backlog o dev tooling/test stack, nen wording khi bao ve phai tach bach.

Suggested direction:

- Claim ro `npm audit --omit=dev` da sach
- Khong claim `npm audit` full workspace da sach cho den khi cleanup xong toolchain dev

---

## Do Not Overclaim When Presenting

Khong nen noi:

- "Case 1-5 da hoan thien"
- "He thong da ACID"
- "Middleware da enterprise-grade"
- "Alerts da realtime"
- "Production-ready"

Nen noi:

- "Case 2 la increment implemented manh nhat"
- "Case 3 duoc trien khai theo eventual consistency co retry/replay"
- "Case 4 da co middleware-lite pattern: outbox, worker, monitoring"
- "Case 5 o muc design, security baseline, DR planning"
- "Alert configuration da configurable; alert summaries refresh ngay trong session hien tai, con batch schedule van la baseline cho aggregate tong the"

---

## Suggested Sprint Order

Neu con 1 sprint ngan truoc viva:

1. Lam dung nghia benefits-change alert
2. Bo sung test cho executive flows quan trong
3. Smoke-test employee mutation contract cho viva
4. Chot wording phan biet production audit va dev-tooling backlog

Neu con rat it thoi gian:

1. Chot script thuyet trinh theo wording trung thuc
2. Rehearse role split: business alert control vs operational recovery control
3. Chot 2-3 known gaps se noi neu thay hoi sau

---

## Definition of Done for Viva Readiness

Project duoc xem la "du su thuyet phuc" khi:

- Demo khong con flow nao dan den UI sai nghia requirement
- Docs khong con tu mau thuan
- Nhom noi trung thuc ve Case 3-5
- Moi known gap lon deu co:
  - ten van de
  - ly do trade-off
  - huong fix o sprint tiep theo

Neu dat 4 dieu tren, thay se thay nhom co tu duy Scrum va System Integration that, chu khong chi la "lam giao dien dep".
