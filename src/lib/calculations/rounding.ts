/**
 * High-precision financial decimal rounding using exponential notation
 * to prevent IEEE 754 binary floating-point representation quirks.
 */
export function roundToDecimals(value: number, decimals: number = 4): number {
  if (!Number.isFinite(value)) return 0;
  const sign = value < 0 ? -1 : 1;
  const abs = Math.abs(value);
  const rounded = Number(Math.round(Number(`${abs}e${decimals}`)) + `e-${decimals}`);
  return sign * rounded;
}
