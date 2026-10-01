import { useState } from 'react';
import { NavLink, Outlet, Link } from 'react-router-dom';
import { LotsProvider, useApp } from '../../lib/state.jsx';
import { Logo, Page } from '../../components/ui.jsx';
import { IconDashboard, IconDocs, IconPlus, IconSettings, IconExternal, IconLogout, IconMenu, IconX } from '../../components/Icons.jsx';

const NAV = [
  { to: '/admin', end: true, label: 'Dashboard', icon: IconDashboard },
  { to: '/admin/certificates', label: 'Certificates', icon: IconDocs },
  { to: '/admin/generate', label: 'Generate COA', icon: IconPlus },
  { to: '/admin/settings', label: 'Settings', icon: IconSettings },
];

export default function AdminLayout() {
  const { config, signOut } = useApp();
  const [open, setOpen] = useState(false);
  return (
    <LotsProvider>
      <div className="shell">
        <aside className={`side${open ? ' open' : ''}`}>
          <Link to="/" className="side-brand"><Logo src={config.logo} /></Link>
          <nav className="side-nav" aria-label="Admin">
            {NAV.map((n) => (
              <NavLink key={n.to} to={n.to} end={n.end} onClick={() => setOpen(false)} className={({ isActive }) => `side-link${isActive ? ' active' : ''}`}>
                <n.icon />{n.label}
              </NavLink>
            ))}
          </nav>
          <div className="side-foot">
            <a className="side-link" href="/" target="_blank" rel="noreferrer"><IconExternal />Public site</a>
            {config.mode === 'production' && <button className="side-link" onClick={signOut}><IconLogout />Sign out</button>}
          </div>
        </aside>
        {open && <div className="scrim" onClick={() => setOpen(false)} />}
        <div className="main">
          <header className="topbar">
            <button className="icon-btn menu-btn" onClick={() => setOpen((o) => !o)} aria-label="Toggle navigation">{open ? <IconX /> : <IconMenu />}</button>
            <span className={`mode ${config.mode}`}>{config.mode === 'demo' ? 'Demo mode · placeholder data' : 'Production'}</span>
          </header>
          <div className="content"><Outlet /></div>
        </div>
      </div>
    </LotsProvider>
  );
}

export function PageHead({ title, sub, children }) {
  return (
    <Page title={title}>
      <div className="page-head">
        <div><h1>{title}</h1>{sub && <p>{sub}</p>}</div>
        <div className="page-actions">{children}</div>
      </div>
    </Page>
  );
}
