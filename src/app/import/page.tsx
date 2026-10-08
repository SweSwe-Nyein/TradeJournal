import React from 'react';
import { PageHeader } from '@/src/components/ui/page-header';
import { ImportWorkflow } from '@/src/components/imports/import-workflow';

export function ImportPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        category="Data Pipeline"
        title="CSV Trade Importer"
        description="Safely import trade records exported from your broker or execution platform with automated column mapping, normalization, and duplicate prevention."
      />

      <ImportWorkflow />
    </div>
  );
}
