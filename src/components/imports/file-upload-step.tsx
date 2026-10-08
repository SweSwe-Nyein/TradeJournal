import React, { useState, useRef } from 'react';
import { Upload, FileSpreadsheet, Download, AlertCircle, CheckCircle2, ArrowRight } from 'lucide-react';
import { Button } from '@/src/components/ui/button';
import { Card, CardContent } from '@/src/components/ui/card';
import { parseCsvFile } from '@/src/lib/imports/parser';
import { downloadSampleCsvFile } from '@/src/lib/imports/sample-csv';
import type { ParsedCsvResult } from '@/src/types/import';

interface FileUploadStepProps {
  onFileParsed: (result: ParsedCsvResult, file: File) => void;
}

export function FileUploadStep({ onFileParsed }: FileUploadStepProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);
  const [isParsing, setIsParsing] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [parsedPreview, setParsedPreview] = useState<ParsedCsvResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  const handleProcessFile = async (file: File) => {
    setParseError(null);

    if (!file.name.toLowerCase().endsWith('.csv') && file.type !== 'text/csv' && file.type !== 'application/vnd.ms-excel') {
      setParseError('Unsupported format. Please select a valid .csv file.');
      return;
    }

    setIsParsing(true);
    try {
      const result = await parseCsvFile(file);
      if (result.totalRows === 0) {
        setParseError('The uploaded CSV file contains no data rows.');
        setIsParsing(false);
        return;
      }
      setSelectedFile(file);
      setParsedPreview(result);
    } catch (err: unknown) {
      setParseError(err instanceof Error ? err.message : 'Failed to parse CSV file.');
    } finally {
      setIsParsing(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleProcessFile(e.dataTransfer.files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleProceed = () => {
    if (parsedPreview && selectedFile) {
      onFileParsed(parsedPreview, selectedFile);
    }
  };

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      {/* Upload Zone */}
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={() => fileInputRef.current?.click()}
        className={`border-2 border-dashed rounded-lg p-10 flex flex-col items-center justify-center text-center cursor-pointer transition-colors ${
          isDragging
            ? 'border-emerald-500 bg-emerald-950/20'
            : 'border-zinc-800 hover:border-zinc-700 bg-zinc-950/40'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv,text/csv,application/vnd.ms-excel"
          className="hidden"
          onChange={(e) => {
            if (e.target.files && e.target.files[0]) {
              handleProcessFile(e.target.files[0]);
            }
          }}
        />

        <div className="w-12 h-12 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center text-emerald-400 mb-4 shadow-sm">
          <Upload className="w-6 h-6" />
        </div>

        <h3 className="text-sm font-semibold text-zinc-100">
          Drop your CSV trade file here, or browse
        </h3>
        <p className="text-xs text-zinc-400 mt-1 max-w-sm leading-relaxed">
          Supports statements exported from Tradovate, Interactive Brokers, NinjaTrader, MetaTrader, ThinkOrSwim, Bybit, Binance, and custom CSVs.
        </p>

        <Button
          type="button"
          variant="outline"
          size="sm"
          className="mt-5 text-xs gap-1.5"
          onClick={(e) => {
            e.stopPropagation();
            fileInputRef.current?.click();
          }}
        >
          <FileSpreadsheet className="w-3.5 h-3.5 text-zinc-400" />
          <span>Browse File</span>
        </Button>
      </div>

      {/* Parse Error Notification */}
      {parseError && (
        <div className="p-3.5 rounded-md bg-red-950/60 border border-red-800/80 text-xs text-red-200 flex items-center gap-2.5 animate-in fade-in-0">
          <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
          <span>{parseError}</span>
        </div>
      )}

      {/* Selected File Details Card */}
      {parsedPreview && selectedFile && (
        <Card className="border-zinc-700 bg-zinc-900/60">
          <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-9 h-9 rounded bg-zinc-800 border border-zinc-700 flex items-center justify-center text-emerald-400 shrink-0">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-zinc-100 truncate">
                  {selectedFile.name}
                </p>
                <p className="text-[11px] font-mono text-zinc-400 mt-0.5">
                  {formatFileSize(selectedFile.size)} · {parsedPreview.totalRows.toLocaleString()} detected rows · {parsedPreview.headers.length} columns
                </p>
              </div>
            </div>

            <Button
              type="button"
              size="sm"
              onClick={handleProceed}
              className="gap-2 text-xs shrink-0"
              disabled={isParsing}
            >
              <span>Continue to Mapping</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Sample Template Callout */}
      <div className="p-4 rounded-lg bg-zinc-900/30 border border-zinc-850 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
        <div>
          <p className="font-medium text-zinc-200">Need a sample CSV format?</p>
          <p className="text-[11px] text-zinc-400 mt-0.5">
            Download our standard CSV template with sample executions and header naming conventions.
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => downloadSampleCsvFile()}
          className="gap-1.5 text-xs shrink-0"
        >
          <Download className="w-3.5 h-3.5 text-emerald-400" />
          <span>Download Sample CSV</span>
        </Button>
      </div>
    </div>
  );
}
