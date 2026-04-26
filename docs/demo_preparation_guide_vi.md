# Hướng Dẫn Chuẩn Bị Demo

> Cập nhật: 2026-04-18

## Mục tiêu

Buổi demo phải cho thấy rõ ba hệ thống chạy riêng:

- `SA / HR Service`
- `Payroll Service`
- `Dashboard Service`

Và phải chứng minh được luồng tích hợp:

1. tạo hoặc sửa nhân sự ở `SA`
2. dữ liệu được đồng bộ sang `Payroll`
3. `Dashboard` vẫn đọc được lớp báo cáo bằng cùng phiên đăng nhập

## Cách chạy nên dùng khi demo tay

Nếu cần nhìn log sống của từng hệ thống, dùng chế độ interactive:

```powershell
npm run case3:stack:interactive
```

Lệnh này sẽ mở riêng cửa sổ PowerShell cho:

- MongoDB
- SA
- Payroll
- Dashboard

Nếu chỉ cần bật nhanh stack nền, dùng:

```powershell
npm run case3:stack:start
```

Lưu ý: `case3:stack:start` là background launcher. Nó start xong rồi trả terminal lại, nên không phù hợp nếu bạn muốn ngồi nhìn log như `npm run dev`.

## Cách chạy thủ công từng terminal

Nếu muốn tự kiểm soát từng cửa sổ:

Terminal 1:

```powershell
npm run mongo:local:foreground
```

Terminal 2:

```powershell
npm run sa:start
```

Terminal 3:

```powershell
npm run payroll:start
```

Terminal 4:

```powershell
npm run dashboard:start
```

## URL cần mở

- SA: `http://127.0.0.1:4000/`
- Payroll console: `http://127.0.0.1:4100/`
- Dashboard login: `http://127.0.0.1:4200/login`

## Thứ tự demo đề xuất

1. Mở `SA` và nói đây là source system.
2. Mở `Payroll` và nói đây là downstream payroll system.
3. Mở `Dashboard` và nói đây là reporting system cho CEO Memo.
4. Đăng nhập dashboard.
5. Tạo hoặc sửa một employee từ phía SA.
6. Chuyển sang Payroll, nhập `employeeId`, chứng minh pay-rate và sync log đã đổi.
7. Quay lại Dashboard để chứng minh lớp báo cáo vẫn hoạt động.

## Câu nói bảo vệ quan trọng

- “Đây là same-repo multi-service runtime, không còn là một Express app duy nhất.”
- “Case Study 3 của nhóm là eventual consistency có kiểm soát, không claim ACID xuyên MongoDB và MySQL.”
- “Payroll có port riêng, API riêng và UI riêng để chứng minh downstream system.”
- “Dashboard là reporting system riêng, còn auth vẫn thuộc SA.”

## Lệnh kiểm tra trước demo

Root gate:

```powershell
npm run verify:all
```

Preflight riêng cho Case 3:

```powershell
npm run verify:case3
```

Lưu ý: `verify:case3` sẽ tự start stack, tự test, rồi tự stop stack khi xong.

## Nếu dashboard chưa có bản build

```powershell
npm --prefix dashboard run build
```

Sau đó chạy lại interactive mode hoặc background launcher.
