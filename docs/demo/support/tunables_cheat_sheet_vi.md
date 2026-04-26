# Tunables Cheat Sheet - Nói Ngắn Nhưng Đúng Bản Chất

> Last Updated: 2026-04-04
> Bản này để nhóm dùng khi giảng viên vào code chỉnh thông số để thử hệ thống. Ý quan trọng nhất là phải nói đúng: thông số này nằm ở file nào, đang điều khiển luồng nào, và tăng hoặc giảm thì trade-off là gì.

## 1. Cách trả lời nhanh

Với mỗi thông số, nhóm nên trả lời theo 5 ý:

1. Nó nằm ở file nào.
2. Nó điều khiển luồng nào.
3. Tăng lên thì được gì, mất gì.
4. Giảm xuống thì được gì, mất gì.
5. Một câu ngắn có thể nói ngay trên lớp.

## 2. Seed batch size

### File

- [seed.js](/D:/SIP_CS%202/SIP_CS/scripts/seed.js)

### Code

```js
const totalRecords = toPositiveInt(args.total || process.env.SEED_TOTAL_RECORDS, profileConfig.totalRecords);
const batchSize = toPositiveInt(args.batch || process.env.SEED_BATCH_SIZE, profileConfig.batchSize);
```

### Điều khiển gì

`SEED_BATCH_SIZE` điều khiển kích thước mỗi lô seed dữ liệu.
Một batch ở đây gồm employee records và các dữ liệu liên quan sẽ được tạo và ghi trong một vòng.

### Nếu tăng

- Ít vòng lặp hơn
- Có thể tăng throughput seed
- Nhưng RAM tăng
- Transaction lớn hơn
- Nếu lỗi thì rollback cũng “to” hơn

### Nếu giảm

- An toàn hơn trên máy yếu
- Dùng ít RAM hơn
- Transaction nhỏ hơn
- Nhưng seed lâu hơn

### Câu nên nói

> Seed batch là trade-off giữa throughput, memory và transaction size. Tăng batch thì nhanh hơn, nhưng rủi ro rollback mỗi lần cũng lớn hơn.

## 3. Total records

### File

- [seed.js](/D:/SIP_CS%202/SIP_CS/scripts/seed.js)

### Code

```js
const totalRecords = toPositiveInt(
  args.total || process.env.SEED_TOTAL_RECORDS,
  profileConfig.totalRecords
);
```

### Điều khiển gì

`SEED_TOTAL_RECORDS` là tổng số employee records mà script sẽ sinh.

### Nếu tăng

- Dataset lớn hơn
- Seed lâu hơn
- Aggregate lâu hơn
- Repair consistency lâu hơn
- Test scale có ý nghĩa hơn

### Nếu giảm

- Dựng môi trường nhanh hơn
- Nhưng không còn đúng baseline 500000 mà nhóm đang dùng để bảo vệ bài

### Câu nên nói

> Đây là thông số quy mô baseline, không chỉ ảnh hưởng seed mà còn ảnh hưởng các bước aggregate, verify và repair phía sau.

## 4. Seed profile

### File

- [seed.js](/D:/SIP_CS%202/SIP_CS/scripts/seed.js)

### Code

```js
const PROFILE_CONFIGS = {
  smb: { totalRecords: 50000, batchSize: 2000 },
  mid: { totalRecords: 200000, batchSize: 4000 },
  enterprise: { totalRecords: 500000, batchSize: 5000 },
};
```

### Điều khiển gì

`profile` là preset cho quy mô dữ liệu và batch mặc định.

### Nếu đổi `enterprise` thành `mid`

- Seed nhanh hơn
- Dataset nhỏ hơn
- Demo nhẹ hơn
- Nhưng mất ý nghĩa test scale theo yêu cầu hiện tại

### Câu nên nói

> `enterprise` là preset baseline mà nhóm em chọn để đáp ứng mốc 500000 records. Đổi profile là đổi quy mô bài test, không chỉ đổi tốc độ seed.

## 5. Export batch size

### File

- [dashboard.controller.js](/D:/SIP_CS%202/SIP_CS/src/controllers/dashboard.controller.js)

### Code

```js
const exportBatchSize = 1000;
```

### Điều khiển gì

`exportBatchSize` là số employee rows mà backend gom lại trước mỗi lần lookup bổ sung khi export CSV.

### Nếu tăng

- Ít round-trip DB hơn
- Có thể export nhanh hơn
- Nhưng mỗi lần flush dùng nhiều memory hơn

### Nếu giảm

- Nhẹ RAM hơn
- Nhưng số lần query tăng lên

### Câu nên nói

> Đây là batch của export, không phải batch của seed hay worker. Nó là trade-off giữa memory và số lần truy vấn.

## 6. Outbox poll interval

### File

- [config.js](/D:/SIP_CS%202/SIP_CS/src/config.js)
- [integrationEventWorker.js](/D:/SIP_CS%202/SIP_CS/src/workers/integrationEventWorker.js)

### Code

```js
export const OUTBOX_POLL_INTERVAL_MS =
  parseInt(process.env.OUTBOX_POLL_INTERVAL_MS, 10) || 5000;
```

### Điều khiển gì

Khoảng thời gian giữa hai lần worker quét queue.

### Nếu giảm từ `5000` xuống `1000`

- Event được nhặt lên nhanh hơn
- Queue phản ứng nhanh hơn
- Nhưng polling dày hơn và tốn tài nguyên hơn

### Nếu tăng lên `10000`

- Nhẹ tài nguyên hơn
- Nhưng event chờ lâu hơn trước khi được xử lý

### Câu nên nói

> Poll interval là trade-off giữa timeliness và overhead. Giảm thì nhanh hơn, tăng thì nhẹ hơn.

