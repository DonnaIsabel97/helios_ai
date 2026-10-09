import { planFraudCaseAction } from "../utils/fraudCaseActions.js";
import { spawn } from "child_process";
import path from "path";
import { fileURLToPath } from "url";
import pool from "../db/connection.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const predictFinGuardPath = path.resolve(
  __dirname,
  "../../../ml/finguard/predict_finguard.py"
);

const pythonPath =
  process.env.NODE_ENV === "production"
    ? "python"
    : path.resolve(__dirname, "../../../.venv/Scripts/python.exe");

export const predictFraud = async (req, res, next) => {
  try {
    const {
      transaction_id,
      customer_id,
      account_id,
      card_id,
      amount,
      transaction_time,
      Time,
      V1, V2, V3, V4, V5, V6, V7, V8, V9, V10,
      V11, V12, V13, V14, V15, V16, V17, V18, V19, V20,
      V21, V22, V23, V24, V25, V26, V27, V28
    } = req.body;

    const payload = {
      Time, V1, V2, V3, V4, V5, V6, V7, V8, V9, V10,
      V11, V12, V13, V14, V15, V16, V17, V18, V19, V20,
      V21, V22, V23, V24, V25, V26, V27, V28, Amount: amount
    };

    const python = spawn(pythonPath, [predictFinGuardPath]);

    let output = "";
    let errorOutput = "";

    python.stdin.write(JSON.stringify(payload));
    python.stdin.end();

    python.stdout.on("data", (data) => {
      output += data.toString();
    });

    python.stderr.on("data", (data) => {
      errorOutput += data.toString();
    });

    python.on("close", async (code) => {
      try {
        console.log("FinGuard python exit code:", code);
        console.log("FinGuard stdout:", output);
        console.log("FinGuard stderr:", errorOutput);

        if (code !== 0) {
          throw new Error(errorOutput || output || "FinGuard Python script failed");
        }

        const result = JSON.parse(output);

        if (result.error) {
          throw new Error(result.error);
        }

        const fraudScore = Number(result.fraud_score);

        let predictionStatus = "normal";
        if (result.predicted_label === "fraud" || fraudScore >= 0.7) {
          predictionStatus = "flagged";
        }

        const predictionResult = await pool.query(
          `
          INSERT INTO fraud_predictions (
            transaction_id,
            customer_id,
            account_id,
            card_id,
            amount,
            transaction_time,
            fraud_score,
            predicted_label,
            status,
            model_version
          )
          VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
          RETURNING *
          `,
          [
            transaction_id,
            customer_id,
            account_id,
            card_id || null,
            amount,
            transaction_time,
            fraudScore,
            result.predicted_label,
            predictionStatus,
            "finguard_v1"
          ]
        );

        const prediction = predictionResult.rows[0];

        let priority = "low";
        let caseNote = "Low-risk transaction review record";

        if (fraudScore >= 0.85 || result.predicted_label === "fraud") {
          priority = "high";
          caseNote = "High-risk fraud review suggested";
        } else if (fraudScore >= 0.6) {
          priority = "medium";
          caseNote = "Moderate-risk transaction review suggested";
        }

        const existingCase = await pool.query(
          `
          SELECT id
          FROM fraud_cases
          WHERE fraud_prediction_id = $1
          `,
          [prediction.id]
        );

        let caseCreated = false;

        if (existingCase.rows.length === 0) {
          const caseResult = await pool.query(
            `
            INSERT INTO fraud_cases (
              fraud_prediction_id,
              assigned_user_id,
              priority,
              decision,
              notes,
              status
            )
            VALUES ($1,$2,$3,$4,$5,$6)
            RETURNING *
            `,
            [
              prediction.id,
              null,
              priority,
              null,
              caseNote,
              "open"
            ]
          );

          console.log("Fraud case inserted:", caseResult.rows[0]);
          caseCreated = true;
        } else {
          console.log("Fraud case already exists for prediction:", prediction.id);
        }

        res.status(201).json({
          ...prediction,
          case_created: caseCreated,
          case_priority: priority,
          case_note: caseNote
        });
      } catch (err) {
        next(err);
      }
    });

    python.on("error", (err) => {
      console.error("Failed to start Python process:", err);
    });
  } catch (error) {
    next(error);
  }
};

export const getFraudPredictions = async (req, res, next) => {
  try {
    const result = await pool.query(
      `
      SELECT
        fp.id,
        fp.transaction_id,
        fp.customer_id,
        fp.account_id,
        fp.card_id,
        fp.amount,
        fp.transaction_time,
        fp.fraud_score,
        fp.predicted_label,
        fp.status,
        fp.model_version,
        fp.created_at,
        fc.decision AS reviewer_decision,
        fc.status AS case_status,
        fc.reviewed_at,
        fc.reviewed_by,
        fc.updated_at::text AS review_version,
        fc.id AS review_case_id,
        EXISTS (SELECT 1 FROM users WHERE id=$1 AND lower(role)='admin') AS can_review
      FROM fraud_predictions fp
      LEFT JOIN fraud_cases fc ON fc.fraud_prediction_id=fp.id
      ORDER BY fp.created_at DESC
      `, [req.user.id]
    );

    res.status(200).json(result.rows);
  } catch (error) {
    next(error);
  }
};

