import api from "../services/api";
import { useEffect, useRef, useState } from "react";
import "../style/DetailsModal.css";
import "../style/CreditDetailsModal.css";

// Compact whole-unit labels preserve the model categories in the form and history.
const savingsLabels = {A61:"Under 100",A62:"100–499",A63:"500–999",A64:"1,000+",A65:"Unknown / no account"};

// Range labels use whole dollars; inference uses their midpoint unless an exact amount is entered.
const debtOptions = [
  {value:"none",label:"$0 — No debt payments",amount:0},
  {value:"1_500",label:"$1–$500",amount:250.5},
  {value:"501_1000",label:"$501–$1,000",amount:750.5},
  {value:"1001_1500",label:"$1,001–$1,500",amount:1250.5},
  {value:"1501_2000",label:"$1,501–$2,000",amount:1750.5},
];

// The eye indicates whether the corresponding field is currently visible.
function RevealButton({ visible, onClick, label }) {
  return <button type="button" className="credit-reveal" aria-label={`${visible ? "Hide" : "Show"} ${label}`} aria-pressed={visible} onClick={onClick}>
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" /><circle cx="12" cy="12" r="3" />
      {!visible && <path d="m3 3 18 18" />}
    </svg>
  </button>;
}

export default function CreditDetailsModal({ item, onClose }) {
  const [loanAmount, setLoanAmount] = useState(Number(item?.loan_amount || 0));
  const [duration, setDuration] = useState([36,60].includes(Number(item?.duration_months)) ? Number(item.duration_months) : "");
  const [annualIncome, setAnnualIncome] = useState("");
  const [incomeDraft, setIncomeDraft] = useState("");
  const [editingIncome, setEditingIncome] = useState(false);
  const [debtRange, setDebtRange] = useState("");
  const [monthlyDebt, setMonthlyDebt] = useState("");
  const [scenarioResult, setScenarioResult] = useState(null);
  const [showId, setShowId] = useState(false);
  const [showApplicant, setShowApplicant] = useState(false);

  const [details, setDetails] = useState(null);
  const [notes, setNotes] = useState("");
  const [pending, setPending] = useState(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [simulationFeedback, setSimulationFeedback] = useState(null);
  const lock = useRef(false);
  useEffect(() => {
    let active = true;
    api.get(`/finsage/predictions/${item.id}`).then(({data}) => { if(active) {
      setDetails(data);
      // Prefill only an untouched simulator; scenario changes never update applicant income.
      if(data.annual_income != null) setAnnualIncome(current=>current === "" ? String(data.annual_income) : current);
    } })
      .catch(() => { if(active) setMessage("Unable to load case history. Close and reopen to retry."); });
    return () => { active = false; };
  }, [item.id]);
  const debtOption = debtOptions.find(option => option.value === debtRange);
  const resolvedDebt = debtRange === "custom" ? (monthlyDebt === "" ? NaN : Number(monthlyDebt)) : debtOption?.amount;
  const debtValid = Number.isFinite(resolvedDebt) && resolvedDebt >= 0 && resolvedDebt <= Number(annualIncome)/12;
  const review = details?.review_case;
  const canUpdate = Boolean(details?.can_update && review);
  const canDecide = canUpdate && ["open", "escalated"].includes(review.status);
  const selected = review?.status === "escalated" ? "escalate" : review?.decision === "approved" ? "approve" : review?.decision === "rejected" ? "reject" : null;
  // Accept a decision or explicitly save a note/scenario before appending history.
  async function save(action) {
    if(lock.current || !canUpdate) return;
    lock.current = true; setSaving(true); setMessage("");
    if(action === "save_simulation") {
      setScenarioResult(null);
      setSimulationFeedback({error:false,text:"Running the model and saving your simulation…"});
    }
    try {
      const {data} = await api.patch(`/finsage/predictions/${item.id}/case`, {
        action, version:review.version,
        ...(action === "save_notes" ? {notes} : {}),
        ...(action === "save_income" ? {annual_income:Number(incomeDraft)} : {}),
        ...(action === "save_simulation" ? {simulation:{loan_amount:loanAmount,duration_months:duration,annual_income:Number(annualIncome),monthly_debt_range:debtRange,...(debtRange === "custom" ? {monthly_debt_payments:Number(monthlyDebt)} : {})}} : {}),
      });
      setDetails(current => ({...current,review_case:data.review_case,activity:[data.activity_event,...current.activity],...(action === "save_income" ? {annual_income:data.annual_income} : {})}));
      if(action === "save_income") {
        setEditingIncome(false);
        if(annualIncome === "" || Number(annualIncome) === Number(details.annual_income)) {
          setAnnualIncome(String(data.annual_income)); setScenarioResult(null);
        }
      }
      if(action === "save_notes") setNotes("");
      if(action === "save_simulation") {
        setScenarioResult(data.activity_event.simulation);
        setSimulationFeedback({error:false,text:"Simulation saved to history."});
      }
      if(["approve","reject","escalate"].includes(action)) setPending(null);
      setMessage("Saved to activity history.");
    } catch(error) {
      const text=error.response?.data?.message || "Unable to save. Check that the backend is running and try again.";
      if(action === "save_simulation") setSimulationFeedback({error:true,text});
      else setMessage(text);
    }
    finally {lock.current = false; setSaving(false);}
  }
  function close() {
    if(saving) return;
    if((notes.trim() || pending || editingIncome) && !window.confirm("Discard your unsaved changes?")) return;
    onClose();
  }

  if (!item) return null;

  const risk = Number(item.risk_probability || 0);

  return (
    <div className="modal-overlay" onClick={close}>
      <div className="details-modal credit-details" onClick={(event) => event.stopPropagation()}>
        <header className="details-modal__header credit-header">
          <div className="credit-header__nav">
            <button className="details-modal__back" onClick={close}>← Back</button>
            <span>FinSage</span>
          </div>
          <div className="credit-header__summary">
            <div><h2>Application details</h2><p>{item.application_number || "Reference unavailable"}</p></div>
            <span className="credit-risk-badge"><i className={`risk-dot ${risk >= 0.7 ? "high" : risk >= 0.3 ? "medium" : "low"}`} aria-hidden="true" />{risk >= 0.7 ? "High Risk" : risk >= 0.3 ? "Medium Risk" : "Low Risk"}</span>
          </div>
        </header>

        <div className="details-grid">
          <section>
            <h3>Applicant Info</h3>
            <p>Loan Amount: ${Number(item.loan_amount).toFixed(2)}</p>
            <p>Duration: {item.duration_months} months</p>
            <p>Annual income: {!details ? "Loading…" : details.annual_income == null ? "Not provided" : `$${Number(details.annual_income).toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2})}`}</p>
            {canUpdate && !editingIncome && <button type="button" className="credit-reveal" onClick={()=>{setIncomeDraft(details.annual_income == null ? "" : String(details.annual_income));setEditingIncome(true);}}>{details.annual_income == null ? "Add income" : "Edit income"}</button>}
            {editingIncome && <div className="credit-income-editor">
              <label>Annual income ($)<input type="number" min="0" max="1000000000" step="0.01" value={incomeDraft} disabled={saving} onChange={e=>setIncomeDraft(e.target.value)} /></label>
              <button type="button" className="credit-reveal" disabled={saving || incomeDraft === "" || !Number.isFinite(Number(incomeDraft)) || Number(incomeDraft)<0} onClick={()=>save("save_income")}>Save income</button>
              <button type="button" className="credit-reveal" disabled={saving} onClick={()=>setEditingIncome(false)}>Cancel</button>
            </div>}
            {/* Show real seeded names and references rather than treating UUIDs as account numbers. */}
            <div className="credit-private-field"><span>Applicant: {item.applicant_name ? showApplicant ? item.applicant_name : "••••••••" : "Unavailable"}</span>
              {item.applicant_name && <RevealButton visible={showApplicant} onClick={() => setShowApplicant(!showApplicant)} label="applicant name" />}
            </div>
            <p>Customer: {item.customer_number || "Unavailable"}</p>
            <div className="credit-private-field"><span>Internal ID: {showId ? item.application_id : "••••••••"}</span>
              <RevealButton visible={showId} onClick={() => setShowId(!showId)} label="application ID" />
            </div>
            <p>Model classification: {item.predicted_class}</p><p>Review status: {review?.status || "Loading…"}</p><p>Reviewer decision: {review?.decision || "Not decided"}</p>
          </section>

          <section>
            <h3>Example Risk Factors</h3>
            <p>Illustrative examples, not an explanation of this prediction.</p>
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
          <p>Change the amounts below to estimate the risk of the loan not being repaid.</p>
          <div className="simulator-grid">
            <label>
              Loan amount ($)
              <input
                type="number"
                value={loanAmount}
                disabled={saving} min="0.01" step="0.01" onChange={(e) => {setLoanAmount(Number(e.target.value)); setScenarioResult(null);}}
              />
            </label>

            <label>
              Duration
              <select value={duration} disabled={saving} onChange={e=>{setDuration(Number(e.target.value));setScenarioResult(null);}}>
                <option value="" disabled>Choose term</option><option value={36}>36 months</option><option value={60}>60 months</option>
              </select>
            </label>
            {/* Income and existing debt match the new training data; do not assume applicant values. */}
            <label>Annual income ($)
              <input type="number" min="1" max="1000000000" step="0.01" value={annualIncome} disabled={saving} onChange={e=>{setAnnualIncome(e.target.value);setScenarioResult(null);}} />
            </label>
            <label>Monthly debt payments ($)
              <select value={debtRange} disabled={saving} onChange={e=>{setDebtRange(e.target.value);setScenarioResult(null);}}>
                <option value="" disabled>Choose range</option>
                {debtOptions.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
                <option value="custom">Custom amount</option>
              </select>
            </label>
          </div>

          {debtRange === "custom" && <label className="credit-custom-debt">Monthly debt amount ($)
            <input type="number" min="0" step="0.01" value={monthlyDebt} disabled={saving} onChange={e=>{setMonthlyDebt(e.target.value);setScenarioResult(null);}} />
          </label>}
          {debtOption && debtRange !== "none" && <p>Estimate uses ${debtOption.amount.toFixed(2)} per month, the middle of this range.</p>}
          {annualIncome !== "" && Number.isFinite(resolvedDebt) && resolvedDebt > Number(annualIncome)/12 && <p>Debt payments exceed monthly income. Choose a lower range or enter an exact amount.</p>}
          <p>Debt payments exclude your mortgage and this proposed loan.</p>
          <p className="scenario-result">
            {scenarioResult ? `Estimated risk: ${(scenarioResult.result_risk * 100).toFixed(1)}%` : "Choose inputs, then run the model."}
          </p>
          <button disabled={!canUpdate || saving || annualIncome === "" || Number(annualIncome) <= 0 || !debtValid || loanAmount <= 0 || ![36,60].includes(duration)} onClick={() => save("save_simulation")}>{saving ? "Saving…" : "Run & save simulation"}</button>
          {/* Keep model progress/errors beside the button that initiated the request. */}
          {simulationFeedback && <p role={simulationFeedback.error ? "alert" : "status"}>{simulationFeedback.text}</p>}
          {Boolean(scenarioResult?.warnings?.length) && <p>Approximate estimate: these amounts go beyond the examples used for training.</p>}
        </section>

        <section className="details-section">
          <h3>Decision</h3>
          <div className="button-row">
            {Object.entries({approve:"Approve",reject:"Reject",escalate:"Escalate"}).map(([action,label]) =>
              <button key={action} aria-pressed={(pending || selected) === action}
                className={(pending || selected) === action ? "credit-selected" : ""}
                disabled={!canDecide || saving} onClick={() => setPending(action)}>
                {selected === action ? "✓ " : ""}{label}{selected === action ? " · Saved" : ""}
              </button>)}
          </div>
          {pending && <div className="credit-confirm"><p>Accept this decision?</p><button disabled={saving} onClick={() => save(pending)}>Accept</button><button disabled={saving} onClick={() => setPending(null)}>Cancel</button></div>}
          <p role="status">{message}</p>
        </section>

        <section className="details-section">
          <h3>Analyst Notes</h3>
          <textarea placeholder="Add a note..." rows="4" maxLength={10000} value={notes} disabled={!canUpdate || saving} onChange={event => setNotes(event.target.value)} />
          <div className="credit-note-footer"><button disabled={!canUpdate || saving || !notes.trim()} onClick={() => save("save_notes")}>Add note</button>{notes && <span>Unsaved note</span>}</div>
        </section>
        <section className="details-section credit-history">
          <h3>Activity / History</h3>
          {!details && <p>Loading history…</p>}
          {details?.activity.map(event => <article key={event.id}>
            {event.note || event.simulation ? <details><summary>
              <span>{event.actor_name} {event.action === "save_income" ? "updated annual income" : event.note ? "created a note" : "created a simulation"}<time>{new Date(event.created_at).toLocaleString()}</time></span><span className="credit-expand" aria-hidden="true" />
            </summary>
              {event.note ? <p className="credit-note-text">{event.note}</p> : <div>
                <p>Loan amount: ${Number(event.simulation.loan_amount).toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2})}</p>
                <p>Duration: {event.simulation.duration_months} months</p>
                {event.simulation.method === "model_usd_v3" ? <>
                  <p>Annual income: ${Number(event.simulation.annual_income).toLocaleString()}</p>
                  {event.simulation.monthly_debt_basis === "midpoint" && <p>Monthly debt range: {event.simulation.monthly_debt_range_label}</p>}
                  <p>{event.simulation.monthly_debt_basis === "midpoint" ? "Amount used" : "Monthly debt payments"}: ${Number(event.simulation.monthly_debt_payments).toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2})}{event.simulation.monthly_debt_basis === "midpoint" ? " (range midpoint)" : ""}</p>
                </> : <p>Savings: {savingsLabels[event.simulation.savings] || event.simulation.savings}</p>}
                {/* Keep the audit metadata in storage; present one clear result to the analyst. */}
                <p className="scenario-result">{["model_v2","model_usd_v3"].includes(event.simulation.method) ? "Estimated risk" : "Demo estimate"}: {(event.simulation.result_risk * 100).toFixed(1)}%</p>
                {Boolean(event.simulation.warnings?.length) && <p>Approximate estimate: these amounts go beyond the examples used for training.</p>}
              </div>}
            </details> : <p>{event.actor_name} {{approve:"approved the application",reject:"rejected the application",escalate:"escalated the case"}[event.action] || event.action}<time>{new Date(event.created_at).toLocaleString()}</time></p>}
          </article>)}
          {review?.notes && <article><p>Original case note</p><p className="credit-note-text">{review.notes}</p></article>}
          {review?.created_at && <article>Case created<time>{new Date(review.created_at).toLocaleString()}</time></article>}
          <article>Prediction recorded<time>{new Date(details?.prediction_created_at || item.created_at).toLocaleString()}</time></article>
        </section>
      </div>
    </div>
  );
}