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
    ? "python3"
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
        fp.created_at
      FROM fraud_predictions fp
      ORDER BY fp.created_at DESC
      `
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