# UI/UX Runtime Audit - 2026-04-25

## Scope

Audited the current Dashboard runtime in `SIP_CS` after refreshing `.codex/context/genome.md`.

Primary frontend surfaces reviewed:

- Auth: login/register shell
- Dashboard shell: sidebar, header, protected routes
- Overview: executive brief, KPI snapshot, shortcuts, operational readiness placement
- Analytics: filter bar, quick checks, charts, drilldown routing
- Alerts: follow-up queue, alert detail, alert settings entry
- Operations: queue health, recovery controls, parity snapshot
- Admin: employee and user management pages

## Evidence

- `python C:/Users/tranb/.codex/skills/codex-project-memory/scripts/generate_genome.py --project-root . --depth full --format json`
  - Result: `553` files, `96,249` lines, genome regenerated at `.codex/context/genome.md`.
- `npm --prefix dashboard run lint`
  - Result: pass.
- `npm --prefix dashboard run test`
  - Result: `29` test files passed, `103` tests passed.
- `npm --prefix dashboard run build`
  - Result: pass, Vite production build completed.
- `npm --prefix dashboard audit --omit=dev`
  - Result: `0` vulnerabilities.
- Runtime stack:
  - `npm run case3:stack:start`
  - SA readiness: `http://127.0.0.1:4000/api/health/ready` returned ready.
  - Dashboard readiness: `http://127.0.0.1:4200/api/health/ready` returned ready.
- Browser audit:
  - Login and protected dashboard session restore worked.
  - No console warnings or errors were observed during the audited browser session.
  - Network calls for auth restore, dashboard summaries, alerts, integration metrics, and reconciliation returned `200`.

## Current Assessment

The system is UI-complete for the current coursework/demo scope, but not yet high-quality enough to call the UX fully polished across all responsive and interaction states.

Strong areas:

- Route coverage is broad: overview, analytics, drilldown, alerts, operations, employee admin, user admin.
- Role-gated navigation and restricted-state pages are implemented.
- Lazy route loading, sidebar prefetch, skeletons, toasts, focus-visible states, and reduced-motion handling exist.
- Dashboard data loading uses abortable requests and React `startTransition` for smoother state updates.
- Operations surface has credible parity and queue health evidence.
- Admin employee workflow surfaces source-record mutation and sync evidence.

Blocking UX gaps found before the follow-up fix:

- Overview runtime does not render operational readiness cards because `DashboardLayout` does not pass `operationalReadiness`, `operationalReadinessError`, `loadingOperationalReadiness`, or `fetchOperationalReadiness` into the overview slice, while `OverviewPage` expects them.
- Mobile dashboard header allows header children to overflow below the header box. At `390x844`, `.header-right` extends below `.dashboard-header`, and page content starts underneath it.
- Mobile Employee Administration with the editor open expands inner workspace width to about `1194px` inside a `390px` viewport. The main content hides horizontal overflow, so controls such as `New Employee` render at excessive width and text is effectively clipped.
- Route changes are functionally fast after chunks are loaded, but the app does not yet have a deliberate page transition system such as route-level fade/slide choreography or View Transitions. Current smoothness is mostly from hover/focus transitions, lazy fallback, and stable layout.

Recommended priority:

1. Fix Overview context wiring so operational readiness cards render in the real app.
2. Make dashboard header `flex-shrink: 0` or otherwise allow responsive height to include meta/status rows, then simplify mobile header metadata.
3. Fix Admin Employees mobile editor/table layout by preventing the wide table from determining the page workspace width; keep table overflow inside `.employee-admin-table-shell`.
4. Add an explicit route transition pattern only after layout bugs are fixed, because animation over broken responsive layout will make the app feel worse.

## Fix Verification - 2026-04-25

Follow-up changes addressed the three P1 runtime issues:

