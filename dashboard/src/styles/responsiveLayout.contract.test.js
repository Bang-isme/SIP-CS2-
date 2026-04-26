import { readFileSync } from 'node:fs';

const readSource = (relativePath) =>
  readFileSync(new URL(relativePath, import.meta.url), 'utf8');

describe('responsive layout CSS contracts', () => {
  it('keeps the dashboard header from shrinking below wrapped mobile controls', () => {
    const dashboardCss = readSource('../pages/Dashboard.css');

    expect(dashboardCss).toMatch(/\.dashboard-header\s*\{[^}]*flex:\s*0\s+0\s+auto;/s);
  });

  it('allows nested dashboard page stacks to shrink inside mobile viewports', () => {
    const layoutCss = readSource('../layouts/DashboardLayout.css');

    expect(layoutCss).toMatch(/\.dashboard-page-stack\s*\{[^}]*min-width:\s*0;/s);
    expect(layoutCss).toMatch(/\.dashboard-page-stack--workspace\s*\{[^}]*max-width:\s*100%;/s);
  });

  it('keeps employee admin table/editor panels from forcing page-width overflow', () => {
    const employeeAdminCss = readSource('../components/AdminEmployeesModal.css');

    expect(employeeAdminCss).toMatch(
      /\.employee-admin-table-panel,\s*\.employee-admin-editor-panel\s*\{[^}]*min-width:\s*0;/s,
    );
  });

  it('keeps the page-level employee editor body independently scrollable instead of clipping edit forms', () => {
    const employeeAdminCss = readSource('../components/AdminEmployeesModal.css');

    expect(employeeAdminCss).toMatch(
      /\.employee-admin-editor-body\s*\{[^}]*overflow-y:\s*auto;/s,
    );
    expect(employeeAdminCss).toMatch(
      /\.employee-admin-editor-body\s*\{[^}]*scrollbar-gutter:\s*stable;/s,
    );
  });

  it('promotes the employee page editor into a focused mobile task surface with anchored form actions', () => {
    const employeeAdminCss = readSource('../components/AdminEmployeesModal.css');

    expect(employeeAdminCss).toMatch(
      /@media\s*\(max-width:\s*860px\)\s*\{[\s\S]*\.employee-admin-workspace--page\.editor-open\s*\{[^}]*grid-template-rows:\s*minmax\(0,\s*1fr\);/s,
    );
    expect(employeeAdminCss).toMatch(
      /@media\s*\(max-width:\s*860px\)\s*\{[\s\S]*\.employee-admin-workspace--page\.editor-open\s+\.employee-admin-table-panel--page\s*\{[^}]*max-height:\s*0;[^}]*overflow:\s*hidden;/s,
    );
    expect(employeeAdminCss).toMatch(
      /\.employee-admin-editor-panel--page\s*>\s*\.employee-admin-form-actions\s*\{[^}]*border-top:\s*1px\s+solid\s+#dbe5f5;[^}]*box-shadow:/s,
    );
    expect(employeeAdminCss).toMatch(
      /@media\s*\(max-width:\s*860px\)\s*\{[\s\S]*\.employee-admin-editor-panel--page\s*>\s*\.employee-admin-form-actions\s*\{[^}]*flex-direction:\s*row;[^}]*flex-wrap:\s*wrap;/s,
    );
  });

  it('keeps mobile dashboard chrome compact with stable page gutters', () => {
    const layoutCss = readSource('../layouts/DashboardLayout.css');
    const dashboardCss = readSource('../pages/Dashboard.css');

    expect(layoutCss).toMatch(/\.dashboard-main-content\s*\{[^}]*scrollbar-gutter:\s*stable;/s);
    expect(layoutCss).toMatch(
      /@media\s*\(max-width:\s*768px\)\s*\{[\s\S]*\.dashboard-page-stack\s*\{[^}]*gap:\s*12px;/s,
    );
    expect(dashboardCss).toMatch(
      /@media\s*\(max-width:\s*768px\)\s*\{[\s\S]*\.header-left,\s*\.header-right\s*\{[^}]*min-width:\s*0;[^}]*width:\s*100%;/s,
    );
  });

  it('defines a restrained route transition with reduced-motion fallback', () => {
    const layoutCss = readSource('../layouts/DashboardLayout.css');

    expect(layoutCss).toMatch(/\.dashboard-route-frame\s*\{[^}]*animation:\s*dashboard-route-enter\s+180ms/s);
    expect(layoutCss).toMatch(/@keyframes\s+dashboard-route-enter/s);
    expect(layoutCss).toMatch(
      /@media\s*\(prefers-reduced-motion:\s*reduce\)\s*\{[\s\S]*\.dashboard-route-frame\s*\{[^}]*animation:\s*none;/s,
    );
  });

  it('does not leave route frames transformed after entry animations', () => {
    const layoutCss = readSource('../layouts/DashboardLayout.css');

    expect(layoutCss).not.toMatch(/\.dashboard-route-frame\s*\{[^}]*animation:[^;]*\bboth\b/s);
    expect(layoutCss).not.toMatch(/\.dashboard-route-frame\s*\{[^}]*will-change:[^;]*transform/s);
    expect(layoutCss).toMatch(/@keyframes\s+dashboard-route-enter\s*\{[\s\S]*to\s*\{[^}]*transform:\s*none;/s);
  });

  it('keeps desktop sidebar collapse and expand as explicit grid states without hover overlay', () => {
    const layoutCss = readSource('../layouts/DashboardLayout.css');
    const sidebarCss = readSource('../components/Sidebar.css');
    const dashboardCss = readSource('../pages/Dashboard.css');

    expect(sidebarCss).toMatch(/--sidebar-motion-duration:\s*320ms;/);
    expect(sidebarCss).toMatch(/--sidebar-rail-width:\s*76px;/);
    expect(sidebarCss).toMatch(/--sidebar-expanded-width:\s*272px;/);
    expect(sidebarCss).toMatch(
      /\.sidebar-brand\s*\{[^}]*position:\s*relative;[^}]*padding-right:\s*34px;/s,
    );
    expect(sidebarCss).toMatch(
      /\.sidebar-collapse-btn\s*\{[^}]*position:\s*absolute;[^}]*top:\s*2px;[^}]*right:\s*-12px;[^}]*width:\s*28px;[^}]*height:\s*28px;/s,
    );
    expect(sidebarCss).toMatch(/\.sidebar-collapse-btn\s+svg\s*\{[^}]*width:\s*14px;[^}]*height:\s*14px;/s);
    expect(sidebarCss).toMatch(
      /\.dashboard-sidebar--collapsed\s+\.sidebar-brand\s*\{[^}]*min-height:\s*32px;[^}]*padding-right:\s*0;/s,
    );
    expect(sidebarCss).toMatch(
      /\.dashboard-sidebar--collapsed\s+\.sidebar-collapse-btn\s*\{[^}]*right:\s*-7px;[^}]*width:\s*28px;[^}]*height:\s*28px;/s,
    );
    expect(layoutCss).toMatch(/\.dashboard-layout\s*\{[^}]*grid-template-columns:\s*272px\s+minmax\(0,\s*1fr\);/s);
    expect(layoutCss).toMatch(/\.dashboard-layout\s*\{[^}]*transition:\s*grid-template-columns\s+320ms/s);
    expect(sidebarCss).toMatch(/\.dashboard-sidebar\s*\{[^}]*z-index:\s*140;/s);
    expect(sidebarCss).toMatch(/\.sidebar-backdrop\s*\{[^}]*z-index:\s*130;/s);
    expect(dashboardCss).toMatch(/\.dashboard-header\s*\{[^}]*z-index:\s*100;/s);
    expect(layoutCss).toMatch(/\.dashboard-layout--sidebar-collapsed\s*\{[^}]*grid-template-columns:\s*76px\s+minmax\(0,\s*1fr\);/s);
    expect(sidebarCss).toMatch(/\.dashboard-sidebar--collapsed\s*\{[^}]*width:\s*var\(--sidebar-rail-width\);/s);
    expect(sidebarCss).not.toMatch(
      /\.dashboard-sidebar--collapsed:hover\s*\{[^}]*width:\s*var\(--sidebar-expanded-width\);/s,
    );
    expect(sidebarCss).toMatch(
      /\.sidebar-nav-link\s*\{[^}]*grid-template-columns:\s*44px\s+minmax\(0,\s*1fr\);[^}]*min-height:\s*44px;/s,
    );
    expect(sidebarCss).toMatch(
      /\.sidebar-logout-btn\s*\{[^}]*grid-template-columns:\s*44px\s+minmax\(0,\s*1fr\);[^}]*min-height:\s*44px;/s,
    );
    expect(sidebarCss).toMatch(
      /\.dashboard-sidebar--collapsed\s+\.sidebar-nav-link,\s*\.dashboard-sidebar--collapsed\s+\.sidebar-nav-link--secondary,\s*\.dashboard-sidebar--collapsed\s+\.sidebar-logout-btn\s*\{[^}]*width:\s*44px;[^}]*grid-template-columns:\s*44px\s+0fr;/s,
    );
    expect(sidebarCss).toMatch(/\.sidebar-nav-link\s+svg,\s*\.sidebar-logout-btn\s+svg\s*\{[^}]*width:\s*17px;[^}]*height:\s*17px;/s);
    expect(sidebarCss).toMatch(
      /\.dashboard-sidebar--collapsed\s+\.sidebar-nav-link\s*>\s*span,\s*\.dashboard-sidebar--collapsed\s+\.sidebar-logout-btn\s*>\s*span\s*\{[^}]*max-width:\s*0;[^}]*opacity:\s*0;[^}]*transform:\s*translateX\(-6px\);/s,
    );
    expect(sidebarCss).not.toMatch(
      /\.dashboard-sidebar--collapsed:hover\s+\.sidebar-nav-link\s*>\s*span,\s*\.dashboard-sidebar--collapsed:hover\s+\.sidebar-logout-btn\s*>\s*span\s*\{/s,
    );
  });

  it('keeps admin users page surfaces constrained while the table owns horizontal scroll', () => {
    const adminUsersCss = readSource('../components/AdminUsersModal.css');

    expect(adminUsersCss).toMatch(/\.admin-page-shell\s*\{[^}]*min-width:\s*0;[^}]*max-width:\s*100%;/s);
    expect(adminUsersCss).toMatch(/\.admin-modal-card--page\s*\{[^}]*min-width:\s*0;[^}]*max-width:\s*100%;/s);
    expect(adminUsersCss).toMatch(/\.admin-users-table-wrap\s*\{[^}]*min-width:\s*0;[^}]*max-width:\s*100%;[^}]*overflow:\s*auto;/s);
    expect(adminUsersCss).toMatch(/\.admin-users-table\s*\{[^}]*width:\s*max-content;[^}]*min-width:\s*max\(760px,\s*100%\);/s);
  });

  it('turns admin users mobile rows into action-visible cards instead of hiding actions off-canvas', () => {
    const adminUsersCss = readSource('../components/AdminUsersModal.css');

    expect(adminUsersCss).toMatch(
      /@media\s*\(max-width:\s*640px\)\s*\{[\s\S]*\.admin-users-table-wrap\s*\{[^}]*overflow-x:\s*hidden;[^}]*overflow-y:\s*auto;/s,
    );
    expect(adminUsersCss).toMatch(
      /@media\s*\(max-width:\s*640px\)\s*\{[\s\S]*\.admin-users-table\s*\{[^}]*display:\s*block;[^}]*width:\s*100%;[^}]*min-width:\s*0;/s,
    );
    expect(adminUsersCss).toMatch(
      /@media\s*\(max-width:\s*640px\)\s*\{[\s\S]*\.admin-users-table\s+td:nth-child\(5\)\s*\{[^}]*grid-template-columns:\s*1fr;[^}]*border-bottom:\s*0;/s,
    );
    expect(adminUsersCss).toMatch(
      /@media\s*\(max-width:\s*640px\)\s*\{[\s\S]*\.admin-promote-btn\s*\{[^}]*width:\s*100%;/s,
    );
  });

  it('keeps page drilldown constrained while table and virtual rows own their overflow', () => {
    const drilldownCss = readSource('../components/DrilldownModal.css');

    expect(drilldownCss).toMatch(/\.drilldown-page-shell\s*\{[^}]*min-width:\s*0;[^}]*max-width:\s*100%;[^}]*overflow:\s*hidden;/s);
    expect(drilldownCss).toMatch(/\.modal-content--page\s*\{[^}]*min-width:\s*0;[^}]*max-width:\s*100%;/s);
    expect(drilldownCss).toMatch(/\.table-container\s*\{[^}]*min-width:\s*0;[^}]*max-width:\s*100%;[^}]*overflow:\s*auto;/s);
    expect(drilldownCss).toMatch(/\.drilldown-table\s*\{[^}]*width:\s*max-content;[^}]*min-width:\s*max\(760px,\s*100%\);/s);
    expect(drilldownCss).toMatch(/\.virtual-table\s*\{[^}]*min-width:\s*max-content;/s);
    expect(drilldownCss).toMatch(/\.virtual-header,\s*\.virtual-row\s*\{[^}]*min-width:\s*760px;/s);
    expect(drilldownCss).toMatch(/\.virtual-header\s*\{[^}]*grid-template-columns:/s);
    expect(drilldownCss).toMatch(/\.virtual-row\s*\{[^}]*grid-template-columns:/s);
  });

  it('keeps drilldown mobile controls from forcing document-level horizontal overflow', () => {
    const drilldownCss = readSource('../components/DrilldownModal.css');

    expect(drilldownCss).toMatch(
      /@media\s*\(max-width:\s*768px\)\s*\{[\s\S]*\.drilldown-page-shell,\s*\.modal-content--page,\s*\.filter-bar,\s*\.filter-row,\s*\.filter-group-wrap,\s*\.filter-group,\s*\.search-group,[\s\S]*min-width:\s*0;[\s\S]*max-width:\s*100%;/s,
    );
    expect(drilldownCss).toMatch(
      /@media\s*\(max-width:\s*768px\)\s*\{[\s\S]*\.search-group\s*\{[^}]*flex:\s*1\s+1\s+100%;[^}]*min-width:\s*0;/s,
    );
    expect(drilldownCss).toMatch(
      /@media\s*\(max-width:\s*768px\)\s*\{[\s\S]*\.filter-select,\s*\.earnings-input\s*\{[^}]*min-width:\s*0;[^}]*max-width:\s*100%;/s,
    );
    expect(drilldownCss).toMatch(
      /@media\s*\(max-width:\s*768px\)\s*\{[\s\S]*\.table-container\s*\{[^}]*overflow-x:\s*auto;[^}]*max-width:\s*100%;/s,
    );
  });

  it('prevents department row progress fills from expanding button scroll width', () => {
    const earningsCss = readSource('../components/EarningsChart.css');

    expect(earningsCss).toMatch(/\.dept-row::before\s*\{[^}]*right:\s*4px;/s);
    expect(earningsCss).toMatch(/\.dept-row::before\s*\{[^}]*max-width:\s*calc\(100%\s*-\s*8px\);/s);
  });
});
