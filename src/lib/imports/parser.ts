import Papa from 'papaparse';
import type { ParsedCsvResult } from '@/src/types/import';

/**
 * Parses raw CSV string or file content safely according to RFC 4180.
 * Handles quoted fields, inner commas, whitespace, BOM, and empty rows.
 */
export function parseCsvString(
  csvText: string,
  fileName: string = 'manual-upload.csv',
  fileSizeBytes: number = 0
): ParsedCsvResult {
  // Strip BOM if present
  let cleanText = csvText;
  if (cleanText.charCodeAt(0) === 0xfeff) {
    cleanText = cleanText.substring(1);
  }

  const parsed = Papa.parse<Record<string, string>>(cleanText, {
    header: true,
    skipEmptyLines: 'greedy',
    transformHeader: (header: string) => header.trim(),
    transform: (value: string) => value.trim(),
  });

  const headers = parsed.meta.fields || [];
  // Filter out completely empty rows
  const rows = parsed.data.filter((row) =>
    Object.values(row).some((val) => val !== undefined && val !== null && String(val).trim() !== '')
  );

  return {
    headers,
    rows,
    totalRows: rows.length,
    fileName,
    fileSizeBytes: fileSizeBytes || new Blob([csvText]).size,
  };
}

/**
 * Asynchronously parses a user-uploaded File object
 */
export function parseCsvFile(file: File): Promise<ParsedCsvResult> {
  return new Promise((resolve, reject) => {
    if (!file.name.toLowerCase().endsWith('.csv') && file.type !== 'text/csv' && file.type !== 'application/vnd.ms-excel') {
      return reject(new Error('Invalid file type: Please upload a .csv file.'));
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = (e.target?.result as string) || '';
        const result = parseCsvString(text, file.name, file.size);
        resolve(result);
      } catch (err) {
        reject(new Error(err instanceof Error ? err.message : 'Failed to parse CSV file.'));
      }
    };
    reader.onerror = () => {
      reject(new Error('Error reading the selected file.'));
    };
    reader.readAsText(file);
  });
}
