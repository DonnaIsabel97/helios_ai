import { useRef, useState, useEffect } from "react";
import NavbarHome from "../components/NavbarHome";
import Footer from "../components/Footer";
import LoginModal from "../modals/LoginModal";
import dashboardIcon from "../assets/dashboard.png";
import "../style/Home.css";

function useInView(ref, threshold = 0.15) {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) setVisible(true); },
      { threshold }
    );
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, [ref, threshold]);
  return visible;
}

function HeroSphere() {
  return (
    <svg viewBox="0 0 400 400" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <radialGradient id="hSG" cx="42%" cy="36%" r="62%">
          <stop offset="0%"   stopColor="#2d1f45"/>
          <stop offset="45%"  stopColor="#1a1128"/>
          <stop offset="80%"  stopColor="#100c18"/>
          <stop offset="100%" stopColor="#080510"/>
        </radialGradient>
        <radialGradient id="hOG" cx="50%" cy="50%" r="50%">
          <stop offset="0%"   stopColor="#9b6fd4" stopOpacity="0"/>
          <stop offset="55%"  stopColor="#9b6fd4" stopOpacity="0.12"/>
          <stop offset="72%"  stopColor="#e86fa3" stopOpacity="0.3"/>
          <stop offset="82%"  stopColor="#e86fa3" stopOpacity="0.55"/>
          <stop offset="90%"  stopColor="#c86fa3" stopOpacity="0.3"/>
          <stop offset="100%" stopColor="#9b6fd4" stopOpacity="0"/>
        </radialGradient>
        <radialGradient id="hRL" cx="50%" cy="50%" r="50%">
          <stop offset="74%"  stopColor="transparent" stopOpacity="0"/>
          <stop offset="86%"  stopColor="#9b6fd4"     stopOpacity="0.4"/>
          <stop offset="93%"  stopColor="#e86fa3"     stopOpacity="0.85"/>
          <stop offset="98%"  stopColor="#f0a0c0"     stopOpacity="0.5"/>
          <stop offset="100%" stopColor="transparent" stopOpacity="0"/>
        </radialGradient>
        <radialGradient id="hAG" cx="50%" cy="50%" r="50%">
          <stop offset="55%"  stopColor="transparent"/>
          <stop offset="72%"  stopColor="#9b6fd4" stopOpacity="0.06"/>
          <stop offset="85%"  stopColor="#e86fa3" stopOpacity="0.18"/>
          <stop offset="100%" stopColor="transparent"/>
        </radialGradient>
        <radialGradient id="hHL" cx="35%" cy="28%" r="40%">
          <stop offset="0%"   stopColor="white" stopOpacity="0.07"/>
          <stop offset="100%" stopColor="white" stopOpacity="0"/>
        </radialGradient>
        <filter id="hSG2" x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="20" result="b"/>
          <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
        <filter id="hDG" x="-200%" y="-200%" width="500%" height="500%">
          <feGaussianBlur stdDeviation="3" result="b"/>
          <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
      </defs>
      <circle cx="200" cy="200" r="195" fill="url(#hAG)"/>
      <circle cx="200" cy="200" r="158" fill="url(#hOG)" filter="url(#hSG2)"/>
      <circle cx="200" cy="200" r="130" fill="url(#hSG)"/>
      <circle cx="200" cy="200" r="130" fill="url(#hHL)"/>
      <circle cx="200" cy="200" r="130" fill="url(#hRL)"/>
      <circle cx="240" cy="158" r="5"   fill="#e86fa3" opacity="0.75" filter="url(#hDG)"/>
      <circle cx="255" cy="170" r="2"   fill="#f0a0c0" opacity="0.4"/>
      {[[48,72,1.2],[340,88,0.8],[52,300,1],[360,310,1.4],[150,42,0.7],[310,52,1],[72,190,0.6],[348,200,0.9],[120,340,0.8],[280,348,1.1]].map(([x,y,r],i)=>(
        <circle key={i} cx={x} cy={y} r={r} fill="white" opacity={0.2+(i%3)*0.12}/>
      ))}
    </svg>
  );
}

