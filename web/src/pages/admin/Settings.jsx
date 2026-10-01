import { useRef, useState } from 'react';
import { api } from '../../lib/api.js';
import { useApp } from '../../lib/state.jsx';
import { PageHead } from './AdminLayout.jsx';
import { useToast } from '../../components/ui.jsx';
import { IconImage, IconUpload } from '../../components/Icons.jsx';

function ImageCard({ title, blurb, endpoint, current, empty, done, reload }) {
  const toast = useToast();
  const input = useRef(null);
  const [file, setFile] = useState(null);
  const [busy, setBusy] = useState(false);
  const [bust, setBust] = useState(0);

  async function upload() {
    setBusy(true);
    try {
      await api(endpoint, { method: 'POST', headers: { 'content-type': file.type }, body: await file.arrayBuffer() });
      await reload(); setBust(Date.now()); setFile(null); toast(done);
    } catch (e) { toast(e.message, 'warn'); }
    finally { setBusy(false); }
  }
  const preview = file ? URL.createObjectURL(file) : current ? `${current}?v=${bust}` : '';
  return (
    <section className="card-box">
      <div className="card-head"><div><h2>{title}</h2><p>{blurb}</p></div></div>
      <div className="logo-row">
        <div className="logo-box">{preview ? <img src={preview} alt={`Current ${title.toLowerCase()}`} /> : <span><IconImage />{empty}</span>}</div>
        <div className="logo-ctl">
          <input ref={input} type="file" accept="image/png,image/jpeg,image/webp" hidden onChange={(e) => setFile(e.target.files[0] || null)} />
          <button className="btn ghost" onClick={() => input.current.click()}>Choose image</button>
          <button className="btn" onClick={upload} disabled={!file || busy}><IconUpload />{busy ? 'Uploading…' : 'Upload'}</button>
          {file && <span className="muted">{file.name}</span>}
        </div>
      </div>
    </section>
  );
}

export default function Settings() {
  const { config, reloadConfig } = useApp();
  return (
    <>
      <PageHead title="Settings" sub="Branding and deployment details." />
      <div className="settings">
        <ImageCard title="Certificate logo" endpoint="/api/logo" current={config.logo} empty="No logo uploaded" reload={reloadConfig}
          done="Logo updated on every certificate"
          blurb="PNG, JPG or WebP. It appears in the header and footer of every certificate. Until you upload one, the laboratory name is printed as a wordmark." />
        <ImageCard title="Signature image" endpoint="/api/signature" current={config.signature} empty="No signature uploaded" reload={reloadConfig}
          done="Signature updated on every certificate"
          blurb="PNG with a transparent background works best. It is printed above the signature line; the signatory’s name and title come from each certificate." />
        <section className="card-box">
          <div className="card-head"><div><h2>Deployment</h2></div></div>
          <dl className="kv">
            <div><dt>Mode</dt><dd>{config.mode}</dd></div>
            <div><dt>Public URL</dt><dd className="mono">{config.baseUrl}</dd></div>
            <div><dt>Default laboratory</dt><dd>{config.lab.lab_name}<br /><span className="muted">{config.lab.lab_address} · {config.lab.lab_website}</span></dd></div>
          </dl>
          <p className="side-note">The public URL is set with the BASE_URL environment variable and is what each certificate’s QR code points to.</p>
        </section>
      </div>
    </>
  );
}
