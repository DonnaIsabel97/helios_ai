import "../style/CaseDetailsModal.css";

export default function CaseDetailsModal({ item, onClose }) {
  if (!item) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="details-modal" onClick={(event) => event.stopPropagation()}>
        <div className="details-modal__header">
          <button className="details-modal__back" onClick={onClose}>
            ← Back
          </button>
          <h2>Case {item.case_code || item.id}</h2>
        </div>

        <div className="case-topline">
          <span>Type: {item.case_type}</span>
          <span>Status: {item.status}</span>
          <span>Priority: {item.priority || item.risk_level}</span>
        </div>

        <section className="details-section">
          <h3>Linked Entity</h3>
          <p>{item.case_type === "Fraud" ? `Transaction ${item.transaction_id}` : `Application ${item.application_id}`}</p>
          <p>
            {item.case_type === "Fraud"
              ? `Fraud Score: ${Number(item.fraud_score || 0).toFixed(2)}`
              : `Risk Probability: ${Number(item.risk_probability || 0).toFixed(2)}`}
          </p>
          <button>View More</button>
        </section>

        <section className="details-section">
          <h3>Investigation Notes</h3>
          <ul className="timeline">
            <li>Suspicious pattern detected</li>
            <li>Assigned to analyst</li>
          </ul>
          <textarea placeholder="Add note..." rows="4" />
        </section>

        <section className="details-section">
          <h3>Actions</h3>
          <div className="button-row">
            <button>{item.case_type === "Fraud" ? "Mark as Fraud" : "Approve"}</button>
            <button>Close Case</button>
            <button>Escalate</button>
          </div>
        </section>

        <section className="details-section">
          <h3>Activity Timeline</h3>
          <ul className="timeline">
            <li>Case created</li>
            <li>Assigned to user</li>
            <li>Note added</li>
          </ul>
        </section>
      </div>
    </div>
  );
}