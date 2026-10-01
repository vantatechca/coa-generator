'use strict';
const SAFE_LOT = /^[A-Za-z0-9._-]{1,64}$/;
const safeLot = (s) => SAFE_LOT.test(s || '');

const num = (v) => {
  if (v === undefined || v === null) return NaN;
  const m = String(v).replace(/,/g, '').match(/-?\d+(\.\d+)?/);
  return m ? parseFloat(m[0]) : NaN;
};
const round = (x, d) => { const f = Math.pow(10, d); return Math.round((x + Math.sign(x) * 1e-9) * f) / f; };
const fmt = (x, d) => round(x, d).toFixed(d);

const httpUrl = (u) => {
  try {
    const x = new URL(String(u).trim());
    return x.protocol === 'http:' || x.protocol === 'https:' ? x.href : null;
  } catch { return null; }
};

// "13.38:Retatrutide:99.83;1.94:Peak 1:0.17" -> [{rt,label,pct}] (null if malformed)
function parsePeaks(s) {
  const out = [];
  for (const seg of String(s || '').split(';').map((x) => x.trim()).filter(Boolean)) {
    const parts = seg.split(':').map((x) => x.trim());
    if (parts.length < 3) return null;
    const rt = parseFloat(parts[0]), pct = parseFloat(parts[parts.length - 1]);
    const label = parts.slice(1, -1).join(':');
    if (!Number.isFinite(rt) || !Number.isFinite(pct) || !label) return null;
    out.push({ rt, label, pct });
  }
  return out.length ? out : null;
}

module.exports = { safeLot, num, round, fmt, httpUrl, parsePeaks };
