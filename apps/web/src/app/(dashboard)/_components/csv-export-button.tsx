'use client';

type CsvExportButtonProps = {
  filename: string;
  headers: string[];
  rows: Array<Array<string | number | null | undefined>>;
  className?: string;
  label?: string;
};

function escapeCell(value: string | number | null | undefined) {
  const text = String(value ?? '');
  if (/[,"]|\n/.test(text)) {
    return `"${text.replaceAll('"', '""')}"`;
  }
  return text;
}

export function CsvExportButton({ filename, headers, rows, className = 'btn', label = '导出 CSV' }: CsvExportButtonProps) {
  return (
    <button
      type="button"
      className={className}
      onClick={() => {
        const csv = [headers, ...rows].map((row) => row.map(escapeCell).join(',')).join('\n');
        const blob = new Blob([`﻿${csv}`], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        link.click();
        URL.revokeObjectURL(url);
      }}
    >
      {label}
    </button>
  );
}
