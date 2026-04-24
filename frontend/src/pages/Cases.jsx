import { useEffect, useState } from "react";
import CaseDetailsModal from "../modals/CaseDetailsModal";
import api from "../services/api";
import "../style/Cases.css";

export default function Cases() {
  const [fraudCases, setFraudCases] = useState([]);
  const [creditCases, setCreditCases] = useState([]);
  const [selectedItem, setSelectedItem] = useState(null);

  useEffect(() => {
    const load = async () => {
      try {
        const [fraudResponse, creditResponse] = await Promise.all([
          api.get("/finguard/cases"),
          api.get("/finsage/cases"),
        ]);

        const mappedFraud = fraudResponse.data.map((item, index) => ({
          ...item,
          case_type: "Fraud",
          case_code: `CASE-F-${index + 1}`,
          priority: item.priority || "High",
        }));

        const mappedCredit = creditResponse.data.map((item, index) => ({
          ...item,
          case_type: "Credit",
          case_code: `CASE-C-${index + 1}`,
          priority: item.risk_level || "Medium",
        }));

        setFraudCases(mappedFraud);
        setCreditCases(mappedCredit);
      } catch (error) {
        console.error(error);
      }
    };

    load();
  }, []);

  const allCases = [...fraudCases, ...creditCases];

  return (
    <div className="page-shell">
      <div className="page-header">
        <h1>Cases</h1>
      </div>

      <section className="filter-bar">
        <button>Open</button>
        <button>Closed</button>
        <button>Fraud ▼</button>
        <button>Assigned to Me</button>
      </section>

      <section className="panel">
        <h2>Cases Table</h2>

        <div className="data-table">
          <div className="data-table__head">
            <span>ID</span>
            <span>Type</span>
            <span>Priority</span>
            <span>Status</span>
            <span>Assigned</span>
            <span>Updated</span>
          </div>

          {allCases.map((item) => (
            <button
              key={item.case_code}
              className="data-table__row data-table__row--button"
              onClick={() => setSelectedItem(item)}
            >
              <span>{item.case_code}</span>
              <span>{item.case_type}</span>
              <span>{item.priority}</span>
              <span>{item.status}</span>
              <span>{item.assigned_user_id ? "User" : "Unassigned"}</span>
              <span>{item.updated_at ? "Updated" : "Recent"}</span>
            </button>
          ))}
        </div>
      </section>

      {selectedItem ? (
        <CaseDetailsModal item={selectedItem} onClose={() => setSelectedItem(null)} />
      ) : null}
    </div>
  );
}