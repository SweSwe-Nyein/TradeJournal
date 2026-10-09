import type { TradeDirection, TradeStatus } from '@/src/types/trade';
import type { ColumnMapping, ValidatedImportRow } from '@/src/types/import';
import { calculateTradeMetrics } from '@/src/lib/calculations/trades';
import { tradeFormSchema } from '@/src/lib/validation/trade';

/**
 * Normalizes currency and decimal numbers (strips $, commas, spaces, handles parentheses).
 */
export function parseDecimal(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  const str = String(value).trim();
  if (!str) return null;

  // Check for negative parentheses e.g. (150.25)
  const isParenthesesNegative = /^\(.*\)$/.test(str);
  // Strip currency symbols, spaces, commas, and parentheses
  const cleanStr = str.replace(/[$,€£¥\s()]/g, '');
  if (!cleanStr) return null;

  const num = Number(cleanStr);
  if (!Number.isFinite(num)) return null;

  return isParenthesesNegative ? -Math.abs(num) : num;
}

/**
 * Normalizes trading direction across broker conventions.
 * Does not guess ambiguous values.
 */
export function parseDirection(value: unknown): TradeDirection | null {
  if (!value) return null;
  const cleaned = String(value).trim().toUpperCase();

  switch (cleaned) {
    case 'BUY':
    case 'LONG':
    case 'B':
    case 'BOT':
    case 'CALL':
    case '1':
      return 'long';

    case 'SELL':
    case 'SHORT':
    case 'S':
    case 'SLD':
    case 'PUT':
    case '-1':
      return 'short';

    default:
      return null;
  }
}

/**
 * Parses and normalizes various date/time formats into a standard ISO 8601 string.
 */
