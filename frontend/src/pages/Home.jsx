import { useRef, useState, useEffect } from "react";
import NavbarHome from "../components/NavbarHome";
import Footer from "../components/Footer";
import LoginModal from "../modals/LoginModal";
import dashboardIcon from "../assets/dashboard.png";
import "../style/Home.css";
 
/* Tiny hook: detect when element enters viewport */
function useInView(ref, threshold = 0.15) {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setVisible(true); },
      { threshold }
    );
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, [ref, threshold]);
  return visible;
}
 
/* Animated counter */
function Counter({ target, suffix = "" }) {
  const [val, setVal] = useState(0);
  useEffect(() => {
    let start = 0;
    const step = target / 48;
    const t = setInterval(() => {
      start += step;
      if (start >= target) { setVal(target); clearInterval(t); }
      else setVal(Math.floor(start));
    }, 18);
    return () => clearInterval(t);
  }, [target]);
  return <>{val}{suffix}</>;
}
 
export default function Home() {
  const [openLogin, setOpenLogin] = useState(false);
  const aboutRef = useRef(null);
  const featuresRef = useRef(null);
  const workbenchRef = useRef(null);
 
  const featuresVisible = useInView(featuresRef);
  const workbenchVisible = useInView(workbenchRef);
 
  return (
    <div className="home-page">
      <NavbarHome
        onLoginClick={() => setOpenLogin(true)}
        onScrollToAbout={() => aboutRef.current?.scrollIntoView({ behavior: "smooth" })}
      />
 
      <div className="home-page__bg" />
 
      {/* ── HERO ── */}
      <section className="home-hero">
        <div className="home-hero__left">
          <div className="home-hero__eyebrow">AI-powered risk intelligence</div>
 
          <h1>
            Helios
          </h1>
 
          <p className="home-hero__lead">
            Fraud detection, credit-risk review, and analyst case management — unified in one enterprise platform.
          </p>
          <p className="home-hero__body">
            Built for banks and financial institutions, Helios centralizes transaction monitoring,
            credit assessment, and review workflows into a single operational experience trusted by risk teams.
          </p>
 
          <div className="home-hero__actions">
            <button className="home-btn home-btn--primary" onClick={() => setOpenLogin(true)}>
              Get started 
            </button>
            <button
              className="home-btn home-btn--secondary"
              onClick={() => aboutRef.current?.scrollIntoView({ behavior: "smooth" })}
            >
              See platform
            </button>
          </div>
        </div>
 
        <div className="home-hero__right">
          <div className="home-preview">
            <div className="home-preview__header">
              <span>Live Monitoring</span>
              <span className="home-preview__live">Live</span>
            </div>
 
            <div className="home-preview__chart">
              <div className="home-preview__chart-bars">
                {Array.from({ length: 12 }).map((_, i) => (
                  <div key={i} className="home-preview__chart-bar" />
                ))}
              </div>
            </div>
 
            <div className="home-preview__metrics">
              <div>
                <small>Fraud alerts</small>
                <strong><Counter target={128} /></strong>
              </div>
              <div>
                <small>Avg risk score</small>
                <strong>0.41</strong>
              </div>
            </div>
 
            <div className="home-preview__rows">
              <div>
                <span>TX123</span>
                <span>$1,200</span>
                <span>High</span>
              </div>
              <div>
                <span>APP084</span>
                <span>$8,900</span>
                <span>Review</span>
              </div>
              <div>
                <span>TX891</span>
                <span>$38</span>
                <span>Low</span>
              </div>
            </div>
          </div>
        </div>
      </section>
 
      {/* ── CORE MODULES ── */}
      <section className="home-section" ref={aboutRef}>
        <div className="home-section__intro">
          <span>Core modules</span>
          <h2>Built for financial intelligence teams</h2>
          <p>
            Helios combines fraud detection, credit-risk review, and case-management
            workflows into one unified platform designed for analyst speed and compliance confidence.
          </p>
        </div>
 
        <div
          className="home-feature-grid"
          ref={featuresRef}
          style={{
            opacity: featuresVisible ? 1 : 0,
            transform: featuresVisible ? 'none' : 'translateY(24px)',
            transition: 'opacity 0.6s ease, transform 0.6s ease',
          }}
        >
          {[
            {
              name: "FinGuard",
              desc: "Monitor transactions in real time, surface suspicious behaviour, and route alerts into review-ready fraud cases with configurable rules.",
            },
            {
              name: "FinSage",
              desc: "Score loan applications using model-based credit insights and support analysts with AI-generated review recommendations and summaries.",
            },
            {
              name: "Cases & Reports",
              desc: "Track investigations end-to-end, manage analyst queues, and generate compliance-ready reports from one centralized operations interface.",
            },
          ].map((card, i) => (
            <article
              key={card.name}
              className="home-feature-card"
              style={{ transitionDelay: `${i * 0.1}s` }}
            >
              <div className="home-feature-card__image">
                <img src={dashboardIcon} alt="" />
              </div>
              <h3>{card.name}</h3>
              <p>{card.desc}</p>
            </article>
          ))}
        </div>
      </section>
 
      {/* ── PLATFORM PREVIEW ── */}
      <section className="home-section home-section--preview">
        <div className="home-section__intro">
          <span>Platform preview</span>
          <h2>Designed for analysts, managers, and risk teams</h2>
          <p>
            A persistent side menu, dynamic monitoring panels, and live review workflows
            make Helios feel operational, focused, and fast.
          </p>
        </div>
 
        <div
          className="home-workbench"
          ref={workbenchRef}
          style={{
            opacity: workbenchVisible ? 1 : 0,
            transform: workbenchVisible ? 'none' : 'translateY(28px)',
            transition: 'opacity 0.65s ease, transform 0.65s ease',
          }}
        >
          <aside className="home-workbench__menu">
            <div className="home-workbench__brand">Helios</div>
            {["Dashboard", "FinGuard", "FinSage", "Cases", "Reports"].map((item) => (
              <div
                key={item}
                className={`home-workbench__item${item === "Dashboard" ? " home-workbench__item--active" : ""}`}
              >
                {item}
              </div>
            ))}
          </aside>
 
          <div className="home-workbench__content">
            <div className="home-workbench__stats">
              {[
                { label: "Fraud alerts", value: "128" },
                { label: "Avg risk score", value: "0.41" },
                { label: "High-risk apps", value: "32" },
              ].map((s) => (
                <div key={s.label}>
                  <small>{s.label}</small>
                  <strong>{s.value}</strong>
                </div>
              ))}
            </div>
 
            <div className="home-workbench__chart">
              {Array.from({ length: 9 }).map((_, i) => (
                <div key={i} className="home-workbench__chart-bar" />
              ))}
            </div>
 
            <div className="home-workbench__table">
              <div className="home-workbench__head">
                <span>ID</span>
                <span>Amount</span>
                <span>Score</span>
                <span>Status</span>
              </div>
              {[
                { id: "TX123",  amount: "$1,200", score: "0.91", status: "Flagged",  cls: "flagged" },
                { id: "APP084", amount: "$8,900", score: "0.82", status: "Pending",  cls: "pending" },
                { id: "TX245",  amount: "$450",   score: "0.18", status: "Clear",    cls: "clear"   },
              ].map((row) => (
                <div key={row.id} className="home-workbench__row">
                  <span>{row.id}</span>
                  <span>{row.amount}</span>
                  <span>{row.score}</span>
                  <span>
                    <span className={`home-status home-status--${row.cls}`}>{row.status}</span>
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
 
      {openLogin ? <LoginModal onClose={() => setOpenLogin(false)} /> : null}
        <Footer
        onLoginClick={() => setOpenLogin(true)}
        onScrollToAbout={() => aboutRef.current?.scrollIntoView({ behavior: "smooth" })}
      />
    </div>
  );
}