- `DashboardLayout` now passes operational readiness state, errors, loading state, and refresh action into the overview slice. A layout test covers this data contract so `OverviewPage` can render readiness cards in real runtime.
- `.dashboard-header` is now a non-shrinking flex item, so wrapped mobile status and refresh controls are included in the header height before page content starts.
- Dashboard page stacks and Employee Administration workspace panels now opt into `min-width: 0` / `max-width: 100%` containment, keeping wide employee tables scrollable inside their table shell instead of expanding the route surface.

Verification after the fix:

- `npm --prefix dashboard run test -- src/layouts/DashboardLayout.test.jsx src/styles/responsiveLayout.contract.test.js`
  - Result: `2` files passed, `11` tests passed.
- `npm --prefix dashboard run lint`
  - Result: pass.
- `npm --prefix dashboard run test`
  - Result: `30` files passed, `107` tests passed.
- `npm --prefix dashboard run build`
  - Result: pass.
- Browser runtime at `390x844`:
  - Overview readiness cards rendered for services, summaries, parity, and queue.
  - Header contained mobile controls; header bottom `138.22`, controls bottom `129.22`, content top `138.22`.
  - Employee editor route stayed within viewport; main `clientWidth=390`, `scrollWidth=390`, `pageOverflow=0`, `New Employee` button width `332`.
  - Console warnings/errors: `0`; checked API calls returned `200`.

## Transition Follow-up - 2026-04-25

Follow-up UI polish added a route-level transition frame in `DashboardLayout`:

- Each dashboard route now renders inside `.dashboard-route-frame` with `data-route-key`, `data-route-title`, and an accessible route-content label.
- The frame uses a restrained `180ms` opacity/translate transition and preserves layout containment with `min-width: 0`.
- `prefers-reduced-motion: reduce` disables the transition.

Verification after the transition follow-up:

- RED first: the new `DashboardLayout` and CSS contract tests failed because no route frame or route transition CSS existed.
- GREEN after implementation:
  - `npm --prefix dashboard run test -- src/layouts/DashboardLayout.test.jsx src/styles/responsiveLayout.contract.test.js`
    - Result: `2` files passed, `13` tests passed.
  - `npm --prefix dashboard run lint`
    - Result: pass.
  - `npm --prefix dashboard run test`
    - Result: `30` files passed, `109` tests passed.
  - `npm --prefix dashboard run build`
    - Result: pass.
- Browser runtime:
  - `/dashboard` frame reported `routeKey=/dashboard`, `routeTitle=Executive Overview`, `ariaLabel=Executive Overview content`, `animationName=dashboard-route-enter`, `animationDuration=0.18s`, `mainOverflow=0`.
  - Reduced motion reported `animationName=none`; normal motion reported `dashboard-route-enter`.
  - Mobile Employee Administration with editor open still reported `main clientWidth=390`, `scrollWidth=390`, `overflow=0`.
  - Console warnings/errors: `0`; checked API calls returned `200`.

## Employee Editor Scroll Fix - 2026-04-25

Root cause:

- The page-level Employee Administration editor inherited the base editor scroll behavior, but `.employee-admin-editor-panel--page` overrode it with `overflow: hidden`.
- On mobile and constrained page layouts, edit mode combines a sticky editor header, sync evidence, a long source-record form, and action buttons. The editor content exceeded its allocated panel height, but the panel clipped it instead of owning vertical scroll.

Fix:

- `.employee-admin-editor-panel--page` now uses `overflow-x: hidden`, `overflow-y: auto`, `scrollbar-gutter: stable`, and `overscroll-behavior: contain`.
- The outer workspace can still contain table width safely, while the edit form owns its vertical scroll.
- `DESIGN.md` now documents the project rule: route shells contain width, table shells own table overflow, and form/editor panels must remain independently scrollable.

Verification:

