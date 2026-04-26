# Demo Q&A Defense - Ban Ngan Gon

> Last Updated: 2026-04-17

File nay dung de tra loi sau slide va demo. Mau tra loi nen la:

1. nhom co can nhac van de do
2. nhom chu dong chon mot trade-off
3. trade-off do bam theo scope mon hoc va user requirement
4. nhom khong claim phan chua kiem chung du sau

## 1. Vi sao phai tich hop?

### Hoi: "Tai sao bai nay can system integration?"

> Vi CEO Memo can management information, khong chi raw operational data. Nhom em can mot lop tong hop de nhin summaries, alerts va trang thai dong bo giua HR va Payroll.

## 2. Day la kieu tich hop nao?

### Hoi: "Day la presentation integration hay data integration?"

> Day la to hop. Dashboard la presentation integration. Executive brief, summaries va drilldown la data integration. Luong SA sang Payroll la functional integration.

## 3. Tai sao tach 3 service?

### Hoi: "Tai sao phai tach SA, Payroll, Dashboard?"

> Vi bai nay can boundary ro de defend. SA la source system, Payroll la downstream system, Dashboard la reporting system. Runtime 3 process giup giang vien thay ro tung vai tro.

## 4. Co phai van la monolith 2 DB khong?

### Hoi: "Nhung van chung repo, vay co phai monolith 2 DB?"

> Repo van dung chung code, nhung runtime da tach thanh 3 process va 3 port. Quan trong hon, Payroll write path da duoc dua ve Payroll service, khong con nam trong SA.

## 5. Tai sao SA khong rollback neu sync loi?

### Hoi: "Neu source save thanh cong ma downstream loi thi sao?"

> Nhom em chon eventual consistency co kiem soat. SA luu source data truoc, enqueue outbox event, va de worker xu ly tiep. Neu downstream loi thi van con queue state, retry, replay va sync log de operator theo doi.

## 6. Tai sao khong claim ACID?

### Hoi: "Sao khong lam strong consistency?"

> Vi MongoDB va MySQL khong nam trong mot transaction xuyen he thong. Nhom em chu dong khong claim ACID hay 2PC. Scope hien tai phu hop hon voi eventual consistency co kiem soat.

## 7. Tai sao khong dung Kafka hay RabbitMQ?

### Hoi: "Sao khong dung middleware that?"

> Nhom em co can nhac. Nhung trong scope mon hoc, DB-backed outbox + polling worker da du de chung minh queue management, persistence, retry va recovery. Nhom em khong overclaim enterprise broker stack.

## 8. Dashboard co real-time khong?

### Hoi: "Dashboard co bi stale khong?"

> Co the stale neu summary cu. Vi vay he thong expose freshness metadata ro rang. Trong demo, startup script se warm summaries va prepare current alert ownership de executive brief o trang thai san sang hon.

> Neu can giu du 4 alert categories trong live demo, nhom em chay them `npm run demo:dashboard:prepare` de provision evidence con thieu trong dataset demo. Day la buoc prep cho demo, khong phai claim runtime business luon tu sinh du 4 loai.

## 9. Tai sao dashboard lai nhanh?

### Hoi: "500K records ma van nhanh?"

> Vi dashboard doc summary/read-model data thay vi scan raw dataset moi lan. Drilldown moi di xuong query chi tiet va van co pagination phia server.

## 10. Payroll boundary hien tai la gi?

### Hoi: "SA co ghi thang sang MySQL payroll khong?"

> Khong. SA worker goi internal Payroll API. Payroll service moi la noi ghi `pay_rates` va `sync_log`.

## 11. Dashboard boundary hien tai la gi?

### Hoi: "Dashboard co phai auth service khong?"

> Khong. Auth van thuoc SA. Dashboard la reporting system, dung cung token auth nhung khong so huu auth flow.

## 12. Lam sao chung minh luong nay chay that?

### Hoi: "Co bang chung tu dong khong?"

> Co. Root gate hien tai la `npm run verify:all`, va lenh nay da bao gom ca `verify:case3`. Nghia la no khong chi check lint/test ma con chung minh duong split-runtime SA -> Payroll -> Dashboard chay end-to-end.

> Neu giang vien muon mot proof hep hon, nhom em co the chay rieng `npm run verify:case3`. Lenh do se start stack, prepare dashboard baseline, sign in, create employee, poll Payroll, update, check dashboard freshness/action center, delete employee va stop stack.

## 13. Quality gates hien tai ra sao?

### Hoi: "He thong co test va gate khong?"

> Co. O thoi diem hien tai, root gate la `verify:all`; no gom backend gate, frontend gate va Case 3 runtime proof. `verify:case3` van duoc giu lai nhu mot fallback hep de kiem tra rieng integrated path.

> Nhom em uu tien gate chay duoc va giai thich duoc, khong chi demo bang tay.

## 14. Case 4 va Case 5 nen claim den muc nao?

### Hoi: "Case 4, Case 5 da xong chua?"

> Case 4 hien tai o muc middleware-lite co implementation that cho queue, retry, replay, monitor va recovery. Case 5 hien tai o muc docs + rehearsal-safe, chua nen claim la production DR rollout.

## 15. Cau ngan nen dung

- "Nhom em co can nhac huong do, nhung chu dong chon giai phap phu hop hon voi scope hien tai."
- "Nhom em khong claim phan chua kiem chung du sau."
- "Day la eventual consistency co kiem soat, khong phai ACID xuyen he thong."
- "Payroll service hien tai tu so huu write path cua MySQL."
- "Dashboard la reporting system rieng, khong phai auth service."
