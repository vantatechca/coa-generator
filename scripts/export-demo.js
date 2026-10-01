'use strict';
// Writes each placeholder certificate as a standalone HTML file you can open directly (no server needed).
const fs = require('fs');
const path = require('path');
const { Store } = require('../lib/store');
const { importRows } = require('../lib/importer');
const { renderPage } = require('../lib/pages');
const { DEMO_ROWS } = require('../lib/demo-data');

(async () => {
  const store = new Store(path.join(__dirname, '..', 'data', 'demo'));
  importRows(DEMO_ROWS, store, 'demo');
  const out = path.join(__dirname, '..', 'demo-output');
  fs.mkdirSync(out, { recursive: true });
  const ctx = { store, mode: 'demo', baseUrl: 'https://example.com', logo: '' };
  for (const row of DEMO_ROWS) {
    const page = await renderPage(row.lot_number, ctx);
    fs.writeFileSync(path.join(out, `sample-coa-${row.lot_number}.html`), page.html);
    fs.writeFileSync(path.join(out, `sample-chromatogram-${row.lot_number}.svg`), page.chromatogramSvg);
    console.log('wrote', row.lot_number);
  }
})().catch((e) => { console.error(e); process.exit(1); });
