import { useMemo } from "react";
import {
  Bar, Line, ComposedChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import { buildPredictionTrend } from "../utils/predictionTrend";

const shortDate = (value) => new Date(`${value}T00:00:00Z`).toLocaleDateString(
  "en-US", { month: "short", day: "numeric", timeZone: "UTC" }
);

// Bright pink highlights alerts/risk; muted pink shows the other predictions.
const seriesColors = { primary: "var(--rose)", secondary: "#8d526e", unknown: "#c5a8b8" };

function TrendTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="prediction-chart__tooltip">
      <strong>{label} · UTC</strong>
      {payload.map((item) => (
        <div key={item.dataKey}>
          <span>{item.name}</span><b>{Number(item.value).toLocaleString()}</b>
        </div>
      ))}
    </div>
  );
}

export default function PredictionTrendChart({ title, rows, classify, primaryLabel, secondaryLabel, variant = "line" }) {
  const { data, skipped, total } = useMemo(
    () => buildPredictionTrend(rows, classify), [rows, classify]
  );
  const series = [
    { key: "secondary", label: secondaryLabel },
    { key: "primary", label: primaryLabel },
    ...(data.some((day) => day.unknown > 0) ? [{ key: "unknown", label: "Unclassified" }] : []),
  ];

  return (
    <section className="panel prediction-chart" aria-label={title}>
      <div className="prediction-chart__heading">
        <div><h2>{title}</h2><p>Predictions recorded per day</p></div>
        <div className="prediction-chart__total"><strong>{total.toLocaleString()}</strong><span>in displayed period</span></div>
      </div>
      {data.length ? (
        <>
          <div className="prediction-chart__legend">
            {series.map(({ key, label }) => (
              <span key={key}><i style={{ background: seriesColors[key] }} />{label}</span>
            ))}
          </div>
          <div className="prediction-chart__plot">
            <ResponsiveContainer width="100%" height="100%" minWidth={0}>
              <ComposedChart data={data} accessibilityLayer margin={{ top: 12, right: 8, bottom: 4, left: 0 }}>
                <CartesianGrid stroke="var(--rim)" vertical={false} strokeDasharray="3 5" />
                <XAxis dataKey="date" tickFormatter={shortDate} tick={{ fill: "var(--text2)", fontSize: 11 }} axisLine={false} tickLine={false} minTickGap={24} tickMargin={12} />
                <YAxis allowDecimals={false} tick={{ fill: "var(--text2)", fontSize: 11 }} axisLine={false} tickLine={false} width={42} />
                <Tooltip content={<TrendTooltip />} cursor={variant === "bar" ? { fill: "var(--rose-dim)" } : { stroke: "var(--rose-bd)", strokeDasharray: "4 4" }} />
                {/* Choose stacked bars for FinSage and lines for FinGuard using the same daily counts. */}
                {series.map(({ key, label }) => (
                  variant === "bar" ? (
                    <Bar key={key} dataKey={key} name={label} stackId="predictions" fill={seriesColors[key]} maxBarSize={36} isAnimationActive={false} />
                  ) : (<Line
                    key={key}
                    type="linear"
                    dataKey={key}
                    name={label}
                    stroke={seriesColors[key]}
                    strokeWidth={key === "primary" ? 2.5 : 2}
                    strokeDasharray={key === "secondary" ? "5 4" : undefined}
                    dot={{ r: data.length <= 7 ? 3 : 2, fill: seriesColors[key], strokeWidth: 0 }}
                    activeDot={{ r: 5, stroke: "var(--surface)", strokeWidth: 2 }}
                    isAnimationActive={false}
                  />)
                ))}
              </ComposedChart>
            </ResponsiveContainer>
          </div>
          {variant === "line" && data.length === 1 && <p className="prediction-chart__period">One recorded day is available. A trend line appears when more dates are recorded.</p>}
          <p className="prediction-chart__period">{data[0].date} — {data.at(-1).date} · UTC · up to 30 days ending at the latest record</p>
          {/* An expandable count table also makes the chart usable without color. */}
          <details className="prediction-chart__data">
            <summary>View daily counts</summary>
            <div><table><thead><tr><th>Date (UTC)</th>{series.map(({ key, label }) => <th key={key}>{label}</th>)}</tr></thead>
              <tbody>{data.map((day) => <tr key={day.date}><td>{day.date}</td>{series.map(({ key }) => <td key={key}>{day[key]}</td>)}</tr>)}</tbody>
            </table></div>
          </details>
        </>
      ) : <p className="prediction-chart__empty">No dated predictions available yet.</p>}
      {skipped > 0 && <p className="prediction-chart__period">{skipped} records omitted because their recording date is missing or invalid.</p>}
    </section>
  );
}
