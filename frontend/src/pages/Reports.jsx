import "../style/Reports.css";

export default function Reports() {
  return (
    <div className="page-shell">
      <div className="page-header">
        <h1>Reports</h1>
      </div>

      <section className="filter-bar">
        <button>Last 7 days</button>
        <button>Last 30 days</button>
        <button>Custom Range</button>
      </section>

      <div className="reports-summary">
        <section className="panel">
          <h2>Fraud Summary</h2>
          <p>Total Alerts: 320</p>
          <p>Fraud Rate: 2.1%</p>
          <p>Avg Score: 0.64</p>
        </section>

        <section className="panel">
          <h2>Credit Risk Summary</h2>
          <p>High Risk: 120</p>
          <p>Approval Rate: 68%</p>
          <p>Avg Risk Score: 0.59</p>
        </section>
      </div>

      <section className="panel">
        <h2>Charts</h2>
        <div className="reports-chart-grid">
          <div className="fake-chart" />
          <div className="fake-chart fake-chart--pie" />
        </div>
      </section>
    </div>
  );
}