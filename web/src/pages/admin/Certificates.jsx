import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useLots } from '../../lib/state.jsx';
import { api } from '../../lib/api.js';
import { PageHead } from './AdminLayout.jsx';
import { Skel, StatusBadge, Modal, useToast } from '../../components/ui.jsx';
import { IconSearch, IconExternal, IconCopy, IconEdit, IconTrash, IconPlus, IconChevronLeft, IconChevronRight } from '../../components/Icons.jsx';
import { timeAgo, plural } from '../../lib/format.js';
import { useApp } from '../../lib/state.jsx';

const PER = 20;
const FILTERS = [['all', 'All'], ['pass', 'Pass'], ['review', 'Needs review']];
const SORTS = {
  updated: ['Recently updated', (a, b) => Date.parse(b.updated) - Date.parse(a.updated)],
  lot: ['Lot number', (a, b) => a.lot.localeCompare(b.lot, undefined, { numeric: true })],
  product: ['Product', (a, b) => String(a.product).localeCompare(String(b.product))],
};

export default function Certificates() {
  const { lots, error, refresh } = useLots();
  const { config } = useApp();
  const toast = useToast();
  const nav = useNavigate();
  const [q, setQ] = useState('');
  const [dq, setDq] = useState('');
  const [filter, setFilter] = useState('all');
  const [sort, setSort] = useState('updated');
  const [page, setPage] = useState(1);
  const [del, setDel] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => { const t = setTimeout(() => setDq(q.trim().toLowerCase()), 160); return () => clearTimeout(t); }, [q]);
  useEffect(() => { setPage(1); }, [dq, filter, sort]);

  const loading = lots === null && !error;
  const rows = useMemo(() => {
    let L = lots || [];
    if (filter === 'pass') L = L.filter((l) => l.overall === 'PASS');
    if (filter === 'review') L = L.filter((l) => l.overall !== 'PASS');
    if (dq) L = L.filter((l) => [l.lot, l.product, l.coa, l.client].some((v) => String(v || '').toLowerCase().includes(dq)));
    return [...L].sort(SORTS[sort][1]);
  }, [lots, dq, filter, sort]);

  const pages = Math.max(1, Math.ceil(rows.length / PER));
  const cur = Math.min(page, pages);
  const view = rows.slice((cur - 1) * PER, cur * PER);

  async function copy(lot) {
    const url = `${config.baseUrl.replace(/\/$/, '')}/coa/${encodeURIComponent(lot)}`;
    try { await navigator.clipboard.writeText(url); toast('Certificate link copied'); } catch { toast(url, 'warn'); }
  }
  async function remove() {
    setBusy(true);
    try { await api(`/api/lots/${encodeURIComponent(del.lot)}`, { method: 'DELETE' }); toast(`Deleted ${del.lot}`); setDel(null); refresh(); }
    catch (e) { toast(e.message, 'warn'); }
    finally { setBusy(false); }
  }

  return (
    <>
      <PageHead title="Certificates" sub={lots ? `${plural(lots.length, 'certificate')} published.` : 'Every published certificate of analysis.'}>
        <Link to="/admin/generate" className="btn"><IconPlus />Generate COA</Link>
      </PageHead>

      <div className="toolbar">
        <div className="search"><IconSearch /><input className="input" type="search" placeholder="Search lot, product, COA number or client" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search certificates" /></div>
        <div className="seg" role="group" aria-label="Filter by result">
          {FILTERS.map(([k, l]) => <button key={k} className={filter === k ? 'on' : ''} onClick={() => setFilter(k)} aria-pressed={filter === k}>{l}</button>)}
        </div>
        <select className="select sort" value={sort} onChange={(e) => setSort(e.target.value)} aria-label="Sort by">
          {Object.entries(SORTS).map(([k, [l]]) => <option key={k} value={k}>{l}</option>)}
        </select>
      </div>

      {error && <p className="notice bad">{error}</p>}
      <section className="card-box flush">
        <div className="tbl-scroll">
          <table className="tbl">
            <thead><tr><th>Lot</th><th>Product</th><th className="hide-md">COA number</th><th className="hide-md">Client</th><th>Purity</th><th>Result</th><th className="hide-sm">Updated</th><th className="r">Actions</th></tr></thead>
            <tbody>
              {loading && Array.from({ length: 8 }, (_, i) => (
                <tr key={i}><td><Skel w={70} /></td><td><Skel w={170} /></td><td className="hide-md"><Skel w={120} /></td><td className="hide-md"><Skel w={110} /></td><td><Skel w={50} /></td><td><Skel w={62} h={22} r={11} /></td><td className="hide-sm"><Skel w={70} /></td><td className="r"><Skel w={96} style={{ marginLeft: 'auto' }} /></td></tr>
              ))}
              {!loading && view.map((l) => (
                <tr key={l.lot} className="row-link">
                  <td><a className="mono lot" href={`/coa/${encodeURIComponent(l.lot)}`} target="_blank" rel="noreferrer">{l.lot}</a></td>
                  <td>{l.product}</td>
                  <td className="hide-md mono muted">{l.coa}</td>
                  <td className="hide-md">{l.client}</td>
                  <td className="num">{l.purity || '—'}</td>
                  <td><StatusBadge value={l.overall} /></td>
                  <td className="hide-sm muted">{timeAgo(l.updated)}</td>
                  <td className="r">
                    <span className="row-actions">
                      <a className="icon-btn" data-tip="Open certificate" aria-label={`Open certificate ${l.lot}`} href={`/coa/${encodeURIComponent(l.lot)}`} target="_blank" rel="noreferrer"><IconExternal /></a>
                      <button className="icon-btn" data-tip="Copy link" aria-label={`Copy link for ${l.lot}`} onClick={() => copy(l.lot)}><IconCopy /></button>
                      <button className="icon-btn" data-tip="Edit" aria-label={`Edit ${l.lot}`} onClick={() => nav(`/admin/generate?lot=${encodeURIComponent(l.lot)}`)}><IconEdit /></button>
                      <button className="icon-btn danger" data-tip="Delete" aria-label={`Delete ${l.lot}`} onClick={() => setDel(l)}><IconTrash /></button>
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!loading && rows.length === 0 && (
          <div className="empty">
            <h3>{lots && lots.length ? 'No certificates match.' : 'No certificates yet.'}</h3>
            <p>{lots && lots.length ? 'Try a different search or filter.' : 'Generate your first certificate or bulk upload a CSV.'}</p>
            {!(lots && lots.length) && <Link to="/admin/generate" className="btn">Generate COA</Link>}
          </div>
        )}
        {!loading && rows.length > PER && (
          <div className="pager">
            <span>{(cur - 1) * PER + 1}–{Math.min(cur * PER, rows.length)} of {rows.length.toLocaleString()}</span>
            <span className="pager-btns">
              <button className="icon-btn" onClick={() => setPage(cur - 1)} disabled={cur === 1} aria-label="Previous page"><IconChevronLeft /></button>
              <span className="num">{cur} / {pages}</span>
              <button className="icon-btn" onClick={() => setPage(cur + 1)} disabled={cur === pages} aria-label="Next page"><IconChevronRight /></button>
            </span>
          </div>
        )}
      </section>

      <Modal open={Boolean(del)} onClose={() => setDel(null)} title="Delete certificate?" footer={<>
        <button className="btn ghost" onClick={() => setDel(null)}>Cancel</button>
        <button className="btn" style={{ background: 'var(--fail)', borderColor: 'var(--fail)' }} onClick={remove} disabled={busy}>{busy ? 'Deleting…' : 'Delete'}</button>
      </>}>
        {del && <p>Lot <b className="mono">{del.lot}</b> ({del.product}) will be removed and its public page will stop working. Anyone holding its QR code will see “not found”. This cannot be undone.</p>}
      </Modal>
    </>
  );
}
