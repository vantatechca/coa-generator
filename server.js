'use strict';
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const express = require('express');
const { Store } = require('./lib/store');
const { importRows, parseCsvText } = require('./lib/importer');
const { renderPage } = require('./lib/pages');
const { DEMO_ROWS } = require('./lib/demo-data');
const { derive, COLUMNS } = require('./lib/derive');
const { safeLot } = require('./lib/util');

let fileCfg = {};
try { fileCfg = JSON.parse(fs.readFileSync(path.join(__dirname, 'config.json'), 'utf8')); } catch { /* defaults */ }
const cfg = {
  mode: process.env.COA_MODE || fileCfg.mode || 'demo',
  port: Number(process.env.PORT || fileCfg.port || 3000),
  baseUrl: process.env.BASE_URL || fileCfg.baseUrl || `http://localhost:${process.env.PORT || fileCfg.port || 3000}`,
  logo: fileCfg.logo || '',
};
if (!['demo', 'production'].includes(cfg.mode)) { console.error('COA_MODE must be "demo" or "production"'); process.exit(1); }
const ADMIN_TOKEN = process.env.ADMIN_TOKEN || '';
if (cfg.mode === 'production' && !ADMIN_TOKEN) { console.error('Production mode needs ADMIN_TOKEN to be set.'); process.exit(1); }

const store = new Store(path.join(__dirname, 'data', cfg.mode));
const ctx = { store, mode: cfg.mode, baseUrl: cfg.baseUrl, logo: cfg.logo };

if (cfg.mode === 'demo' && Object.keys(store.all()).length === 0) {
  const r = importRows(DEMO_ROWS, store, 'demo');
  console.log(`Loaded ${r.imported.length} sample lots`);
}

const sha = (s) => crypto.createHash('sha256').update(String(s)).digest();
function admin(req, res, next) {
  if (cfg.mode !== 'production') return next();
  if (crypto.timingSafeEqual(sha(req.get('x-admin-token') || ''), sha(ADMIN_TOKEN))) return next();
  res.status(401).json({ error: 'Admin token missing or wrong' });
}

const app = express();
app.disable('x-powered-by');
app.use(express.static(path.join(__dirname, 'public'), { index: false }));
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'public', 'admin.html')));
app.use('/media', express.static(store.images));

app.get('/api/config', (req, res) => res.json({ mode: cfg.mode }));
app.get('/api/lots', admin, (req, res) => {
  const out = Object.entries(store.all()).map(([lot, rec]) => {
    const d = derive(rec.row, { mode: cfg.mode });
    return { lot, product: rec.row.product_name, coa: rec.row.coa_number, overall: d.overall || 'INVALID', updated: rec.updated };
  });
  res.json(out);
});

app.get('/sample.csv', (req, res) => {
  const q = (v) => (/[",\n]/.test(v) ? `"${String(v).replace(/"/g, '""')}"` : v);
  const lines = [COLUMNS.join(',')];
  for (const row of DEMO_ROWS) lines.push(COLUMNS.map((c) => q(row[c] ?? '')).join(','));
  res.type('text/csv').attachment('lots-sample.csv').send(lines.join('\n') + '\n');
});

app.post('/api/import', admin, express.text({ type: '*/*', limit: '64mb' }), (req, res) => {
  try {
    const rows = parseCsvText(req.body || '');
    if (!rows.length) return res.status(400).json({ error: 'The CSV has no data rows' });
    res.json(importRows(rows, store, cfg.mode));
  } catch (e) { res.status(400).json({ error: `Could not read CSV: ${e.message}` }); }
});

app.post('/api/image/:file', admin, express.raw({ type: ['image/png', 'image/jpeg', 'image/webp'], limit: '5mb' }), (req, res) => {
  if (!/^[A-Za-z0-9._-]+\.(png|jpe?g|webp)$/i.test(req.params.file) || !Buffer.isBuffer(req.body)) return res.status(400).json({ error: 'Use a .png, .jpg or .webp file name and the matching content type' });
  fs.writeFileSync(path.join(store.images, req.params.file), req.body);
  res.json({ saved: req.params.file });
});

// Certificate logo. Saved as logo.<ext> and picked up automatically by every certificate page.
app.post('/api/logo', admin, express.raw({ type: ['image/png', 'image/jpeg', 'image/webp'], limit: '5mb' }), (req, res) => {
  const type = req.get('content-type') || '';
  const ext = type.includes('png') ? 'png' : type.includes('webp') ? 'webp' : 'jpg';
  if (!Buffer.isBuffer(req.body) || !req.body.length) return res.status(400).json({ error: 'Send a PNG, JPG or WebP image' });
  for (const f of fs.readdirSync(store.images)) if (/^logo\./i.test(f)) fs.rmSync(path.join(store.images, f), { force: true });
  const name = `logo.${ext}`;
  fs.writeFileSync(path.join(store.images, name), req.body);
  res.json({ saved: name, url: `/media/${name}` });
});

app.post('/api/demo/reset', admin, (req, res) => {
  if (cfg.mode !== 'demo') return res.status(403).json({ error: 'Only available in demo mode' });
  res.json(importRows(DEMO_ROWS, store, 'demo'));
});

app.get('/coa/:lot', async (req, res) => {
  try {
    if (!safeLot(req.params.lot)) return res.status(404).send('Not found');
    const page = await renderPage(req.params.lot, ctx);
    if (!page) return res.status(404).send('Certificate not found');
    res.type('html').send(page.html);
  } catch (e) { console.error(e); res.status(500).send('Could not render this certificate'); }
});

app.get('/coa/:lot/chromatogram.svg', async (req, res) => {
  try {
    if (!safeLot(req.params.lot)) return res.status(404).send('Not found');
    const page = await renderPage(req.params.lot, ctx);
    if (!page || !page.chromatogramSvg) return res.status(404).send('Chromatogram not available');
    res.type('image/svg+xml').send(page.chromatogramSvg);
  } catch (e) { console.error(e); res.status(500).send('Could not render the chromatogram'); }
});

if (require.main === module) {
  app.listen(cfg.port, () => console.log(`COA app (${cfg.mode} mode) on ${cfg.baseUrl}`));
}
module.exports = { app, ctx };
