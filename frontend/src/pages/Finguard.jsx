import { useEffect, useMemo, useState } from "react";
import MetricCard from "../components/MetricCard";
import TransactionDetailsModal from "../modals/TransactionDetailsModal";
import api from "../services/api";
import "../style/Finguard.css";

export default function Finguard() {
  const [rows, setRows] = useState([]);
  const [expandedRow, setExpandedRow] = useState(null);
  const [selectedItem, setSelectedItem] = useState(null);

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

  const highRiskCount = useMemo(
    () => rows.filter((item) => Number(item.fraud_score) >= 0.7).length,
    [rows]
  );

  const avgScore = useMemo(() => {
    if (!rows.length) return "0.00";
    const total = rows.reduce((sum, item) => sum + Number(item.fraud_score || 0), 0);
    return (total / rows.length).toFixed(2);
  }, [rows]);

  return (
    <div className="page-shell">
      <div className="page-header">
        <h1>Finguard</h1>
        <p>Real-time fraud monitoring</p>
      </div>

      <section className="filter-bar">
        <button>Score &gt; 0.7</button>
        <button>Last 24h</button>
        <button>Amount &gt; $500</button>
        <button>Status ▼</button>
      </section>

      <div className="metric-grid">
        <MetricCard title="Alerts" value={rows.length} subtitle="Transactions reviewed" accent="red" />
        <MetricCard title="Avg Score" value={avgScore} subtitle="Average fraud score" accent="gold" />
        <MetricCard title="High Risk" value={highRiskCount} subtitle="High-risk transactions" accent="navy" />
      </div>

      <section className="panel">
        <h2>Transactions Table</h2>

        <div className="data-table">
          <div className="data-table__head">
            <span>ID</span>
            <span>Time</span>
            <span>Amount</span>
            <span>Score</span>
            <span>Risk</span>
            <span>Status</span>
          </div>

          {rows.map((item) => {
            const score = Number(item.fraud_score || 0);
            const risk = score >= 0.7 ? "High" : score >= 0.3 ? "Medium" : "Low";
            const expanded = expandedRow === item.id;

            return (
              <div key={item.id} className="expandable-row-wrap">
                <button
                  className="data-table__row data-table__row--button"
                  onClick={() => setExpandedRow(expanded ? null : item.id)}
                >
                  <span>{item.transaction_id}</span>
                  <span>{new Date(item.transaction_time || item.created_at).toLocaleTimeString()}</span>
                  <span>${Number(item.amount).toFixed(2)}</span>
                  <span>{score.toFixed(2)}</span>
                  <span>
                    <span className={`risk-dot ${risk.toLowerCase()}`} /> {risk}
                  </span>
                  <span>{item.status}</span>
                </button>

                {expanded && (
                  <div className="expanded-row">
                    <p>Fraud Score: {score.toFixed(2)} ({risk} Risk)</p>
                    <p>Signals: high amount, unusual pattern</p>

                    <div className="button-row">
                      <button>Mark Fraud</button>
                      <button>Mark Legit</button>
                      <button onClick={() => setSelectedItem(item)}>View Details</button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {selectedItem ? (
        <TransactionDetailsModal item={selectedItem} onClose={() => setSelectedItem(null)} />
      ) : null}
    </div>
  );
}