export const formatLocaleDateTime = (
  value: string | Date | null | undefined,
  locale: string,
  fallback = '-'
) => {
  if (!value) {
    return fallback;
  }

  return new Date(value).toLocaleString(locale);
};

export const formatFixedNumber = (
  value: unknown,
  digits: number,
  fallback = '--'
) => {
  const numericValue = Number(value);
  return Number.isFinite(numericValue) ? numericValue.toFixed(digits) : fallback;
};
