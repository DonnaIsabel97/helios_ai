import { useEffect, useRef, useState } from "react";
import "../style/MetricCard.css";

function useInView(ref) {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) setVisible(true); },
      { threshold: 0.2 }
    );
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, [ref]);
  return visible;
}

export default function MetricCard({ title, value, subtitle, accent = "gold", trend, icon }) {
  const ref = useRef(null);
  const visible = useInView(ref);

  return (
    <article
      ref={ref}
      className={`metric-card metric-card--${accent}${visible ? " metric-card--visible" : ""}`}
    >
      <div className="metric-card__header">
        <div className="metric-card__title">{title}</div>
        {icon && <div className="metric-card__icon">{icon}</div>}
      </div>
      <div className="metric-card__value">{value}</div>
      <div className="metric-card__footer">
        {subtitle ? <div className="metric-card__subtitle">{subtitle}</div> : null}
        {trend != null ? (
          <div className={`metric-card__trend metric-card__trend--${trend >= 0 ? "up" : "down"}`}>
            {trend >= 0 ? "▲" : "▼"} {Math.abs(trend)}%
          </div>
        ) : null}
      </div>
    </article>
  );
}