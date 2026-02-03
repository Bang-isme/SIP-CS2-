# Case Study 2 - User Guide (Dashboard)

> Last Updated: 2026-02-03

## 1) Yêu cầu môi trường
- Node.js 18+ (khuyến nghị).
- MongoDB và MySQL đang chạy.

## 2) Cấu hình biến môi trường
- Backend: `MONGODB_URI`, `PORT`, `SECRET`.
- Tạo file `.env` dựa trên `.env.example` nếu có.

## 3) Cài đặt & chạy Backend
1. Vào thư mục `SIP_CS`.
2. Cài dependencies:
   `npm install`
3. Chạy dev server:
   `npm run dev`

## 4) Cài đặt & chạy Frontend
1. Vào thư mục `SIP_CS/dashboard`.
2. Cài dependencies:
   `npm install`
3. Chạy Vite:
   `npm run dev`

## 5) Chạy batch tổng hợp
- Chạy:
  `node scripts/aggregate-dashboard.js`
- Có thể truyền năm:
  `node scripts/aggregate-dashboard.js 2026`

## 6) Sử dụng Dashboard
- Xem KPI cards và các biểu đồ tổng quan.
- Bấm vào các phần drilldown để xem chi tiết.
- Dùng bộ lọc: department, gender, ethnicity, type, shareholder.
- Dùng min earnings để lọc high earners.
- Export CSV khi cần.

## 7) Lưu ý
- Nếu thấy thông báo thiếu summary, cần chạy lại batch.
- Dữ liệu dashboard phụ thuộc vào thời điểm chạy batch.
