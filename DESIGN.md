---
version: alpha
name: SIP People Ops Console
description: Durable UI/UX contract for the SIP dashboard, operations, and administration workflows.
colors:
  primary: "#4F46E5"
  primaryDeep: "#4338CA"
  trustTeal: "#0F766E"
  operationsAmber: "#D97706"
  danger: "#BE123C"
  canvas: "#F5F7FB"
  surface: "#FFFFFF"
  surfaceSubtle: "#F8FAFC"
  panel: "#EEF3F8"
  text: "#111827"
  textSecondary: "#475569"
  textTertiary: "#6B7A90"
  border: "#DBE3EF"
  divider: "#EDF2F7"
  successBg: "#ECFDF5"
  warningBg: "#FFFBEB"
  dangerBg: "#FFF1F2"
typography:
  heading-xl:
    fontFamily: "Plus Jakarta Sans"
    fontSize: 1.5rem
    fontWeight: 800
    lineHeight: 1.15
    letterSpacing: 0em
  heading-md:
    fontFamily: "Plus Jakarta Sans"
    fontSize: 1.0625rem
    fontWeight: 800
    lineHeight: 1.2
    letterSpacing: 0em
  body-md:
    fontFamily: "Plus Jakarta Sans"
    fontSize: 0.9375rem
    fontWeight: 500
    lineHeight: 1.5
    letterSpacing: 0em
  label-sm:
    fontFamily: "Plus Jakarta Sans"
    fontSize: 0.75rem
    fontWeight: 700
    lineHeight: 1.35
    letterSpacing: 0.04em
  mono-sm:
    fontFamily: "JetBrains Mono"
    fontSize: 0.75rem
    fontWeight: 600
    lineHeight: 1.4
    letterSpacing: 0em
rounded:
  sm: 6px
  md: 8px
  lg: 12px
  xl: 16px
  full: 9999px
spacing:
  xs: 4px
  sm: 8px
  md: 12px
  lg: 16px
  xl: 24px
  xxl: 32px
components:
  route-frame:
    backgroundColor: "{colors.canvas}"
    textColor: "{colors.text}"
    rounded: "{rounded.md}"
    padding: 0px
  workflow-panel:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text}"
    rounded: "{rounded.lg}"
    padding: 16px
  data-table-shell:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text}"
    rounded: "{rounded.md}"
    padding: 0px
  form-editor-panel:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text}"
    rounded: "{rounded.md}"
    padding: 12px
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "#FFFFFF"
    rounded: "{rounded.full}"
    height: 34px
---

## Overview

SIP is an operational dashboard, not a marketing surface. The interface must feel calm, dense, and dependable: users are scanning payroll, readiness, alerts, and employee source records under time pressure. The design goal is simple workflows with clear ownership of state, scroll, and action placement.

Prefer fewer controls, clearer grouping, and predictable movement. Simplicity here means the user always knows which panel owns the next action and which panel can scroll.

## Colors

- Use `primary` and `primaryDeep` sparingly for navigation, selected rows, primary actions, and focus states.
- Use `trustTeal` for healthy operational states and `operationsAmber` for attention states that are not failures.
- Use `danger` only for destructive actions, failed sync, and blocking validation.
- Keep dashboard surfaces on `canvas`, `surface`, and `surfaceSubtle`; avoid adding decorative gradients when a simple state badge or table affordance communicates better.
- Text contrast must stay anchored on `text`, `textSecondary`, and `textTertiary`. Do not lower contrast to make dense UI feel lighter.

## Typography

- Headings use Plus Jakarta Sans with strong weight, but dashboard headings stay compact. Do not use hero-scale type inside admin tools, tables, modals, sidebars, or editor panels.
- Labels use uppercase only for short field labels, table headers, status chips, and metrics. Long instructions should be sentence case.
- Numeric operational values should use `mono-sm` or the existing mono token so IDs, rates, counts, and timestamps scan predictably.
- Letter spacing is `0em` for normal text. Positive tracking is reserved for short labels only.

## Layout

- Use the 4/8px rhythm already in `variables.css`: compact control interiors use `8px` to `12px`, panel padding uses `12px` to `16px`, and page gaps use `10px` to `18px`.
- Dashboard pages use constrained full-width bands or route frames. Do not nest decorative cards inside cards.
- Desktop navigation should be collapsible when it competes with dense tables or chart grids. The expanded sidebar explains route names; the collapsed sidebar preserves icons, active state, accessible names, and tooltips while returning width to the main workspace. Sidebar expansion must be an explicit grid state, not a hover overlay. The main shell and sticky header must start after the sidebar column in both states, with `0px` horizontal overlap. Use a measured transition around `320ms`; labels should hide/reveal with opacity/transform/max-width, not by swapping positioning modes.
- Every nested app surface must define both shrink behavior and scroll ownership:
  - Outer route and shell containers: `min-width: 0`, `min-height: 0`, `overflow-x: hidden`.
  - Wide data tables: scroll inside the table shell only.
  - Long forms and evidence panels: scroll inside the editor panel only.
  - Parent workflow containers may use `overflow: hidden` only when every overflow-prone child has its own `overflow: auto` or `overflow-y: auto`.
