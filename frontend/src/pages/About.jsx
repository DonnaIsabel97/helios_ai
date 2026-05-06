import { useState } from "react";
import NavbarHome from "../components/NavbarHome";
import Footer from "../components/Footer";
import LoginModal from "../modals/LoginModal";
import aboutImage from "../assets/about_us_2.png";
import dashboardIcon from "../assets/dashboard.png";
import "../style/About.css";

export default function About() {
  const [openLogin, setOpenLogin] = useState(false);

  const capabilities = [
    {
      title: "FinGuard",
      icon: dashboardIcon,
      desc: "Real-time fraud detection powered by AI, instantly flagging suspicious transactions and creating cases for review.",
    },
    {
      title: "FinSage",
      icon: dashboardIcon,
      desc: "AI-driven credit risk scoring with clear probability insights and decision support.",
    },
    {
      title: "Case Management",
      icon: dashboardIcon,
      desc: "Investigate, track, and resolve fraud and credit cases in a unified workflow.",
    },
  ];

  return (
    <div className="about-page">
      <NavbarHome onLoginClick={() => setOpenLogin(true)} />

      <main className="about-main">
        <section className="about-hero">
          <div className="about-hero__content">
            <span className="about-eyebrow">About Helios</span>

            <h1>Helping financial teams make smarter and faster decisions.</h1>

            <p>
              Helios is an AI-powered financial intelligence platform designed
              to detect fraud, assess credit risk, and streamline analyst review
              workflows in one unified system.
            </p>

            <button
              type="button"
              className="about-primary-btn"
              onClick={() => {
                window.location.href = "/contact-us";
              }}
            >
              Contact Us
            </button>
          </div>

          <div className="about-hero__visual">
            <div className="about-workbench">
              <aside className="about-workbench__menu">
                <div className="about-workbench__brand">Helios</div>

                {["Dashboard", "FinGuard", "FinSage", "Cases", "Reports"].map(
                  (item) => (
                    <div
                      key={item}
                      className={`about-workbench__item${
                        item === "Dashboard"
                          ? " about-workbench__item--active"
                          : ""
                      }`}
                    >
                      {item}
                    </div>
                  )
                )}
              </aside>

              <div className="about-workbench__content">
                <div className="about-workbench__stats">
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

                <div className="about-workbench__chart">
                  {Array.from({ length: 9 }).map((_, i) => (
                    <div key={i} className="about-workbench__chart-bar" />
                  ))}
                </div>

                <div className="about-workbench__table">
                  <div className="about-workbench__head">
                    <span>ID</span>
                    <span>Amount</span>
                    <span>Score</span>
                    <span>Status</span>
                  </div>

                  {[
                    {
                      id: "TX123",
                      amount: "$1,200",
                      score: "0.91",
                      status: "Flagged",
                      cls: "flagged",
                    },
                    {
                      id: "APP084",
                      amount: "$8,900",
                      score: "0.82",
                      status: "Pending",
                      cls: "pending",
                    },
                    {
                      id: "TX245",
                      amount: "$450",
                      score: "0.18",
                      status: "Clear",
                      cls: "clear",
                    },
                  ].map((row) => (
                    <div key={row.id} className="about-workbench__row">
                      <span>{row.id}</span>
                      <span>{row.amount}</span>
                      <span>{row.score}</span>
                      <span>
                        <span className={`about-status about-status--${row.cls}`}>
                          {row.status}
                        </span>
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="about-features">
          <div className="about-section-header">
            <span>Core Capabilities</span>
            <h2>One platform for fraud, credit, and case review</h2>
          </div>

          <div className="about-feature-grid">
            {capabilities.map((item) => (
              <article className="about-feature-card" key={item.title}>
                <div className="about-feature-icon">
                  <img src={item.icon} alt={`${item.title} icon`} />
                </div>

                <h3>{item.title}</h3>
                <p>{item.desc}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="about-mission">
          <div className="about-mission__visual">
            <div className="about-small-image">
              <img src={aboutImage} alt="Helios mission" />
            </div>
          </div>

          <div className="about-mission__content">
            <span className="about-eyebrow">Our Mission</span>
            <h2>Reduce risk and improve financial decision-making.</h2>
            <p>
              Our mission is to help financial institutions move from scattered
              risk signals to clear, actionable intelligence. Helios gives
              analysts the tools to review, explain, and act on fraud and credit
              risk faster.
            </p>
          </div>
        </section>
      </main>

      {openLogin && <LoginModal onClose={() => setOpenLogin(false)} />}
      <Footer onLoginClick={() => setOpenLogin(true)} />
    </div>
  );
}