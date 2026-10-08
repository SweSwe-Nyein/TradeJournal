import { z } from 'zod';

export const accountTypeEnum = z.enum(['personal', 'prop_firm', 'demo']);

export const tradingAccountSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'Account name is required')
    .max(60, 'Account name cannot exceed 60 characters'),
  account_type: accountTypeEnum,
  broker_name: z
    .string()
    .trim()
    .max(60, 'Broker name cannot exceed 60 characters')
    .optional()
    .or(z.literal('')),
  starting_balance: z
    .number()
    .min(0, 'Starting balance cannot be negative')
    .max(100_000_000, 'Starting balance cannot exceed 100,000,000'),
  currency: z
    .string()
    .min(3, 'Currency must be at least 3 characters')
    .max(5, 'Currency code too long'),
  timezone: z
    .string()
    .min(1, 'Timezone is required'),
  prop_firm_rules: z
    .object({
      profitTarget: z.number().optional(),
      maxDrawdown: z.number().optional(),
      dailyLossLimit: z.number().optional(),
      minTradingDays: z.number().optional(),
      consistencyTarget: z.number().optional(),
    })
    .optional(),
});

export type TradingAccountFormData = z.infer<typeof tradingAccountSchema>;
