import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { IconCheck, IconX, IconAlert } from './Icons.jsx';

/* Fade/slide in once when scrolled into view. */
export function Reveal({ as: Tag = 'div', delay = 0, className = '', children, ...rest }) {
  const ref = useRef(null);
  const [seen, setSeen] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el || seen) return undefined;
    if (!('IntersectionObserver' in window)) { setSeen(true); return undefined; }
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setSeen(true); io.disconnect(); } }, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });
    io.observe(el);
    return () => io.disconnect();
  }, [seen]);
  return <Tag ref={ref} className={`reveal${seen ? ' in' : ''} ${className}`} style={{ '--d': `${delay}ms` }} {...rest}>{children}</Tag>;
}

/* Thin line across the top on every navigation. Re-keyed per path so the animation restarts. */
export function RouteProgress() {
  const { pathname } = useLocation();
  return <div className="progress" aria-hidden="true"><i key={pathname} /></div>;
}

/* Wraps a routed page so it fades in on navigation and scrolls to top. */
export function Page({ children, title }) {
  const { pathname, hash } = useLocation();
  useEffect(() => { document.title = title ? `${title} · MSD Sciences` : 'MSD Sciences'; }, [title]);
  useEffect(() => { if (!hash) window.scrollTo({ top: 0, behavior: 'instant' }); }, [pathname, hash]);
  return <div className="page-enter" key={pathname}>{children}</div>;
}

export const Skel = ({ w = '100%', h = 14, r, style }) => <span className="skel" style={{ display: 'block', width: w, height: h, borderRadius: r, ...style }} />;

export function StatusBadge({ value }) {
  if (value === 'PASS') return <span className="badge pass"><IconCheck />Pass</span>;
  if (value === 'INVALID') return <span className="badge neutral"><IconAlert />Invalid</span>;
  return <span className="badge fail"><IconX />Review</span>;
}

export function Logo({ size = 28, light = false, src }) {
  return (
    <span className="brand">
      {src ? <img src={src} alt="" style={{ height: size, width: 'auto' }} /> : (
        <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true">
          <rect width="32" height="32" rx="7" fill={light ? '#fff' : '#12305e'} />
          <path d="M5 22h6l2.5-11 3 15 2.5-8H27" fill="none" stroke={light ? '#12305e' : '#fff'} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )}
      <span className="brand-name" style={{ color: light ? '#fff' : undefined }}>MSD Sciences</span>
    </span>
  );
}

/* Toasts */
const ToastCtx = createContext(() => {});
export const useToast = () => useContext(ToastCtx);
export function ToastProvider({ children }) {
  const [items, setItems] = useState([]);
  const push = useCallback((message, kind = 'ok') => {
    const id = Math.random().toString(36).slice(2);
    setItems((x) => [...x, { id, message, kind }]);
    setTimeout(() => setItems((x) => x.filter((i) => i.id !== id)), 3600);
  }, []);
  return (
    <ToastCtx.Provider value={push}>
      {children}
      <div className="toasts" role="status" aria-live="polite">
        {items.map((t) => (
          <div key={t.id} className={`toast ${t.kind}`}>{t.kind === 'ok' ? <IconCheck /> : <IconAlert />}{t.message}</div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}

/* Modal with focus on open, Esc to close, click-outside to close. */
export function Modal({ open, onClose, title, children, wide = false, footer }) {
  const ref = useRef(null);
  useEffect(() => {
    if (!open) return undefined;
    const prev = document.activeElement;
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    ref.current && ref.current.focus();
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = ''; prev && prev.focus && prev.focus(); };
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="modal-back" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className={`modal${wide ? ' wide' : ''}`} role="dialog" aria-modal="true" aria-label={title} tabIndex={-1} ref={ref}>
        <div className="modal-head"><h3>{title}</h3><button className="icon-btn" onClick={onClose} aria-label="Close"><IconX /></button></div>
        <div className="modal-body">{children}</div>
        {footer && <div className="modal-foot">{footer}</div>}
      </div>
    </div>
  );
}
