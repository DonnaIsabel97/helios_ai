import { useEffect, useMemo, useState } from "react";
import MetricCard from "../components/MetricCard";
import api from "../services/api";
import "../style/Dashboard.css";

export default function Dashboard() {
  const [fraudCases, setFraudCases] = useState([]);
  const [creditCases, setCreditCases] = useState([]);
  const [fraudPredictions, setFraudPredictions] = useState([]);

  useEffect(() => {
    const load = async () => {
      try {
        const [fCases, cCases, fPreds] = await Promise.all([
          api.get("/finguard/cases"),
          api.get("/finsage/cases"),
          api.get("/finguard/predictions"),
        ]);

        setFraudCases(fCases.data);
        setCreditCases(cCases.data);
        setFraudPredictions(fPreds.data);
      } catch (error) {
        console.error(error);
      }
    };

    load();
  }, []);

  const avgScore = useMemo(() => {
    if (!fraudPredictions.length) return "0.00";
    const total = fraudPredictions.reduce((sum, item) => sum + Number(item.fraud_score || 0), 0);
    return (total / fraudPredictions.length).toFixed(2);
  }, [fraudPredictions]);

  const highRiskApplicants = creditCases.filter((item) => item.risk_level === "high").length;

  return (
    <div className="page-shell">
      <div className="page-header">
        <h1>Dashboard</h1>
      </div>

      <div className="metric-grid">
        <MetricCard title="Alerts" value={fraudCases.length} subtitle="Open fraud cases" accent="red" />
        <MetricCard title="Avg Score" value={avgScore} subtitle="Average fraud score" accent="gold" />
        <MetricCard title="High Risk" value={highRiskApplicants} subtitle="High-risk applicants" accent="navy" />
      </div>

      <div className="dashboard-grid">
        <section className="panel">
          <h2>Recent Fraud Alerts</h2>
          <div className="mini-list">
            {fraudPredictions.slice(0, 5).map((item) => (
              <div className="mini-list__row" key={item.id}>
                <span>{item.transaction_id}</span>
                <span>{Number(item.fraud_score).toFixed(2)}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="panel">
          <h2>High-Risk Applicants</h2>
          <div className="mini-list">
            {creditCases.slice(0, 5).map((item) => (
              <div className="mini-list__row" key={item.id}>
                <span>{item.application_id}</span>
                <span>{Number(item.risk_probability).toFixed(2)}</span>
              </div>
            ))}
          </div>
        </section>
      </div>

      <section className="panel">
        <h2>Fraud Trend</h2>
        <div className="fake-chart" />
      </section>

      <section className="panel">
        <h2>Recent Alerts / Transactions</h2>
        <div className="data-table">
          <div className="data-table__head">
            <span>ID</span>
            <span>Amount</span>
            <span>Score</span>
            <span>Status</span>
          </div>

          {fraudPredictions.slice(0, 8).map((item) => (
            <div className="data-table__row" key={item.id}>
              <span>{item.transaction_id}</span>
              <span>${Number(item.amount).toFixed(2)}</span>
              <span>{Number(item.fraud_score).toFixed(2)}</span>
              <span>{item.status}</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}