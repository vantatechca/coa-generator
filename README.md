# COA App

Imports lab results from a CSV (one row per product/lot) and publishes a certificate-of-analysis page for each lot, including a chromatogram the app draws itself from the peak data in the row. Built for bulk uploads: drop a CSV with hundreds or thousands of rows and every lot is published in one pass.

## Run it

```bash
npm install
npm run demo          # sample data (pages stamped SAMPLE), ~> http://localhost:3000
npm run export-demo   # writes standalone sample pages to demo-output/ (open directly in a browser)
npm start             # production
```

Production:

```bash
COA_MODE=production ADMIN_TOKEN=<long-random-secret> BASE_URL=https://your-domain npm start
```

Production refuses to start without `ADMIN_TOKEN`. Public pages (`/coa/<lot>`) need no token; the admin page and `/api/*` do.

## Bulk import

1. Open the admin page (`/`). Download **`/sample.csv`** — the exact columns plus a filled-in example row.
2. Upload the CSV (one row per lot). Every valid row is stored in a single write, so large files stay fast. Rows with errors are rejected with reasons; nothing is half-published. The summary shows created / updated / rejected / warning counts.
3. Share `https://your-domain/coa/<lot>`. The QR code on each page points to that URL.

Re-uploading a row with an existing `lot_number` updates it. The admin list has a search box for locating lots in large batches.

Excel: save the workbook as **CSV (comma delimited)** before uploading.

## What the app calculates (never type these)

- PASS/FAIL for purity (≥ 95%), identity, fentanyl screen, each heavy metal (limits 1.5 / 0.5 / 10 / 1.5 / 1 ppm), sterility, and V0 / V1 rows
- Overall PASS badge, Mean and Std Dev (population SD, matching the lab's report), headline figures, notes text

## Checks on import

Rows with errors are rejected with reasons (nothing half-published). Warnings are shown for: main chromatogram peak not matching V0 purity, peak percentages not summing to ~100%, V0/V1 differing by more than 1 point, purity below spec, and missing `verify_url` / `original_pdf_url`.

## Chromatogram

The app generates the chromatogram itself from `chrom_peaks`, so no instrument file or image upload is needed:

`13.38:Retatrutide:99.83;1.94:Peak 1:0.17` (retention time : label : percent)

`lib/trace.js` turns those measured retention times and area percentages into a trace (exponentially modified Gaussian peaks, minor peaks scaled by their reported area ratio) that `lib/chromatogram.js` renders as an SVG. The retention times printed on the graph come from the row, so each certificate reflects its own data. SVG: `/coa/<lot>/chromatogram.svg`.

## Images you upload

The logo and the optional product photo are the only uploaded images:

- **Logo** — set `logo` in `config.json` (or leave blank); the file is served from `/media/...`. For a per-deployment upload, POST the image to `/api/image/<name>` (png/jpg/webp) and reference the saved name.
- **Product photo** — set the `product_image` column to the uploaded file name; the page shows it when the file exists under `data/<mode>/images`.

## Demo mode

Every page gets a sticky notice, a tiled "SAMPLE — PLACEHOLDER DATA" watermark, and an in-page notice. These are added by the renderer, not by the data, so they cannot be removed by editing a CSV. Demo data is stored separately (`data/demo`) from production (`data/production`).

## Data you provide

Testing-laboratory name, address, website, report links and results must match the laboratory report they come from. The page shows them as entered. The `lab_name`, `lab_address` and `lab_website` columns are optional: when blank, certificates print the default laboratory (MSD Sciences, set in `lib/derive.js`).

## Files

- `template.html` — the certificate layout (fields are `data-field` attributes)
- `lib/derive.js` — validation and calculations
- `lib/chromatogram.js` — SVG graph renderer
- `lib/trace.js` — builds the trace from the row's peaks (the app draws the chromatogram)
- `lib/pages.js` — fills the template
- `lib/demo-data.js` — sample rows (demo + `/sample.csv`)

