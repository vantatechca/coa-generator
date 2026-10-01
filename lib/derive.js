'use strict';
// Turns one CSV row into the exact values printed on the certificate.
// Statuses, mean and standard deviation are COMPUTED here, never typed in, so they cannot disagree with the results.

const { safeLot, num, fmt, parsePeaks } = require('./util');

const REQUIRED = [
  'lot_number', 'coa_number', 'product_name', 'client_name', 'labeled_content',
  'analysis_date', 'date_received', 'identity_name', 'identity_reference', 'identity_result',
  'fentanyl_result', 'v0_purity', 'v0_npc', 'v0_id', 'v1_purity', 'v1_npc', 'v1_id',
  'chromatogram_sample', 'chrom_peaks', 'as_result', 'cd_result', 'cr_result', 'hg_result',
  'pb_result', 'sterility_result', 'endotoxin_result', 'lab_name', 'lab_address', 'lab_website',
  'issued_date', 'access_code',
];
const OPTIONAL = [
  'client_website', 'accession_number', 'appearance', 'sample_matrix', 'volume', 'method',
  'verify_url', 'original_pdf_url', 'product_image', 'purity_result', 'npc_result',
];
const COLUMNS = [...REQUIRED, ...OPTIONAL];

const PURITY_MIN = 95.0;
const METALS = [['as', 1.5], ['cd', 0.5], ['cr', 10], ['hg', 1.5], ['pb', 1]];

const dash = (s) => (s && String(s).trim() ? String(s).trim() : '—');

function metalStatus(res, limit) {
  if (/not\s*detected|^nd$|<\s*lo[dq]|bql/i.test(res)) return 'PASS';
  const n = num(res);
  if (Number.isFinite(n)) return n <= limit ? 'PASS' : 'FAIL';
  return null;
}