- Do not use `overflow: hidden` on page-level form editors, drawers, or modals unless a clearly named child scroll region exists.
- Do not leave persistent transforms on route frames or shell ancestors that can contain fixed overlays. Modals and drawers must anchor to the viewport, not to a transformed route subtree.
- On mobile, stacked workflow panels must preserve action access. A user must be able to reach reset, delete, save, refresh, pagination, and close controls without layout clipping.
- On mobile, a split table/editor workflow becomes a focused editor task after row selection. Collapse the table panel until the editor is hidden so the user is not forced to manage two competing scroll regions in one small viewport.
- Editor forms should separate scroll body and action footer. Long fields and evidence cards can scroll, but reset, delete, save, and close/hide actions stay visibly anchored in the editor panel.

## Elevation & Depth

- Depth should be quiet: thin borders, subtle shadows, and selected-row background changes are enough for this product.
- Use heavier elevation only for modal overlays, toasts, active dropdowns, and temporary blocking UI.
- Avoid stacking multiple fuzzy shadows on dashboard cards or table panels.

## Shapes

- Keep repeated cards and panels at `8px` to `12px` radius. Use `16px` only for larger grouped containers.
- Buttons and chips can use `rounded.full` when they are compact status or command controls.
- Do not mix many radius values inside one workflow. A table shell, editor panel, and action buttons should look like one system.

## Components

- `route-frame` owns page transitions and route labels. Keep route animation subtle: opacity plus a small vertical shift, around `180ms`, with reduced-motion support. The final animation state must compute to `transform: none`; avoid `animation-fill-mode: both` on route frames.
- `sidebar` is persistent navigation on desktop and a drawer on mobile. Desktop may collapse to a balanced icon rail and expand only through the explicit collapse/expand control. Do not auto-expand the rail on hover. The expanded state owns a `272px` grid column; the collapsed state owns a `76px` grid column. The collapse/expand button must be anchored, not a brand-row grid item; keep it compact (`28px`) and close to the sidebar/main boundary so it does not push the logo or route links. The icon rail uses centered `44px` targets and `17px` icons. Mobile must keep the drawer readable with full labels and a close control.
- `workflow-panel` is for a single work area such as Employee Administration. It can contain a table panel and an editor panel, but each child must own its scroll.
- `data-table-shell` is the only place where a wide table should create horizontal scrolling. The page itself must not grow wider than the viewport.
- `form-editor-panel` is for create/edit forms, sync evidence, and save/delete actions. It uses an independently scrollable body plus an anchored action footer in page and modal variants.
- Primary and destructive actions should be visually stable and stay reachable at the end of the workflow. Do not hide them below a clipped container.
- Hover and focus states should be functional, not decorative: use focus rings, selected rows, and restrained background changes before adding motion.

## Do's and Don'ts

- Do test interaction surfaces at `390px` width before calling a dashboard workflow ready.
- Do test dense desktop pages at `1366px` width with both expanded and collapsed sidebar states.
- Do verify sidebar states: collapsed rail stays `76px`, expanded sidebar is `272px`, header left edge equals sidebar right edge, overlap remains `0px`, hover does not change sidebar width, collapse/expand button keeps a stable top anchor, and icons remain visually centered.
- Do verify Manage Employees edit mode at `390px`: document horizontal overflow stays `0px`, the table panel collapses to `0px` height while editing, the editor fills the workspace, the editor body owns vertical scroll, and the save/delete footer remains visible.
- Do check `clientWidth` versus `scrollWidth` for route containers after adding a wide table or side editor.
- Do preserve `prefers-reduced-motion` for route transitions and any future panel animation.
- Do verify fixed overlays after adding transitions; route animation must not change the containing block for modal or drawer positioning.
- Do prefer one visible primary action per panel state.
- Do keep edit and create flows visually related, but make immutable fields such as Employee ID obvious.
- Do not let parent containers clip forms, evidence cards, or action rows.
- Do not make a table's intrinsic width decide the page width.
- Do not add animation to disguise broken layout.
- Do not keep `will-change: transform` on idle app shells or route frames.
- Do not add explanatory in-app copy for basic mechanics when layout and controls can make the task obvious.
- Do not use complex nested panels when one table plus one editor region solves the workflow.
