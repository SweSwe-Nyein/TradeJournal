import type {
  StandardFieldKey,
  FieldDefinition,
  ColumnMapping,
} from '@/src/types/import';

export const STANDARD_FIELDS: FieldDefinition[] = [
  {
    key: 'symbol',
    label: 'Symbol / Ticker',
    required: true,
    description: 'Ticker symbol (e.g. NQ, ES, AAPL, EURUSD, BTCUSDT)',
  },
  {
    key: 'direction',
    label: 'Direction / Side',
    required: true,
    description: 'Order direction (BUY / SELL, LONG / SHORT)',
  },
  {
    key: 'entry_time',
    label: 'Entry Time',
    required: true,
    description: 'Execution timestamp when position was opened',
  },
  {
    key: 'exit_time',
    label: 'Exit Time',
    required: false,
    description: 'Execution timestamp when position was closed',
  },
  {
    key: 'entry_price',
    label: 'Entry Price',
    required: true,
    description: 'Average fill price when position was entered',
  },
  {
    key: 'exit_price',
    label: 'Exit Price',
    required: false,
    description: 'Average fill price when position was closed',
  },
  {
    key: 'quantity',
    label: 'Quantity / Size',
    required: true,
    description: 'Number of shares, contracts, or units traded',
  },
  {
    key: 'stop_loss',
    label: 'Stop Loss',
    required: false,
    description: 'Initial planned stop price level',
  },
  {
    key: 'take_profit',
    label: 'Take Profit',
    required: false,
    description: 'Initial planned target price level',
  },
  {
    key: 'commission',
    label: 'Commission',
    required: false,
    description: 'Broker execution commission paid',
  },
  {
    key: 'fees',
    label: 'Exchange Fees',
    required: false,
    description: 'Regulatory and exchange transaction fees',
  },
  {
    key: 'swap',
    label: 'Swap / Financing',
    required: false,
    description: 'Overnight interest or carry fees',
  },
  {
    key: 'risk_amount',
    label: 'Risk Amount ($)',
    required: false,
    description: 'Planned dollar risk for R-multiple tracking',
  },
  {
    key: 'notes',
    label: 'Notes / Setup',
    required: false,
    description: 'Trade rationale, tags, or execution comments',
  },
];

/**
 * Common synonym dictionary for broker export headers
 */
const FIELD_SYNONYMS: Record<StandardFieldKey, string[]> = {
  symbol: [
    'symbol',
    'ticker',
    'instrument',
    'contract',
    'security',
    'asset',
    'pair',
    'market',
    'product',
    'underlying',
  ],
  direction: [
    'direction',
    'side',
    'type',
    'action',
    'order type',
    'pos type',
    'position type',
    'b/s',
    'buy/sell',
    'trade type',
  ],
  entry_time: [
    'entry time',
    'entry_time',
    'open time',
    'opened',
    'open date',
    'entry date',
    'date',
    'time',
    'datetime',
    'date/time',
    'fill time',
    'executed at',
    'entry timestamp',
  ],
  exit_time: [
    'exit time',
    'exit_time',
    'close time',
    'closed',
    'close date',
    'exit date',
    'exit timestamp',
    'closed at',
  ],
  entry_price: [
    'entry price',
    'open price',
    'entry',
    'price',
    'avg open price',
    'open',
    'buy price',
    'execution price',
    'fill price',
    'in price',
  ],
  exit_price: [
    'exit price',
    'close price',
    'exit',
    'close',
    'avg close price',
    'sell price',
    'closing price',
    'out price',
  ],
  quantity: [
    'quantity',
    'qty',
    'size',
    'volume',
    'contracts',
    'shares',
    'lots',
    'amount',
    'vol',
    'filled qty',
  ],
  stop_loss: [
    'stop loss',
    'stop_loss',
    'sl',
    'stop',
    'stop price',
    'initial stop',
  ],
  take_profit: [
    'take profit',
    'take_profit',
    'tp',
    'target',
    'profit target',
    'limit price',
  ],
  commission: [
    'commission',
    'comm',
    'commissions',
    'brokerage',
    'broker fee',
  ],
  fees: [
    'fees',
    'fee',
    'exchange fees',
    'sec fee',
    'regulatory fees',
    'other fees',
    'trans fees',
  ],
  swap: [
    'swap',
    'financing',
    'overnight fee',
    'rollover',
    'storage',
  ],
  risk_amount: [
    'risk amount',
    'risk',
    'risk ($)',
    'initial risk',
    '1r',
    'dollar risk',
    'planned risk',
  ],
  notes: [
    'notes',
    'note',
    'comment',
    'comments',
    'memo',
    'strategy',
    'setup',
    'tags',
    'tag',
  ],
};

function normalizeHeaderString(h: string): string {
  return h
    .toLowerCase()
    .replace(/[_\-\/\\]/g, ' ')
    .replace(/[^\w\s]/g, '')
    .trim();
}

/**
 * Automatically inspects the raw CSV headers and selects the highest-confidence matching column for each field.
 */
export function autoDetectColumnMapping(headers: string[]): ColumnMapping {
  const mapping: ColumnMapping = {
    symbol: null,
    direction: null,
    entry_time: null,
    exit_time: null,
    entry_price: null,
    exit_price: null,
    quantity: null,
    stop_loss: null,
    take_profit: null,
    commission: null,
    fees: null,
    swap: null,
    risk_amount: null,
    notes: null,
  };

  const normalizedHeaders = headers.map((h) => ({
    original: h,
    normalized: normalizeHeaderString(h),
  }));

  const usedOriginals = new Set<string>();

  // Pass 1: Exact matches or prominent synonyms
  for (const field of STANDARD_FIELDS) {
    const synonyms = FIELD_SYNONYMS[field.key] || [];

    for (const syn of synonyms) {
      const match = normalizedHeaders.find(
        (nh) => !usedOriginals.has(nh.original) && nh.normalized === syn
      );
      if (match) {
        mapping[field.key] = match.original;
        usedOriginals.add(match.original);
        break;
      }
    }
  }

  // Pass 2: Fuzzy includes for still-unmapped fields
  for (const field of STANDARD_FIELDS) {
    if (mapping[field.key]) continue;

    const synonyms = FIELD_SYNONYMS[field.key] || [];
    for (const syn of synonyms) {
      const match = normalizedHeaders.find(
        (nh) => !usedOriginals.has(nh.original) && nh.normalized.includes(syn)
      );
      if (match) {
        mapping[field.key] = match.original;
        usedOriginals.add(match.original);
        break;
      }
    }
  }

  return mapping;
}
