const STORAGE_KEY = 'sip.dashboard.drilldown.presets.v1';
const MAX_SAVED_PRESETS = 12;

const slugify = (value = '') => {
  return String(value)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
};

const cleanString = (value) => {
  if (value === undefined || value === null) return '';
  return String(value).trim();
};

export const normalizeDrilldownPresetFilters = (filters = {}, defaultContext = '') => {
  const normalized = {};
  const context = cleanString(filters.context || defaultContext);
  const department = cleanString(filters.department);
  const employmentType = cleanString(filters.employmentType);
  const gender = cleanString(filters.gender);
  const ethnicity = cleanString(filters.ethnicity);
  const benefitPlan = cleanString(filters.benefitPlan);
  const search = cleanString(filters.search);
  const shareholder = cleanString(filters.isShareholder);
  const minEarnings = cleanString(filters.minEarnings);

  if (context) normalized.context = context;
  if (department) normalized.department = department;
  if (employmentType) normalized.employmentType = employmentType;
  if (gender) normalized.gender = gender;
  if (ethnicity) normalized.ethnicity = ethnicity;
  if (benefitPlan) normalized.benefitPlan = benefitPlan;
  if (search) normalized.search = search;
  if (shareholder === 'true' || shareholder === 'false') normalized.isShareholder = shareholder;
  if (minEarnings) normalized.minEarnings = minEarnings;

  return normalized;
};

const parseStoredPresets = () => {
  if (typeof window === 'undefined' || !window.localStorage) return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((preset) => {
        const name = cleanString(preset?.name);
        const context = cleanString(preset?.context);
        const id = cleanString(preset?.id) || `${slugify(name || 'preset')}-${context || 'all'}`;
        if (!name) return null;
        return {
          id,
          name,
          context,
          updatedAt: cleanString(preset?.updatedAt),
          filters: normalizeDrilldownPresetFilters(preset?.filters || {}, context),
        };
      })
      .filter(Boolean)
      .sort((left, right) => {
        const leftTime = Date.parse(left.updatedAt || 0) || 0;
        const rightTime = Date.parse(right.updatedAt || 0) || 0;
        return rightTime - leftTime;
      });
  } catch {
    return [];
  }
};

const persistPresets = (presets) => {
  if (typeof window === 'undefined' || !window.localStorage) return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(presets));
};

export const loadSavedDrilldownPresets = ({ context = '' } = {}) => {
  const normalizedContext = cleanString(context);
  return parseStoredPresets().filter((preset) => preset.context === normalizedContext);
};

export const saveDrilldownPreset = ({ name, filters, context = '' }) => {
  const cleanName = cleanString(name).slice(0, 48);
  if (!cleanName) {
    throw new Error('Preset name is required');
  }

  const normalizedContext = cleanString(context);
  const normalizedFilters = normalizeDrilldownPresetFilters(filters, normalizedContext);
  const id = `${normalizedContext || 'all'}-${slugify(cleanName || 'preset')}`;
  const updatedAt = new Date().toISOString();

  const nextPreset = {
    id,
    name: cleanName,
    context: normalizedContext,
    updatedAt,
    filters: normalizedFilters,
  };

  const merged = [nextPreset, ...parseStoredPresets().filter((preset) => preset.id !== id)]
    .slice(0, MAX_SAVED_PRESETS);

  persistPresets(merged);
  return merged.filter((preset) => preset.context === normalizedContext);
};

export const deleteDrilldownPreset = ({ id, context = '' }) => {
  const normalizedContext = cleanString(context);
  const remaining = parseStoredPresets().filter((preset) => preset.id !== id);
  persistPresets(remaining);
  return remaining.filter((preset) => preset.context === normalizedContext);
};

export const buildRecommendedDrilldownPresets = ({ context = '', benefitPlans = [] } = {}) => {
  const normalizedContext = cleanString(context);
  const firstBenefitPlan = benefitPlans[0] || '';

  const common = [
    {
      id: 'shareholders-only',
      name: 'Shareholders Only',
      description: 'Focus on employees tied to shareholder reporting.',
      filters: { isShareholder: 'true' },
    },
    {
      id: 'part-time-scan',
      name: 'Part-time Scan',
      description: 'Review contractor and part-time exposure quickly.',
      filters: { employmentType: 'Part-time' },
    },
    {
      id: 'engineering-focus',
      name: 'Engineering Focus',
      description: 'Jump straight to the largest engineering cohort in the current dataset.',
      filters: { department: 'Engineering' },
    },
  ];

  if (normalizedContext === 'earnings') {
    return [
      {
        id: 'high-earners-100k',
        name: 'High Earners > $100k',
        description: 'CEO memo quick query for compensation outliers.',
        filters: { minEarnings: '100000' },
      },
      {
        id: 'high-earners-150k',
        name: 'High Earners > $150k',
        description: 'Narrow the review to the highest-paid cohort.',
        filters: { minEarnings: '150000' },
      },
      ...common,
    ];
  }

  if (normalizedContext === 'benefits') {
    return [
      {
        id: 'benefits-shareholders',
        name: 'Benefits: Shareholders',
        description: 'Compare plan cost behavior for shareholder employees.',
        filters: { isShareholder: 'true' },
      },
      ...(firstBenefitPlan
        ? [{
          id: `benefits-plan-${slugify(firstBenefitPlan)}`,
          name: `Plan: ${firstBenefitPlan}`,
          description: 'Inspect a single plan without rebuilding filters.',
          filters: { benefitPlan: firstBenefitPlan },
        }]
        : []),
      {
        id: 'benefits-non-shareholders',
        name: 'Benefits: Non-shareholders',
        description: 'Review non-equity employees for plan mix differences.',
        filters: { isShareholder: 'false' },
      },
    ];
  }

  if (normalizedContext === 'vacation') {
    return [
      {
        id: 'vacation-full-time',
        name: 'Vacation: Full-time',
        description: 'Check the largest vacation pool first.',
        filters: { employmentType: 'Full-time' },
      },
      {
        id: 'vacation-shareholders',
        name: 'Vacation: Shareholders',
        description: 'See whether shareholder staff are accumulating leave.',
        filters: { isShareholder: 'true' },
      },
      ...common.filter((preset) => preset.id !== 'part-time-scan'),
    ];
  }

  return common;
};
