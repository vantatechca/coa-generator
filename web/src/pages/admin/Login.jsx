import { useState } from 'react';
import { Navigate, useLocation, useNavigate, Link } from 'react-router-dom';
import { useApp } from '../../lib/state.jsx';
import { Logo, Page } from '../../components/ui.jsx';
import { IconEye } from '../../components/Icons.jsx';

export default function Login() {
  const { ready, authed, signIn, config } = useApp();
  const [value, setValue] = useState('');
  const [show, setShow] = useState(false);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const nav = useNavigate();
  const loc = useLocation();
  if (ready && authed) return <Navigate to={(loc.state && loc.state.from) || '/admin'} replace />;

  async function submit(e) {
    e.preventDefault();
    setBusy(true); setErr('');
    try { await signIn(value.trim()); nav((loc.state && loc.state.from) || '/admin', { replace: true }); }
    catch { setErr('That token was not accepted. Check it and try again.'); }
    finally { setBusy(false); }
  }

  return (
    <Page title="Sign in">
      <div className="login">
        <form className="login-card" onSubmit={submit}>
          <Link to="/"><Logo src={config && config.logo} /></Link>
          <h1>Staff sign in</h1>
          <p>Enter the admin token for this deployment to manage certificates.</p>
          <div className="field">
            <label htmlFor="tok">Admin token</label>
            <div className="input-wrap">
              <input id="tok" className={`input${err ? ' invalid' : ''}`} type={show ? 'text' : 'password'} value={value} onChange={(e) => { setValue(e.target.value); setErr(''); }} autoComplete="current-password" autoFocus spellCheck="false" />
              <button type="button" className="icon-btn" onClick={() => setShow((s) => !s)} aria-label={show ? 'Hide token' : 'Show token'} aria-pressed={show}><IconEye /></button>
            </div>
            <p className="form-err" role="alert">{err}</p>
          </div>
          <button className="btn lg" disabled={!value.trim() || busy}>{busy ? 'Checking…' : 'Sign in'}</button>
        </form>
      </div>
    </Page>
  );
}
