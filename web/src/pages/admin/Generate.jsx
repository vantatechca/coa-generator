import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '../../lib/api.js';
import { useApp, useLots } from '../../lib/state.jsx';
import { PageHead } from './AdminLayout.jsx';
import { Modal, Skel, StatusBadge, useToast } from '../../components/ui.jsx';
import { IconCheck, IconAlert, IconPlus, IconTrash, IconUpload, IconDownload, IconEye, IconExternal } from '../../components/Icons.jsx';
import { fromInputDate, toInputDate, todayInput } from '../../lib/format.js';
import { SECTIONS, LABEL, DATE_KEYS, makeCode, parsePeaks, serializePeaks } from './fields.js';

const humanize = (msg) => msg.replace(/^Missing required value: (\w+)/, (_, k) => `${LABEL[k] || k} is required`);
const keyOf = (msg) => (msg.match(/^Missing required value: (\w+)/) || [])[1];

function Control({ f, value, onChange, invalid, lab, disabled }) {
  const id = `f-${f.k}`;
  const ph = f.dflt ? lab[f.dflt] : f.ph;
  return (
    <div className={`field${f.wide ? ' wide' : ''}`}>
      <label htmlFor={id}>{f.label}{f.req && <abbr title="Required"> *</abbr>}</label>
      <div className="input-wrap">
        <input id={id} className={`input${invalid ? ' invalid' : ''}${f.mono ? ' mono' : ''}`} type={f.type === 'date' ? 'date' : 'text'} inputMode={f.num ? 'decimal' : undefined}
          list={f.options ? `${id}-opts` : undefined} value={value} placeholder={ph} onChange={(e) => onChange(f.k, e.target.value)}
          autoComplete="off" spellCheck="false" disabled={disabled} aria-invalid={invalid || undefined} />
        {f.gen && <button type="button" className="btn ghost sm" onClick={() => onChange(f.k, makeCode())}>Generate</button>}
      </div>
      {f.options && <datalist id={`${id}-opts`}>{f.options.map((o) => <option key={o} value={o} />)}</datalist>}
      {f.hint && <span className="hint">{f.hint}</span>}
    </div>
  );
}

function PeaksEditor({ peaks, setPeaks }) {
  const total = peaks.reduce((a, p) => a + (parseFloat(p.pct) || 0), 0);
  const upd = (i, k, v) => setPeaks(peaks.map((p, j) => (j === i ? { ...p, [k]: v } : p)));
  const ok = Math.abs(total - 100) <= 0.15;
  return (
    <div className="peaks">
      <div className="peaks-head"><span>Retention time (min)</span><span>Label</span><span>Area (%)</span><span /></div>
      {peaks.map((p, i) => (
        <div className="peaks-row" key={i}>
          <input className="input num" inputMode="decimal" value={p.rt} placeholder="13.38" onChange={(e) => upd(i, 'rt', e.target.value)} aria-label={`Peak ${i + 1} retention time`} />
          <input className="input" value={p.label} placeholder={i === 0 ? 'Main compound' : `Peak ${i}`} onChange={(e) => upd(i, 'label', e.target.value)} aria-label={`Peak ${i + 1} label`} />
          <input className="input num" inputMode="decimal" value={p.pct} placeholder="99.83" onChange={(e) => upd(i, 'pct', e.target.value)} aria-label={`Peak ${i + 1} area percent`} />
          <button type="button" className="icon-btn danger" onClick={() => setPeaks(peaks.filter((_, j) => j !== i))} disabled={peaks.length === 1} aria-label={`Remove peak ${i + 1}`}><IconTrash /></button>
        </div>
      ))}
      <div className="peaks-foot">
        <button type="button" className="btn ghost sm" onClick={() => setPeaks([...peaks, { rt: '', label: '', pct: '' }])}><IconPlus />Add peak</button>
        <span className={`peaks-sum num ${ok ? 'ok' : 'warn'}`}>{ok ? <IconCheck /> : <IconAlert />}Total {total.toFixed(2)}%{ok ? '' : ' · should be about 100%'}</span>
      </div>
    </div>
  );
}

