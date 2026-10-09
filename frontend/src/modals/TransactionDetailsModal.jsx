import { useEffect, useRef, useState } from "react";
import api from "../services/api";
import "../style/DetailsModal.css";
import "../style/TransactionalDetailsModal.css";
import { fraudRisk } from "../utils/finguardFilters";

const actionLabels = { mark_fraud: "Mark as Fraud", mark_legit: "Mark as Legit", escalate: "Escalate" };
const activityLabels = {
  save_notes: "created a note", mark_fraud: "marked the transaction as fraud",
  mark_legit: "marked the transaction as legitimate", escalate: "escalated the case",
  mark_reviewed: "marked the transaction as reviewed", mark_unreviewed: "marked the transaction as not reviewed",
};

export default function TransactionDetailsModal({ item, onClose, onCaseUpdated }) {
  const [details, setDetails] = useState(null);
  const [revealedId, setRevealedId] = useState(null);
  const [failedId, setFailedId] = useState(null);
  const [notesDraft, setNotesDraft] = useState("");
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const requestLock = useRef(false);
  const [pendingAction, setPendingAction] = useState(null);
  const predictionId = item?.id;
  // Load actual account/card display fields, never use UUID suffixes as numbers.
  useEffect(() => {
    if (!predictionId) return;
    let active = true;
    api.get(`/finguard/predictions/${predictionId}`)
      .then(({ data }) => { if (active) { setDetails({ ...data, id: predictionId }); setNotesDraft(""); } })
      .catch(() => { if (active) setFailedId(predictionId); });
    return () => { active = false; };
  }, [predictionId]);
  if (!item) return null;
  const currentDetails = details?.id === predictionId ? details : null;
  const account = currentDetails?.account_number == null ? "" : String(currentDetails.account_number);
  const cardLastFour = String(currentDetails?.card_number_masked || "").match(/(\d{4})$/)?.[1];
  const isVisible = revealedId === predictionId;
  const maskedAccount = account.length > 4 ? "*".repeat(account.length - 4) + account.slice(-4) : "****";

  const reviewCase = currentDetails?.review_case;
  const canUpdate = Boolean(currentDetails?.can_update && reviewCase);
  const canDecide = canUpdate && ["open", "escalated"].includes(reviewCase.status);
  const notesChanged = notesDraft.length > 0;
  const savedAction = reviewCase?.status === "escalated" ? "escalate"
    : reviewCase?.decision === "fraud" ? "mark_fraud" : reviewCase?.decision === "legit" ? "mark_legit" : null;
  // Save one action at a time; only update the UI after the database confirms it.
  const saveAction = async (action) => {
    if (requestLock.current || !canUpdate) return;
    requestLock.current = true;
    setSaving(true);
    setFeedback(null);
    try {
      const { data } = await api.patch(`/finguard/predictions/${predictionId}/case`, {
        action, version: reviewCase.version,
        ...(action === "save_notes" ? { notes: notesDraft } : {}),
      });
      setDetails((current) => ({ ...current, review_case: data.review_case,
        activity: data.activity_event ? [data.activity_event, ...(current.activity || [])] : current.activity }));
      if (action === "save_notes") setNotesDraft("");
      else setPendingAction(null);
      onCaseUpdated?.(predictionId, data.review_case);
      setFeedback({ error: false, text: action === "save_notes" ? "Note added to history." : "Action accepted and saved to history." });
    } catch (error) {
      setFeedback({ error: true, text: error.response?.data?.message || "Unable to save. Please try again." });
    } finally {
      requestLock.current = false;
      setSaving(false);
    }
  };
  // Avoid discarding a note draft when closing the panel.
  const closeDetails = () => {
    if (saving) return;
    if ((notesChanged || pendingAction) && !window.confirm("Discard your unsaved note or action selection?")) return;
    onClose();
  };

  // Use the same risk label as the transaction table.
  const risk = fraudRisk(item.fraud_score);

  return (
    <div className="modal-overlay" onClick={closeDetails}> 
      <div className="details-modal transaction-details" role="dialog" aria-modal="true" aria-label={`Transaction ${item.transaction_id}`} onClick={(event) => event.stopPropagation()}>
        {/* Separate navigation, transaction identity, and risk into a clear hierarchy. */}
        <header className="details-modal__header transaction-header">
          <div className="transaction-header__navigation">
            <button type="button" className="details-modal__back" onClick={closeDetails}>
              ← Back
            </button>
            <span className="transaction-header__eyebrow">FinGuard</span>
          </div>
          <div className="transaction-header__summary">
            <div className="transaction-header__identity">
              <h2>Transaction details</h2>
              <p className="transaction-header__id">{item.transaction_id}</p>
            </div>
            <span className="transaction-risk-badge">
              <span className={`risk-dot ${risk.toLowerCase()} transaction-risk-light`} aria-hidden="true" />
              <span>{risk} Risk</span>
            </span>
          </div>
        </header>
        <div className="details-grid">
          <section>
            <h3>Transaction Info</h3>
            <p>Amount: ${Number(item.amount).toFixed(2)}</p>
            <p>Time: {new Date(item.transaction_time || item.created_at).toLocaleString()}</p>
            <div className="transaction-account">
              <span>Account: {account ? (isVisible ? account : maskedAccount) : currentDetails || failedId === predictionId ? "Unavailable" : "Loading…"}</span>
              {account && <button type="button" className="account-visibility" aria-label={isVisible ? "Hide account number" : "Show account number"}
                aria-pressed={isVisible} onClick={() => setRevealedId(isVisible ? null : predictionId)}>
                {/* Open eye when visible; crossed-out eye when hidden. */}
                <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
                  <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" />
                  <circle cx="12" cy="12" r="3" />
                  {!isVisible && <path d="m3 3 18 18" />}
                </svg>
              </button>}
            </div>
            <p>Card: {cardLastFour ? `********${cardLastFour}` : currentDetails || failedId === predictionId ? "Unavailable" : "Loading…"}</p>
          </section>

          <section>
            <h3>Model Insights</h3>
            <p>Predicted Label: {item.predicted_label}</p>
            <p>Model alert status: {item.status}</p>
            <p>Review status: {reviewCase?.status || "Not available"}</p>
            <p>Reviewer decision: {reviewCase?.decision || "Not decided"}</p>
            <p>Priority: {reviewCase?.priority || "Not available"}</p>
          </section>
        </div>

<section className="details-section">
          <h3>Actions</h3>
          {currentDetails && !currentDetails.can_update && <p>Admin access is required to update this case.</p>}
          {currentDetails && !reviewCase && <p>No review case exists for this prediction.</p>}
          {failedId === predictionId && <p role="alert">Case details could not be loaded. Close and reopen this panel to retry.</p>}
          {saving && <p role="status">Saving…</p>}
          {feedback && <p role={feedback.error ? "alert" : "status"}>{feedback.text}</p>}
          {/* Selecting an action stages it; Accept is the only operation that saves it. */}
          <div className="button-row transaction-action-options">
            {/* Keep every option visible; only the saved decision gets a check and highlight. */}
            {Object.entries(actionLabels)
              
              .map(([action, label]) => (
              <button key={action} type="button" aria-pressed={(pendingAction || savedAction) === action}
                className={`${savedAction === action ? "is-saved" : ""} ${pendingAction === action ? "is-pending" : ""}`}
                disabled={!canDecide || saving || action === savedAction}
                onClick={() => { setPendingAction(action); setFeedback(null); }}>
                {savedAction === action && <span aria-hidden="true">✓ </span>}{label}
                {savedAction === action && <span className="action-saved-label"> · Saved</span>}
              </button>
            ))}
          </div>
          {pendingAction && <div className="transaction-action-confirm">
            <p>Selected: {actionLabels[pendingAction]}. Accept to save this action.</p>
            <div className="button-row">
              <button type="button" disabled={saving} onClick={() => saveAction(pendingAction)}>Accept</button>
              <button type="button" disabled={saving} onClick={() => setPendingAction(null)}>Cancel</button>
            </div>
          </div>}
        </section>

        <section className="details-section">
          <h3>Analyst Notes</h3>
          <textarea aria-label="Analyst notes" placeholder="Write a new note for the activity history…" rows="4" maxLength={10000}
            value={notesDraft} onChange={(event) => setNotesDraft(event.target.value)} disabled={!canUpdate || saving} />
          {/* Keep the draft indicator opposite the save action. */}
          <div className="transaction-note-footer">
            <button disabled={!canUpdate || saving || !notesDraft.trim()} onClick={() => saveAction("save_notes")}>Add note</button>
            {notesChanged && <p role="status">Unsaved notes</p>}
          </div>
        </section>

        <section className="details-section">
          <h3>Activity / History</h3>
          <div className="case-activity-list">
            {/* Each saved note is its own expandable entry, with server-provided author and time. */}
            {(currentDetails?.activity || []).map((event) => (
              event.action === "save_notes" ? (
                <details className="case-activity-entry" key={event.id}>
                  <summary>
                    <span><strong>{event.actor_name}</strong> created a note
                      <time dateTime={event.created_at}>{new Date(event.created_at).toLocaleString()}</time>
                    </span>
                    <span className="case-activity-expand" aria-hidden="true" />
                  </summary>
                  <p className="case-activity-note">{event.note}</p>
                </details>
              ) : (
                <div className="case-activity-entry" key={event.id}>
                  <p><strong>{event.actor_name}</strong> {activityLabels[event.action] || event.action}</p>
                  <time dateTime={event.created_at}>{new Date(event.created_at).toLocaleString()}</time>
                </div>
              )
            ))}
            {/* Earlier data has no reliable author/history; do not invent attribution. */}
            {reviewCase?.notes && <details className="case-activity-entry case-activity-legacy">
              <summary><span>Existing case note<small>Author and original note time were not recorded.</small></span><span className="case-activity-expand" aria-hidden="true" /></summary>
              <p className="case-activity-note">{reviewCase.notes}</p>
            </details>}
            {savedAction && !(currentDetails?.activity || []).some((event) => event.action === savedAction) &&
              <p className="case-activity-legacy">Existing saved action: {actionLabels[savedAction]}. Its author and action time were not recorded.</p>}
            <div className="case-activity-entry"><p>Prediction recorded</p><time dateTime={item.created_at}>{new Date(item.created_at).toLocaleString()}</time></div>
            {reviewCase && <div className="case-activity-entry"><p>Case created</p><time dateTime={reviewCase.created_at}>{new Date(reviewCase.created_at).toLocaleString()}</time></div>}
          </div>
        </section>
      </div>
    </div>
  );
}