- RED first: `npm --prefix dashboard run test -- src/styles/responsiveLayout.contract.test.js` failed because the page editor still had `overflow: hidden`.
- GREEN after implementation:
  - `npm --prefix dashboard run test -- src/styles/responsiveLayout.contract.test.js`
    - Result: `1` file passed, `5` tests passed.
  - `npm --prefix dashboard run test -- src/components/AdminEmployeesModal.test.jsx src/styles/responsiveLayout.contract.test.js`
    - Result: `2` files passed, `12` tests passed.
  - `python C:/Users/tranb/.codex/skills/codex-design-md/scripts/design_contract.py lint DESIGN.md`
    - Result: `0` errors, `0` warnings.
  - `npm --prefix dashboard run lint`
    - Result: pass.
  - `npm --prefix dashboard run test`
    - Result: `30` files passed, `110` tests passed.
  - `npm --prefix dashboard run build`
    - Result: pass.
- Browser runtime at `390x844`, `/dashboard/admin/employees`, edit existing employee:
  - Editor `overflowY=auto`.
  - Editor `clientHeight=246`, `scrollHeight=1687`, `afterScrollTop=1441`.
  - Save and Delete buttons were visible after scrolling.
  - Main content stayed contained: `clientWidth=390`, `scrollWidth=390`, `mainOverflow=0`.
  - Console warnings/errors: `0`; checked API calls returned `200`.

## Fixed Overlay Anchoring - 2026-04-25

Root cause:

- `.dashboard-route-frame` used `animation-fill-mode: both` and kept a transform-capable compositing hint after route entry.
- A transformed ancestor can become the containing block for `position: fixed` descendants. Because the alert settings overlay is rendered inside the dashboard route subtree, the mobile modal could be anchored to the route frame instead of the viewport.
- At `390x844`, this pushed the Alert Settings card below the viewport bottom even though the inner editor itself could scroll.

Fix:

- `.dashboard-route-frame` now uses the entry animation without `both`, only hints `will-change: opacity`, and ends the keyframe at `transform: none`.
- A CSS contract test now prevents route frames from keeping `animation-fill-mode: both` or a persistent `will-change: transform`.
- `DESIGN.md` now records the overlay anchoring rule: route transitions must not leave transformed ancestors that can capture fixed modals or drawers.

Verification:

- RED first: `npm --prefix dashboard run test -- src/styles/responsiveLayout.contract.test.js` failed while the route frame still used `both`.
- GREEN after implementation:
  - `npm --prefix dashboard run test -- src/styles/responsiveLayout.contract.test.js`
    - Result: `1` file passed, `6` tests passed.
  - `npm --prefix dashboard run test -- src/layouts/DashboardLayout.test.jsx src/styles/responsiveLayout.contract.test.js`
    - Result: `2` files passed, `15` tests passed.
  - `npm --prefix dashboard run lint`
    - Result: pass.
  - `python C:/Users/tranb/.codex/skills/codex-design-md/scripts/design_contract.py lint DESIGN.md`
    - Result: `0` errors, `0` warnings.
  - `npm --prefix dashboard run test`
    - Result: `30` files passed, `111` tests passed.
  - `npm --prefix dashboard run build`
    - Result: pass.
- Browser runtime at `390x844`, `/dashboard/alerts`, Alert Settings open:
  - Overlay rect matched viewport: top `0`, bottom `844`, width `390`.
  - Card stayed within viewport: top `42.2`, bottom `801.8`, width `350`.
  - Route frame computed `transform=none`.
  - Editor retained independent scroll: `overflowY=auto`, `clientHeight=230`, `scrollHeight=756`.
  - Document and body stayed contained: `scrollWidth=390`.
  - Console warnings/errors: `0`.
- Mobile route scan at `390x844` across overview, analytics, alerts, integration, employee admin, and user admin:
  - No content horizontal overflow was observed.
  - Route frames reported `transform=none`.

## Desktop Sidebar Collapse - 2026-04-25

UX principle:

- A dashboard can scroll, but scroll must be purposeful: page scroll for route-level reading, table scroll for wide data, editor scroll for long forms.
- Persistent navigation should not permanently consume width when users are reviewing dense charts, tables, and drilldowns. Desktop should let the user trade labels for workspace width without losing orientation.