function Single() {
  const { config } = useApp();
  const { refresh } = useLots();
  const toast = useToast();
  const [sp] = useSearchParams();
  const editLot = sp.get('lot');
  const lab = useMemo(() => ({ name: config.lab.lab_name, address: config.lab.lab_address, website: config.lab.lab_website }), [config]);

  const blank = useCallback(() => ({ issued_date: todayInput(), access_code: makeCode() }), []);
  const [vals, setVals] = useState(() => blank());
  const [peaks, setPeaks] = useState([{ rt: '', label: '', pct: '' }, { rt: '', label: '', pct: '' }]);
  const [loading, setLoading] = useState(Boolean(editLot));
  const [check, setCheck] = useState(null);
  const [checking, setChecking] = useState(false);
  const [tried, setTried] = useState(false);
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(null);
  const [preview, setPreview] = useState(false);
  const seq = useRef(0);

  // Load an existing lot for editing
  useEffect(() => {
    if (!editLot) return;
    setLoading(true);
    api(`/api/lots/${encodeURIComponent(editLot)}`).then(({ row }) => {
      const v = { ...row };
      for (const k of DATE_KEYS) v[k] = toInputDate(row[k]);
      setVals(v); setPeaks(parsePeaks(row.chrom_peaks).length ? parsePeaks(row.chrom_peaks) : [{ rt: '', label: '', pct: '' }]);
    }).catch((e) => toast(e.message, 'warn')).finally(() => setLoading(false));
  }, [editLot]); // eslint-disable-line react-hooks/exhaustive-deps

  const setVal = (k, v) => { setVals((x) => ({ ...x, [k]: v })); setDone(null); };
  const row = useMemo(() => {
    const r = { ...vals, chrom_peaks: serializePeaks(peaks) };
    for (const k of DATE_KEYS) r[k] = fromInputDate(vals[k]);
    return r;
  }, [vals, peaks]);

  // Debounced live validation against the real server rules
  useEffect(() => {
    if (loading) return undefined;
    const my = ++seq.current;
    setChecking(true);
    const t = setTimeout(() => {
      api('/api/preview', { method: 'POST', json: { row } })
        .then((r) => { if (my === seq.current) setCheck(r); })
        .catch(() => { if (my === seq.current) setCheck({ errors: ['Could not reach the server'], warnings: [] }); })
        .finally(() => { if (my === seq.current) setChecking(false); });
    }, 600);
    return () => clearTimeout(t);
  }, [row, loading]);

  const missing = useMemo(() => new Set((check ? check.errors : []).map(keyOf).filter(Boolean)), [check]);
  const errors = check ? check.errors.map(humanize) : [];
  const ready = check && check.errors.length === 0;
  const nMissing = (check ? check.errors : []).filter(keyOf).length;
  const others = check ? check.errors.filter((e) => !keyOf(e)) : [];

  async function publish() {
    setTried(true);
    if (!ready) { toast('Complete the highlighted fields first', 'warn'); document.querySelector('.input.invalid')?.scrollIntoView({ behavior: 'smooth', block: 'center' }); return; }
    setSaving(true);
    try {
      const r = await api('/api/lots', { method: 'POST', json: { row } });
      setDone(r); refresh();
      toast(`${r.status === 'updated' ? 'Updated' : 'Published'} ${r.lot}`);
    } catch (e) { toast(e.message, 'warn'); }
    finally { setSaving(false); }
  }

  if (loading) return <div className="gen"><div className="gen-form">{[0, 1].map((i) => <div className="card-box" key={i}><Skel w={160} h={18} /><Skel h={40} style={{ marginTop: 20 }} /><Skel h={40} style={{ marginTop: 14 }} /></div>)}</div></div>;

  return (
    <div className="gen">
      <div className="gen-form">
        {SECTIONS.map((s) => (
          <section className="card-box" key={s.id} id={s.id}>
            <div className="card-head"><div><h2>{s.title}</h2><p>{s.blurb}</p></div></div>
            <div className="form-grid">
              {s.fields.map((f) => (
                <Control key={f.k} f={f} value={vals[f.k] || ''} onChange={setVal} lab={lab}
                  invalid={tried && missing.has(f.k)} disabled={f.k === 'lot_number' && Boolean(editLot)} />
              ))}
            </div>
            {s.peaks && <><div className="divider" /><PeaksEditor peaks={peaks} setPeaks={(p) => { setPeaks(p); setDone(null); }} /></>}
          </section>
        ))}
      </div>

      <aside className="gen-side">
        <div className="card-box sticky">
          <div className="card-head"><div><h2>{editLot ? `Editing ${editLot}` : 'Checks'}</h2><p>Validated by the same rules as the CSV import.</p></div></div>
          {done ? (
            <div className="result ok">
              <div className="result-t"><IconCheck />{done.status === 'updated' ? 'Certificate updated' : 'Certificate published'}</div>
              <p>Result: <StatusBadge value={done.overall} /></p>
              <div className="stack-btns">
                <a className="btn" href={`/coa/${encodeURIComponent(done.lot)}`} target="_blank" rel="noreferrer"><IconExternal />Open certificate</a>
                <Link className="btn ghost" to="/admin/certificates">View all certificates</Link>
              </div>
            </div>
          ) : (
            <>
              <div className={`result ${checking && !check ? '' : ready ? 'ok' : 'bad'}`} aria-live="polite">
                {!check ? <Skel h={20} /> : ready ? (
                  <><div className="result-t"><IconCheck />Ready to publish</div><p>Overall result: <StatusBadge value={check.overall} /></p></>
                ) : (
                  <><div className="result-t"><IconAlert />{nMissing ? `${nMissing} required ${nMissing === 1 ? 'field' : 'fields'} missing` : 'Fix the issues below'}</div>
                    {others.length > 0 && <ul>{others.map((e) => <li key={e}>{e}</li>)}</ul>}
                    {nMissing > 0 && !others.length && <p>{errors.slice(0, 3).join(' · ')}{nMissing > 3 ? ` · +${nMissing - 3} more` : ''}</p>}</>
                )}
              </div>
              {check && check.warnings.length > 0 && (
                <div className="result warn"><div className="result-t"><IconAlert />Check these</div><ul>{check.warnings.map((w) => <li key={w}>{w}</li>)}</ul></div>
              )}
              <div className="stack-btns">
                <button className="btn" onClick={publish} disabled={saving}>{saving ? 'Publishing…' : editLot ? 'Save changes' : 'Publish certificate'}</button>
                <button className="btn ghost" onClick={() => setPreview(true)} disabled={!ready}><IconEye />Preview certificate</button>
              </div>
              <p className="side-note">Preview renders the real certificate without saving it.</p>
            </>
          )}
        </div>
      </aside>

      <Modal open={preview} onClose={() => setPreview(false)} title="Certificate preview" wide>
        {check && check.html && <iframe className="preview-frame" title="Certificate preview" srcDoc={check.html} sandbox="allow-same-origin allow-modals" />}
      </Modal>
    </div>
  );
}

