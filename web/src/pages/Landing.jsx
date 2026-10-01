import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Page, Reveal, Logo } from '../components/ui.jsx';
import { IconArrow, IconFlask, IconShield, IconQr, IconPin, IconCheck, IconDocs, IconMenu, IconX } from '../components/Icons.jsx';
import { useApp } from '../lib/state.jsx';

const ADDRESS = '661 University Ave, Toronto, ON M5G 1M1, Canada';
const SITE = 'msdsciences.online';

/* An illustrative chromatogram: one dominant peak with a minor one, built from Gaussians. Drawn as SVG. */
function chromPath(w, h) {
  const peaks = [{ c: 0.62, a: 1, s: 0.012 }, { c: 0.2, a: 0.05, s: 0.01 }];
  const pts = [];
  for (let i = 0; i <= 320; i++) {
    const x = i / 320;
    let y = 0;
    for (const p of peaks) y += p.a * Math.exp(-((x - p.c) ** 2) / (2 * p.s * p.s));
    pts.push(`${(x * w).toFixed(1)},${(h - 6 - y * (h - 22)).toFixed(1)}`);
  }
  return `M${pts.join(' L')}`;
}

function SpecimenCard() {
  const d = useMemo(() => chromPath(420, 150), []);
  return (
    <figure className="specimen" aria-label="Example layout of a certificate of analysis">
      <div className="spec-head">
        <div><span className="spec-k">Certificate of Analysis</span><b>Example report</b></div>
        <span className="badge pass"><IconCheck />Pass</span>
      </div>
      <dl className="spec-grid">
        <div><dt>Purity</dt><dd className="num">99.8%</dd></div>
        <div><dt>Identity</dt><dd>Confirmed</dd></div>
        <div><dt>Fentanyl screen</dt><dd>Not detected</dd></div>
        <div><dt>Heavy metals</dt><dd>Not detected</dd></div>
      </dl>
      <svg className="spec-chrom" viewBox="0 0 420 150" role="img" aria-label="Illustrative HPLC chromatogram">
        <line x1="0" y1="144" x2="420" y2="144" stroke="#cfcabd" />
        <path d={d} pathLength="1" fill="none" stroke="#12305e" strokeWidth="1.6" strokeLinejoin="round" className="draw" />
        <text x="262" y="30" fontSize="10" fill="#44505f" fontFamily="IBM Plex Mono">main peak</text>
      </svg>
      <figcaption>Illustration of the report layout. Not a real result.</figcaption>
    </figure>
  );
}

const SERVICES = [
  { icon: IconShield, title: 'Drugs', text: 'Confirm what a substance is and how pure it is, and screen for dangerous adulterants such as fentanyl.', items: ['Identity confirmation', 'Purity quantitation', 'Adulterant screening'] },
  { icon: IconFlask, title: 'Research chemicals', text: 'Independent verification for peptides and research compounds before they go into your work.', items: ['Purity and content by HPLC', 'Two-sample conformity', 'Heavy metals and sterility'] },
  { icon: IconDocs, title: 'Laboratory chemicals', text: 'Reagents and general laboratory chemicals tested against what their labels claim.', items: ['Assay against label claim', 'Elemental impurities', 'Documented, traceable results'] },
];

const PANEL = [
  ['Purity & identity', 'HPLC with UV detection at 214 nm. Each sample is run in duplicate and the mean and standard deviation are reported.'],
  ['Net peptide content', 'Quantity of active compound per vial, reported against the labelled amount.'],
  ['Fentanyl screen', 'A dedicated screen on every sample, reported as Detected or Not detected.'],
  ['Heavy metals', 'Arsenic, cadmium, chromium, mercury and lead by ICP-MS, each against a stated limit.'],
  ['Sterility', 'Growth testing, reported as No growth or Growth observed.'],
  ['Endotoxin', 'Reported in EU/mL against a stated maximum.'],
];

const STEPS = [
  ['01', 'Submit your sample', 'Send the sample with its lot or batch number and the labelled content.'],
  ['02', 'We test it', 'Purity, identity, contaminants, sterility and endotoxin, run on the same sample.'],
  ['03', 'You receive a certificate', 'A formal certificate of analysis with the chromatogram, a QR code and an access code.'],
  ['04', 'Anyone can verify it', 'Scan the QR code or enter the lot number to open the original, published record.'],
];

