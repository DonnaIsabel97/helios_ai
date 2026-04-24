import "../style/TransactionalDetailsModal.css";

export default function TransactionDetailsModal({ item, onClose }) {
  if (!item) return null;

  const score = Number(item.fraud_score || 0);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="details-modal" onClick={(event) => event.stopPropagation()}>
        <div className="details-modal__header">
          <button className="details-modal__back" onClick={onClose}>
            ← Back
          </button>
          <h2>Transaction {item.transaction_id}</h2>
        </div>

        <div className="details-modal__risk">
          Fraud Score: {score.toFixed(2)}{" "}
          <span className={`risk-dot ${score >= 0.7 ? "high" : score >= 0.3 ? "medium" : "low"}`} />
          {score >= 0.7 ? "High Risk" : score >= 0.3 ? "Review" : "Low Risk"}
        </div>

        <div className="details-grid">
          <section>
            <h3>Transaction Info</h3>
            <p>Amount: ${Number(item.amount).toFixed(2)}</p>
            <p>Time: {new Date(item.transaction_time || item.created_at).toLocaleString()}</p>
            <p>Account: {item.account_id}</p>
            <p>Card: {item.card_id || "N/A"}</p>
          </section>

          <section>
            <h3>Model Insights</h3>
            <p>Predicted Label: {item.predicted_label}</p>
            <p>Status: {item.status}</p>
            <p>Score Contribution: simulated explanation</p>
            <p>Pattern: unusual activity / amount / velocity</p>
          </section>
        </div>

        <section className="details-section">
          <h3>Risk Visualization</h3>
          <div className="progress-wrap">
            <div className="progress-bar">
              <div style={{ width: `${Math.min(score * 100, 100)}%` }} />
            </div>
            <span>{(score * 100).toFixed(0)}%</span>
          </div>
        </section>

        <section className="details-section">
          <h3>Actions</h3>
          <div className="button-row">
            <button>Mark as Fraud</button>
            <button>Mark as Legit</button>
            <button>Escalate</button>
          </div>
        </section>

        <section className="details-section">
          <h3>Analyst Notes</h3>
          <textarea placeholder="Add note..." rows="4" />
        </section>

        <section className="details-section">
          <h3>Activity / History</h3>
          <ul className="timeline">
            <li>Transaction created</li>
            <li>Flagged by model</li>
            <li>Awaiting analyst review</li>
          </ul>
        </section>
      </div>
    </div>
  );
}