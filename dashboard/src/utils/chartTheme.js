/**
 * Resolves CSS custom properties to hex strings for Recharts SVG attributes.
 * SVG `fill`/`stroke` attributes don't support var() — this bridge reads
 * the live design tokens and hands Recharts concrete color values.
 */

let _cache = null;

function resolve() {
  const s = getComputedStyle(document.documentElement);
  const get = (prop, fallback) => s.getPropertyValue(prop).trim() || fallback;

  return {
    earnings:      get('--accent-earnings', '#6366f1'),
    earningsLight: get('--color-primary-200', '#c7ccfe'),
    earningsMid:   get('--color-primary-400', '#818cf8'),
    vacation:      get('--accent-vacation', '#0d9488'),
    benefits:      get('--accent-benefits', '#8b5cf6'),
    alerts:        get('--accent-alerts', '#f59e0b'),
    pink:          get('--accent-pink', '#f472b6'),
    birthday:      get('--accent-birthday', '#ec4899'),
    cyan:          get('--accent-cyan', '#06b6d4'),
    gridStroke:    get('--color-divider', '#f0f0f5'),
  };
}

export function getChartTheme() {
  if (!_cache) _cache = resolve();
  return _cache;
}
