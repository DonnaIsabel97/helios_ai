import { useEffect, useState } from "react";
import api from "../services/api";

function Dashboard() {
  const [summary, setSummary] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const { data } = await api.get("/dashboard");
        setSummary(data);
      } catch (err) {
        setError(err.response?.data?.message || "Failed to load dashboard");
      }
    };

    fetchDashboard();
  }, []);

  if (error) return <p>{error}</p>;
  if (!summary) return <p>Loading...</p>;

  return (
    <div>
      <h1>Dashboard</h1>
      <p>Total Users: {summary.total_users}</p>
      <p>Total Fraud Cases: {summary.total_fraud_cases}</p>
      <p>Total Credit Cases: {summary.total_credit_cases}</p>
      <p>Total Fraud Predictions: {summary.total_fraud_predictions}</p>
      <p>Total Credit Predictions: {summary.total_credit_predictions}</p>
    </div>
  );
}

export default Dashboard;