export const getFraudCases = async (req, res, next) => {
  try {
    const result = await pool.query(
      `
      SELECT
        fc.id,
        fc.fraud_prediction_id,
        fc.assigned_user_id,
        fc.priority,
        fc.decision,
        fc.notes,
        fc.status,
        fc.created_at,
        fc.updated_at,
        fp.transaction_id,
        fp.amount,
        fp.fraud_score,
        fp.predicted_label,
        fp.transaction_time
      FROM fraud_cases fc
      JOIN fraud_predictions fp
        ON fc.fraud_prediction_id = fp.id
      ORDER BY fc.created_at DESC
      `
    );

    res.status(200).json(result.rows);
  } catch (error) {
    next(error);
  }
};
// Fetch display numbers only when an authenticated user opens transaction details.
export const getFraudPredictionDetails = async (req, res, next) => {
  try {
    const result = await pool.query(`
      SELECT fp.id, a.account_number, c.card_number_masked
      FROM fraud_predictions fp
      LEFT JOIN accounts a ON a.id = fp.account_id AND a.customer_id = fp.customer_id
      LEFT JOIN cards c ON c.id = fp.card_id AND c.account_id = fp.account_id
      WHERE fp.id = $1
    `, [req.params.id]);
    if (!result.rows.length) return res.status(404).json({ message: "Prediction not found." });
    res.set("Cache-Control", "no-store");
    const review = await pool.query("SELECT *, updated_at::text AS version FROM fraud_cases WHERE fraud_prediction_id=$1", [req.params.id]);
    const user = await pool.query("SELECT role FROM users WHERE id=$1", [req.user.id]);
    const activity = review.rows[0] ? await pool.query("SELECT * FROM fraud_case_activity WHERE fraud_case_id=$1 ORDER BY created_at DESC, id DESC", [review.rows[0].id]) : { rows: [] };
    res.json({ ...result.rows[0], activity: activity.rows, review_case: review.rows[0] || null, can_update: user.rows[0]?.role.toLowerCase() === "admin" });
  } catch (error) { next(error); }
};

// Lock and version-check the case so two reviewers cannot silently overwrite it.
export const updateFraudCase = async (req, res, next) => {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(req.params.id)) {
    return res.status(400).json({ message: "Invalid prediction ID." });
  }
  const { action, version, notes } = req.body || {};
  if (typeof version !== "string") return res.status(400).json({ message: "Reload the case before saving." });
  let client;
  try {
    client = await pool.connect();
    await client.query("BEGIN");
    // Check the current database role, not a role supplied by the browser.
    const user = await client.query("SELECT role, full_name FROM users WHERE id = $1", [req.user.id]);
    if (user.rows[0]?.role.toLowerCase() !== "admin") {
      await client.query("ROLLBACK");
      return res.status(403).json({ message: "Only an Admin can update fraud cases." });
    }
    const found = await client.query("SELECT *, updated_at::text AS version FROM fraud_cases WHERE fraud_prediction_id = $1 FOR UPDATE", [req.params.id]);
    const current = found.rows[0];
    if (!current) {
      await client.query("ROLLBACK");
      return res.status(404).json({ message: "No review case exists for this prediction." });
    }
    if (current.version !== version) {
      await client.query("ROLLBACK");
      return res.status(409).json({ message: "This case changed. Close and reopen its details before saving." });
    }
    const planned = planFraudCaseAction(current, action, notes);
    const saved = await client.query(`UPDATE fraud_cases
      SET decision=$1, status=$2, priority=$3, notes=$4, updated_at=clock_timestamp(),
          reviewed_at=CASE WHEN $6 IN ('mark_reviewed','mark_fraud','mark_legit','escalate') THEN COALESCE(reviewed_at, clock_timestamp()) WHEN $6='mark_unreviewed' THEN NULL ELSE reviewed_at END,
          reviewed_by=CASE WHEN $6 IN ('mark_reviewed','mark_fraud','mark_legit','escalate') AND reviewed_at IS NULL THEN $7::uuid WHEN $6='mark_unreviewed' THEN NULL ELSE reviewed_by END
      WHERE id=$5 RETURNING *, updated_at::text AS version`,
      [planned.decision, planned.status, planned.priority, planned.notes, current.id, action, req.user.id]);
    // Save the action and its history together: both succeed or both roll back.
    const event = await client.query(`INSERT INTO fraud_case_activity
      (fraud_case_id, actor_user_id, actor_name, action, note, previous_status, new_status, previous_decision, new_decision)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
      [current.id, req.user.id, user.rows[0].full_name || "User", action,
       action === "save_notes" ? notes.trim() : null, current.status, saved.rows[0].status, current.decision, saved.rows[0].decision]);
    await client.query("COMMIT");
    res.set("Cache-Control", "no-store");
    res.json({ review_case: saved.rows[0], activity_event: event.rows[0] });
  } catch (error) {
    if (client) await client.query("ROLLBACK").catch(() => {});
    if (error.status) return res.status(error.status).json({ message: error.message });
    next(error);
  } finally { client?.release(); }
};
