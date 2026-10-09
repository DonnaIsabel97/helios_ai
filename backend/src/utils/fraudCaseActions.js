// Keep reviewer decisions separate from the model's fraud_predictions record.
export function planFraudCaseAction(current, action, notes) {
  const next = { decision: current.decision, status: current.status, priority: current.priority, notes: current.notes, reviewed_at: current.reviewed_at, reviewed_by: current.reviewed_by };
  // Reviewing a transaction is independent of its prediction and final decision.
  if (action === "mark_reviewed" || action === "mark_unreviewed") {
    if (action === "mark_unreviewed" && (current.decision || ["closed", "escalated"].includes(current.status))) {
      throw Object.assign(new Error("A decided or escalated case cannot be marked as not reviewed."), { status: 409 });
    }
    next.reviewed_at = action === "mark_reviewed" ? "now" : null;
    next.reviewed_by = null;
    return next;
  }
  if (action === "save_notes") {
    if (typeof notes !== "string" || !notes.trim() || notes.length > 10000) throw Object.assign(new Error("Enter a note between 1 and 10,000 characters."), { status: 400 });
    // New notes are appended to activity, preserving the original case note.
    next.notes = current.notes;
    return next;
  }
  if (!["mark_fraud", "mark_legit", "escalate"].includes(action)) throw Object.assign(new Error("Unknown case action."), { status: 400 });
  if (!["open", "escalated"].includes(current.status)) throw Object.assign(new Error("This case is already closed or cannot be changed in its current state."), { status: 409 });
  // Accepting an analyst action completes the initial review.
  next.reviewed_at = current.reviewed_at || "now";
  if (action === "escalate") {
    next.status = "escalated";
    next.priority = "high";
  } else {
    next.decision = action === "mark_fraud" ? "fraud" : "legit";
    next.status = "closed";
  }
  return next;
}
