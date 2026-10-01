'use strict';
// Placeholder data for demonstrations ONLY. Every name, number, code and link below is invented.
// Values are shaped like a real report (purity near 99%, two-sample conformity, clean panels)
// so the sample page reads naturally, and the app stamps every page built from them as a sample.

const LAB = {
  lab_name: 'Sample Laboratory (Placeholder)',
  lab_address: '100 Placeholder Ave, Suite 200, Sample City, ST 00000',
  lab_website: 'example.com',
  client_name: 'Sample Client Co.',
  client_website: 'example.com',
  appearance: 'Good',
  sample_matrix: 'Lyophilized',
  volume: '3mL',
  method: 'Full QC Panel',
  v0_id: 'Confirmed',
  v1_id: 'Confirmed',
  identity_result: 'Confirmed',
  fentanyl_result: 'Not Detected',
  chromatogram_sample: 'Dedicated V0',
  as_result: 'Not Detected', cd_result: 'Not Detected', cr_result: 'Not Detected',
  hg_result: 'Not Detected', pb_result: 'Not Detected',
  sterility_result: 'No Growth',
  endotoxin_result: 'NMT 0.05 EU/mL',
};

const lot = (o) => ({
  ...LAB,
  verify_url: `https://example.com/verify/${o.coa_number}`,
  original_pdf_url: `https://example.com/reports/${o.coa_number}.pdf`,
  ...o,
});

const DEMO_ROWS = [
  lot({
    lot_number: 'RT0011', coa_number: 'COA-2026-SMP011', accession_number: 'ACC-2026-16407',
    product_name: 'GLP-3 RT - 10mg', labeled_content: '10mg',
    identity_name: 'GLP-3 RT', identity_reference: 'Retatrutide',
    analysis_date: '09/24/2026', date_received: '09/17/2026', issued_date: '09/25/2026',
    v0_purity: '99.83', v0_npc: '10.31', v1_purity: '99.87', v1_npc: '10.34',
    chrom_peaks: '13.38:Retatrutide:99.83;1.94:Peak 1:0.17',
    access_code: 'K4M9R2TX',
  }),
  lot({
    lot_number: 'GC0207', coa_number: 'COA-2026-SMP012', accession_number: 'ACC-2026-16408',
    product_name: 'GHK-Cu - 50mg', labeled_content: '50mg',
    identity_name: 'GHK-Cu', identity_reference: 'GHK-Cu',
    analysis_date: '09/24/2026', date_received: '09/17/2026', issued_date: '09/25/2026',
    v0_purity: '99.46', v0_npc: '49.62', v1_purity: '99.52', v1_npc: '49.78',
    chrom_peaks: '2.94:GHK-Cu:99.46;5.72:Peak 1:0.54',
    access_code: 'P7C2WQ5N',
  }),
  lot({
    lot_number: 'SK0315', coa_number: 'COA-2026-SMP013', accession_number: 'ACC-2026-16409',
    product_name: 'Selank - 5mg', labeled_content: '5mg',
    identity_name: 'Selank', identity_reference: 'Selank',
    analysis_date: '09/25/2026', date_received: '09/18/2026', issued_date: '09/28/2026',
    v0_purity: '99.27', v0_npc: '5.08', v1_purity: '99.31', v1_npc: '5.11',
    chrom_peaks: '12.84:Selank:99.27;2.11:Peak 1:0.73',
    access_code: 'H8D3VB6Y',
  }),
];

module.exports = { DEMO_ROWS };
