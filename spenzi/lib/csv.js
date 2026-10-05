const NEEDS_GUARD = /^[=+\-@\t\r]/

/** Escape one CSV cell (RFC 4180) and neutralise spreadsheet formula injection. */
export function csvCell(value, { numeric = false } = {}) {
  if (value === null || value === undefined) return ''
  let s = String(value)
  if (!numeric && NEEDS_GUARD.test(s)) s = `'${s}`
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

/** columns: [{ header, value: (row) => any, numeric?: boolean }] */
export function toCSV(rows, columns) {
  const lines = [columns.map((c) => csvCell(c.header)).join(',')]
  for (const row of rows) {
    lines.push(columns.map((c) => csvCell(c.value(row), { numeric: c.numeric })).join(','))
  }
  return '﻿' + lines.join('\r\n') // BOM so Excel reads UTF-8 (₹, €) correctly
}

export function downloadCSV(filename, text) {
  const url = URL.createObjectURL(new Blob([text], { type: 'text/csv;charset=utf-8' }))
  const a = Object.assign(document.createElement('a'), { href: url, download: filename })
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
