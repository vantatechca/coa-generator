import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useLots } from '../../lib/state.jsx';
import { PageHead } from './AdminLayout.jsx';
import { Skel, StatusBadge } from '../../components/ui.jsx';
import { IconPlus, IconUpload, IconDownload, IconArrow, IconCheck, IconX, IconAlert } from '../../components/Icons.jsx';
import { timeAgo, plural } from '../../lib/format.js';

const WEEKS = 12;
const startOfWeek = (d) => { const x = new Date(d); x.setHours(0, 0, 0, 0); x.setDate(x.getDate() - x.getDay()); return x; };
const niceMax = (n) => { for (const m of [4, 8, 12, 20, 40, 80]) if (n <= m) return m; const p = 10 ** Math.floor(Math.log10(n)); return Math.ceil(n / p) * p; };

function weekly(lots) {
  const now = startOfWeek(new Date());
  const buckets = Array.from({ length: WEEKS }, (_, i) => { const d = new Date(now); d.setDate(d.getDate() - (WEEKS - 1 - i) * 7); return { start: d, count: 0 }; });
  for (const l of lots) {
    const t = Date.parse(l.updated);
    if (!Number.isFinite(t)) continue;
    const idx = buckets.findIndex((b, i) => t >= +b.start && (i === WEEKS - 1 || t < +buckets[i + 1].start));
    if (idx >= 0) buckets[idx].count++;
  }
  return buckets;
}

function Kpi({ label, value, sub, loading, tone }) {
  return (
    <div className="kpi">
      <span className="kpi-l">{label}</span>
      {loading ? <Skel w={70} h={34} style={{ margin: '10px 0 6px' }} /> : <span className={`kpi-v num ${tone || ''}`}>{value}</span>}
      {loading ? <Skel w={120} h={12} /> : <span className="kpi-s">{sub}</span>}
    </div>
  );
}

function IssuedChart({ buckets }) {
  const [hover, setHover] = useState(null);
  const [table, setTable] = useState(false);
  const max = niceMax(Math.max(1, ...buckets.map((b) => b.count)));
  const ticks = [0, max / 2, max];
  const label = (d) => d.toLocaleDateString('en-CA', { month: 'short', day: 'numeric' });
  return (
    <section className="card-box">
      <div className="card-head">
        <div><h2>Certificates issued per week</h2><p>Last {WEEKS} weeks, by date issued or updated</p></div>
        <button className="btn ghost sm" onClick={() => setTable((t) => !t)} aria-pressed={table}>{table ? 'View chart' : 'View as table'}</button>
      </div>
      {table ? (
        <table className="tbl compact"><thead><tr><th>Week of</th><th className="r">Certificates</th></tr></thead>
          <tbody>{buckets.map((b) => <tr key={+b.start}><td>{label(b.start)}</td><td className="r num">{b.count}</td></tr>)}</tbody></table>
      ) : (
        <div className="chart" role="img" aria-label={`Bar chart of certificates issued per week over the last ${WEEKS} weeks`}>
          <div className="chart-plot">
          <div className="plot-area">
            {ticks.map((t) => (
              <i key={t} className="gridline" style={{ bottom: `${(t / max) * 100}%` }}><span className="ytick num">{t}</span></i>
            ))}
            <div className="bars" onMouseLeave={() => setHover(null)}>
              {buckets.map((b, i) => (
                <button key={+b.start} type="button" className={`bar-col${hover === i ? ' hot' : ''}`} onMouseEnter={() => setHover(i)} onFocus={() => setHover(i)} onBlur={() => setHover(null)} aria-label={`Week of ${label(b.start)}: ${plural(b.count, 'certificate')}`}>
                  <span className="bar" style={{ height: `${(b.count / max) * 100}%` }} />
                  {hover === i && <span className="tip"><b className="num">{b.count}</b> {b.count === 1 ? 'certificate' : 'certificates'}<br />week of {label(b.start)}</span>}
                </button>
              ))}
            </div>
          </div>
          <div className="chart-x">{buckets.map((b, i) => <span key={+b.start}>{(WEEKS - 1 - i) % 2 === 0 ? label(b.start) : ''}</span>)}</div>
        </div>
</div>
      )}
    </section>
  );
}

