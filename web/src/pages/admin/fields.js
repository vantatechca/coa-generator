// Form definition for the Generate page. Keys match the CSV columns the server validates.
export const ID_OK = ['Confirmed', 'Not confirmed'];
export const NOT_DETECTED = ['Not Detected', 'Detected'];

export const SECTIONS = [
  { id: 'report', title: 'Report', blurb: 'Identifiers printed on the certificate and used for its public link.', fields: [
    { k: 'lot_number', label: 'Lot number', req: true, ph: 'RT0011', hint: 'Letters, digits, dot, dash. This becomes the public URL.' },
    { k: 'coa_number', label: 'COA number', req: true, ph: 'COA-2026-000123' },
    { k: 'accession_number', label: 'Accession number', ph: 'ACC-2026-16407' },
    { k: 'issued_date', label: 'Issued date', req: true, type: 'date' },
    { k: 'access_code', label: 'Access code', req: true, ph: 'K4M9R2TX', gen: true, mono: true, hint: 'Printed beside the QR code.' },
  ] },
  { id: 'sample', title: 'Sample', blurb: 'What was submitted, by whom, and when.', fields: [
    { k: 'product_name', label: 'Product name', req: true, ph: 'Retatrutide - 10mg' },
    { k: 'labeled_content', label: 'Labelled content', req: true, ph: '10mg' },
    { k: 'client_name', label: 'Client name', req: true },
    { k: 'client_website', label: 'Client website', ph: 'example.com' },
    { k: 'date_received', label: 'Date received', req: true, type: 'date' },
    { k: 'analysis_date', label: 'Analysis date', req: true, type: 'date' },
    { k: 'appearance', label: 'Appearance', ph: 'Good' },
    { k: 'sample_matrix', label: 'Sample matrix', ph: 'Lyophilized' },
    { k: 'volume', label: 'Volume', ph: '3mL' },
    { k: 'method', label: 'Method', ph: 'Full QC Panel' },
  ] },
  { id: 'identity', title: 'Identity, purity and quantitation', blurb: 'Two independent runs (V0 and V1). Mean, standard deviation and PASS/FAIL are calculated for you.', fields: [
    { k: 'identity_name', label: 'Identity name', req: true, hint: 'As labelled by the client.' },
    { k: 'identity_reference', label: 'Reference compound', req: true, hint: 'The standard it was matched against.' },
    { k: 'identity_result', label: 'Identity result', req: true, options: ID_OK, hint: 'Must contain “Confirmed” to pass.' },
    { k: 'v0_purity', label: 'V0 purity (%)', req: true, num: true, ph: '99.83' },
    { k: 'v0_npc', label: 'V0 net content (mg)', req: true, num: true, ph: '10.31' },
    { k: 'v0_id', label: 'V0 identity', req: true, options: ID_OK },
    { k: 'v1_purity', label: 'V1 purity (%)', req: true, num: true, ph: '99.87' },
    { k: 'v1_npc', label: 'V1 net content (mg)', req: true, num: true, ph: '10.34' },
    { k: 'v1_id', label: 'V1 identity', req: true, options: ID_OK },
  ] },
  { id: 'chrom', title: 'Chromatogram', blurb: 'Enter the measured peaks. The graph is drawn from these retention times and area percentages.', peaks: true, fields: [
    { k: 'chromatogram_sample', label: 'Chromatogram sample', req: true, options: ['Dedicated V0', 'V0', 'V1'] },
  ] },
  { id: 'screens', title: 'Screens and contaminants', blurb: 'Enter what was measured. Nothing here is pre-filled.', fields: [
    { k: 'fentanyl_result', label: 'Fentanyl screen', req: true, options: NOT_DETECTED },
    { k: 'sterility_result', label: 'Sterility', req: true, options: ['No Growth', 'Growth'] },
    { k: 'endotoxin_result', label: 'Endotoxin', req: true, ph: 'NMT 0.05 EU/mL', hint: 'Reported only; not graded.' },
    { k: 'as_result', label: 'Arsenic (limit 1.5 ppm)', req: true, options: ['Not Detected'], hint: 'Not Detected, or a value in ppm.' },
    { k: 'cd_result', label: 'Cadmium (limit 0.5 ppm)', req: true, options: ['Not Detected'] },
    { k: 'cr_result', label: 'Chromium (limit 10 ppm)', req: true, options: ['Not Detected'] },
    { k: 'hg_result', label: 'Mercury (limit 1.5 ppm)', req: true, options: ['Not Detected'] },
    { k: 'pb_result', label: 'Lead (limit 1 ppm)', req: true, options: ['Not Detected'] },
  ] },
  { id: 'lab', title: 'Laboratory, signatory and links', blurb: 'Leave the laboratory fields blank to use the defaults. Links let readers check the original report.', fields: [
    { k: 'lab_name', label: 'Laboratory name', dflt: 'name' },
    { k: 'lab_address', label: 'Laboratory address', dflt: 'address', wide: true },
    { k: 'lab_website', label: 'Laboratory website', dflt: 'website' },
    { k: 'signatory_name', label: 'Signatory name', hint: 'Printed under the signature line. Leave blank to sign by hand.' },
    { k: 'signatory_title', label: 'Signatory title', ph: 'Laboratory Director' },
    { k: 'verify_url', label: 'Verification link', ph: 'https://…' },
    { k: 'original_pdf_url', label: 'Original report link', ph: 'https://…' },
    { k: 'product_image', label: 'Product photo file name', ph: 'vial.png', hint: 'Upload via the API; the file must exist.' },
  ] },
];

export const LABEL = Object.fromEntries(SECTIONS.flatMap((s) => s.fields.map((f) => [f.k, f.label])));
export const DATE_KEYS = ['issued_date', 'date_received', 'analysis_date'];
export const ALPHA = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
export const makeCode = () => Array.from(crypto.getRandomValues(new Uint8Array(8)), (n) => ALPHA[n % ALPHA.length]).join('');

export const parsePeaks = (s) => String(s || '').split(';').map((x) => x.trim()).filter(Boolean).map((seg) => {
  const p = seg.split(':'); return { rt: p[0] || '', label: p.slice(1, -1).join(':'), pct: p[p.length - 1] || '' };
});
export const serializePeaks = (peaks) => peaks.filter((p) => p.rt !== '' || p.label !== '' || p.pct !== '')
  .map((p) => `${p.rt}:${String(p.label).replace(/[;:]/g, ' ').trim()}:${p.pct}`).join(';');
