# Demo Docs

Thư mục này chứa các tài liệu phục vụ demo theo runtime hiện tại của dự án.

## Nên đọc theo thứ tự

1. `docs/demo/live/demo_spoken_case_study_1_5_vi.md`
2. `docs/demo/live/demo_master_script_12_15min_vi.md`
3. `docs/demo/live/demo_runbook_one_page_vi.md`
4. `docs/demo/live/viva_defense_one_page_vi.md`
5. `docs/demo/live/demo_script_simple_vi.md`
6. `docs/demo_preparation_guide_vi.md`
7. `docs/demo/live/demo_end_to_end_talk_track_vi.md`
8. `docs/demo/demo_real_use_case_detailed_vi.md`
9. `docs/demo/slide/group11_dashboard_capabilities_vi.md`

## Nếu chỉ mở một file

Để nói đầy đủ Case Study 1 đến 5:

- `docs/demo/live/demo_spoken_case_study_1_5_vi.md`

Để đọc demo lớp học khoảng 12-15 phút:

- `docs/demo/live/demo_master_script_12_15min_vi.md`

Để nhìn nhanh trước khi lên trình bày:

- `docs/demo/live/demo_runbook_one_page_vi.md`

Để ôn phần hỏi đáp / viva:

- `docs/demo/live/viva_defense_one_page_vi.md`

Để giải thích riêng dashboard của nhóm 11 hiện có gì và người dùng thao tác được gì:

- `docs/demo/slide/group11_dashboard_capabilities_vi.md`

## Ba URL cần nhớ

- `http://127.0.0.1:4000/`
- `http://127.0.0.1:4100/`
- `http://127.0.0.1:4200/login`

## Boundary cần nhớ

- `SA` là source system
- `Payroll` là downstream system
- `Dashboard` là reporting system

## Cách mở stack khi demo tay

Nếu cần nhìn log riêng của từng service:

```powershell
npm run case3:stack:interactive
```

Nếu muốn tự mở từng terminal:

```powershell
npm run mongo:local:foreground
npm run sa:start
npm run payroll:start
npm run dashboard:start
```

Nếu chỉ cần bật stack nền nhanh:

```powershell
npm run case3:stack:start
```

Lưu ý:

- `case3:stack:start` là lệnh mở stack nền, không giữ log sống trong cùng terminal.
- `verify:all` là gate tổng hiện tại.
- `verify:case3` là preflight hẹp cho integrated path của Case 3, và sẽ tự stop stack khi xong.
- `demo:dashboard:prepare` chỉ là bước chuẩn bị dữ liệu trình diễn, không phải claim rằng runtime business luôn tự sinh đủ 4 loại alert trong mọi dataset.

## Các lệnh quan trọng

```powershell
npm run verify:all
npm run verify:case3
npm run demo:dashboard:prepare
```

## Evidence bundle mới nhất

- `docs/demo/evidence/2026-04-16/README.md`
