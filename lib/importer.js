'use strict';
const { parse } = require('csv-parse/sync');
const { derive } = require('./derive');

// Validates every row; good rows are saved in one pass, bad rows are rejected with reasons. Nothing is half-published.
function importRows(rows, store, mode) {
  const imported = [], rejected = [], warnings = [];
  const seen = new Set();
  const toPut = [];
  rows.forEach((raw, i) => {
    const d = derive(raw, { mode });
    const label = d.lot || `row ${i + 2}`;
    if (d.errors.length) { rejected.push({ lot: label, errors: d.errors }); return; }
    if (seen.has(d.lot)) { rejected.push({ lot: label, errors: ['Duplicate lot_number in this file'] }); return; }
    seen.add(d.lot);
    toPut.push({ lot: d.lot, row: d.row });
    imported.push({ lot: d.lot, overall: d.overall });
    d.warnings.forEach((w) => warnings.push({ lot: d.lot, warning: w }));
  });
  const existed = store.putMany(toPut);
  imported.forEach((it, i) => { it.status = existed[i] ? 'updated' : 'created'; });
  return { imported, rejected, warnings };
}

function parseCsvText(text) {
  return parse(text, { columns: true, skip_empty_lines: true, trim: true, bom: true, relax_column_count: true });
}

module.exports = { importRows, parseCsvText };
