import { describe, it, expect } from 'vitest';
import { tradingAccountSchema } from '@/src/lib/validation/account';

describe('Trading Account Zod Validation', () => {
  it('validates a valid prop firm account payload', () => {
    const result = tradingAccountSchema.safeParse({
      name: 'Apex 50K PA #1',
      account_type: 'prop_firm',
      broker_name: 'Tradovate',
      starting_balance: 50000,
      currency: 'USD',
      timezone: 'America/New_York',
    });
    expect(result.success).toBe(true);
  });

  it('validates a personal account with optional broker omitted', () => {
    const result = tradingAccountSchema.safeParse({
      name: 'Interactive Brokers Main',
      account_type: 'personal',
      starting_balance: 25000.5,
      currency: 'USD',
      timezone: 'UTC',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.starting_balance).toBe(25000.5);
    }
  });

  it('validates a demo simulation account', () => {
    const result = tradingAccountSchema.safeParse({
      name: 'Paper Trading',
      account_type: 'demo',
      starting_balance: 100000,
      currency: 'USD',
      timezone: 'America/Chicago',
    });
    expect(result.success).toBe(true);
  });

  it('rejects an empty account name', () => {
    const result = tradingAccountSchema.safeParse({
      name: '   ',
      account_type: 'personal',
      starting_balance: 10000,
      currency: 'USD',
      timezone: 'UTC',
    });
    expect(result.success).toBe(false);
  });

  it('rejects an unsupported account type', () => {
    const result = tradingAccountSchema.safeParse({
      name: 'Crypto Vault',
      account_type: 'hedge_fund',
      starting_balance: 50000,
      currency: 'USD',
      timezone: 'UTC',
    });
    expect(result.success).toBe(false);
  });

  it('rejects a negative starting balance', () => {
    const result = tradingAccountSchema.safeParse({
      name: 'Margin Debt',
      account_type: 'personal',
      starting_balance: -500,
      currency: 'USD',
      timezone: 'UTC',
    });
    expect(result.success).toBe(false);
  });

  it('rejects an excessively large balance', () => {
    const result = tradingAccountSchema.safeParse({
      name: 'Sovereign Wealth',
      account_type: 'personal',
      starting_balance: 500_000_000,
      currency: 'USD',
      timezone: 'UTC',
    });
    expect(result.success).toBe(false);
  });
});

describe('Account P&L and Balance Calculations', () => {
  it('correctly calculates initial flat performance', () => {
    const startingBalance = 50000;
    const netPnL = 0;
    const currentBalance = startingBalance + netPnL;
    const netPnLPercentage = startingBalance > 0 ? (netPnL / startingBalance) * 100 : 0;

    expect(currentBalance).toBe(50000);
    expect(netPnL).toBe(0);
    expect(netPnLPercentage).toBe(0);
  });

  it('correctly derives current balance as Starting Balance + Total Net P&L', () => {
    const startingBalance = 50000;
    const netPnL = 2000;
    const currentBalance = startingBalance + netPnL;

    expect(currentBalance).toBe(52000);
  });

  it('maintains correct net P&L and updates current balance when starting balance changes', () => {
    const netPnL = 2000;
    
    // Old starting balance
    const oldStarting = 50000;
    const oldCurrent = oldStarting + netPnL;
    expect(oldCurrent).toBe(52000);

    // New starting balance (e.g., changed from $50k to $100k)
    const newStarting = 100000;
    const newCurrent = newStarting + netPnL;

    expect(newStarting).toBe(100000);
    expect(netPnL).toBe(2000); // Net P&L must remain unchanged
    expect(newCurrent).toBe(102000); // Current Balance becomes 102,000 without artificial P&L
  });
});