function Bulk() {
  const { refresh } = useLots();
  const toast = useToast();
  const input = useRef(null);
  const [file, setFile] = useState(null);
  const [drag, setDrag] = useState(false);
  const [busy, setBusy] = useState(false);
  const [res, setRes] = useState(null);

  const pick = (f) => { if (f) { setFile(f); setRes(null); } };
  async function run() {
    setBusy(true); setRes(null);
    try {
      const r = await api('/api/import', { method: 'POST', headers: { 'content-type': 'text/csv' }, body: await file.text() });
      setRes(r); refresh();
      toast(`${r.imported.length} certificate${r.imported.length === 1 ? '' : 's'} imported`);
    } catch (e) { toast(e.message, 'warn'); }
    finally { setBusy(false); }
  }
  const created = res ? res.imported.filter((i) => i.status === 'created').length : 0;

  return (
    <div className="bulk">
      <section className="card-box">
        <div className="card-head"><div><h2>Upload a CSV</h2><p>One row per lot. Every valid row is saved in a single write; rows with errors are rejected with reasons, and nothing is half-published.</p></div>
          <a className="btn ghost sm" href="/sample.csv"><IconDownload />Sample CSV</a></div>
        <div className={`drop${drag ? ' over' : ''}${file ? ' has' : ''}`}
          onDragOver={(e) => { e.preventDefault(); setDrag(true); }} onDragLeave={() => setDrag(false)}
          onDrop={(e) => { e.preventDefault(); setDrag(false); pick(e.dataTransfer.files[0]); }}
          onClick={() => input.current.click()} role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); input.current.click(); } }}>
          <IconUpload />
          {file ? <><b>{file.name}</b><span>{(file.size / 1024).toFixed(1)} KB · click to choose a different file</span></> : <><b>Drop a CSV here, or click to browse</b><span>Excel users: save as “CSV (comma delimited)” first.</span></>}
          <input ref={input} type="file" accept=".csv,text/csv" hidden onChange={(e) => pick(e.target.files[0])} />
        </div>
        <div className="bulk-actions">
          <button className="btn" onClick={run} disabled={!file || busy}>{busy ? 'Importing…' : 'Import certificates'}</button>
          {busy && <span className="indeterminate" aria-hidden="true"><i /></span>}
        </div>
      </section>

      {res && (
        <section className="card-box">
          <div className="card-head"><div><h2>Import summary</h2></div></div>
          <div className="kpis four">
            <div className="kpi"><span className="kpi-l">Created</span><span className="kpi-v num">{created}</span></div>
            <div className="kpi"><span className="kpi-l">Updated</span><span className="kpi-v num">{res.imported.length - created}</span></div>
            <div className="kpi"><span className="kpi-l">Rejected</span><span className={`kpi-v num ${res.rejected.length ? 'bad' : ''}`}>{res.rejected.length}</span></div>
            <div className="kpi"><span className="kpi-l">Warnings</span><span className={`kpi-v num ${res.warnings.length ? 'warnTxt' : ''}`}>{res.warnings.length}</span></div>
          </div>
          {res.rejected.length > 0 && (
            <div className="issues bad"><h3>Rejected rows</h3>
              <ul>{res.rejected.map((r) => <li key={r.lot}><b className="mono">{r.lot}</b><span>{r.errors.map(humanize).join(' · ')}</span></li>)}</ul></div>
          )}
          {res.warnings.length > 0 && (
            <div className="issues warn"><h3>Warnings</h3>
              <ul>{res.warnings.map((w, i) => <li key={i}><b className="mono">{w.lot}</b><span>{w.warning}</span></li>)}</ul></div>
          )}
          <div className="bulk-actions"><Link className="btn" to="/admin/certificates">View certificates</Link></div>
        </section>
      )}
    </div>
  );
}

export default function Generate() {
  const [sp, setSp] = useSearchParams();
  const editing = Boolean(sp.get('lot'));
  const tab = editing ? 'single' : sp.get('tab') === 'bulk' ? 'bulk' : 'single';
  const go = (t) => setSp(t === 'bulk' ? { tab: 'bulk' } : {}, { replace: true });
  return (
    <>
      <PageHead title={editing ? 'Edit certificate' : 'Generate COA'} sub="Create one certificate by hand, or publish a whole batch from a CSV." />
      {!editing && (
        <div className="tabs" role="tablist">
          <button role="tab" aria-selected={tab === 'single'} className={tab === 'single' ? 'on' : ''} onClick={() => go('single')}>Single certificate</button>
          <button role="tab" aria-selected={tab === 'bulk'} className={tab === 'bulk' ? 'on' : ''} onClick={() => go('bulk')}>Bulk upload (CSV)</button>
        </div>
      )}
      {tab === 'single' ? <Single key={sp.get('lot') || 'new'} /> : <Bulk />}
    </>
  );
}
