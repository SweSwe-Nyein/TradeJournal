import React, { useState } from 'react';
import { STANDARD_FIELDS } from '@/src/lib/imports/mapping';
import type { ColumnMapping, ParsedCsvResult, StandardFieldKey } from '@/src/types/import';
import { Button } from '@/src/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/src/components/ui/card';
import { ArrowLeft, ArrowRight, AlertCircle, CheckCircle2, Sliders } from 'lucide-react';

interface ColumnMappingStepProps {
  parsedCsv: ParsedCsvResult;
  initialMapping: ColumnMapping;
  onConfirmMapping: (mapping: ColumnMapping) => void;
  onBack: () => void;
}

export function ColumnMappingStep({
  parsedCsv,
  initialMapping,
  onConfirmMapping,
  onBack,
}: ColumnMappingStepProps) {
  const [mapping, setMapping] = useState<ColumnMapping>(initialMapping);

  const handleSelectColumn = (key: StandardFieldKey, value: string) => {
    setMapping((prev) => ({
      ...prev,
      [key]: value === '__NONE__' ? null : value,
    }));
  };

  // Verify that all required fields have a mapping selected
  const missingRequired = STANDARD_FIELDS.filter(
    (f) => f.required && !mapping[f.key]
  );
  const isValid = missingRequired.length === 0;

  // First data row preview for sample values
  const sampleRow = parsedCsv.rows[0] || {};

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <Card>
        <CardHeader className="pb-4 border-b border-zinc-850">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <CardTitle className="text-base font-semibold text-zinc-100 flex items-center gap-2">
                <Sliders className="w-4 h-4 text-emerald-400" />
                <span>Map CSV Headers to Trade Fields</span>
              </CardTitle>
              <CardDescription className="text-xs text-zinc-400 mt-1">
                We detected headers automatically. Adjust any mismatched columns below to align with your broker format.
              </CardDescription>
            </div>
            <div className="text-xs font-mono text-zinc-400">
              CSV Headers: <span className="text-zinc-200">{parsedCsv.headers.length} detected</span>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0 divide-y divide-zinc-850/60">
          {STANDARD_FIELDS.map((field) => {
            const mappedHeader = mapping[field.key] || '';
            const sampleValue = mappedHeader ? sampleRow[mappedHeader] : undefined;

            return (
              <div
                key={field.key}
                className="p-3.5 sm:px-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-zinc-900/30 transition-colors"
              >
                {/* Field Label and Description */}
                <div className="sm:w-1/2 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-zinc-200">
                      {field.label}
                    </span>
                    {field.required ? (
                      <span className="text-[10px] font-mono font-medium text-rose-400 bg-rose-950/50 border border-rose-800/60 px-1.5 py-0.2 rounded">
                        Required
                      </span>
                    ) : (
                      <span className="text-[10px] font-mono text-zinc-400">
                        Optional
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-zinc-400 truncate mt-0.5">
                    {field.description}
                  </p>
                </div>

                {/* Dropdown & Sample Preview */}
                <div className="sm:w-1/2 flex items-center gap-3 justify-end">
                  {sampleValue !== undefined && sampleValue !== '' && (
                    <div className="hidden lg:block text-right min-w-0 max-w-[140px] truncate">
                      <span className="text-[10px] text-zinc-400 font-mono block">Sample:</span>
                      <span className="text-xs font-mono text-zinc-300 truncate block">
                        {sampleValue}
                      </span>
                    </div>
                  )}

                  <select
                    value={mappedHeader || '__NONE__'}
                    onChange={(e) => handleSelectColumn(field.key, e.target.value)}
                    className={`h-8 w-full sm:w-56 text-xs rounded border bg-zinc-900 px-2.5 py-1 text-zinc-200 focus:outline-none focus:ring-1 focus:ring-zinc-600 ${
                      field.required && !mappedHeader
                        ? 'border-rose-800 bg-rose-950/20 text-rose-300'
                        : 'border-zinc-800'
                    }`}
                  >
                    <option value="__NONE__" className="text-zinc-500">
                      — Not Mapped —
                    </option>
                    {parsedCsv.headers.map((h) => (
                      <option key={h} value={h} className="text-zinc-200 bg-zinc-900">
                        {h}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* Validation Banner if missing required fields */}
      {!isValid && (
        <div className="p-3.5 rounded-md bg-amber-950/60 border border-amber-800/80 text-xs text-amber-200 flex items-start gap-2.5">
          <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold">Missing Required Mappings</p>
            <p className="text-[11px] text-amber-300/80 mt-0.5">
              Please map columns for:{' '}
              <span className="font-mono text-amber-200">
                {missingRequired.map((f) => f.label).join(', ')}
              </span>
            </p>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex items-center justify-between pt-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onBack}
          className="gap-2 text-xs"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Upload</span>
        </Button>

        <Button
          type="button"
          size="sm"
          disabled={!isValid}
          onClick={() => onConfirmMapping(mapping)}
          className="gap-2 text-xs"
        >
          <span>Preview Trades ({parsedCsv.totalRows.toLocaleString()})</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Button>
      </div>
    </div>
  );
}
