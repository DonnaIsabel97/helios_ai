// Older accepted decisions also count as reviewed, without inventing review dates.
export function reviewIsLocked(row) {
  return ["fraud", "legit"].includes(row.reviewer_decision) || row.case_status === "escalated";
}
export function isFraudReviewed(row) {
  return Boolean(row.reviewed_at) || reviewIsLocked(row);
}
export function analystStatus(row) {
  if (row.case_status === "escalated") return "escalated";
  if (row.reviewer_decision === "fraud") return "marked_fraud";
  if (row.reviewer_decision === "legit") return "marked_legit";
  return isFraudReviewed(row) ? "reviewed" : "needs_review";
}
export const analystStatusLabels = {
  needs_review: "Needs review", reviewed: "Reviewed — no decision",
  marked_legit: "Marked legitimate", marked_fraud: "Marked fraud", escalated: "Escalated",
};

// Share the existing display thresholds between the table and its risk filter.
export function fraudRisk(score) {
  if (score == null || score === "" || !Number.isFinite(Number(score))) return "Unknown";
  return Number(score) >= 0.7 ? "High" : Number(score) >= 0.3 ? "Medium" : "Low";
}

export function filterFraudRows(rows, filters, now) {
  return rows.filter((row) => {
    // Use the same timestamp as the table; exclude future and invalid dates.
    if (filters.last24h) {
      const time = Date.parse(row.transaction_time || row.created_at);
      if (!Number.isFinite(time) || time > now || time < now - 86400000) return false;
    }
    if (filters.amount !== "all") {
      const amount = row.amount == null || row.amount === "" ? NaN : Number(row.amount);
      if (!Number.isFinite(amount)) return false;
      if (filters.amount === "upTo500" && amount > 500) return false;
      if (filters.amount === "over500" && amount <= 500) return false;
    }
    if (filters.review === "reviewed" && !isFraudReviewed(row)) return false;
    if (filters.review === "unreviewed" && isFraudReviewed(row)) return false;
    if (filters.status !== "all" && analystStatus(row) !== filters.status) return false;
    if (filters.risk !== "all" && fraudRisk(row.fraud_score).toLowerCase() !== filters.risk) return false;
    return true;
  });
}
