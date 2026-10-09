import ReviewConfirmation from "../components/ReviewConfirmation";
import { filterFraudRows, fraudRisk, isFraudReviewed, reviewIsLocked, analystStatus, analystStatusLabels } from "../utils/finguardFilters";
import { useEffect, useMemo, useRef, useState } from "react";
import MetricCard from "../components/MetricCard";
import TransactionDetailsModal from "../modals/TransactionDetailsModal";
import api from "../services/api";
import "../style/Finguard.css";

export default function Finguard() {
  const [rows, setRows] = useState([]);
  const [selectedItem, setSelectedItem] = useState(null);
  const [reviewSaving, setReviewSaving] = useState(null);
  const [reviewError, setReviewError] = useState("");
  const [reviewTarget, setReviewTarget] = useState(null);
  const reviewLock = useRef(false);
  const [reviewNotice, setReviewNotice] = useState("");
  // Briefly announce a confirmed save without keeping a permanent banner.
  useEffect(() => {
    if (!reviewNotice) return;
    const timer = setTimeout(() => setReviewNotice(""), 4500);
    return () => clearTimeout(timer);
  }, [reviewNotice]);
  // Apply the saved case's review metadata to the list and its filters immediately.
  const applyCaseUpdate = (predictionId, saved) => {
    setRows((current) => current.map((row) => row.id === predictionId ? {
      ...row, reviewed_at: saved.reviewed_at, reviewed_by: saved.reviewed_by, review_version: saved.version, reviewer_decision: saved.decision, case_status: saved.status,
    } : row));
  };
  const toggleReviewed = async (item) => {
    if (reviewLock.current) return;
    reviewLock.current = true;
    setReviewSaving(item.id);
    setReviewError("");
    try {
      const { data } = await api.patch(`/finguard/predictions/${item.id}/case`, {
        action: item.reviewed_at ? "mark_unreviewed" : "mark_reviewed", version: item.review_version,
      });
      applyCaseUpdate(item.id, data.review_case);
      setReviewTarget(null);
      setReviewNotice(item.reviewed_at ? "Transaction marked as not reviewed." : "Transaction marked as reviewed.");
    } catch (error) {
      setReviewError(error.response?.data?.message || "Unable to save review status.");
    } finally { reviewLock.current = false; setReviewSaving(null); }
  };

  // Each selection narrows the table; All removes that individual constraint.
  const [filters, setFilters] = useState({ last24h: false, amount: "all", status: "all", risk: "all", review: "all" });
  const [now, setNow] = useState(() => Date.now());
  const updateFilter = (key, value) => {
    setFilters((current) => ({ ...current, [key]: value }));
    setNow(Date.now());
  };
  const resetFilters = () => {
    setFilters({ last24h: false, amount: "all", status: "all", risk: "all", review: "all" });
  };
  const hasFilters = filters.last24h || filters.amount !== "all" || filters.status !== "all" || filters.risk !== "all" || filters.review !== "all";
  // Refresh the rolling time window every minute while it is enabled.
  useEffect(() => {
    if (!filters.last24h) return;
    const timer = setInterval(() => setNow(Date.now()), 60000);
    return () => clearInterval(timer);
  }, [filters.last24h]);
  const filteredRows = useMemo(() => filterFraudRows(rows, filters, now), [rows, filters, now]);

  useEffect(() => {
    const load = async () => {
      try {
        const response = await api.get("/finguard/predictions");
        setRows(response.data);
      } catch (error) {
        console.error(error);
      }
    };

    load();
  }, []);

  // Cards summarize analyst workload across all loaded transactions.
  const reviewedCount = rows.filter(isFraudReviewed).length;
  const needsReviewCount = rows.length - reviewedCount;
  const escalatedCount = rows.filter((row) => analystStatus(row) === "escalated").length;

  return (
    <div className="page-shell finguard-page">
      <div className="page-header">
        <h1>Finguard</h1>
        <p>Real-time fraud monitoring</p>
      </div>

      <section className="filter-bar" aria-label="Transaction filters">
        <button type="button" className={filters.last24h ? "active" : ""}
          aria-pressed={filters.last24h} onClick={() => updateFilter("last24h", !filters.last24h)}>Last 24h</button>
        <label className="finguard-filter">
          <select aria-label="Amount" value={filters.amount} onChange={(event) => updateFilter("amount", event.target.value)}>
            <option value="all">Amount</option><option value="upTo500">$500 or less</option><option value="over500">Over $500</option>
          </select>
        </label>
        <label className="finguard-filter">
          <select aria-label="Status" value={filters.status} onChange={(event) => updateFilter("status", event.target.value)}>
            <option value="all">Status</option>
            {Object.entries(analystStatusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
        </label>
        <label className="finguard-filter">
          <select aria-label="Risk level" value={filters.risk} onChange={(event) => updateFilter("risk", event.target.value)}>
            <option value="all">Risk level</option><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option>
          </select>
        </label>
        <label className="finguard-filter">
          <select aria-label="Review status" value={filters.review} onChange={(event) => updateFilter("review", event.target.value)}>
            <option value="all">Review</option><option value="reviewed">Reviewed</option><option value="unreviewed">Not reviewed</option>
          </select>
        </label>
        {hasFilters && <button type="button" onClick={resetFilters}>Clear filters</button>}
      </section>

      <div className="metric-grid">
        <MetricCard title="Needs Review" value={needsReviewCount} subtitle="Awaiting initial analyst review" accent="red" />
        <MetricCard title="Reviewed" value={reviewedCount} subtitle="Initial analyst review completed" accent="gold" />
        <MetricCard title="Escalated" value={escalatedCount} subtitle="Reviewed · needs further attention" accent="navy" />
      </div>

      <section className="panel">
        <h2>Transactions Table</h2>
        {reviewError && <p role="alert">{reviewError}</p>}
        <p className="filter-results" role="status">Showing {filteredRows.length} of {rows.length} transactions · summary cards show all transactions</p>

        <div className="data-table">
          {/* Five columns, with risk displayed as a label instead of a score. */}
          <div className="transaction-review-heading">
            <span className="transaction-review-heading__label">Reviewed</span>
          <div className="data-table__head">
            <span>ID</span>
            <span>Time</span>
            <span>Amount</span>
            <span>Risk Level</span>
            <span>Status</span>
          </div>
          </div>

          {filteredRows.length === 0 && <p className="filter-results">{hasFilters ? "No transactions match these filters. Try another selection or clear the filters." : "No transactions available."}</p>}
          {filteredRows.map((item) => {
            const risk = fraudRisk(item.fraud_score);
            const reviewed = isFraudReviewed(item);
            const reviewLocked = reviewIsLocked(item);

            return (
              <div key={item.id} className="transaction-row-wrap">
                <div className="transaction-review-row">
                  {/* This checkbox is separate from the row button and changes only after a confirmed save. */}
                  <input type="checkbox" className="transaction-review-checkbox" checked={reviewed}
                    aria-label={`Reviewed: ${item.transaction_id}`}
                    title={reviewLocked ? "Reviewed through an accepted action" : item.reviewed_at ? `Reviewed on ${new Date(item.reviewed_at).toLocaleString()}` : "Not reviewed"}
                    disabled={reviewLocked || !item.can_review || !item.review_case_id || reviewSaving !== null}
                    onChange={() => { setReviewError(""); setReviewTarget(item); }} />
                <button
                  className="data-table__row data-table__row--button"
                  onClick={() => setSelectedItem(item)}
                  aria-haspopup="dialog"
                  aria-label={`Open transaction ${item.transaction_id}`}
                >
                  <span>{item.transaction_id}</span>
                  <span>{new Date(item.transaction_time || item.created_at).toLocaleTimeString()}</span>
                  <span>${Number(item.amount).toFixed(2)}</span>
                  <span className="risk-label">
                    <span className={`risk-dot ${risk.toLowerCase()}`} aria-hidden="true" /> {risk}
                  </span>
                  <span className="analyst-status">{analystStatusLabels[analystStatus(item)]}</span>
                </button>
                </div>

              </div>
            );
          })}
        </div>
      </section>

      <div className={`review-save-notice ${reviewNotice ? "is-visible" : ""}`} role="status" aria-live="polite">{reviewNotice}</div>
      {reviewTarget && <ReviewConfirmation item={reviewTarget} saving={reviewSaving !== null} error={reviewError}
        onCancel={() => { setReviewTarget(null); setReviewError(""); }} onConfirm={() => toggleReviewed(reviewTarget)} />}
      {selectedItem ? (
        <TransactionDetailsModal key={selectedItem.id} item={selectedItem} onCaseUpdated={applyCaseUpdate} onClose={() => setSelectedItem(null)} />
      ) : null}
    </div>
  );
}