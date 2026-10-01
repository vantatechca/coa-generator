'use strict';
// Renders an HPLC chromatogram as a standalone SVG from real trace data (time, intensity).

const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

function niceStep(range, target) {
  const raw = range / target;
  const p = Math.pow(10, Math.floor(Math.log10(raw)));
  const f = raw / p;
  const n = f < 1.5 ? 1 : f < 3 ? 2 : f < 7 ? 5 : 10;
  return n * p;
}

const trimNum = (x) => String(parseFloat(x.toFixed(2)));
function fmtY(v) {
  const a = Math.abs(v);
  if (a >= 1e6) return trimNum(v / 1e6) + 'M';
  if (a >= 1e3) return trimNum(v / 1e3) + 'k';
  return String(Math.round(v));
}

// Keeps min and max of each bucket so narrow peaks survive downsampling.
function decimate(t, y, buckets) {
  const n = t.length;
  if (n <= buckets * 2) return { t, y };
  const ot = [], oy = [];
  const size = n / buckets;
  for (let b = 0; b < buckets; b++) {
    const s = Math.floor(b * size), e = Math.min(n, Math.floor((b + 1) * size));
    if (e <= s) continue;
    let mn = s, mx = s;
    for (let i = s; i < e; i++) { if (y[i] < y[mn]) mn = i; if (y[i] > y[mx]) mx = i; }
    const a = Math.min(mn, mx), c = Math.max(mn, mx);
    ot.push(t[a]); oy.push(y[a]);
    if (c !== a) { ot.push(t[c]); oy.push(y[c]); }
  }
  return { t: ot, y: oy };
}

/**
 * @param {object} o
 * @param {string} o.title       e.g. "Retatrutide(10mg) — UV 214nm"
 * @param {ArrayLike<number>} o.t  retention time, minutes
 * @param {ArrayLike<number>} o.y  intensity, mV
 * @param {{rt:number,label:string,pct:number}[]} o.peaks  labelled peaks
 * @param {string|null} o.watermark  text drawn faintly across the plot (demo mode)
 */
function renderChromatogram({ title, wavelength = '214nm', t, y, peaks = [], watermark = null, width = 1100, height = 520 }) {
  const L = 84, R = 26, T = 62, B = 66;
  const W = width, H = height, w = W - L - R, h = H - T - B;
  const n = t.length;
  let yMaxData = -Infinity, yMinData = Infinity;
  for (let i = 0; i < n; i++) { if (y[i] > yMaxData) yMaxData = y[i]; if (y[i] < yMinData) yMinData = y[i]; }

  const xmin = Math.min(0, t[0]), xmax = t[n - 1];
  const xs = niceStep(xmax - xmin, 9);
  let ymin = yMinData < 0 ? yMinData * 1.15 : 0;
  const yTop = yMaxData * 1.14;
  const ys = niceStep(yTop - ymin, 8);
  ymin = Math.floor(ymin / ys) * ys;
  const ymax = Math.ceil(yTop / ys) * ys;

  const X = (v) => L + ((v - xmin) / (xmax - xmin)) * w;
  const Y = (v) => T + h - ((v - ymin) / (ymax - ymin)) * h;

  const out = [];
  out.push(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-label="${esc(title)}" font-family="'Segoe UI', Arial, Helvetica, sans-serif">`);
  out.push(`<rect width="${W}" height="${H}" fill="#fff"/>`);
  out.push(`<text x="${W / 2}" y="30" text-anchor="middle" font-size="16" font-weight="700" fill="#222">${esc(title)}</text>`);

  for (let k = 0; ymin + k * ys <= ymax + 1e-9; k++) {
    const v = ymin + k * ys, py = Y(v);
    out.push(`<line x1="${L}" y1="${py.toFixed(1)}" x2="${L + w}" y2="${py.toFixed(1)}" stroke="#e6e9ee" stroke-width="1"/>`);
    out.push(`<text x="${L - 8}" y="${(py + 4).toFixed(1)}" text-anchor="end" font-size="11" fill="#555">${fmtY(v)}</text>`);
  }
  for (let k = 0; xmin + k * xs <= xmax + 1e-9; k++) {
    const v = xmin + k * xs, px = X(v);
    out.push(`<line x1="${px.toFixed(1)}" y1="${T}" x2="${px.toFixed(1)}" y2="${T + h}" stroke="#e6e9ee" stroke-width="1"/>`);
    out.push(`<text x="${px.toFixed(1)}" y="${T + h + 18}" text-anchor="middle" font-size="11" fill="#555">${v.toFixed(2)}</text>`);
  }
  out.push(`<rect x="${L}" y="${T}" width="${w}" height="${h}" fill="none" stroke="#cfd6e0" stroke-width="1"/>`);
  out.push(`<text transform="translate(22 ${T + h / 2}) rotate(-90)" text-anchor="middle" font-size="11" font-weight="700" fill="#333">Intensity (mV)</text>`);
  out.push(`<text x="${L + w / 2}" y="${H - 16}" text-anchor="middle" font-size="11" font-weight="700" fill="#333">Retention Time (min)</text>`);
  out.push(`<text x="${L + w - 8}" y="${T + 18}" text-anchor="end" font-size="12" fill="#9aa3b0">${esc(wavelength)}</text>`);

  if (watermark) {
    const cx = L + w / 2, cy = T + h / 2;
    out.push(`<text transform="rotate(-12 ${cx} ${cy})" x="${cx}" y="${cy}" text-anchor="middle" font-size="46" font-weight="700" fill="#c0392b" fill-opacity="0.11">${esc(watermark)}</text>`);
  }

  const d = decimate(t, y, 900);
  let path = '';
  for (let i = 0; i < d.t.length; i++) path += (i ? 'L' : 'M') + X(d.t[i]).toFixed(1) + ' ' + Y(d.y[i]).toFixed(1);
  out.push(`<path d="${path}" fill="none" stroke="#2b6cb8" stroke-width="1.6" stroke-linejoin="round"/>`);

  for (const p of peaks) {
    let bi = -1;
    for (let i = 0; i < n; i++) {
      if (Math.abs(t[i] - p.rt) <= 0.25 && (bi < 0 || y[i] > y[bi])) bi = i;
    }
    if (bi < 0) continue;
    const px = X(t[bi]), py = Y(y[bi]);
    out.push(`<circle cx="${px.toFixed(1)}" cy="${py.toFixed(1)}" r="2.6" fill="#2b6cb8"/>`);
    const label = `${p.label} (${p.pct.toFixed(2)}%)`;
    const rt = `RT: ${t[bi].toFixed(2)} min`;
    if (py - 24 < T + 8) {
      out.push(`<text x="${(px + 10).toFixed(1)}" y="${(py + 2).toFixed(1)}" font-size="10.5" font-weight="700" fill="#222">${esc(label)}</text>`);
      out.push(`<text x="${(px + 10).toFixed(1)}" y="${(py + 14).toFixed(1)}" font-size="9" fill="#666">${esc(rt)}</text>`);
    } else {
      const lx = Math.min(Math.max(px, L + 64), L + w - 64);
      out.push(`<text x="${lx.toFixed(1)}" y="${(py - 20).toFixed(1)}" text-anchor="middle" font-size="10.5" font-weight="700" fill="#222">${esc(label)}</text>`);
      out.push(`<text x="${lx.toFixed(1)}" y="${(py - 9).toFixed(1)}" text-anchor="middle" font-size="9" fill="#666">${esc(rt)}</text>`);
    }
  }
  out.push('</svg>');
  return out.join('\n');
}

module.exports = { renderChromatogram };
