# Demo Pass Checklist (1-Page)

> Last Updated: 2026-02-16
> Goal: run a clean demo aligned to CEO Memo + Case Study 1-5.

## 1) Preconditions (2-3 mins)

- Backend terminal in `SIP_CS`: `npm run dev`
- Frontend terminal in `SIP_CS/dashboard`: `npm run dev`
- Admin account is available
- Data aggregated once before demo: `node scripts/aggregate-dashboard.js`

Pass criteria:
- Backend and dashboard start without crash.
- KPI cards and main panels render.

## 2) Hard Gates Before Live Demo

1. Backend tests
   - `npm test`
2. Frontend lint
   - in `SIP_CS/dashboard`: `npm run lint`
3. Frontend production build
   - in `SIP_CS/dashboard`: `npm run build`
4. Integration queue rehearsal
   - `npm run demo:queue:flow -- 2 2`

Pass criteria:
- Unit + integration backend tests pass.
- Lint passes.
- Build passes without chunk-size warning >500 kB.
- Queue flow completes warning -> critical -> cleanup.

## 3) Live Demo Flow (6-8 mins)

1. Summary (Executive view)
   - Show KPI row and freshness badge (`Fresh`/`Stale`/`Unknown`).
   - Show that refresh button has loading/disabled state.

2. Alerts (Manage-by-exception)
   - Open `Action Items & Alerts` panel.
   - Open one alert modal (`View Record`) and paginate/search.

3. Drilldown (Ad-hoc query)
   - Open drilldown from Earnings (or Vacation/Benefits CTA).
   - Apply `minEarnings` filter (example: `100000`).
   - Export CSV.

4. Integration exceptions (Case 4)
   - Seed warning/critical states.
   - Show queue metrics and one row retry.
   - Run Retry DEAD (All) and Replay (Filtered).
   - Verify non-admin session sees restricted-state message instead of controls.

5. Recovery action
   - Run cleanup and show queue stabilizes.

## 4) Evidence Pack to Capture

Screenshots:
- Dashboard top (KPI + freshness + summary)
- Alerts panel + modal
- Drilldown with active filter chips
- Integration queue warning/critical
- Integration queue recovered

Terminal outputs:
- `npm test`
- `npm run lint` (dashboard)
- `npm run build` (dashboard)

## 5) Go / No-Go

- [ ] Summary data visible and understandable for CEO decisions
- [ ] Error states are localized (summary/alerts/integration)
- [ ] Drilldown + CSV export works
- [ ] Integration retry/replay works and recovery can be shown
- [ ] Test/lint/build evidence captured
