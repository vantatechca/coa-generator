'use strict';
const { COLUMNS } = require('../lib/derive');
const { DEMO_ROWS } = require('../lib/demo-data');
const q = (v) => (/[",\n]/.test(v) ? `"${String(v).replace(/"/g, '""')}"` : v);
console.log([COLUMNS.join(','), ...DEMO_ROWS.map((r) => COLUMNS.map((c) => q(r[c] ?? '')).join(','))].join('\n'));
