import "../style/Footer.css";

export default function Footer(){
    return (
        <div className="home-footer">
        <div className="home-footer__wave">
          <svg viewBox="0 0 1440 110" preserveAspectRatio="none">
            <path
              d="M0,55 C200,95 400,105 600,80 C800,55 1000,95 1200,75 C1320,62 1380,68 1440,72 L1440,110 L0,110 Z"
              fill="#0d1c2b"
            />
          </svg>
        </div>
 
        <div className="home-footer__content">
          <div className="home-footer__brand">
            <h3>Helios</h3>
            <p>AI-powered financial intelligence platform</p>
          </div>
          <div className="home-footer__links">
            <span>About</span>
            <span>Documentation</span>
            <span>Privacy</span>
            <span>Contact</span>
          </div>
        </div>
 
        <div className="home-footer__bottom">
          <span>© 2026 Helios. All rights reserved.</span>
          <span>SOC 2 Type II · ISO 27001 · GDPR</span>
        </div>
        </div>
    )
}