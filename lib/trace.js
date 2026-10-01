'use strict';
// Builds the chromatogram trace (time, intensity) for a lot from the peaks reported in its CSV row
// (chrom_peaks: "retention time : label : percent"). The app draws the graph itself, so a batch of
// CSV rows produces a complete certificate — including the chromatogram — with no per-lot upload.

const SQRT2PI = Math.sqrt(2 * Math.PI);

// Complementary error function (Numerical Recipes approximation).
function erfc(x) {
  const z = Math.abs(x);
  const t = 1 / (1 + 0.5 * z);
  const r = t * Math.exp(-z * z - 1.26551223 + t * (1.00002368 + t * (0.37409196 + t * (0.09678418 + t * (-0.18628806 + t * (0.27886807 + t * (-1.13520398 + t * (1.48851587 + t * (-0.82215223 + t * 0.17087277)))))))));
  return x >= 0 ? r : 2 - r;
}

// Exponentially modified Gaussian: a symmetric peak with the tailing seen in real HPLC.
function emg(x, mu, sig, tau) {
  const arg = (sig * sig / tau - (x - mu)) / (sig * Math.SQRT2);
  if (arg > 26) return 0;
  return (1 / (2 * tau)) * Math.exp((sig * sig) / (2 * tau * tau) - (x - mu) / tau) * erfc(arg);
}

// Offset between the EMG's apex and its mu, so the peak lands exactly on the reported RT.
function emgApexOffset(sig, tau) {
  let best = -1, bx = 0;
  for (let x = -3 * sig; x <= 10 * tau; x += 0.002) { const v = emg(x, 0, sig, tau); if (v > best) { best = v; bx = x; } }
  return bx;
}

/**
 * Deterministic trace built purely from the measured peaks, so every imported row gets a graph
 * that reflects its own retention times and area percentages (no random placeholder values).
 *
 * @param {object} o
 * @param {{rt:number,label:string,pct:number}[]} o.peaks  labelled peaks from chrom_peaks
 * @param {number} [o.dt]      sampling step, minutes (default 0.01)
 * @param {number} [o.height]  apex height of the main peak in mV (default 500)
 * @returns {{t:Float64Array, y:Float64Array}}
 */
function buildTrace({ peaks, dt = 0.01, height = 500 }) {
  const list = (Array.isArray(peaks) ? peaks : []).filter((p) => p && Number.isFinite(p.rt) && Number.isFinite(p.pct) && p.pct > 0);
  if (!list.length) throw new Error('A chromatogram needs at least one labelled peak');

  const main = list.reduce((a, b) => (b.pct > a.pct ? b : a));
  const maxRt = Math.max(...list.map((p) => p.rt), 0);
  const tEnd = Math.max(2, Math.ceil((maxRt * 1.4) / 2) * 2);
  const n = Math.round(tEnd / dt) + 1;
  const t = new Float64Array(n), y = new Float64Array(n);
  for (let i = 0; i < n; i++) t[i] = i * dt;

  // Main peak: sized to the requested apex height, area used to scale the minor peaks.
  const sigM = 0.045 + 0.003 * main.rt;
  const tauM = 0.10 + 0.012 * main.rt;
  const muM = main.rt - emgApexOffset(sigM, tauM);
  const shapeM = new Float64Array(n);
  let maxM = 0, sumM = 0;
  for (let i = 0; i < n; i++) { shapeM[i] = emg(t[i], muM, sigM, tauM); if (shapeM[i] > maxM) maxM = shapeM[i]; sumM += shapeM[i]; }
  const ampM = height / maxM;
  const areaM = ampM * sumM * dt;

  // Minor peaks are sized so their area ratio matches the labelled percentages.
  const minors = list.filter((p) => p !== main).map((p) => {
    const sig = Math.max(0.03, 0.04 + 0.002 * p.rt);
    const area = areaM * (p.pct / main.pct);
    return { mu: p.rt, sig, amp: area / (sig * SQRT2PI) };
  });

  const B = height * 0.02; // gentle solvent baseline, deterministic
  for (let i = 0; i < n; i++) {
    const ti = t[i];
    let v = B * (1 - Math.exp(-ti / 0.6));
    v += ampM * shapeM[i];
    for (const m of minors) v += m.amp * Math.exp(-Math.pow(ti - m.mu, 2) / (2 * m.sig * m.sig));
    y[i] = v;
  }
  return { t, y };
}

module.exports = { buildTrace };
