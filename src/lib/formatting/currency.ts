export function formatCurrency(
  value: number,
  options: {
    currency?: string;
    showSign?: boolean;
    minimumFractionDigits?: number;
    maximumFractionDigits?: number;
  } = {}
): string {
  const {
    currency = 'USD',
    showSign = false,
    minimumFractionDigits = 2,
    maximumFractionDigits = 2,
  } = options;

  const formatted = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits,
    maximumFractionDigits,
  }).format(Math.abs(value));

  if (value < 0) {
    return `-${formatted}`;
  }
  if (value > 0 && showSign) {
    return `+${formatted}`;
  }
  return formatted;
}

export function formatPercentage(
  value: number,
  options: { showSign?: boolean; decimals?: number } = {}
): string {
  const { showSign = true, decimals = 2 } = options;
  const sign = value > 0 && showSign ? '+' : '';
  return `${sign}${value.toFixed(decimals)}%`;
}
