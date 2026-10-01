const rtf = typeof Intl !== 'undefined' && Intl.RelativeTimeFormat ? new Intl.RelativeTimeFormat('en', { numeric: 'auto' }) : null;

export function timeAgo(iso) {
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return '—';
  const s = Math.round((t - Date.now()) / 1000);
  const units = [['year', 31536000], ['month', 2592000], ['week', 604800], ['day', 86400], ['hour', 3600], ['minute', 60]];
  for (const [u, n] of units) if (Math.abs(s) >= n) return rtf.format(Math.round(s / n), u);
  return 'just now';
}

export const fmtDate = (iso) => {
  const d = new Date(iso);
  return Number.isNaN(+d) ? '—' : d.toLocaleDateString('en-CA', { year: 'numeric', month: 'short', day: 'numeric' });
};

// The certificate stores dates as MM/DD/YYYY; date inputs use YYYY-MM-DD.
export const toInputDate = (s) => {
  const m = String(s || '').match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  return m ? `${m[3]}-${m[1].padStart(2, '0')}-${m[2].padStart(2, '0')}` : '';
};
export const fromInputDate = (s) => {
  const m = String(s || '').match(/^(\d{4})-(\d{2})-(\d{2})$/);
  return m ? `${m[2]}/${m[3]}/${m[1]}` : '';
};
export const todayInput = () => new Date().toISOString().slice(0, 10);

export const plural = (n, one, many = `${one}s`) => `${n.toLocaleString()} ${n === 1 ? one : many}`;
