const PREFIX_MULTIPLIERS = {
  'p': 1e-12,
  'n': 1e-9,
  'μ': 1e-6,
  'm': 1e-3,
  '': 1.0,
  'k': 1e3,
  'M': 1e6,
  'G': 1e9
};

export function formatValue(value, prefix = '', unit = '') {
  if (value === null || value === undefined || isNaN(value)) return '—';
  return `${value} ${prefix}${unit}`.trim();
}

export function getUnitSuggestions(measurementType) {
  switch (measurementType) {
    case 'DC_VOLTAGE':
    case 'AC_VOLTAGE':
      return { defaultUnit: 'V', defaultPrefix: '', options: ['', 'm', 'μ'] };
    case 'RESISTANCE':
      return { defaultUnit: 'Ω', defaultPrefix: '', options: ['', 'm', 'k', 'M'] };
    case 'FREQUENCY':
      return { defaultUnit: 'Hz', defaultPrefix: 'k', options: ['Hz', 'k', 'M'] };
    case 'DIODE':
    case 'CONTINUITY':
      return { defaultUnit: 'V', defaultPrefix: 'm', options: ['m', ''] };
    default:
      return { defaultUnit: 'V', defaultPrefix: '', options: ['', 'm', 'k'] };
  }
}