export default function Home() {
  const [openLogin, setOpenLogin] = useState(false);
  const aboutRef     = useRef(null);
  const featuresRef  = useRef(null);
  const workbenchRef = useRef(null);
  const featuresVisible  = useInView(featuresRef);
  const workbenchVisible = useInView(workbenchRef);

  return (
    <div className="home-page">
      <NavbarHome onLoginClick={() => setOpenLogin(true)} />
      <div className="home-page__bg" />

      {/* ── HERO ── */}
      <section className="home-hero">
        <div className="home-hero__orb"><HeroSphere /></div>

        <div className="home-hero__left">
          <div className="home-hero__eyebrow">AI-powered risk intelligence</div>
          <h1>Helios</h1>
          <p className="home-hero__lead">
            Fraud detection, credit-risk review, and analyst case management —
            unified in one enterprise platform.
          </p>
          <p className="home-hero__body">
            Built for banks and financial institutions, Helios centralises
            transaction monitoring, credit assessment, and review workflows
            into a single operational experience trusted by risk teams.
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

        <div className="home-hero__scroll">
          <span>Scroll</span>
          <div className="home-hero__scroll-line" />
        </div>
      </section>

      {/* ── CORE MODULES ── */}
      <section className="home-section" ref={aboutRef}>
        <div className="home-section__intro">
          <span>Core modules</span>
          <h2>Built for financial <em>intelligence</em> teams</h2>
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
            transform: featuresVisible ? "none" : "translateY(28px)",
            transition: "opacity 0.6s ease, transform 0.6s ease",
          }}
        >
          {[
            { name: "FinGuard", desc: "Monitor transactions in real time, surface suspicious behaviour, and route alerts into review-ready fraud cases with configurable rules." },
            { name: "FinSage",  desc: "Score loan applications using model-based credit insights and support analysts with AI-generated review recommendations." },
            { name: "Cases & Reports", desc: "Track investigations end-to-end, manage analyst queues, and generate compliance-ready reports from one centralised interface." },
          ].map((card, i) => (
            <article key={card.name} className="home-feature-card" style={{ transitionDelay: `${i * 0.1}s` }}>
              <div className="home-feature-card__image"><img src={dashboardIcon} alt="" /></div>
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
          <h2>Designed for analysts, managers, <em>and</em> risk teams</h2>
          <p>A persistent side menu, dynamic monitoring panels, and live review workflows make Helios feel operational, focused, and fast.</p>
        </div>

        <div
          className="home-workbench"
          ref={workbenchRef}
          style={{
            opacity: workbenchVisible ? 1 : 0,
            transform: workbenchVisible ? "none" : "translateY(28px)",
            transition: "opacity 0.65s ease, transform 0.65s ease",
          }}
        >
          <aside className="home-workbench__menu">
            <div className="home-workbench__brand">Helios</div>
            {["Dashboard","FinGuard","FinSage","Cases","Reports"].map(item => (
              <div key={item} className={`home-workbench__item${item==="Dashboard"?" home-workbench__item--active":""}`}>{item}</div>
            ))}
          </aside>

          <div className="home-workbench__content">
            <div className="home-workbench__stats">
              {[{label:"Fraud alerts",value:"128"},{label:"Avg risk score",value:"0.41"},{label:"High-risk apps",value:"32"}].map(s=>(
                <div key={s.label}><small>{s.label}</small><strong>{s.value}</strong></div>
              ))}
            </div>
            <div className="home-workbench__chart">
              {Array.from({length:9}).map((_,i)=><div key={i} className="home-workbench__chart-bar"/>)}
            </div>
            <div className="home-workbench__table">
              <div className="home-workbench__head"><span>ID</span><span>Amount</span><span>Score</span><span>Status</span></div>
              {[{id:"TX123",amount:"$1,200",score:"0.91",status:"Flagged",cls:"flagged"},{id:"APP084",amount:"$8,900",score:"0.82",status:"Pending",cls:"pending"},{id:"TX245",amount:"$450",score:"0.18",status:"Clear",cls:"clear"}].map(r=>(
                <div key={r.id} className="home-workbench__row">
                  <span>{r.id}</span><span>{r.amount}</span><span>{r.score}</span>
                  <span><span className={`home-status home-status--${r.cls}`}>{r.status}</span></span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {openLogin && <LoginModal onClose={() => setOpenLogin(false)} />}
      <Footer onLoginClick={() => setOpenLogin(true)} />
    </div>
  );
}