export function parseDateTime(value: unknown): string | null {
  if (!value) return null;
  const str = String(value).trim();
  if (!str) return null;

  // 1. Unix timestamp (seconds or milliseconds)
  if (/^\d{10,13}$/.test(str)) {
    const num = Number(str);
    const ms = str.length === 10 ? num * 1000 : num;
    const d = new Date(ms);
    return !isNaN(d.getTime()) ? d.toISOString() : null;
  }

  // 2. Standard ISO or Date.parse
  const directDate = new Date(str);
  if (!isNaN(directDate.getTime())) {
    return directDate.toISOString();
  }

  // 3. Common broker formats: DD/MM/YYYY or MM/DD/YYYY with time
  // e.g. 10/07/2026 14:30:00 or 2026.10.07 14:30:00
  const normalizedStr = str.replace(/\./g, '-').replace(/\//g, '-');
  const fallbackDate = new Date(normalizedStr);
  if (!isNaN(fallbackDate.getTime())) {
    return fallbackDate.toISOString();
  }

  return null;
}

/**
 * Computes deterministic trade fingerprint for deduplication.
 */
export function generateTradeFingerprint(
  accountId: string,
  symbol: string,
  direction: string,
  entryTime: string,
  exitTime: string | null | undefined,
  entryPrice: number,
  exitPrice: number | null | undefined,
  quantity: number
): string {
  const normSymbol = (symbol || '').trim().toUpperCase();
  const normEntryMs = new Date(entryTime).getTime() || 0;
  const normExitMs = exitTime ? new Date(exitTime).getTime() || 'open' : 'open';
  const normEntryPrice = Number(entryPrice).toFixed(4);
  const normExitPrice = exitPrice !== null && exitPrice !== undefined ? Number(exitPrice).toFixed(4) : 'none';
  const normQty = Number(quantity).toFixed(4);

  return `${accountId}:${normSymbol}:${direction}:${normEntryMs}:${normExitMs}:${normEntryPrice}:${normExitPrice}:${normQty}`;
}

/**
 * Normalizes and validates a single CSV row using the selected ColumnMapping.
 */
export function normalizeCsvRow(
  rawRow: Record<string, string>,
  mapping: ColumnMapping,
  tradingAccountId: string,
  index: number
): ValidatedImportRow {
  const errors: string[] = [];

  const rawSymbol = mapping.symbol ? rawRow[mapping.symbol] : undefined;
  const rawDirection = mapping.direction ? rawRow[mapping.direction] : undefined;
  const rawEntryTime = mapping.entry_time ? rawRow[mapping.entry_time] : undefined;
  const rawExitTime = mapping.exit_time ? rawRow[mapping.exit_time] : undefined;
  const rawEntryPrice = mapping.entry_price ? rawRow[mapping.entry_price] : undefined;
  const rawExitPrice = mapping.exit_price ? rawRow[mapping.exit_price] : undefined;
  const rawQuantity = mapping.quantity ? rawRow[mapping.quantity] : undefined;
  const rawStopLoss = mapping.stop_loss ? rawRow[mapping.stop_loss] : undefined;
  const rawTakeProfit = mapping.take_profit ? rawRow[mapping.take_profit] : undefined;
  const rawCommission = mapping.commission ? rawRow[mapping.commission] : undefined;
  const rawFees = mapping.fees ? rawRow[mapping.fees] : undefined;
  const rawSwap = mapping.swap ? rawRow[mapping.swap] : undefined;
  const rawRisk = mapping.risk_amount ? rawRow[mapping.risk_amount] : undefined;
  const rawNotes = mapping.notes ? rawRow[mapping.notes] : undefined;

  // 1. Symbol
  const symbol = rawSymbol ? rawSymbol.trim().toUpperCase() : '';
  if (!symbol) {
    errors.push('Symbol is required');
  }

  // 2. Direction
  const direction = parseDirection(rawDirection);
  if (!direction) {
    errors.push(`Invalid or unmapped direction: "${rawDirection ?? 'missing'}"`);
  }

  // 3. Entry time
  const entryTimeIso = parseDateTime(rawEntryTime);
  if (!entryTimeIso) {
    errors.push(`Invalid or missing entry time: "${rawEntryTime ?? 'missing'}"`);
  }

  // 4. Exit time
  const exitTimeIso = rawExitTime ? parseDateTime(rawExitTime) : null;
  if (rawExitTime && !exitTimeIso) {
    errors.push(`Invalid exit time format: "${rawExitTime}"`);
  }

  // 5. Entry price
  const entryPrice = parseDecimal(rawEntryPrice);
  if (entryPrice === null || entryPrice <= 0) {
    errors.push(`Entry price must be greater than 0 (got: ${rawEntryPrice ?? 'missing'})`);
  }

  // 6. Exit price
  const exitPrice = parseDecimal(rawExitPrice);
  if (rawExitPrice && (exitPrice === null || exitPrice <= 0)) {
    errors.push(`Exit price must be greater than 0 if provided (got: ${rawExitPrice})`);
  }

  // 7. Quantity
  const quantity = parseDecimal(rawQuantity);
  if (quantity === null || quantity <= 0) {
    errors.push(`Quantity must be greater than 0 (got: ${rawQuantity ?? 'missing'})`);
  }

  // Chronological verification: exit cannot precede entry
  if (entryTimeIso && exitTimeIso) {
    if (new Date(exitTimeIso).getTime() < new Date(entryTimeIso).getTime()) {
      errors.push('Exit time cannot be before entry time');
    }
  }

  // Numerical optionals
  const stopLoss = parseDecimal(rawStopLoss);
  const takeProfit = parseDecimal(rawTakeProfit);
  const commission = parseDecimal(rawCommission) ?? 0;
  const fees = parseDecimal(rawFees) ?? 0;
  const swap = parseDecimal(rawSwap) ?? 0;
  const riskAmount = parseDecimal(rawRisk);

  if (commission < 0) errors.push('Commission cannot be negative');
  if (fees < 0) errors.push('Fees cannot be negative');
  if (riskAmount !== null && riskAmount < 0) errors.push('Risk amount cannot be negative');

  const status: TradeStatus = exitPrice !== null && exitTimeIso !== null ? 'closed' : 'open';

  // Calculate metrics if valid
  let grossPnL = 0;
  let netPnL = 0;
  let rMultiple: number | null = null;

  if (direction && entryPrice && quantity) {
    const metrics = calculateTradeMetrics({
      symbol,
      direction,
      entry_price: entryPrice,
      exit_price: exitPrice,
      quantity,
      commission,
      fees,
      swap,
      risk_amount: riskAmount,
      usdJpyRate: undefined
    });
    grossPnL = metrics.gross_pnl;
    netPnL = metrics.net_pnl;
    rMultiple = metrics.r_multiple;
  }

  const fingerprint = generateTradeFingerprint(
    tradingAccountId,
    symbol,
    direction || 'unknown',
    entryTimeIso || '',
    exitTimeIso,
    entryPrice || 0,
    exitPrice,
    quantity || 0
  );

  const isValid = errors.length === 0;

  return {
    index,
    raw: rawRow,
    status: isValid ? 'valid' : 'invalid',
    errors,
    fingerprint,
    data: isValid
      ? {
          symbol,
          direction: direction!,
          entry_time: entryTimeIso!,
          exit_time: exitTimeIso,
          entry_price: entryPrice!,
          exit_price: exitPrice,
          quantity: quantity!,
          stop_loss: stopLoss,
          take_profit: takeProfit,
          commission,
          fees,
          swap,
          risk_amount: riskAmount,
          status,
          notes: rawNotes ? rawNotes.trim() : null,
          gross_pnl: grossPnL,
          net_pnl: netPnL,
          r_multiple: rMultiple,
        }
      : null,
  };
}