function Outcomes({ pass, review, invalid, total }) {
  const seg = [
    { k: 'Pass', n: pass, c: 'var(--pass)', icon: <IconCheck /> },
    { k: 'Needs review', n: review, c: 'var(--fail)', icon: <IconX /> },
    { k: 'Invalid', n: invalid, c: 'var(--ink-3)', icon: <IconAlert /> },
  ];
  return (
    <section className="card-box">
      <div className="card-head"><div><h2>Results</h2><p>Overall outcome of every certificate</p></div></div>
      <div className="stack" role="img" aria-label={`${pass} pass, ${review} need review, ${invalid} invalid`}>
        {total === 0 ? <i className="stack-empty" /> : seg.filter((s) => s.n > 0).map((s) => <i key={s.k} style={{ flexGrow: s.n, background: s.c }} />)}
      </div>
      <ul className="legend">
        {seg.map((s) => <li key={s.k}><span className="lg-k" style={{ color: s.c }}>{s.icon}</span><span>{s.k}</span><b className="num">{s.n.toLocaleString()}</b></li>)}
      </ul>
    </section>
  );
}

export default function Dashboard() {
  const { lots, error } = useLots();
  const loading = lots === null && !error;
  const s = useMemo(() => {
    const L = lots || [];
    const pass = L.filter((l) => l.overall === 'PASS').length;
    const invalid = L.filter((l) => l.overall === 'INVALID').length;
    const review = L.length - pass - invalid;
    const month = L.filter((l) => Date.now() - Date.parse(l.updated) < 30 * 864e5).length;
    return { total: L.length, pass, review, invalid, month, rate: L.length ? (pass / L.length) * 100 : 0, buckets: weekly(L), recent: [...L].sort((a, b) => Date.parse(b.updated) - Date.parse(a.updated)).slice(0, 7) };
  }, [lots]);

  return (
    <>
      <PageHead title="Dashboard" sub="An overview of the certificates your laboratory has issued.">
        <Link to="/admin/generate" className="btn"><IconPlus />Generate COA</Link>
      </PageHead>
      {error && <p className="notice bad">{error}</p>}
      <div className="kpis">
        <Kpi loading={loading} label="Certificates" value={s.total.toLocaleString()} sub="Published in total" />
        <Kpi loading={loading} label="Pass rate" value={`${s.rate.toFixed(s.rate === 100 || s.rate === 0 ? 0 : 1)}%`} sub={`${plural(s.pass, 'certificate')} passed`} />
        <Kpi loading={loading} label="Needs review" value={(s.review + s.invalid).toLocaleString()} sub="Failed a check or invalid" tone={s.review + s.invalid ? 'bad' : ''} />
        <Kpi loading={loading} label="Last 30 days" value={s.month.toLocaleString()} sub="Issued or updated" />
      </div>

      <div className="grid-2">
        {loading ? <div className="card-box"><Skel w={220} h={18} /><Skel h={190} style={{ marginTop: 22 }} /></div> : <IssuedChart buckets={s.buckets} />}
        {loading ? <div className="card-box"><Skel w={120} h={18} /><Skel h={14} style={{ marginTop: 28 }} /><Skel h={80} style={{ marginTop: 22 }} /></div> : <Outcomes pass={s.pass} review={s.review} invalid={s.invalid} total={s.total} />}
      </div>

      <div className="grid-2 b">
        <section className="card-box flush">
          <div className="card-head pad"><div><h2>Recent certificates</h2></div><Link to="/admin/certificates" className="link">View all <IconArrow /></Link></div>
          <table className="tbl">
            <thead><tr><th>Lot</th><th>Product</th><th>Result</th><th className="r">Updated</th></tr></thead>
            <tbody>
              {loading && Array.from({ length: 5 }, (_, i) => <tr key={i}><td><Skel w={70} /></td><td><Skel w={160} /></td><td><Skel w={60} h={22} r={11} /></td><td className="r"><Skel w={70} style={{ marginLeft: 'auto' }} /></td></tr>)}
              {!loading && s.recent.length === 0 && <tr><td colSpan="4" className="empty-cell">No certificates yet.</td></tr>}
              {s.recent.map((l) => (
                <tr key={l.lot} className="row-link">
                  <td><a className="mono lot" href={`/coa/${encodeURIComponent(l.lot)}`} target="_blank" rel="noreferrer">{l.lot}</a></td>
                  <td>{l.product}</td><td><StatusBadge value={l.overall} /></td><td className="r muted">{timeAgo(l.updated)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
        <section className="card-box">
          <div className="card-head"><div><h2>Quick actions</h2></div></div>
          <div className="actions-list">
            <Link to="/admin/generate" className="action"><IconPlus /><span><b>Generate a certificate</b><small>Enter results for one lot and preview it</small></span><IconArrow className="go" /></Link>
            <Link to="/admin/generate?tab=bulk" className="action"><IconUpload /><span><b>Bulk upload a CSV</b><small>Publish hundreds of lots in one pass</small></span><IconArrow className="go" /></Link>
            <a href="/sample.csv" className="action"><IconDownload /><span><b>Download sample CSV</b><small>The exact columns the importer expects</small></span><IconArrow className="go" /></a>
          </div>
        </section>
      </div>
    </>
  );
}
