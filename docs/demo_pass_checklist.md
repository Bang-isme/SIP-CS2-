# Demo Pass Checklist (1-Page)

> Last Updated: 2026-04-22
> Goal: run a clean demo aligned to CEO Memo + Case Study 1-5.
> Latest live proof bundle: `docs/demo/evidence/2026-04-22-smoke/README.md`
> Primary operator runbook: `docs/demo/live/demo_runbook_one_page_vi.md`
> Primary viva sheet: `docs/demo/live/viva_defense_one_page_vi.md`

## 1. Preconditions (2-3 mins)

- In `SIP_CS`, run: `npm run case3:stack:start`
- Admin account is available
- Dataset has already been seeded and aggregated at least once
- Dashboard summary warm-up completes
- Alert ownership baseline is prepared
- If alert visibility looks incomplete, rerun: `npm run demo:dashboard:prepare`

Pass criteria:

- SA, Payroll, and Dashboard start without crashing
- dashboard top-level panels render
- Payroll console opens
- executive brief is not in `Action Required`

---

## 2. Hard Gates Before Live Demo

1. Root verification:
   - `npm run verify:all`
2. Optional fallback if you skip the full gate and only need the integration path:
   - `npm run verify:case3`
3. Optional queue rehearsal before class, not during the happy path:
   - `npm run demo:queue:flow -- 2 2`
4. Preferred evidence bundle command when you want a dated proof pack:
   - `npm run demo:evidence:build`

Pass criteria:

- `verify:all` proves backend gate, frontend gate, and Case 3 propagation in one root command
- `verify:case3` remains a narrower fallback check for the split-runtime path
- queue flow completes warning -> critical -> cleanup when you intentionally rehearse failure-paths
- `demo:evidence:build` creates a dated proof bundle for Case 2-4 under `docs/demo/evidence/`

---

## 3. Live Demo Flow (6-8 mins)

1. Executive summary
   - show KPI row
   - show freshness badge
   - confirm executive brief is `Ready for Memo`
2. Alerts
    - open `Action Items & Alerts`
    - confirm all 4 alert categories are visible
    - open one alert modal and show pagination/search
3. Drilldown
   - open drilldown from Earnings, Vacation, or Benefits
   - apply `minEarnings`
   - export CSV
4. Case 3 system integration
   - create or update employee through SA
   - show sync evidence from SA
   - open Payroll console and show downstream evidence
5. Optional integration exceptions
   - seed warning or critical queue states
   - show queue metrics and one retry action
   - show replay or retry dead
6. Optional recovery action
   - run cleanup and show queue stabilizes

---

## 4. Evidence Pack To Capture

Preferred path:

- Run `npm run demo:evidence:build`
- This generates a dated pack with:
  - backend verification log
  - frontend verification log
  - Case 3 stack gate log
  - Case 4 operations smoke log
  - dashboard demo preparation report
  - summary JSON + README
  - optional screenshots if local browser capture prerequisites are available

If screenshot capture is not available locally:

- rerun with `DEMO_EVIDENCE_SKIP_CAPTURE=1`
- the pack still remains valid for log + data evidence

---

## 5. Go / No-Go

- [ ] Summary data is visible and understandable for CEO decisions
- [ ] Executive brief is `Ready for Memo`
- [ ] All 4 alert categories are visible
- [ ] Error states are localized
- [ ] Drilldown and CSV export work
- [ ] SA and Payroll propagation can be shown
- [ ] Integration retry/replay can be shown if the instructor asks for failure handling
- [ ] Test, lint, build, and audit evidence has been captured in a dated proof pack
