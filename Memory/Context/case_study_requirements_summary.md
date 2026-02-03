# Case Study Requirements Summary (CEO Memo + Case Study 1-5)

> Last Updated: 2026-02-03

## 1) Tom tat yeu cau cot loi (CEO Memo)
- Dashboard tong hop cho quan ly cap cao: thong ke thu nhap (theo shareholder, gioi, dan toc, part-time/full-time) - hien tai va nam truoc; tong ngay nghi; trung binh chi tra benefits theo ke hoach.
- Kha nang drill-down tu summary vao chi tiet.
- Canh bao (alerts): sap toi anniversary, vacation vuot nguong, thay doi benefits anh huong luong, sinh nhat trong thang.
- Khong bat buoc thay he thong legacy; uu tien tich hop trinh bay (presentation-style) hoac middleware neu can.
Source: CEO_Memo

## 2) Yeu cau va deliverables theo tung Case Study (rut gon)
- Case Study 1 - The Proposal: neu ro van de, de xuat 2 phuong an kha thi (so sanh uu/nhuoc), sketch GUI, artifact cho moi phuong an, lifecycle va schedule; tach problem statement khoi solution.
- Case Study 2 - The Dashboard: dashboard tich hop (presentation-style); co requirements doc, test plan (va ket qua), design doc, user guide + cai dat; khong chinh legacy (neu can thay doi, bao effort).
- Case Study 3 - Integrated System: tich hop chuc nang (data entered once -> phan phoi gan real-time); chu y consistency/ACID (hoac chi ro khi nao inconsistent va cach restore); deliverables: he thong tich hop + requirements/design/test va demo.
- Case Study 4 - Fully Integrated System: mo rong Case 3; middleware chinh thuc, tao cam nhan "1 he thong duy nhat", phan phoi data gan real-time; tranh alter schema legacy (co the extend).
- Case Study 5 - Network Integration: phan tich yeu cau mang, backup & recovery (RTO/RPO), security & authentication, bang thong va uu tien dich vu; deliverable: presentation + requirements doc ho tro de xuat mang.
Source: Student_SI_Case_Study_1, Student_SI_Case_Study_2, Student_SI_Case_Study_3, Student_SI_Case_Study_4, Student_SI_Case_Study_5

## 3) Ma tran doi chieu (tinh nang / study)
| Yeu cau chinh | Case1 | Case2 | Case3 | Case4 | Case5 |
|---|---|---|---|---|---|
| Dashboard summary + drill-down | Y | Y | Y | Y |  |
| Alerts / Manage-by-exception | Y (de xuat) | Y | Y (consistency needs) | Y (middleware xu ly) |  |
| Giu nguyen legacy / estimate effort neu thay doi | Y | Y (cu the) |  |  |  |
| Near real-time data consistency / ACID |  |  | Y | Y |  |
| Middleware & single-system appearance |  |  | option | required |  |
| Test plan, verification & validation |  | Y | Y | Y | Y (backup testing) |
| Network / Backup & Recovery / Security |  |  |  |  | Y |
Source: CEO_Memo (Alerts) + Student_SI_Case_Study_1..5

## 4) Uu tien (MVP va tinh nang co the doi)
MVP (bat buoc cho demo/diem):
- Dashboard summary (thu nhap theo bo phan; hien tai & nam truoc).
- Drill-down tu summary toi ban ghi chi tiet.
- 2 alert co ban: (a) anniversary sap toi, (b) vacation vuot nguong.
- Requirements doc + test plan + GUI sketch cho presentation.

Defer (neu thieu thoi gian):
- Middleware full-duplex hoac two-phase commit de dat ACID hoan toan; thay vao do doc ro inconsistent cases + reconciliation plan (Case Study 3).
- Toan bo network redesign & DR (dua vao bao cao/kien nghi; demo chi can backup plan co ban).
- Full benefits analytics across multiple plan types (co the show sample stats cho 1-2 plan truoc).
Source: CEO_Memo, Student_SI_Case_Study_3, Student_SI_Case_Study_5

## 5) Kien truc de xuat ngan (toi uu thoi gian)
- Giai doan 1 (Presentation-style integration): FE dashboard doc du lieu tu read-only views hoac API tong hop (khong thay legacy). Dung ETL nhe/cron job de lam bang summary hang ngay. (Phu hop Case 1 & Case 2).
- Giai doan 2 (Functional integration gan real-time): neu can real-time, dua middleware (message queue / broker) de replicate thay doi HR -> trung gian -> Payroll va cap nhat summary store; document inconsistency windows & reconciliation. (Case 3 -> Case 4).
- Network & DR: xac dinh RTO/RPO hop ly, bang thong cho replication, vi tri authentication. (Case 5).
Source: Student_SI_Case_Study_2, Student_SI_Case_Study_3, Student_SI_Case_Study_4, Student_SI_Case_Study_5

## 6) Danh sach artifacts can nop (theo all case studies)
- Problem Statement (tach khoi solution).
- Requirements Document (functional + non-functional + alerts + security + network constraints).
- Two alternative visions / architecture options (uu/nhuoc).
- GUI sketches / mockups (dashboard + drill-down + alert UI).
- Design & Architecture doc (incl. middleware options, data flows, consistency model).
- Test plan & test results (unit / integration / acceptance / DR test).
- User guide + Installation instructions.
- Project schedule & system integration lifecycle (roles, milestones, deliverables).
Source: Student_SI_Case_Study_1, Student_SI_Case_Study_2, Student_SI_Case_Study_3, Student_SI_Case_Study_4, Student_SI_Case_Study_5

## 7) Ghi chu quan trong va assumptions
- Khong sua schema legacy tru khi co uoc tinh effort ro rang (Case 2, 4).
- Consistency: neu khong the dam bao ACID toan bo, phai mo ta ro khi nao du lieu co the inconsistent, co che detect & reconcile (Case 3).
- Chi phi/thoi gian: middleware va full network remediation ton thoi gian; nen de la giai doan 2.
- Alerts bat buoc: anniversary, vacation vuot nguong, benefits change, birthdays trong thang.
- Khong bat buoc thay he thong legacy; uu tien presentation-style hoac middleware neu can.
Source: CEO_Memo, Student_SI_Case_Study_2, Student_SI_Case_Study_3, Student_SI_Case_Study_4