Fix:

- Added a desktop sidebar collapse/expand control.
- Expanded state keeps the existing 272px labeled sidebar.
- Collapsed state uses a 76px icon rail, preserves active route state, preserves accessible link names, and adds `title` tooltips for icon-only navigation.
- Mobile keeps the existing drawer pattern: full 272px readable sidebar, close button visible, collapse button hidden.
- `DESIGN.md` now records the rule that desktop navigation can collapse when it competes with dense dashboard content, while mobile navigation stays readable as a drawer.

Verification:

- RED first: `npm --prefix dashboard run test -- src/layouts/DashboardLayout.test.jsx` failed because there was no `Collapse sidebar` control.
- GREEN after implementation:
  - `npm --prefix dashboard run test -- src/layouts/DashboardLayout.test.jsx`
    - Result: `1` file passed, `10` tests passed.
  - `npm --prefix dashboard run test -- src/styles/responsiveLayout.contract.test.js src/components/AlertSettingsModal.test.jsx src/pages/Login.test.jsx`
    - Result: `3` files passed, `10` tests passed.
  - `npm --prefix dashboard run test`
    - Result: `30` files passed, `112` tests passed.
  - `npm --prefix dashboard run lint`
    - Result: pass.
  - `npm --prefix dashboard run build`
    - Result: pass.
  - `python C:/Users/tranb/.codex/skills/codex-design-md/scripts/design_contract.py lint DESIGN.md`
    - Result: `0` errors, `0` warnings.
- Browser runtime:
  - Desktop `1366x768`, `/dashboard/analytics`:
    - Expanded grid columns: `272px 1094px`.
    - Collapsed grid columns: `76px 1290px`.
    - Main workspace gained `196px`.
    - Document/body `scrollWidth=1366`, so no horizontal overflow.
    - Collapse button label changed from `Collapse sidebar` to `Expand sidebar`.
  - Mobile `390x844`, `/dashboard/analytics`:
    - Layout grid stayed `390px`.
    - Sidebar stayed a 272px drawer.
    - Collapse button display was `none`; close button stayed visible when drawer opened.
    - Document/body `scrollWidth=390`.
  - Console warnings/errors: `0`.

## Sidebar Hover Expansion Polish - 2026-04-25

Superseded later on 2026-04-25 by `Sidebar Overlay Correction`: hover overlay expansion caused the sticky header to sit over the expanded sidebar and made collapsed/expanded navigation feel like two different components. The active contract is now explicit click-to-collapse/expand grid states only.

UX principle:

- Collapsed navigation should behave like a stable rail, not like a broken narrow sidebar.
- Hover expansion should help recognition without stealing the main workspace permanently. The main dashboard must not reflow when the rail temporarily opens.
- Icons in collapsed mode need a stable touch/click target and visual center; labels should return only when the rail is intentionally explored.

Fix:

- Collapsed desktop sidebar now auto-expands on hover from a 76px rail to a 272px overlay.
- The dashboard grid track stays 76px while the sidebar overlay opens, so charts/tables do not shift.
- Added `justify-self: start` to allow the sidebar grid item to draw wider than the collapsed track.
- Standardized sidebar navigation icons to 17px and collapsed targets to 44px by 44px.
- Removed `focus-within` as an auto-expand trigger because clicking collapse left focus on the toggle and made the rail appear stuck open. Keyboard users can still press the explicit Expand button.
- `DESIGN.md` now records the hover-overlay rule and the icon rail verification checklist.

Verification:

- RED first: `npm --prefix dashboard run test -- src/styles/responsiveLayout.contract.test.js` failed because no hover expansion contract existed.
- GREEN after implementation:
  - `npm --prefix dashboard run test -- src/styles/responsiveLayout.contract.test.js`
    - Result: `1` file passed, `7` tests passed.
  - `npm --prefix dashboard run test -- src/layouts/DashboardLayout.test.jsx src/styles/responsiveLayout.contract.test.js`
    - Result: `2` files passed, `17` tests passed.
  - `npm --prefix dashboard run test`
    - Result: `30` files passed, `113` tests passed.
  - `npm --prefix dashboard run lint`
    - Result: pass.
  - `npm --prefix dashboard run build`
    - Result: pass.
  - `python C:/Users/tranb/.codex/skills/codex-design-md/scripts/design_contract.py lint DESIGN.md`
    - Result: `0` errors, `0` warnings.
- Browser runtime at `1366x768`, `/dashboard/analytics`:
  - Collapsed rail: grid `76px 1290px`, sidebar width `76`, main left `76`, main width `1290`, nav item `44x44`, icon `17x17`, label visually hidden.
  - Hover expansion: grid stayed `76px 1290px`, sidebar width expanded to `272`, main left stayed `76`, main width stayed `1290`, nav item width `243`, label restored, document width stayed `1366`.
  - Main reflow on hover: `0`.

## Sidebar Motion Refinement - 2026-04-25

Superseded later on 2026-04-25 by `Sidebar Overlay Correction`: keep the shared motion tokens and label flow, but do not use hover to expand the collapsed rail.

Root cause:

- The collapsed sidebar previously hid labels with a visually-hidden positioning switch and restored them with `position: static` on hover.
- That made the sidebar feel like it popped between two different layouts instead of revealing one consistent layout.
- The rail expansion duration was also too fast for a 196px width change, so the motion did not read as smooth.

Fix:

- Added sidebar motion tokens:
  - `--sidebar-motion-duration: 320ms`
  - `--sidebar-motion-ease: cubic-bezier(0.16, 1, 0.3, 1)`
  - `--sidebar-label-duration: 220ms`
- Collapsed labels now stay in the same layout flow and animate with `max-width`, `opacity`, and `translateX`.
- Hover labels reveal with a slight delay (`90ms`, `60ms`, `0ms`) so the rail begins opening before text appears.
- Collapsed active targets remain `44px` by `44px`; icons remain `17px`.
- Mobile drawer resets collapsed-only max-width/opacity transforms so it remains fully readable.

Verification:

- RED first: `npm --prefix dashboard run test -- src/styles/responsiveLayout.contract.test.js` failed because no 320ms motion token or label reveal contract existed.
- GREEN:
  - `npm --prefix dashboard run test -- src/styles/responsiveLayout.contract.test.js`
    - Result: `1` file passed, `7` tests passed.
  - `npm --prefix dashboard run test -- src/layouts/DashboardLayout.test.jsx src/styles/responsiveLayout.contract.test.js`
    - Result: `2` files passed, `17` tests passed.
- Browser runtime at `1024x768`, `/dashboard/admin/employees`:
  - Collapsed: grid `76px 948px`, sidebar width `76`, main width `948`, active item `44x44`, icon `17x17`, label `max-width=0`, label opacity `0`, label transform `translateX(-6px)`, sidebar transition durations `0.32s, 0.32s, 0.22s`.
  - Hover: grid stayed `76px 948px`, sidebar width `272`, main width stayed `948`, label `max-width=180px`, label opacity `1`, label transform `none`.
  - Main reflow on hover: `0`.
  - Console warnings/errors: `0`.

## Sidebar Overlay Correction - 2026-04-25

Root cause:

- The previous hover-expansion sidebar kept the dashboard grid at `76px` while drawing the sidebar itself out to `272px`.
- Because the sticky dashboard header lives inside the main shell with `z-index: 100`, that overlay expansion let the header visually cover the right side of the expanded sidebar.
- This also created an inconsistent mental model: collapsed sidebar behaved like an icon rail, while hover-expanded sidebar behaved like a floating drawer.

Fix:

- Removed desktop `collapsed:hover` expansion rules.
- Sidebar now has exactly two desktop states:
  - Expanded: layout grid `272px minmax(0, 1fr)`.
  - Collapsed: layout grid `76px minmax(0, 1fr)`.
- Expand/collapse is only through the explicit sidebar button, so the header and main content move as part of the same grid transition.
- Layout transition now uses the same sidebar motion token timing: `320ms cubic-bezier(0.16, 1, 0.3, 1)`.
- Sidebar and backdrop layering now sits above the sticky header (`sidebar z-index=140`, backdrop `130`, header `100`) for drawer/transition safety.
- Nav links and logout controls use the same internal grid in both states: `44px` icon lane plus label lane; collapsed state only reduces the label lane and opacity.

Verification:

- RED first: `npm --prefix dashboard run test -- src/styles/responsiveLayout.contract.test.js` failed while hover overlay expansion and old z-index values were still present.
- GREEN:
  - `npm --prefix dashboard run test -- src/styles/responsiveLayout.contract.test.js`
    - Result: `1` file passed, `7` tests passed.
  - `npm --prefix dashboard run build`
    - Result: pass.
- Browser runtime at `1024x768`, `/dashboard/analytics`, after rebuilding `dist`:
  - Expanded: grid `272px 752px`, sidebar `left=0 right=272 width=272`, header `left=272 width=752`, overlap `0`, layout transition `0.32s`, sidebar z-index `140`, header z-index `100`.
  - Collapsed: grid `76px 948px`, sidebar `left=0 right=76 width=76`, header `left=76 width=948`, overlap `0`.
  - Collapsed hover: grid stayed `76px 948px`, sidebar stayed `76`, header stayed `left=76`, overlap `0`.
  - Console warnings/errors: `0`.

## Sidebar Toggle Anchor Correction - 2026-04-25

Root cause:

- The collapse/expand button was still part of the `.sidebar-brand` grid flow.
- In expanded state it sat on the brand row, but in collapsed state the brand grid became a single column, so the same button moved to a different vertical position and made the rail feel like a different layout.

Fix:

- The collapse/expand button is now absolutely anchored inside the brand area instead of participating in the brand grid.
- Expanded and collapsed states keep the button at the same top anchor (`17px` from the sidebar top in browser runtime).
- Collapsed brand mark is slightly reduced to `30px` and left-aligned so the fixed toggle has a clear lane in the rail.
- The desktop brand row reserves right padding in expanded state so the workspace title never sits underneath the anchored control.
- Mobile drawer resets the brand grid to the full drawer layout and hides the desktop collapse control as before.

Verification:

- RED first: `npm --prefix dashboard run test -- src/styles/responsiveLayout.contract.test.js` failed because the button was not anchored and the collapsed-state override did not exist.
- GREEN:
  - `npm --prefix dashboard run test -- src/styles/responsiveLayout.contract.test.js`
    - Result: `1` file passed, `7` tests passed.
  - `npm --prefix dashboard run test -- src/layouts/DashboardLayout.test.jsx src/styles/responsiveLayout.contract.test.js`
    - Result: `2` files passed, `17` tests passed.
  - `npm --prefix dashboard run build`
    - Result: pass.
- Browser runtime at `930x928`, `/dashboard/admin/employees`, after rebuilding `dist`:
  - Collapsed settled: grid `76px 854px`, sidebar width `76`, header left `76`, button `left=41 top=17 right=71`, brand mark `left=10 right=40`, button/brand overlap `false`, header/sidebar overlap `0`.
  - Expanded settled: grid `272px 658px`, sidebar width `272`, header left `272`, button `left=227 top=17 right=257`, brand mark `left=14 right=46`, button/brand overlap `false`, header/sidebar overlap `0`.
  - Console warnings/errors: `0`.

## Sidebar Toggle Boundary Refinement - 2026-04-25

Root cause:

- After anchoring the toggle, the button was still visually too large (`30px`) and too far left in expanded state because it was anchored to the brand content edge rather than the sidebar/main boundary.

