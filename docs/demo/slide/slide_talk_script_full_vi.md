# Kich Ban Thuyet Trinh Slide - Ban Day Du

> Last Updated: 2026-04-15

File nay dung de doc slide. Noi dung duoc viet lai theo runtime hien tai.

## Nguyen tac chung

- noi ngan
- bam theo boundary that
- khong overclaim
- neu bi cat ngang, tra loi 1-2 cau roi quay lai slide

## Slide 1 - Mo dau

> Em xin chao thay va cac ban. Nhom em la Group 11. Hom nay nhom em trinh bay he thong HR & Payroll Analytics, ten noi bo la Sentify, duoc xay trong khuon kho mon System Integration Practices.

## Slide 2 - Bai toan

> Doanh nghiep dang van hanh hai he thong rieng: HR va Payroll. Du lieu van ton tai, nhung ban quan ly chua co mot noi de nhin tong hop earnings, vacation, benefits va trang thai dong bo.

> Neu doi soat thu cong thi cham, kho trace va kho phuc hoi khi co sai lech. Day la ly do nhom em dat bai toan theo huong System Integration.

## Slide 3 - Cach nhom nhin bai toan SIP

> Nhom em khong xem day chi la dashboard. Day la bai toan co ca presentation integration, data integration va functional integration.

> Dashboard la presentation layer. Executive brief, summaries va drilldown la data integration. Con luong SA sang Payroll la functional integration.

## Slide 4 - Kien truc hien tai

> Runtime hien tai da tach thanh ba service: SA tren 4000, Payroll tren 4100 va Dashboard tren 4200.

> SA so huu auth, employee CRUD va outbox. Payroll so huu payroll write path. Dashboard so huu reporting layer. Vi vay hien tai khong con la mot backend duy nhat noi voi hai database theo kieu monolith 2 DB.

## Slide 5 - Data ownership

> MongoDB local giu employee source-of-truth, users, roles, alerts va SA-owned outbox/audit collections.

> MySQL local giu payroll-side data, sync log va summary/read-model tables cho Dashboard. Active outbox hien tai khong nam o MySQL nua.

## Slide 6 - Dashboard gia tri cho CEO Memo

> Dashboard service cung cap executive brief, earnings, vacation, benefits, alert follow-up, drilldown va export. Muc tieu la tao management information de nguoi quan ly thay duoc dieu gi dang can chu y.

> Startup script hien tai warm dashboard summaries va baseline lai current alert ownership, nen trong demo executive brief mong muon o trang thai `Ready for Memo`.

## Slide 7 - Consistency va integration

> Khi employee thay doi o SA, SA ghi source data vao MongoDB truoc, roi enqueue integration event vao SA-owned Mongo outbox. Worker xu ly event, adapter goi internal Payroll API, va Payroll service moi la noi ghi `pay_rates` va `sync_log`.

> Nhom em khong claim ACID xuyen MongoDB va MySQL. Nhom em chon eventual consistency co kiem soat, va bo sung queue visibility, retry, replay, recover-stuck va sync log.

## Slide 8 - Reliability va observability

> He thong hien tai co health, readiness, OpenAPI contract, queue metrics, correlation trace va automated verify flow. Nhom em muon chung minh he thong khong chi chay duoc khi "thuan loi", ma con co cach theo doi va giai thich khi co loi.

## Slide 9 - Gioi han va trade-off

> Nhom em noi that ba gioi han chinh.

> Thu nhat, consistency la eventual consistency, khong phai strong consistency xuyen he thong.

> Thu hai, queue hien tai la DB-backed outbox + polling worker, chua phai enterprise broker stack.

> Thu ba, Dashboard dung summary/read-model data, vi vay can freshness metadata va startup prep de tranh stale snapshot trong demo.

## Slide 10 - Ket luan

> Tom lai, nhom em da co mot he thong co 3 service rieng, co dashboard phuc vu CEO Memo, co luong SA sang Payroll co the chung minh duoc, va co queue/monitoring/recovery de defend duoc trong mon SIP.

> Nhom em khong overclaim phan chua lam den noi. Diem nhom em muon nhan manh la: he thong nay co the giai thich duoc bang code, API, local runtime va tai lieu.

## Cau chuyen slide sang demo live

> Sau phan slide, nhom em xin chuyen sang demo live de chung minh 3 service dang chay rieng, va luong create -> sync -> verify dang chay that.

## Cau ngan khi bi hoi chen ngang

### "Day co phai monolith 2 DB khong?"

> Khong. Runtime da tach thanh 3 process va 3 port. Payroll write path khong nam trong SA nua.

### "Consistency cua em la gi?"

> Eventual consistency co kiem soat, co queue visibility va recovery path.

### "Dashboard co real-time khong?"

> Khong claim real-time. Dashboard dung summary/read-model data va co freshness metadata.

### "Co verify tu dong khong?"

> Co. `npm run verify:case3` chung minh create -> sync -> verify -> delete va check ca dashboard freshness/action center.

## Dieu khong nen noi

- "Hoan toan khong co loi"
- "ACID xuyen he thong"
- "Da co enterprise middleware stack"
- "Case 5 da production-ready"
