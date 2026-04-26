export const VALID_DRILLDOWN_CONTEXTS = new Set(['earnings', 'vacation', 'benefits']);

const DRILLDOWN_FILTER_KEYS = [
  'context',
  'department',
  'employmentType',
  'gender',
  'ethnicity',
  'isShareholder',
  'benefitPlan',
  'minEarnings',
  'search',
];

export function normalizeDrilldownContext(context) {
  if (!context || !VALID_DRILLDOWN_CONTEXTS.has(context)) return '';
  return context;
}

export function buildDrilldownSearch(baseSearchParams, filters = {}) {
  const nextParams = new URLSearchParams(baseSearchParams);
  nextParams.delete('drilldown');

  DRILLDOWN_FILTER_KEYS.forEach((key) => {
    nextParams.delete(key);
  });

  DRILLDOWN_FILTER_KEYS.forEach((key) => {
    const value = filters[key];
    if (value === undefined || value === null || value === '') return;
    nextParams.set(key, String(value));
  });

  return nextParams;
}

export function clearDrilldownSearch(baseSearchParams) {
  const nextParams = new URLSearchParams(baseSearchParams);
  nextParams.delete('drilldown');
  DRILLDOWN_FILTER_KEYS.forEach((key) => {
    nextParams.delete(key);
  });
  return nextParams;
}

export function parseDrilldownFilters(searchParams) {
  const context = normalizeDrilldownContext(searchParams.get('context'));
  if (!context) return null;

  const filters = { context };
  DRILLDOWN_FILTER_KEYS.forEach((key) => {
    if (key === 'context') return;
    const value = searchParams.get(key);
    if (value) {
      filters[key] = value;
    }
  });

  return filters;
}

export function toSearchString(searchParams) {
  const serialized = searchParams.toString();
  return serialized ? `?${serialized}` : '';
}
