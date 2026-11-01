type Cell = string | number | null | undefined;

const escape = (v: Cell) => {
  const s = v == null ? "" : String(v);
  // Neutralise spreadsheet formula injection, then quote if needed.
  const safe = /^[=+\-@]/.test(s) && !/^-?\d/.test(s) ? `'${s}` : s;
  return /[",\n]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
};

/** CSV with a BOM so Excel opens Turkish characters correctly. */
export function toCsv(rows: Cell[][]) {
  return "﻿" + rows.map((r) => r.map(escape).join(",")).join("\r\n");
}
