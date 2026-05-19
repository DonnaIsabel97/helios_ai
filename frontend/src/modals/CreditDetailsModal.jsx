import { useMemo, useState } from "react";
import "../style/DetailsModal.css";

export default function CreditDetailsModal({ item, onClose }) {
  const [loanAmount, setLoanAmount] = useState(Number(item?.loan_amount || 0));
  const [duration, setDuration] = useState(Number(item?.duration_months || 12));
  const [savings, setSavings] = useState("Low");

  const scenarioScore = useMemo(() => {
    const base = Number(item?.risk_probability || 0);
    const amountAdj = loanAmount > 20000 ? 0.08 : loanAmount > 10000 ? 0.04 : -0.02;
    const durationAdj = duration > 36 ? 0.08 : duration > 24 ? 0.04 : -0.02;
    const savingsAdj = savings === "Low" ? 0.07 : savings === "Medium" ? 0.02 : -0.05;
    return Math.max(0, Math.min(1, base + amountAdj + durationAdj + savingsAdj));
  }, [item, loanAmount, duration, savings]);

  if (!item) return null;

  const risk = Number(item.risk_probability || 0);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="details-modal" onClick={(event) => event.stopPropagation()}>
        <div className="details-modal__header">
          <button className="details-modal__back" onClick={onClose}>
            ← Back
          </button>
          <h2>Application {item.application_id}</h2>
        </div>

        <div className="details-modal__risk">
          Risk Probability: {risk.toFixed(2)}{" "}
          <span className={`risk-dot ${risk >= 0.7 ? "high" : risk >= 0.3 ? "medium" : "low"}`} />
          {risk >= 0.7 ? "High Risk" : risk >= 0.3 ? "Review" : "Low Risk"}
        </div>

        <div className="details-grid">
          <section>
            <h3>Applicant Info</h3>
            <p>Loan Amount: ${Number(item.loan_amount).toFixed(2)}</p>
            <p>Duration: {item.duration_months} months</p>
            <p>Applicant ID: {item.customer_id}</p>
            <p>Status: {item.predicted_class}</p>
          </section>

          <section>
            <h3>Risk Factors</h3>
            <p>High loan amount ↑</p>
            <p>Long duration ↑</p>
            <p>Low savings ↑</p>
            <p>Employment instability ↑</p>
          </section>
        </div>

        <section className="details-section">
          <h3>Risk Visualization</h3>
          <div className="progress-wrap">
            <div className="progress-bar">
              <div style={{ width: `${Math.min(risk * 100, 100)}%` }} />
            </div>
            <span>{(risk * 100).toFixed(0)}%</span>
          </div>
        </section>

        <section className="details-section">
          <h3>Scenario Simulator</h3>
          <div className="simulator-grid">
            <label>
              Loan Amount
              <input
                type="number"
                value={loanAmount}
                onChange={(e) => setLoanAmount(Number(e.target.value))}
              />
            </label>

            <label>
              Duration
              <input
                type="number"
                value={duration}
                onChange={(e) => setDuration(Number(e.target.value))}
              />
            </label>

            <label>
              Savings
              <select value={savings} onChange={(e) => setSavings(e.target.value)}>
                <option>Low</option>
                <option>Medium</option>
                <option>High</option>
              </select>
            </label>
          </div>

          <p className="scenario-result">
            Updated Risk: {scenarioScore.toFixed(2)}
          </p>
        </section>

        <section className="details-section">
          <h3>Decision</h3>
          <div className="button-row">
            <button>Approve</button>
            <button>Reject</button>
            <button>Request Review</button>
          </div>
        </section>

        <section className="details-section">
          <h3>Notes</h3>
          <textarea placeholder="Add decision reasoning..." rows="4" />
        </section>
      </div>
    </div>
  );
}