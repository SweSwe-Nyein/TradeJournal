export { roundToDecimals } from './rounding';
import { calculateGrossPnL as engineGross, calculateNetPnL as engineNet, calculateRMultiple as engineR } from './tradingCalculations';
import type { TradeDirection, TradeCalculationInputs, TradeCalculationResults } from '@/src/types/trade';

export function calculateGrossPnL(
  symbol: string,
  direction: TradeDirection,
  entryPrice: number,
  exitPrice: number | null | undefined,
  quantity: number,
  usdJpyRate?: number
): number {
  if (exitPrice === null || exitPrice === undefined || !Number.isFinite(entryPrice) || !Number.isFinite(exitPrice) || !Number.isFinite(quantity) || entryPrice <= 0 || exitPrice <= 0 || quantity <= 0) {
    return 0;
  }
  return engineGross(symbol, direction, entryPrice, exitPrice, quantity, usdJpyRate);
}

export function calculateNetPnL(
  grossPnL: number,
  commission: number = 0,
  fees: number = 0,
  swap: number = 0
): number {
  return engineNet(grossPnL, commission, fees, swap);
}

export function calculateRMultiple(
  netPnL: number,
  riskAmount: number | null | undefined
): number | null {
  if (riskAmount === null || riskAmount === undefined || !Number.isFinite(riskAmount) || riskAmount <= 0) return null;
  return engineR(netPnL, riskAmount);
}

export function calculateTradeMetrics(inputs: TradeCalculationInputs): TradeCalculationResults {
  const grossPnL = calculateGrossPnL(
    inputs.symbol,
    inputs.direction,
    inputs.entry_price,
    inputs.exit_price ?? null,
    inputs.quantity,
    inputs.usdJpyRate
  );
  const netPnL = calculateNetPnL(grossPnL, inputs.commission ?? 0, inputs.fees ?? 0, inputs.swap ?? 0);
  const rMultiple = calculateRMultiple(netPnL, inputs.risk_amount ?? 0);
  return { gross_pnl: grossPnL, net_pnl: netPnL, r_multiple: rMultiple };
}