Fix:

- Reduced the collapse/expand button to `28px` with a `14px` icon.
- Moved the expanded button toward the sidebar boundary with `right: -12px` from the brand anchor.
- Moved the collapsed button to `right: -7px`, keeping a small gap from the rail edge while avoiding logo overlap.
- Reduced expanded brand padding reserve from `38px` to `34px` to match the smaller control.

Verification:

- RED first: `npm --prefix dashboard run test -- src/styles/responsiveLayout.contract.test.js` failed against the old `30px/right:0` contract.
- GREEN:
  - `npm --prefix dashboard run test -- src/styles/responsiveLayout.contract.test.js`
    - Result: `1` file passed, `7` tests passed.
  - `npm --prefix dashboard run test -- src/layouts/DashboardLayout.test.jsx src/styles/responsiveLayout.contract.test.js`
    - Result: `2` files passed, `17` tests passed.
  - `npm --prefix dashboard run lint`
    - Result: pass.
  - `npm --prefix dashboard run build`
    - Result: pass.
- Browser runtime at `930x928`, `/dashboard/admin/employees`, after rebuilding `dist`:
  - Expanded: sidebar width `272`, button `left=241 top=18 right=269 width=28 height=28`, icon `14x14`, boundary gap `3px`, button/brand overlap `false`, header/sidebar overlap `0`.
  - Collapsed: sidebar width `76`, button `left=44 top=18 right=72 width=28 height=28`, icon `14x14`, boundary gap `4px`, button/brand overlap `false`, header/sidebar overlap `0`.

## Employee Editor Mobile Focus Mode - 2026-04-26

Root cause:

- At `390px`, the Manage Employees route technically allowed scrolling after an employee row was opened, but the user experience still felt clipped.
- The table and editor competed for the same limited vertical workspace. The table shell collapsed to `0px` while the editor received only about `246px` before the first fix.
- The form actions lived at the end of the long form content, so Save/Delete could sit far outside the visible viewport even when the editor had its own scroll.

Fix:

- Page-level employee editor now uses a focused mobile task mode: after row selection, the table panel collapses and the editor fills the workspace.
- Refactored the editor into a fixed header, independently scrollable body, and anchored action footer.
- The footer remains visible with Reset/Delete/Save while the form and sync evidence scroll inside `.employee-admin-editor-body--page`.
- Dashboard main content now uses `scrollbar-gutter: stable`, and mobile route stacks use a stable `12px` gap to reduce small route-to-route layout jitter.
- `DESIGN.md` now records the split table/editor rule: on mobile, edit mode must be a focused task surface with visible actions, not two competing scroll regions.

Verification:

- RED first: `npm --prefix dashboard run test -- src/styles/responsiveLayout.contract.test.js` failed for the missing focused mobile editor and stable gutter contracts.
- GREEN:
  - `npm --prefix dashboard run test -- src/styles/responsiveLayout.contract.test.js`
    - Result: `1` file passed, `9` tests passed.
  - `npm --prefix dashboard run lint`
    - Result: pass.
  - `npm --prefix dashboard run build`
    - Result: pass.
  - `npm --prefix dashboard run test`
    - First run had a `DashboardLayout` route-transition timeout in full-suite mode.
    - Rerun of `src/layouts/DashboardLayout.test.jsx` passed.
    - Full rerun passed: `30` files, `115` tests.
- Browser runtime at `390x844`, `/dashboard/admin/employees`, after rebuilding `dist`:
  - Document horizontal overflow: `0`.
  - Header/content overlap: `0`.
  - Employee workspace: `358x455.69`.
  - Table panel in edit mode: height `0`, overflow hidden.
  - Editor panel: `358x455.69`, overflow hidden.
  - Editor body: height `270.81`, `overflow-y:auto`, scrollHeight `1402`.
  - Action footer: height `49`, row-wrap layout, visible inside editor.
  - Console warnings/errors: `0`.
