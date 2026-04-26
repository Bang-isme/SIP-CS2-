# Chia Vai Thuyet Trinh - Bang / Khiem / Hoa

> Last Updated: 2026-04-15

## 1. Nguyen tac chung

- moi nguoi noi theo phan minh hieu va da dong gop
- khong overclaim
- khi bi hoi kho, uu tien boundary va trade-off
- neu khong chac, noi dung muc implementation hien tai

## 2. Bang

Bang nen noi:

- bai toan
- vi sao can integration
- kien truc tong the
- boundary giua SA, Payroll, Dashboard

Loi goi y:

> Trong bai CEO Memo, du lieu HR va Payroll dang o hai he thong khac nhau. Nhom em can mot lop tong hop de tao management information, dong thoi van phai giu duoc ranh gioi giua source system, downstream system va reporting system.

> Phien ban hien tai chay thanh ba service rieng: SA, Payroll va Dashboard. Day la same-repo multi-service runtime, khong con la mot backend duy nhat noi voi hai database.

## 3. Khiem

Khiem nen noi:

- dashboard
- executive brief
- alerts
- drilldown
- export

Loi goi y:

> Dashboard la reporting system rieng cho Case Study 2. O day, nhom em uu tien executive brief, freshness, alert follow-up va drilldown de nguoi quan ly thay duoc thong tin can quyet dinh nhanh.

> Startup script hien tai warm summary va baseline lai current alert ownership, nen trong demo executive brief mong muon o trang thai `Ready for Memo`.

## 4. Hoa

Hoa nen noi:

- outbox
- worker
- Payroll internal API
- consistency model
- OpenAPI / quality gates / DR rehearsal-safe

Loi goi y:

> Khi employee thay doi o SA, SA ghi source data vao MongoDB truoc, roi enqueue integration event vao SA-owned Mongo outbox. Worker xu ly event, PayrollAdapter goi internal Payroll API, va Payroll service moi la noi ghi `pay_rates` va `sync_log`.

> Nhom em khong claim ACID xuyen he thong. Nhom em chon eventual consistency co kiem soat va bo sung queue visibility, retry, replay, recover-stuck va sync log.

## 5. Cau chuyen giao giua nguoi

### Bang -> Khiem

> Sau phan kien truc tong the, nhom em xin chuyen sang phan nguoi dung nhin thay truc tiep, tuc la Dashboard va executive reporting.

### Khiem -> Hoa

> Do la lop presentation va reporting. Phan tiep theo la lop integration phia sau, noi the hien day khong chi la mot dashboard ma la mot bai SIP dung nghia.

## 6. Neu bi hoi xoay

Bang uu tien tra loi:

- tai sao can integration
- tai sao tach 3 service

Khiem uu tien tra loi:

- dashboard co gi
- freshness / alerts / drilldown

Hoa uu tien tra loi:

- outbox nam o dau
- Payroll write path nam o dau
- consistency la gi
- verify va evidence ra sao
