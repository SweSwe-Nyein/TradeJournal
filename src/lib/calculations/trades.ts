import type {
  TradeDirection,
  TradeCalculationInputs,
  TradeCalculationResults,
} from '@/src/types/trade';

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

/**
 * Calculates Gross P&L based on trade direction:
 * - Long: (exit_price - entry_price) * quantity
 * - Short: (entry_price - exit_price) * quantity
 *
 * If exit price is missing (open position) or inputs are non-positive/non-finite, returns 0.
 */
export function calculateGrossPnL(
  direction: TradeDirection,
  entryPrice: number,
  exitPrice: number | null | undefined,
  quantity: number
): number {
  if (
    exitPrice === null ||
    exitPrice === undefined ||
    !Number.isFinite(entryPrice) ||
    !Number.isFinite(exitPrice) ||
    !Number.isFinite(quantity) ||
    entryPrice <= 0 ||
    exitPrice <= 0 ||
    quantity <= 0
  ) {
    return 0;
  }

  const rawPnL =
    direction === 'long'
      ? (exitPrice - entryPrice) * quantity
      : (entryPrice - exitPrice) * quantity;

  return roundToDecimals(rawPnL, 4);
}

/**
 * Calculates Net P&L:
 * net P&L = gross P&L - commission - fees - swap
 */
export function calculateNetPnL(
  grossPnL: number,
  commission: number = 0,
  fees: number = 0,
  swap: number = 0
): number {
  const safeGross = Number.isFinite(grossPnL) ? grossPnL : 0;
  const safeCommission = Number.isFinite(commission) && commission >= 0 ? commission : 0;
  const safeFees = Number.isFinite(fees) && fees >= 0 ? fees : 0;
  const safeSwap = Number.isFinite(swap) ? swap : 0;

  const rawNet = safeGross - safeCommission - safeFees - safeSwap;
  return roundToDecimals(rawNet, 4);
}

/**
 * Calculates R-multiple:
 * R = net P&L / risk_amount
 *
 * If risk_amount is missing, null, undefined, zero, negative, or invalid,
 * r_multiple returns null rather than Infinity or NaN.
 */
export function calculateRMultiple(
  netPnL: number,
  riskAmount: number | null | undefined
): number | null {
  if (
    riskAmount === null ||
    riskAmount === undefined ||
    !Number.isFinite(riskAmount) ||
    riskAmount <= 0 ||
    !Number.isFinite(netPnL)
  ) {
    return null;
  }

  const rawR = netPnL / riskAmount;
  if (!Number.isFinite(rawR)) {
    return null;
  }

  return roundToDecimals(rawR, 2);
}

/**
 * Calculates all financial metrics for a trade in a single normalized operation:
 * Returns { gross_pnl, net_pnl, r_multiple }.
 */
export function calculateTradeMetrics(
  inputs: TradeCalculationInputs
): TradeCalculationResults {
  const grossPnL = calculateGrossPnL(
    inputs.direction,
    inputs.entry_price,
    inputs.exit_price,
    inputs.quantity
  );

  const netPnL = calculateNetPnL(
    grossPnL,
    inputs.commission ?? 0,
    inputs.fees ?? 0,
    inputs.swap ?? 0
  );

  const rMultiple = calculateRMultiple(netPnL, inputs.risk_amount);

  return {
    gross_pnl: grossPnL,
    net_pnl: netPnL,
    r_multiple: rMultiple,
  };
}
