import { z } from 'zod';

export const tradeDirectionEnum = z.enum(['long', 'short']);
export const tradeStatusEnum = z.enum(['open', 'closed']);

export const tradeFormSchema = z
  .object({
    trading_account_id: z
      .string()
      .trim()
      .min(1, 'Trading account selection is required'),
    symbol: z
      .string()
      .trim()
      .min(1, 'Symbol is required')
      .max(20, 'Symbol cannot exceed 20 characters')
      .transform((val) => val.toUpperCase()),
    direction: tradeDirectionEnum,
    entry_time: z
      .string()
      .min(1, 'Entry time is required')
      .refine((val) => !isNaN(new Date(val).getTime()), {
        message: 'Entry time must be a valid date/time',
      }),
    exit_time: z
      .string()
      .optional()
      .nullable()
      .refine((val) => !val || !isNaN(new Date(val).getTime()), {
        message: 'Exit time must be a valid date/time',
      }),
    entry_price: z
      .number()
      .positive('Entry price must be greater than 0'),
    exit_price: z
      .number()
      .positive('Exit price must be greater than 0')
      .optional()
      .nullable(),
    quantity: z
      .number()
      .positive('Quantity must be greater than 0'),
    stop_loss: z
      .number()
      .positive('Stop loss must be greater than 0')
      .optional()
      .nullable(),
    take_profit: z
      .number()
      .positive('Take profit must be greater than 0')
      .optional()
      .nullable(),
    commission: z
      .number()
      .min(0, 'Commission cannot be negative')
      .default(0),
    fees: z
      .number()
      .min(0, 'Fees cannot be negative')
      .default(0),
    swap: z
      .number()
      .default(0),
    risk_amount: z
      .number()
      .min(0, 'Risk amount cannot be negative')
      .optional()
      .nullable(),
    status: tradeStatusEnum.default('closed'),
    strategy: z
      .string()
      .trim()
      .max(100, 'Strategy cannot exceed 100 characters')
      .optional()
      .nullable(),
    strategies: z
      .array(z.string().trim().min(1))
      .optional()
      .default([]),
    strategy_ids: z
      .array(z.string().trim().min(1))
      .optional()
      .default([]),
    tags: z
      .array(z.string().trim().min(1))
      .optional()
      .default([]),
    tag_ids: z
      .array(z.string().trim().min(1))
      .optional()
      .default([]),
    mistakes: z
      .array(z.string().trim().min(1))
      .optional()
      .default([]),
    mistake_ids: z
      .array(z.string().trim().min(1))
      .optional()
      .default([]),
    notes: z
      .string()
      .max(2000, 'Notes cannot exceed 2000 characters')
      .optional()
      .nullable(),
  })
  .refine(
    (data) => {
      if (data.exit_time && data.entry_time) {
        const entry = new Date(data.entry_time).getTime();
        const exit = new Date(data.exit_time).getTime();
        if (!isNaN(entry) && !isNaN(exit) && exit < entry) {
          return false;
        }
      }
      return true;
    },
    {
      message: 'Exit time cannot be before entry time',
      path: ['exit_time'],
    }
  )
  .refine(
    (data) => {
      if (data.status === 'closed') {
        if (data.exit_price === null || data.exit_price === undefined || data.exit_price <= 0) {
          return false;
        }
      }
      return true;
    },
    {
      message: 'Exit price is required for closed trades',
      path: ['exit_price'],
    }
  );

export type TradeFormInput = z.input<typeof tradeFormSchema>;
export type TradeFormData = z.output<typeof tradeFormSchema>;
