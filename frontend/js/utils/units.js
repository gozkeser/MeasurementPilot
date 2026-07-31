export const PREFIX_MULTIPLIERS = {
  'p': 1e-12,
  'n': 1e-9,
  'μ': 1e-6,
  'm': 1e-3,
  '': 1.0,
  'k': 1e3,
  'K': 1e3,
  'M': 1e6,
  'G': 1e9
};

/** Kullanıcı girişini (display değer + prefix) base unit'e çevirir. */
export function toBaseUnit(value, prefix) {
  return value * (PREFIX_MULTIPLIERS[prefix] ?? 1);
}

/** Base unit değerini verilen prefix'e çevirerek gösterim değeri döner. */
export function fromBaseUnit(value, prefix) {
  const m = PREFIX_MULTIPLIERS[prefix] ?? 1;
  return m === 0 ? 0 : value / m;
}

/** Verilen prefix ve unit ile formatlanmış string döner. */
export function formatWithPrefix(baseValue, prefix, unit) {
  if (baseValue === null || baseValue === undefined || isNaN(baseValue)) return '—';
  const displayVal = fromBaseUnit(baseValue, prefix);
  // Ondalık basamakları kısalt
  const formatted = parseFloat(displayVal.toPrecision(6));
  return `${formatted} ${prefix}${unit}`.trim();
}

export function formatValue(value, prefix = '', unit = '') {
  if (value === null || value === undefined || isNaN(value)) return '—';
  return `${value} ${prefix}${unit}`.trim();
}

/** Measurement tipine göre prefix seçenek listesi döner. */
export function getPrefixOptions(measurementType) {
  const allPrefixes = [
    { value: 'p', label: 'p (pico)' },
    { value: 'n', label: 'n (nano)' },
    { value: 'μ', label: 'μ (micro)' },
    { value: 'm', label: 'm (milli)' },
    { value: '',  label: '— (base)' },
    { value: 'k', label: 'k (kilo)' },
    { value: 'M', label: 'M (mega)' },
    { value: 'G', label: 'G (giga)' },
  ];
  return allPrefixes;
}

export function getUnitSuggestions(measurementType) {
  switch (measurementType) {
    case 'DC_VOLTAGE':
    case 'AC_VOLTAGE':
      return { defaultUnit: 'V', defaultPrefix: '', options: ['', 'm', 'μ'] };
    case 'RESISTANCE':
      return { defaultUnit: 'Ohm', defaultPrefix: '', options: ['', 'm', 'k', 'M'] };
    case 'FREQUENCY':
      return { defaultUnit: 'Hz', defaultPrefix: 'k', options: ['', 'k', 'M'] };
    case 'DIODE':
    case 'CONTINUITY':
      return { defaultUnit: 'V', defaultPrefix: 'm', options: ['m', ''] };
    default:
      return { defaultUnit: 'V', defaultPrefix: '', options: ['', 'm', 'k'] };
  }
}
