import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";

export default function CreditRiskChart({ rows }) {
  // Count stored model classifications, not approvals or rounded scores.
  const categories = [
    { name: "High risk", key: "high_risk", color: "var(--rose)", value: 0 },
    { name: "Low risk", key: "low_risk", color: "#8d526e", value: 0 },
    { name: "Unclassified", key: "unknown", color: "#c5a8b8", value: 0 },
  ];
  for (const row of rows) {
    const category = categories.find((item) => item.key === row.predicted_class);
    (category || categories[2]).value += 1;
  }
  const total = rows.length;
  const visible = categories.filter((item) => item.key !== "unknown" || item.value > 0);

  return (
    <section className="panel prediction-chart" aria-label="FinSage credit risk distribution">
      <div className="prediction-chart__heading">
        <div><h2>FinSage · Credit risk</h2><p>Share of saved application predictions</p></div>
        <div className="prediction-chart__total"><strong>{total.toLocaleString()}</strong><span>total predictions</span></div>
      </div>
      {total > 0 ? (
        <>
          <div className="prediction-chart__plot">
            <ResponsiveContainer width="100%" height="100%" minWidth={0}>
              <PieChart accessibilityLayer>
                <Pie data={visible.filter((item) => item.value > 0)} dataKey="value" nameKey="name"
                  cx="50%" cy="50%" innerRadius="58%" outerRadius="82%"
                  stroke="var(--surface)" strokeWidth={3} isAnimationActive={false}>
                  {visible.filter((item) => item.value > 0).map((item) => <Cell key={item.key} fill={item.color} />)}
                </Pie>
                <Tooltip formatter={(value, name) => [`${Number(value).toLocaleString()} (${(Number(value) / total * 100).toFixed(1)}%)`, name]}
                  contentStyle={{ background: "var(--surface2)", border: "1px solid var(--rose-bd)", borderRadius: 8, fontFamily: "Jost, sans-serif", fontSize: 12 }}
                  itemStyle={{ color: "var(--text)" }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          {/* Visible counts and percentages explain the slices without relying on color. */}
          <div className="credit-chart-breakdown">
            {visible.map((item) => (
              <div key={item.key}>
                <span><i style={{ background: item.color }} />{item.name}</span>
                <strong>{item.value.toLocaleString()}</strong>
                <span>{(item.value / total * 100).toFixed(1)}%</span>
              </div>
            ))}
          </div>
          <p className="prediction-chart__period">All saved predictions · model classifications, not approval decisions.</p>
        </>
      ) : <p className="prediction-chart__empty">No credit predictions available yet.</p>}
    </section>
  );
}
