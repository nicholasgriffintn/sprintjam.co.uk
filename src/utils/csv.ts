export const downloadCsv = (filename: string, csv = '') => {
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
};

export const csvEscape = (value: unknown) => {
  return `"${String(value ?? '').replace(/"/g, '""')}"`;
};