## 7. Outbox batch size

### File

- [config.js](/D:/SIP_CS%202/SIP_CS/src/config.js)

### Code

```js
export const OUTBOX_BATCH_SIZE =
  parseInt(process.env.OUTBOX_BATCH_SIZE, 10) || 50;
```

### Điều khiển gì

Số event mà worker xử lý trong một vòng polling.

### Nếu tăng

- Queue drain nhanh hơn
- Throughput cao hơn
- Nhưng áp lực lên downstream lớn hơn

### Nếu giảm

- Nhẹ hơn cho downstream
- Nhưng backlog tiêu chậm hơn

### Câu nên nói

> Đây là batch của worker. Nó ảnh hưởng throughput của integration queue, chứ không ảnh hưởng trực tiếp dashboard UI.

## 8. Max attempts

### File

- [config.js](/D:/SIP_CS%202/SIP_CS/src/config.js)
- [integrationEventService.js](/D:/SIP_CS%202/SIP_CS/src/services/integrationEventService.js)

### Code

```js
export const OUTBOX_MAX_ATTEMPTS =
  parseInt(process.env.OUTBOX_MAX_ATTEMPTS, 10) || 5;
```

### Điều khiển gì

Số lần retry tối đa trước khi event bị coi là `DEAD`.

### Nếu tăng

- Event có thêm cơ hội tự hồi phục
- Nhưng operator sẽ thấy dead event chậm hơn

### Nếu giảm

- Dead event xuất hiện sớm hơn
- Nhưng hệ thống ít cơ hội retry tự động hơn

### Câu nên nói

> Max attempts là ngưỡng phân biệt giữa retry tự động và chuyển sang trạng thái cần operator can thiệp.

## 9. Processing timeout

### File

- [config.js](/D:/SIP_CS%202/SIP_CS/src/config.js)
- [integrationEventService.js](/D:/SIP_CS%202/SIP_CS/src/services/integrationEventService.js)

### Code

```js
export const OUTBOX_PROCESSING_TIMEOUT_MS =
  parseInt(process.env.OUTBOX_PROCESSING_TIMEOUT_MS, 10) || (15 * 60 * 1000);
```

### Điều khiển gì

Ngưỡng để coi một event ở trạng thái `PROCESSING` là bị kẹt.

### Nếu giảm quá thấp

- Dễ đánh nhầm event đang xử lý là stuck

### Nếu tăng quá cao

- Event kẹt bị phát hiện chậm hơn

### Câu nên nói

> Timeout này là ranh giới giữa “đang xử lý bình thường” và “có khả năng bị kẹt”.

## 10. Exponential backoff

### File

- [integrationEventService.js](/D:/SIP_CS%202/SIP_CS/src/services/integrationEventService.js)

### Code

```js
const getBackoffMs = (attempts) => {
  const baseMs = 5000;
  const exp = Math.max(attempts - 1, 0);
  return Math.min(60000, baseMs * Math.pow(2, exp));
};
```

### Điều khiển gì

Khoảng đợi giữa các lần retry.

### Nếu base backoff lớn hơn

- Đỡ đập liên tục vào downstream đang lỗi
- Nhưng recovery chậm hơn

### Nếu base backoff nhỏ hơn

- Retry nhanh hơn
- Nhưng dễ tạo áp lực lặp lên downstream

### Câu nên nói

> Backoff là cách để retry có kiểm soát. Hệ thống không retry dồn dập một cách mù quáng.

## 11. Local dataset target

### File

- [local-runtime-doctor.js](/D:/SIP_CS%202/SIP_CS/scripts/local-runtime-doctor.js)

### Code

```js
const DATASET_TARGET =
  Number.parseInt(process.env.LOCAL_DATASET_TARGET || "500000", 10);
```

### Điều khiển gì

Ngưỡng mà runtime doctor dùng để kiểm tra local baseline.

### Nếu đổi

- Chỉ đổi tiêu chuẩn pass/fail của bước doctor
- Không làm dữ liệu thật thay đổi

### Câu nên nói

> Đây là ngưỡng kiểm tra, không phải nguồn dữ liệu. Nó chỉ nói doctor kỳ vọng bao nhiêu records để coi môi trường đạt chuẩn demo.

## 12. Migrations status

### File

- [migrate-mysql.js](/D:/SIP_CS%202/SIP_CS/scripts/migrate-mysql.js)
- [mysqlDatabase.js](/D:/SIP_CS%202/SIP_CS/src/mysqlDatabase.js)

### Lệnh

```powershell
npm run db:migrate:mysql:status
```

### Ý nghĩa

Xác nhận schema MySQL đang đúng với code hiện tại.

### Câu nên nói

> Phần này là guardrail vận hành. Nó giúp nhóm em tránh tình huống code mới nhưng schema vẫn cũ.

## 13. Phân biệt nhanh ba loại batch

### Seed batch

- file: [seed.js](/D:/SIP_CS%202/SIP_CS/scripts/seed.js)
- ảnh hưởng: throughput seed, memory, transaction size

### Export batch

- file: [dashboard.controller.js](/D:/SIP_CS%202/SIP_CS/src/controllers/dashboard.controller.js)
- ảnh hưởng: memory export, số lần query

### Worker batch

- file: [config.js](/D:/SIP_CS%202/SIP_CS/src/config.js)
- ảnh hưởng: queue throughput, downstream pressure

### Câu nên nói

> Trong hệ thống này có nhiều loại batch khác nhau. Khi bị hỏi, nhóm em phải nói rõ đang nói tới seed batch, export batch hay worker batch, vì ba loại này khác nhau về vai trò và trade-off.
