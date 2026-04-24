import { useEffect, useMemo, useState } from "react";
import MetricCard from "../components/MetricCard";
import CreditDetailsModal from "../modals/CreditDetailsModal";
import api from "../services/api";
import "../style/Finsage.css";

export default function Finsage() {
  const [rows, setRows] = useState([]);
  const [expandedRow, setExpandedRow] = useState(null);
  const [selectedItem, setSelectedItem] = useState(null);

  useEffect(() => {
    const load = async () => {
      try {
        const response = await api.get("/finsage/predictions");
        setRows(response.data);
      } catch (error) {
        console.error(error);
      }
    };

    load();
  }, []);

  const avgRisk = useMemo(() => {
    if (!rows.length) return "0.00";
    const total = rows.reduce((sum, item) => sum + Number(item.risk_probability || 0), 0);
    return (total / rows.length).toFixed(2);
  }, [rows]);

  const approvalRate = useMemo(() => {
    if (!rows.length) return "0%";
    const approvedLike = rows.filter((item) => item.predicted_class === "low_risk").length;
    return `${Math.round((approvedLike / rows.length) * 100)}%`;
  }, [rows]);

  const highRiskCount = rows.filter((item) => Number(item.risk_probability || 0) >= 0.7).length;

  return (
    <div className="page-shell">
      <div className="page-header">
        <h1>FinSage</h1>
        <p>Credit Risk Analysis</p>
      </div>

      <section className="filter-bar">
        <button>High Risk</button>
        <button>Amount &gt; $10k</button>
        <button>Pending ▼</button>
      </section>

      <div className="metric-grid">
        <MetricCard title="High Risk" value={highRiskCount} subtitle="High-risk applications" accent="red" />
        <MetricCard title="Avg Risk" value={avgRisk} subtitle="Average risk score" accent="gold" />
        <MetricCard title="Approval Rate" value={approvalRate} subtitle="Low-risk applications" accent="navy" />
      </div>

      <section className="panel">
        <h2>Applications Queue</h2>

        <div className="data-table">
          <div className="data-table__head">
            <span>ID</span>
            <span>Amount</span>
            <span>Risk Score</span>
            <span>Risk Level</span>
            <span>Status</span>
          </div>

          {rows.map((item) => {
            const score = Number(item.risk_probability || 0);
            const risk = score >= 0.7 ? "High" : score >= 0.3 ? "Medium" : "Low";
            const expanded = expandedRow === item.id;

            return (
              <div key={item.id} className="expandable-row-wrap">
                <button
                  className="data-table__row data-table__row--button"
                  onClick={() => setExpandedRow(expanded ? null : item.id)}
                >
                  <span>{item.application_id}</span>
                  <span>${Number(item.loan_amount).toFixed(0)}</span>
                  <span>{score.toFixed(2)}</span>
                  <span>
                    <span className={`risk-dot ${risk.toLowerCase()}`} /> {risk}
                  </span>
                  <span>{item.predicted_class}</span>
                </button>

                {expanded && (
                  <div className="expanded-row">
                    <p>Risk: {(score * 100).toFixed(0)}% ({risk})</p>
                    <p>Factors: high loan, low savings</p>

                    <div className="button-row">
                      <button onClick={() => setSelectedItem(item)}>Review</button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {selectedItem ? (
        <CreditDetailsModal item={selectedItem} onClose={() => setSelectedItem(null)} />
      ) : null}
    </div>
  );
}