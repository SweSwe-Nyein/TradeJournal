import { describe, it, expect } from 'vitest';
import { tradeFormSchema } from '@/src/lib/validation/trade';

describe('Trade Zod Validation Schema', () => {
  const validBaseTrade = {
    trading_account_id: '123e4567-e89b-12d3-a456-426614174000',
    symbol: 'NQ',
    direction: 'long' as const,
    entry_time: '2026-10-07T09:30:00Z',
    exit_time: '2026-10-07T10:15:00Z',
    entry_price: 18500.25,
    exit_price: 18545.5,
    quantity: 2,
    stop_loss: 18480,
    take_profit: 18560,
    commission: 4.5,
    fees: 1.25,
    swap: 0,
    risk_amount: 40.5,
    status: 'closed' as const,
    notes: 'Opening range breakout entry',
  };

  it('validates a complete, valid closed trade', () => {
    const result = tradeFormSchema.safeParse(validBaseTrade);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.symbol).toBe('NQ'); // transformed uppercase
      expect(result.data.direction).toBe('long');
    }
  });

  it('rejects an empty symbol', () => {
    const result = tradeFormSchema.safeParse({
      ...validBaseTrade,
      symbol: '   ',
    });
    expect(result.success).toBe(false);
  });

  it('rejects an invalid direction', () => {
    const result = tradeFormSchema.safeParse({
      ...validBaseTrade,
      direction: 'sideways',
    });
    expect(result.success).toBe(false);
  });

  it('rejects non-positive entry price', () => {
    const resultZero = tradeFormSchema.safeParse({
      ...validBaseTrade,
      entry_price: 0,
    });
    expect(resultZero.success).toBe(false);

    const resultNegative = tradeFormSchema.safeParse({
      ...validBaseTrade,
      entry_price: -150,
    });
    expect(resultNegative.success).toBe(false);
  });

  it('rejects non-positive exit price for closed trade', () => {
    const result = tradeFormSchema.safeParse({
      ...validBaseTrade,
      exit_price: 0,
    });
    expect(result.success).toBe(false);
  });

  it('rejects non-positive quantity', () => {
    const result = tradeFormSchema.safeParse({
      ...validBaseTrade,
      quantity: 0,
    });
    expect(result.success).toBe(false);
  });

  it('rejects negative fees and commission', () => {
    const resultComm = tradeFormSchema.safeParse({
      ...validBaseTrade,
      commission: -5,
    });
    expect(resultComm.success).toBe(false);

    const resultFees = tradeFormSchema.safeParse({
      ...validBaseTrade,
      fees: -2,
    });
    expect(resultFees.success).toBe(false);
  });

  it('rejects negative risk amount', () => {
    const result = tradeFormSchema.safeParse({
      ...validBaseTrade,
      risk_amount: -100,
    });
    expect(result.success).toBe(false);
  });

  it('rejects when exit time is before entry time', () => {
    const result = tradeFormSchema.safeParse({
      ...validBaseTrade,
      entry_time: '2026-10-07T10:00:00Z',
      exit_time: '2026-10-07T09:00:00Z', // 1 hour earlier
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe('Exit time cannot be before entry time');
    }
  });

  it('allows open trades without exit time or exit price', () => {
    const openTrade = {
      trading_account_id: '123e4567-e89b-12d3-a456-426614174000',
      symbol: 'ES',
      direction: 'short' as const,
      entry_time: '2026-10-07T14:00:00Z',
      exit_time: null,
      entry_price: 5800.5,
      exit_price: null,
      quantity: 1,
      stop_loss: 5815,
      take_profit: 5770,
      commission: 2.5,
      fees: 0.5,
      swap: 0,
      risk_amount: 14.5,
      status: 'open' as const,
    };

    const result = tradeFormSchema.safeParse(openTrade);
    expect(result.success).toBe(true);
  });
});
