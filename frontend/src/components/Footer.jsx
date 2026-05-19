import "../style/Footer.css";

export default function Footer() {
  return (
    <footer className="home-footer">
      <div className="home-footer__content">

        {/* Brand */}
        <div className="home-footer__brand">
          <h3>Helios</h3>
          <p>AI-powered financial intelligence for risk and fraud teams.</p>
          <div className="home-footer__badges">
            <span className="home-footer__badge">SOC 2</span>
            <span className="home-footer__badge">ISO 27001</span>
            <span className="home-footer__badge">GDPR</span>
          </div>
        </div>

        {/* Platform */}
        <div className="home-footer__col">
          <h4>Platform</h4>
          <div className="home-footer__col-links">
            <span>FinGuard</span>
            <span>FinSage</span>
            <span>Cases &amp; Reports</span>
          </div>
        </div>

        {/* Company */}
        <div className="home-footer__col">
          <h4>Company</h4>
          <div className="home-footer__col-links">
            <span>About</span>
            <span>Contact</span>
            <span>Documentation</span>
          </div>
        </div>

        {/* Legal */}
        <div className="home-footer__col">
          <h4>Legal</h4>
          <div className="home-footer__col-links">
            <span>Privacy Policy</span>
            <span>Terms of Service</span>
            <span>Security</span>
          </div>
        </div>

      </div>

      <div className="home-footer__bottom">
        <span>© 2026 Helios. All rights reserved.</span>
        <span>Built for financial intelligence teams.</span>
      </div>
    </footer>
  );
}