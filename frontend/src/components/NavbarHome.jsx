import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "../style/HomeNavBar.css";

/* ── Eclipse Logo SVG ── */
export function HeliosLogo({ size = 32 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <radialGradient id="sphereGrad" cx="42%" cy="38%" r="58%">
          <stop offset="0%" stopColor="#2a1f3d" />
          <stop offset="60%" stopColor="#16101f" />
          <stop offset="100%" stopColor="#0c0810" />
        </radialGradient>
        <radialGradient id="glowGrad" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#e86fa3" stopOpacity="0.55" />
          <stop offset="45%" stopColor="#9b6fd4" stopOpacity="0.3" />
          <stop offset="100%" stopColor="#e86fa3" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="rimGrad" cx="50%" cy="50%" r="50%">
          <stop offset="72%" stopColor="transparent" />
          <stop offset="88%" stopColor="#9b6fd4" stopOpacity="0.5" />
          <stop offset="96%" stopColor="#e86fa3" stopOpacity="0.9" />
          <stop offset="100%" stopColor="#e86fa3" stopOpacity="0.3" />
        </radialGradient>
        <filter id="glow" x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur stdDeviation="2.5" result="blur" />
          <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
        <clipPath id="sphereClip">
          <circle cx="20" cy="20" r="14" />
        </clipPath>
      </defs>

      {/* Outer atmospheric glow */}
      <circle cx="20" cy="20" r="19" fill="url(#glowGrad)" opacity="0.6" />

      {/* Sphere body */}
      <circle cx="20" cy="20" r="14" fill="url(#sphereGrad)" />

      {/* Rim light */}
      <circle cx="20" cy="20" r="14" fill="url(#rimGrad)" />

      {/* Highlight dot */}
      <circle cx="24" cy="15" r="1.5" fill="#e86fa3" opacity="0.7" filter="url(#glow)" />

      {/* Subtle surface shine */}
      <ellipse cx="17" cy="16" rx="4" ry="2.5" fill="white" opacity="0.04" transform="rotate(-20 17 16)" />
    </svg>
  );
}

export default function NavbarHome({ onLoginClick }) {
  const navigate = useNavigate();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 30);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header className={`navbar-home${scrolled ? " navbar-home--scrolled" : ""}`}>
      <button className="navbar-home__brand" onClick={() => navigate("/")}>
        <div className="navbar-home__logo-mark">
          <HeliosLogo size={32} />
        </div>
        <span>Helios</span>
      </button>

      <nav className="navbar-home__links">
        <button onClick={() => navigate("/about")} className="navbar-home__link">About</button>
        <button onClick={() => navigate("/contact-us")} className="navbar-home__link">Contact</button>
        <button className="navbar-home__login" onClick={onLoginClick}>
          Log in
        </button>
      </nav>
    </header>
  );
}