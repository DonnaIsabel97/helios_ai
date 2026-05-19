import "../style/ComingSoon.css";

export default function ComingSoon() {
  return (
    <main className="coming">
      <div className="coming__background"></div>

      <section className="coming__content">
        <div className="coming__eclipse-wrapper">
          <div className="coming__glow"></div>

          <div className="coming__planet">
            <div className="coming__flare"></div>

            <div className="coming__text">
              <span>COMING SOON</span>

              <div className="coming__progress">
                <div className="coming__progress-bar"></div>
              </div>
            </div>
          </div>
        </div>

        <div className="coming__info">
          <h1>Helios</h1>

          <p>
            AI-powered fraud detection, credit-risk intelligence, and analyst
            case management platform currently in development.
          </p>
        </div>
      </section>
    </main>
  );
}