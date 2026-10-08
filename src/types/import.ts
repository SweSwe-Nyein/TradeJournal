import type { TradeDirection, TradeStatus } from './trade';

export type StandardFieldKey =
  | 'symbol'
  | 'direction'
  | 'entry_time'
  | 'exit_time'
  | 'entry_price'
  | 'exit_price'
  | 'quantity'
  | 'stop_loss'
  | 'take_profit'
  | 'commission'
  | 'fees'
  | 'swap'
  | 'risk_amount'
  | 'notes';

export interface FieldDefinition {
  key: StandardFieldKey;
  label: string;
  required: boolean;
  description: string;
}

export type ColumnMapping = Record<StandardFieldKey, string | null>;

export interface ParsedCsvResult {
  headers: string[];
  rows: Record<string, string>[];
  totalRows: number;
  fileName: string;
  fileSizeBytes: number;
}

export type ImportRowStatus = 'valid' | 'invalid' | 'duplicate';

export interface ValidatedImportRow {
  index: number;
  raw: Record<string, string>;
  status: ImportRowStatus;
  errors: string[];
  fingerprint: string;
  data: {
    symbol: string;
    direction: TradeDirection;
    entry_time: string;
    exit_time: string | null;
    entry_price: number;
    exit_price: number | null;
    quantity: number;
    stop_loss: number | null;
    take_profit: number | null;
    commission: number;
    fees: number;
    swap: number;
    risk_amount: number | null;
    status: TradeStatus;
    notes: string | null;
    gross_pnl: number;
    net_pnl: number;
    r_multiple: number | null;
  } | null;
}

export interface ImportResultSummary {
  totalRows: number;
  importedCount: number;
  skippedDuplicatesCount: number;
  invalidCount: number;
  failedCount: number;
  errors: { row: number; symbol?: string; message: string }[];
  importedTradeIds: string[];
}
