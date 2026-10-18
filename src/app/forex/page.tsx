import React from 'react';
import { PageHeader } from '@/src/components/ui/page-header';
import { ForexConfirmationTable } from '@/src/components/forex/forex-confirmation-table';
import { Compass, ExternalLink, Activity } from 'lucide-react';

export function ForexConfirmationPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        category="Market Context"
        title="Forex Market Confirmation"
        description="Multi-timeframe confirmation table for 8 major and cross pairs: ADR volatility targets, institutional session highs/lows, liquidity sweeps, and H1/M15 directional alignment via Twelve Data API."
      />

      <ForexConfirmationTable />
    </div>
  );
}
