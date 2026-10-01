'use strict';
const fs = require('fs');
const path = require('path');
const cheerio = require('cheerio');
const QRCode = require('qrcode');
const { derive } = require('./derive');
const { renderChromatogram } = require('./chromatogram');
const { buildTrace } = require('./trace');
const { httpUrl } = require('./util');

const TEMPLATE = fs.readFileSync(path.join(__dirname, '..', 'template.html'), 'utf8');
const DEMO_MARK = 'SAMPLE — PLACEHOLDER DATA';
const WM_TILE = `data:image/svg+xml;utf8,${encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" width="460" height="320"><text transform="rotate(-24 230 160)" x="230" y="160" text-anchor="middle" font-family="Arial" font-size="30" font-weight="700" fill="#c0392b" fill-opacity="0.09">${DEMO_MARK}</text></svg>`
)}`;

const CSS = `
.bad{color:#c0392b!important}
.logo{display:flex;align-items:center;height:60px}
.logo img,.logo svg{max-height:60px;max-width:190px}
.qr{width:108px;height:108px}.qr svg{width:100%;height:100%;display:block}
.pimg{width:150px;height:190px;display:flex;align-items:center;justify-content:center}
.pimg img,.pimg svg{max-width:100%;max-height:100%;object-fit:contain}
.chrom svg{width:100%;height:auto;display:block}
.chrom-missing{border:1px dashed #b7c0cf;background:#f6f8fb;color:#6b7686;padding:34px;text-align:center;font-size:12px;border-radius:4px}
.sheet a{color:#12305e}
.actions{max-width:820px;margin:0 auto 12px;display:flex;justify-content:flex-end}
.actions button{padding:7px 12px;border:1px solid #12305e;background:#fff;color:#12305e;border-radius:6px;cursor:pointer;font-size:12px}
.demo-banner{position:sticky;top:0;z-index:50;background:#fff4d6;border-bottom:2px solid #c0392b;color:#7a1f14;text-align:center;font-size:13px;padding:10px 16px;margin:-28px -16px 18px;line-height:1.4}
.demo-sheet{position:relative;overflow:hidden}
.demo-sheet::before{content:"";position:absolute;inset:0;background-image:url("${WM_TILE}");background-repeat:repeat;pointer-events:none;z-index:5;-webkit-print-color-adjust:exact;print-color-adjust:exact}
.wordmark{font:700 19px/1 "Segoe UI",Arial,sans-serif;color:#12305e;letter-spacing:-.2px}
.pimg-empty{width:150px;height:190px;border:1px dashed #b7c0cf;background:#f6f8fb;color:#6b7686;font-size:11px;display:flex;align-items:center;justify-content:center;text-align:center;padding:12px;border-radius:4px}
.sign{display:grid;grid-template-columns:repeat(2,minmax(0,260px));gap:12px 48px;padding:14px 0 6px}
.sign .sig{height:46px;display:flex;align-items:flex-end;border-bottom:1px solid #8a94a3}
.sign .sig img{max-height:44px;max-width:200px}
.sign .who{display:block;margin-top:5px;font-size:11.5px;color:#0f1b2d;font-weight:600}
.sign .role{display:block;font-size:10px;color:#6b7686;text-transform:uppercase;letter-spacing:.6px}
.foot-brand{align-items:center;padding-top:10px;margin-top:8px;border-top:1px solid #dfe3ea}
.foot-brand .logo{height:26px}.foot-brand .logo img,.foot-brand .logo svg{max-height:26px;max-width:120px}
.foot-brand .wordmark{font-size:14px}
@media print{.actions,.demo-banner{display:none!important}}
`;

const demoLogo = () => `<svg xmlns="http://www.w3.org/2000/svg" width="190" height="60" viewBox="0 0 190 60"><polygon points="28,6 48,17 48,41 28,52 8,41 8,17" fill="#12305e"/><circle cx="28" cy="29" r="8" fill="#fff"/><text x="62" y="29" font-family="Segoe UI,Arial" font-size="17" font-weight="700" fill="#12305e">YOUR LOGO</text><text x="62" y="45" font-family="Segoe UI,Arial" font-size="10" fill="#6b7686" letter-spacing="1.5">PLACEHOLDER</text></svg>`;

function demoVial(name, content) {
  const e = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 150 190" width="150" height="190"><defs><linearGradient id="vg" x1="0" x2="1"><stop offset="0" stop-color="#dfe5ee"/><stop offset=".45" stop-color="#fff"/><stop offset="1" stop-color="#cdd5e1"/></linearGradient></defs><rect x="50" y="12" width="50" height="20" rx="3" fill="#7b8696"/><rect x="46" y="30" width="58" height="10" fill="#aab3c0"/><rect x="38" y="40" width="74" height="136" rx="12" fill="url(#vg)" stroke="#aab3c0"/><rect x="44" y="76" width="62" height="64" rx="3" fill="#fff" stroke="#c4ccd8"/><rect x="44" y="76" width="62" height="14" fill="#12305e"/><text x="75" y="106" text-anchor="middle" font-family="Arial" font-size="9" font-weight="700" fill="#12305e">${e(name)}</text><text x="75" y="120" text-anchor="middle" font-family="Arial" font-size="9" fill="#555">${e(content)}</text><text x="75" y="133" text-anchor="middle" font-family="Arial" font-size="6" fill="#999">SAMPLE IMAGE</text></svg>`;
}

// A logo uploaded through the admin page is saved as logo.<ext> in the images directory and
// takes precedence over any logo configured in config.json.
function findImageFile(ctx, base) {
  try { return fs.readdirSync(ctx.store.images).find((n) => new RegExp(`^${base}\\.(png|jpe?g|webp)$`, 'i').test(n)) || null; }
  catch { return null; }
}
const findLogoFile = (ctx) => findImageFile(ctx, 'logo');
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

function chromatogramFor(lot, d, ctx) {
  // The graph is generated by the app from this lot's own peaks, so it is available for every
  // imported row without any per-lot trace upload.
  const trace = buildTrace({ peaks: d.chart.peaks });
  return renderChromatogram({ title: d.chart.title, t: trace.t, y: trace.y, peaks: d.chart.peaks });
}

// `record` lets the admin preview a certificate that has not been saved yet.
async function renderPage(lot, ctx, record) {
  const rec = record || ctx.store.get(lot);
  if (!rec) return null;
  const d = derive(rec.row, { mode: ctx.mode });
  if (d.errors.length) throw new Error(`Stored data for ${lot} is invalid: ${d.errors.join('; ')}`);
  const f = d.fields;
  const demo = ctx.mode === 'demo';
  const $ = cheerio.load(TEMPLATE);

  $('title').text(`COA ${f.coa_number} - ${f.product_name}`);
  $('.toolbar').remove();
  $('body').removeClass('show');
  $('head').append(`<style>${CSS}</style>`);

  // images
  const swap = (name, html) => {
    const $el = $(`[data-field="${name}"]`);
    if (html) $el.replaceWith(html); else $el.remove();
  };
  let logo = null;
  const logoFile = findLogoFile(ctx);
  if (logoFile) logo = `<div class="logo"><img src="/media/${encodeURIComponent(logoFile)}" alt="Logo"></div>`;
  else if (demo) logo = `<div class="logo">${demoLogo()}</div>`;
  else if (ctx.logo) logo = `<div class="logo"><img src="${httpUrl(ctx.logo) || '/media/' + path.basename(ctx.logo)}" alt="Logo"></div>`;
  // No logo uploaded: fall back to the laboratory name as a wordmark rather than an empty slot.
  const wordmark = `<div class="logo"><span class="wordmark">${esc(f.lab_name)}</span></div>`;
  swap('logo_image', logo || wordmark);

  const qrSvg = await QRCode.toString(`${ctx.baseUrl.replace(/\/$/, '')}/coa/${lot}`, { type: 'svg', margin: 0, errorCorrectionLevel: 'M' });
  swap('qr_image', `<div class="qr">${qrSvg}</div>`);

  let pimg = null;
  const file = d.row.product_image && path.basename(d.row.product_image);
  if (file && fs.existsSync(path.join(ctx.store.images, file))) {
    pimg = $('<div class="pimg">').append($('<img>').attr({ src: `/media/${encodeURIComponent(file)}`, alt: f.product_name }));
  }
  else if (demo) pimg = `<div class="pimg">${demoVial(d.row.identity_name, d.row.labeled_content)}</div>`;
  if (!pimg) pimg = '<div class="pimg-empty">Product image not provided</div>';
  swap('product_image', pimg);

  const chrom = chromatogramFor(lot, d, ctx);
  swap('chromatogram_image', chrom ? `<div class="chrom">${chrom}</div>` : '<div class="chrom-missing">Chromatogram unavailable for this lot</div>');

  // links
  for (const name of ['verify_url', 'verify_url_footer', 'original_pdf_url']) {
    const url = httpUrl(name === 'original_pdf_url' ? d.row.original_pdf_url : d.row.verify_url);
    const $el = $(`[data-field="${name}"]`);
    $el.empty();
    if (url) $el.append($('<a target="_blank" rel="noopener">').attr('href', url).text(url.replace(/^https?:\/\//, '')));
    else $el.text('—');
    $el.removeAttr('data-field');
  }

  // fentanyl icon: only shown when the result really is "Not Detected"
  const $fent = $('[data-field="fentanyl_headline"]');
  if (!d.fentanylOk) $fent.empty().append($('<span class="bad">').text(f.fentanyl_result));
  $fent.removeAttr('data-field');

  // text fields
  $('[data-field]').each((_, el) => {
    const $el = $(el);
    const name = $el.attr('data-field');
    if (!(name in f)) throw new Error(`Template field has no mapping: ${name}`);
    $el.text(f[name]).removeAttr('data-field');
    if (name.endsWith('_status') && name !== 'overall_status' && !['PASS', 'Reported', 'N/A'].includes(f[name])) $el.addClass('bad');
    if (name === 'overall_status' && f[name] !== 'PASS') $el.css('background', '#c0392b');
  });
  // the static "N/A" cell has no field; nothing else to clean up

  // Signatory block (name/title from the row; signature image uploaded once in Settings) and a small footer brand mark.
  const sigFile = findImageFile(ctx, 'signature');
  const sigImg = sigFile ? `<img src="/media/${encodeURIComponent(sigFile)}" alt="Signature">` : '';
  const who = d.row.signatory_name ? `<span class="who">${esc(d.row.signatory_name)}</span>` : '<span class="who">&nbsp;</span>';
  const role = `<span class="role">${esc(d.row.signatory_title || 'Authorized signatory')}</span>`;
  $('.footer .refs').before(`<div class="sign"><div><div class="sig">${sigImg}</div>${who}${role}</div><div><div class="sig"></div><span class="who">&nbsp;</span><span class="role">Date</span></div></div>`);
  const footLogo = logo ? logo.replace(/class="logo"/, 'class="logo"') : wordmark;
  $('.footer .row').last().after(`<div class="row foot-brand">${footLogo}<span>${esc(f.lab_website)}</span></div>`);

  if (demo) {
    $('.sheet').addClass('demo-sheet');
    $('body').prepend('<div class="demo-banner"><b>SAMPLE DOCUMENT — PLACEHOLDER DATA.</b> Every value, name, graph and identifier on this page is a placeholder for demonstration. This is not a real certificate.</div>');
    $('.notes-title').before('<p style="margin:0 0 10px;font-size:11px;color:#7a1f14"><b>Notice:</b> All data on this sample, including the chromatogram, is placeholder content created for demonstration purposes only.</p>');
  }
  $('.sheet').before('<div class="actions"><button onclick="window.print()">Print / Save as PDF</button></div>');
  return { html: $.html(), chromatogramSvg: chrom, overall: d.overall };
}

module.exports = { renderPage, chromatogramFor };
