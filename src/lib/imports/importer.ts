import { TradeService } from '@/src/lib/services/trade-service';
import { tradeFormSchema } from '@/src/lib/validation/trade';
import type { ValidatedImportRow, ImportResultSummary } from '@/src/types/import';

export interface ExecuteImportOptions {
  skipDuplicates?: boolean;
}

/**
 * Executes the validated import transaction.
 * Re-validates every row with tradeFormSchema before inserting.
 * Strictly prevents duplicates and respects account and user ownership.
 */
export async function executeTradeImport(
  userId: string,
  tradingAccountId: string,
  rows: ValidatedImportRow[],
  options: ExecuteImportOptions = { skipDuplicates: true }
): Promise<ImportResultSummary> {
  const result: ImportResultSummary = {
    totalRows: rows.length,
    importedCount: 0,
    skippedDuplicatesCount: 0,
    invalidCount: 0,
    failedCount: 0,
    errors: [],
    importedTradeIds: [],
  };

  if (!userId) {
    result.errors.push({ row: 0, message: 'User must be authenticated to import trades.' });
    return result;
  }

  if (!tradingAccountId) {
    result.errors.push({ row: 0, message: 'A target trading account must be selected.' });
    return result;
  }

  const skipDuplicates = options.skipDuplicates !== false;

  for (const item of rows) {
    // 1. Skip duplicate rows if flagged
    if (item.status === 'duplicate') {
      if (skipDuplicates) {
        result.skippedDuplicatesCount++;
        continue;
      }
    }

    // 2. Skip invalid rows
    if (item.status === 'invalid' || !item.data) {
      result.invalidCount++;
      result.errors.push({
        row: item.index + 1,
        symbol: item.raw.Symbol || item.raw.symbol || 'N/A',
        message: item.errors.join(', ') || 'Invalid trade record.',
      });
      continue;
    }

    // 3. Re-validate row data strictly against Zod tradeFormSchema
    const schemaValidation = tradeFormSchema.safeParse({
      trading_account_id: tradingAccountId,
      symbol: item.data.symbol,
      direction: item.data.direction,
      entry_time: item.data.entry_time,
      exit_time: item.data.exit_time,
      entry_price: item.data.entry_price,
      exit_price: item.data.exit_price,
      quantity: item.data.quantity,
      stop_loss: item.data.stop_loss,
      take_profit: item.data.take_profit,
      commission: item.data.commission,
      fees: item.data.fees,
      swap: item.data.swap,
      risk_amount: item.data.risk_amount,
      status: item.data.status,
      notes: item.data.notes,
    });

    if (!schemaValidation.success) {
      result.invalidCount++;
      const zErrors = schemaValidation.error.issues.map((i) => i.message).join(', ');
      result.errors.push({
        row: item.index + 1,
        symbol: item.data.symbol,
        message: zErrors,
      });
      continue;
    }

    // 4. Perform insert via TradeService
    try {
      const { data: createdTrade, error: insertError } = await TradeService.createTrade(
        userId,
        {
          trading_account_id: tradingAccountId,
          symbol: schemaValidation.data.symbol,
          direction: schemaValidation.data.direction,
          entry_time: schemaValidation.data.entry_time,
          exit_time: schemaValidation.data.exit_time || null,
          entry_price: schemaValidation.data.entry_price,
          exit_price: schemaValidation.data.exit_price || null,
          quantity: schemaValidation.data.quantity,
          stop_loss: schemaValidation.data.stop_loss || null,
          take_profit: schemaValidation.data.take_profit || null,
          commission: schemaValidation.data.commission ?? 0,
          fees: schemaValidation.data.fees ?? 0,
          swap: schemaValidation.data.swap ?? 0,
          risk_amount: schemaValidation.data.risk_amount || null,
          status: schemaValidation.data.status,
          notes: schemaValidation.data.notes || null,
        }
      );

      if (insertError || !createdTrade) {
        result.failedCount++;
        result.errors.push({
          row: item.index + 1,
          symbol: item.data.symbol,
          message: insertError?.message || 'Database insert failed.',
        });
      } else {
        result.importedCount++;
        result.importedTradeIds.push(createdTrade.id);
      }
    } catch (err: unknown) {
      result.failedCount++;
      const message = err instanceof Error ? err.message : 'Execution error during insert';
      result.errors.push({
        row: item.index + 1,
        symbol: item.data.symbol,
        message,
      });
    }
  }

  return result;
}
