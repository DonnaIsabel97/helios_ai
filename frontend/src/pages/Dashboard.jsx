import { Link } from "react-router-dom";
import RiskDistributionChart from "../components/RiskDistributionChart";
import { useEffect, useState } from "react";
import MetricCard from "../components/MetricCard";
import api from "../services/api";
import "../style/Dashboard.css";


export default function Dashboard() {
  // Start with arrays so array methods are safe before data arrives.
  const [fraudCases, setFraudCases] = useState([]);
  const [creditCases, setCreditCases] = useState([]);
  const [fraudPredictions, setFraudPredictions] = useState([]);
  const [creditPredictions, setCreditPredictions] = useState([]);

  // Show loading and failure states instead of a blank page.
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    // Prevent state updates after navigating away from this page.
    let active = true;

    const load = async () => {
      try {
        // The shared base URL already includes /api.
        const [fCases, cCases, fPreds, cPreds] = await Promise.all([
          api.get("/finguard/cases"),
          api.get("/finsage/cases"),
          api.get("/finguard/predictions"),
          api.get("/finsage/predictions"),
        ]);

        // Reject unexpected responses before using array methods.
        if (
          !Array.isArray(fCases.data) ||
          !Array.isArray(cCases.data) ||
          !Array.isArray(fPreds.data) ||
          !Array.isArray(cPreds.data)
        ) {
          throw new Error(
            "Unexpected API response: dashboard endpoints must return arrays."
          );
        }

        if (active) {
          setFraudCases(fCases.data);
          setCreditCases(cCases.data);
          setFraudPredictions(fPreds.data);
          setCreditPredictions(cPreds.data);
        }
      } catch (err) {
        if (active) {
          // Explain an expired or invalid session separately.
          const message =
            err.response?.status === 401
              ? "Your session is invalid or expired. Please sign in again."
              : err.message || "Unable to load the dashboard.";

          setError(message);
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    load();

    return () => {
      active = false;
    };
  }, []);

// Count only open cases for the "Open fraud cases" metric.
  const openFraudCases = fraudCases.filter(
    (item) => item.status === "open"
  ).length;

  // The current workflow treats open fraud and credit cases as awaiting review.
  const pendingReviews = openFraudCases + creditCases.filter(
    (item) => item.status === "open"
  ).length;

  // Keep the existing credit-risk field mapping for now.
  const highRiskCreditCases = creditCases.filter(
    (item) => item.risk_level === "high"
  );

  // Show flagged predictions in the alerts panel.
  const recentFraudAlerts = fraudPredictions
    .filter((item) => item.status === "flagged")
    .slice(0, 5);

  return (
    <div className="page-shell dashboard-page">
      <div className="page-header">
        <h1>Dashboard</h1>
      </div>

      {/* Keep status messages inside the existing page layout. */}
      {loading ? (
        <section className="panel">
          <p role="status">Loading dashboard...</p>
        </section>
      ) : error ? (
        <section className="panel">
          <p role="alert">{error}</p>
        </section>
      ) : (
        <>
          <div className="metric-grid">
            <MetricCard
              title="Open Fraud Cases"
              value={openFraudCases}
              subtitle="Awaiting fraud review"
              accent="red"
            />
            <MetricCard
              title="Pending Reviews"
              value={pendingReviews}
              subtitle="Across FinGuard and FinSage"
              accent="gold"
            />
            <MetricCard
              title="High Risk"
              value={highRiskCreditCases.length}
              subtitle="High-risk applicants"
              accent="navy"
            />
          </div>

          {/* Count actual saved predictions; tiny scores do not need rescaling. */}
          <div className="dashboard-charts">
            <RiskDistributionChart model="fraud" rows={fraudPredictions} />
            <RiskDistributionChart model="credit" rows={creditPredictions} />
          </div>
          <p className="dashboard-chart-note">Both charts show counts and percentages across all saved demo predictions.</p>

          {/* Separate overview tables reuse the quiet rows and risk dots of the model pages. */}
          <div className="dashboard-grid dashboard-overviews">
            <section className="panel">
              {/* Navigate to the full model page without reloading the application. */}
              <div className="overview-panel-header">
                <h2>FinGuard · Recent Fraud Alerts</h2>
                <Link className="overview-see-more" to="/finguard" aria-label="See more in FinGuard">See more <span aria-hidden="true">→</span></Link>
              </div>
              <div className="overview-table-scroll">
                <table className="overview-table">
                  <thead><tr><th scope="col">ID</th><th scope="col">Amount</th><th scope="col">Risk Level</th><th scope="col">Status</th></tr></thead>
                  <tbody>
                    {recentFraudAlerts.length === 0 ? (
                      <tr><td colSpan={4}>No flagged transactions found.</td></tr>
                    ) : recentFraudAlerts.map((item) => {
                      // Match the existing FinGuard risk bands without displaying the score.
                      const score = Number(item.fraud_score);
                      const risk = item.fraud_score == null || !Number.isFinite(score)
                        ? "Unknown" : score >= 0.7 ? "High" : score >= 0.3 ? "Medium" : "Low";
                      return (
                        <tr key={item.id}>
                          <td title={item.transaction_id}>{item.transaction_id}</td>
                          <td>{item.amount == null ? "—" : "$" + Number(item.amount).toFixed(2)}</td>
                          <td><span className="overview-risk"><i className={`risk-dot ${risk.toLowerCase()}`} aria-hidden="true" />{risk}</span></td>
                          <td>{item.status}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </section>
            <section className="panel">
              <div className="overview-panel-header">
                <h2>FinSage · High-Risk Applicants</h2>
                <Link className="overview-see-more" to="/finsage" aria-label="See more in FinSage">See more <span aria-hidden="true">→</span></Link>
              </div>
              <div className="overview-table-scroll">
                <table className="overview-table">
                  <thead><tr><th scope="col">ID</th><th scope="col">Amount</th><th scope="col">Risk Level</th><th scope="col">Status</th></tr></thead>
                  <tbody>
                    {highRiskCreditCases.length === 0 ? (
                      <tr><td colSpan={4}>No high-risk applicants found.</td></tr>
                    ) : highRiskCreditCases.slice(0, 5).map((item) => (
                      <tr key={item.id}>
                        <td title={item.application_id}>{item.application_id}</td>
                        <td>{item.loan_amount == null ? "—" : "$" + Number(item.loan_amount).toFixed(2)}</td>
                        {/* These cases are already selected by their saved high risk level. */}
                        <td><span className="overview-risk"><i className="risk-dot high" aria-hidden="true" />High</span></td>
                        <td>{item.status}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          </div>
          <section className="panel">
            <h2>Recent Alerts / Transactions</h2>

            <div className="data-table">
              <div className="data-table__head">
                <span>ID</span>
                <span>Amount</span>
                <span>Score</span>
                <span>Status</span>
              </div>

              {fraudPredictions.length === 0 ? (
                <p>No predictions found.</p>
              ) : (
                fraudPredictions.slice(0, 8).map((item) => (
                  <div className="data-table__row" key={item.id}>
                    <span>{item.transaction_id}</span>
                    <span>${Number(item.amount).toFixed(2)}</span>
                    <span>
                      {Number(item.fraud_score).toFixed(2)}
                    </span>
                    <span>{item.status}</span>
                  </div>
                ))
              )}
            </div>
          </section>
        </>
      )}
    </div>
  );
}