export default function Landing() {
  const [scrolled, setScrolled] = useState(false);
  const [menu, setMenu] = useState(false);
  const [lot, setLot] = useState('');
  const [err, setErr] = useState('');
  const { config } = useApp();

  useEffect(() => {
    const on = () => setScrolled(window.scrollY > 8);
    on(); window.addEventListener('scroll', on, { passive: true });
    return () => window.removeEventListener('scroll', on);
  }, []);

  function verify(e) {
    e.preventDefault();
    const v = lot.trim();
    if (!/^[A-Za-z0-9._-]{1,64}$/.test(v)) { setErr('Enter the lot number exactly as printed on the certificate (letters, digits, dot, dash).'); return; }
    window.location.assign(`/coa/${encodeURIComponent(v)}`);
  }

  const close = () => setMenu(false);
  return (
    <Page title="Independent analytical testing">
      <header className={`nav${scrolled ? ' scrolled' : ''}`}>
        <div className="wrap nav-in">
          <a href="/" aria-label="MSD Sciences home"><Logo src={config && config.logo} /></a>
          <nav className={`nav-links${menu ? ' open' : ''}`} aria-label="Primary">
            <a href="#services" onClick={close}>Services</a>
            <a href="#testing" onClick={close}>Testing</a>
            <a href="#process" onClick={close}>Process</a>
            <a href="#verify" onClick={close}>Verify</a>
            <Link to="/admin" className="btn ghost sm" onClick={close}>Staff sign in</Link>
          </nav>
          <button className="icon-btn nav-toggle" onClick={() => setMenu((m) => !m)} aria-label={menu ? 'Close menu' : 'Open menu'} aria-expanded={menu}>{menu ? <IconX /> : <IconMenu />}</button>
        </div>
      </header>

      <main>
        <section className="hero">
          <div className="wrap hero-in">
            <div className="hero-copy">
              <p className="eyebrow">Independent analytical laboratory · Toronto</p>
              <h1>Know exactly what is in your sample.</h1>
              <p className="lede">For five years MSD Sciences has tested drugs, research chemicals and laboratory chemicals. Every result is issued as a certificate of analysis that anyone can verify online.</p>
              <div className="hero-cta">
                <a href="#verify" className="btn lg">Verify a certificate <IconArrow className="arrow" /></a>
                <a href="#testing" className="btn lg ghost">What we test</a>
              </div>
            </div>
            <div className="hero-art"><SpecimenCard /></div>
          </div>
          <div className="wrap">
            <dl className="facts">
              <div><dt>In operation</dt><dd>5 years</dd></div>
              <div><dt>Laboratory</dt><dd>Toronto, Canada</dd></div>
              <div><dt>Every sample</dt><dd>Tested in duplicate</dd></div>
              <div><dt>Every certificate</dt><dd>Verifiable by QR code</dd></div>
            </dl>
          </div>
        </section>

        <section id="services" className="section">
          <div className="wrap">
            <Reveal className="section-head">
              <p className="eyebrow">Services</p>
              <h2>Testing for the substances people actually need answers about.</h2>
            </Reveal>
            <div className="cards">
              {SERVICES.map((s, i) => (
                <Reveal key={s.title} delay={i * 80} className="card service">
                  <s.icon className="service-icon" />
                  <h3>{s.title}</h3>
                  <p>{s.text}</p>
                  <ul>{s.items.map((it) => <li key={it}><IconCheck />{it}</li>)}</ul>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        <section id="testing" className="section band">
          <div className="wrap split">
            <Reveal className="split-head">
              <p className="eyebrow light">The test panel</p>
              <h2>One sample, a full picture.</h2>
              <p>The panel below is what appears on a certificate. Every figure is calculated from the measured data, so the pass or fail shown can never disagree with the numbers beside it.</p>
            </Reveal>
            <Reveal delay={100}>
              <ol className="panel">
                {PANEL.map(([k, v]) => (
                  <li key={k}><span className="panel-k">{k}</span><span className="panel-v">{v}</span></li>
                ))}
              </ol>
            </Reveal>
          </div>
        </section>

        <section id="process" className="section">
          <div className="wrap">
            <Reveal className="section-head">
              <p className="eyebrow">Process</p>
              <h2>From sample to a certificate you can check.</h2>
            </Reveal>
            <ol className="steps">
              {STEPS.map(([n, t, d], i) => (
                <Reveal as="li" key={n} delay={i * 80}>
                  <span className="step-n mono">{n}</span>
                  <h3>{t}</h3>
                  <p>{d}</p>
                </Reveal>
              ))}
            </ol>
          </div>
        </section>

        <section id="verify" className="section verify">
          <div className="wrap verify-in">
            <Reveal>
              <IconQr className="verify-icon" />
              <h2>Verify a certificate</h2>
              <p>Enter the lot number printed on your certificate to open the published record. If you have the document in hand, scanning its QR code goes to the same page.</p>
            </Reveal>
            <Reveal delay={100}>
              <form onSubmit={verify} className="verify-form" noValidate>
                <label htmlFor="lot" className="label">Lot number</label>
                <div className="verify-row">
                  <input id="lot" className={`input lg${err ? ' invalid' : ''}`} value={lot} onChange={(e) => { setLot(e.target.value); setErr(''); }} placeholder="e.g. RT0004" autoComplete="off" spellCheck="false" aria-describedby="lot-err" />
                  <button className="btn lg" type="submit">Open certificate</button>
                </div>
                <p id="lot-err" className="form-err" role="alert">{err}</p>
              </form>
            </Reveal>
          </div>
        </section>
      </main>

      <footer className="footer">
        <div className="wrap footer-in">
          <div>
            <Logo light src={config && config.logo} />
            <p className="footer-about">Independent analytical testing for drugs, research chemicals and laboratory chemicals.</p>
          </div>
          <address>
            <span className="label light">Laboratory</span>
            <p><IconPin />{ADDRESS}</p>
            <p><a href={`https://${SITE}`}>{SITE}</a></p>
          </address>
        </div>
        <div className="wrap footer-base"><span>© {new Date().getFullYear()} MSD Sciences</span><Link to="/admin">Staff sign in</Link></div>
      </footer>
    </Page>
  );
}