function derive(raw, { mode }) {
  const r = {};
  for (const [k, v] of Object.entries(raw)) r[k.trim().toLowerCase()] = String(v ?? '').trim();
  const errors = [], warnings = [];

  for (const k of REQUIRED) if (!r[k]) errors.push(`Missing required value: ${k}`);
  if (r.lot_number && !safeLot(r.lot_number)) errors.push('lot_number may only use letters, digits, dot, dash and underscore (max 64)');

  const v0p = num(r.v0_purity), v1p = num(r.v1_purity), v0n = num(r.v0_npc), v1n = num(r.v1_npc);
  for (const [k, v] of [['v0_purity', v0p], ['v1_purity', v1p], ['v0_npc', v0n], ['v1_npc', v1n]]) {
    if (r[k] && !Number.isFinite(v)) errors.push(`${k} is not a number: "${r[k]}"`);
  }
  for (const [k, v] of [['v0_purity', v0p], ['v1_purity', v1p]]) {
    if (Number.isFinite(v) && (v < 0 || v > 100)) errors.push(`${k} must be between 0 and 100`);
  }
  const peaks = r.chrom_peaks ? parsePeaks(r.chrom_peaks) : null;
  if (r.chrom_peaks && !peaks) errors.push('chrom_peaks must look like "13.38:Name:99.83;1.94:Peak 1:0.17" (retention time : label : percent)');
  if (errors.length) return { errors, warnings, lot: r.lot_number || null };

  const purity = r.purity_result ? num(r.purity_result) : v1p;
  const npc = r.npc_result ? num(r.npc_result) : v1n;
  if (!Number.isFinite(purity) || !Number.isFinite(npc)) return { errors: ['purity_result / npc_result is not a number'], warnings, lot: r.lot_number };

  const meanP = (v0p + v1p) / 2, meanN = (v0n + v1n) / 2;
  const sdP = Math.sqrt(((v0p - meanP) ** 2 + (v1p - meanP) ** 2) / 2); // population SD, matches the lab's report
  const sdN = Math.sqrt(((v0n - meanN) ** 2 + (v1n - meanN) ** 2) / 2);

  const idOk = (s) => /confirmed/i.test(s);
  const st = {};
  st.purity = purity >= PURITY_MIN ? 'PASS' : 'FAIL';
  st.identity = idOk(r.identity_result) ? 'PASS' : 'FAIL';
  st.fentanyl = /not\s*detected/i.test(r.fentanyl_result) ? 'PASS' : 'FAIL';
  st.v0 = v0p >= PURITY_MIN && idOk(r.v0_id) ? 'PASS' : 'FAIL';
  st.v1 = v1p >= PURITY_MIN && idOk(r.v1_id) ? 'PASS' : 'FAIL';
  st.sterility = /no\s*growth/i.test(r.sterility_result) ? 'PASS' : 'FAIL';
  for (const [m, limit] of METALS) {
    const s = metalStatus(r[`${m}_result`], limit);
    if (s === null) { warnings.push(`${m}_result "${r[m + '_result']}" not recognised; marked FAIL for review`); st[m] = 'FAIL'; } else st[m] = s;
  }
  const checks = Object.values(st);
  const overall = checks.every((s) => s === 'PASS') ? 'PASS' : 'FAIL';

  // Cross-checks that catch typos before anything is published.
  const main = peaks.reduce((a, b) => (b.pct > a.pct ? b : a));
  const sum = peaks.reduce((a, b) => a + b.pct, 0);
  if (Math.abs(main.pct - v0p) > 0.05) warnings.push(`Main chromatogram peak (${main.pct}%) differs from V0 purity (${v0p}%)`);
  if (Math.abs(sum - 100) > 0.15) warnings.push(`Chromatogram peak percentages add up to ${sum.toFixed(2)}%, expected about 100%`);
  if (Math.abs(v1p - v0p) > 1) warnings.push('V0 and V1 purity differ by more than 1 percentage point');
  if (purity < PURITY_MIN) warnings.push(`Purity ${purity}% is below the ${PURITY_MIN}% specification`);
  if (mode !== 'demo' && !r.verify_url && !r.original_pdf_url) warnings.push('No verify_url or original_pdf_url: readers cannot check this result against the laboratory report');

  const lab = r.lab_name;
  const fields = {
    coa_number: r.coa_number, coa_number_footer: r.coa_number,
    product_name: r.product_name, client_name: r.client_name, client_website: dash(r.client_website),
    lot_number: r.lot_number, lot_number_footer: r.lot_number,
    analysis_date: r.analysis_date, test_date: r.analysis_date, date_received: r.date_received,
    accession_number: dash(r.accession_number), labeled_content: r.labeled_content,
    appearance: dash(r.appearance), sample_matrix: dash(r.sample_matrix), volume: dash(r.volume), method: dash(r.method),
    overall_status: overall,
    access_code: r.access_code, access_code_footer: r.access_code,
    product_image_caption: `${r.product_name} - ${r.lot_number}`,
    identity_name: r.identity_name, identity_name_note: r.identity_name,
    purity_headline: `${fmt(purity, 2)}%`, purity_result: `${fmt(purity, 2)}%`, purity_status: st.purity,
    npc_result: fmt(npc, 2),
    identity_reference: r.identity_reference, identity_result: r.identity_result, identity_status: st.identity,
    fentanyl_result: r.fentanyl_result, fentanyl_status: st.fentanyl,
    chromatogram_sample: r.chromatogram_sample, chromatogram_sample_note: r.chromatogram_sample,
    chromatogram_purity_note: `${fmt(v0p, 2)}%`, mean_purity_note: `${fmt(meanP, 2)}%`,
    samples_tested: '2',
    v0_purity: `${fmt(v0p, 2)}%`, v0_npc: `${fmt(v0n, 2)} mg`, v0_id: r.v0_id, v0_result: st.v0,
    v1_purity: `${fmt(v1p, 2)}%`, v1_npc: `${fmt(v1n, 2)} mg`, v1_id: r.v1_id, v1_result: st.v1,
    mean_purity: `${fmt(meanP, 2)}%`, mean_npc: `${fmt(meanN, 2)} mg`,
    sd_purity: `${fmt(sdP, 4)}%`, sd_npc: `${fmt(sdN, 4)} mg`,
    sterility_result: r.sterility_result, sterility_status: st.sterility,
    endotoxin_result: r.endotoxin_result, endotoxin_status: 'Reported',
    lab_name: lab, lab_name_note: lab, lab_address: r.lab_address, lab_website: r.lab_website,
    lab_contact_line: `${lab} | ${r.lab_address} | ${r.lab_website}`,
    issued_date: r.issued_date, issued_date_footer: r.issued_date,
  };
  for (const [m] of METALS) { fields[`${m}_result`] = r[`${m}_result`]; fields[`${m}_status`] = st[m]; }

  return {
    errors: [], warnings, lot: r.lot_number, row: r, fields, overall, fentanylOk: st.fentanyl === 'PASS',
    chart: { title: `${r.identity_reference}(${r.labeled_content}) — UV 214nm`, peaks },
  };
}

module.exports = { derive, COLUMNS, REQUIRED, OPTIONAL };
