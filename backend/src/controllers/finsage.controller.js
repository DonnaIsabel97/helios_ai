import { spawn } from "child_process";
import path from "path";
import { fileURLToPath } from "url";
import pool from "../db/connection.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const predictFinSagePath = path.resolve(
  __dirname,
  "../../../ml/finsage/predict_finsage.py"
);

const pythonPath = path.resolve(
  __dirname,
  "../../../.venv/Scripts/python.exe"
);

export const predictCreditRisk = async (req, res, next) => {
  try {
    const {
      loan_application_id,
      customer_id,
      feature_1,
      feature_2,
      feature_5,
      feature_6,
      feature_7
    } = req.body;

    const payload = {
      feature_1,
      feature_2,
      feature_5,
      feature_6,
      feature_7
    };

    const python = spawn(pythonPath, [predictFinSagePath]);

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
        console.log("FinSage exit code:", code);
        console.log("FinSage stdout:", output);
        console.log("FinSage stderr:", errorOutput);

        if (code !== 0) {
          let parsedError = null;

          try {
            parsedError = JSON.parse(output);
          } catch {
            parsedError = null;
          }

          if (parsedError?.error) {
            throw new Error(parsedError.error);
          }

          throw new Error(output || errorOutput || "FinSage Python script failed");
        }

        const result = JSON.parse(output);

        if (result.error) {
          throw new Error(result.error);
        }

        const applicationResult = await pool.query(
          `
          SELECT id, loan_amount, duration_months
          FROM loan_applications
          WHERE id = $1
          `,
          [loan_application_id]
        );

        if (applicationResult.rows.length === 0) {
          throw new Error("Loan application not found");
        }

        const application = applicationResult.rows[0];

        const explanationSummary = result.insights
          ? result.insights
              .map(
                (item) =>
                  `${item.feature}=${item.value} (${item.direction}, impact=${item.impact})`
              )
              .join(" | ")
          : "Generated from Discrete Bayesian Network inference";

        const predictionResult = await pool.query(
          `
          INSERT INTO credit_predictions (
            application_id,
            loan_application_id,
            customer_id,
            loan_amount,
            duration_months,
            risk_probability,
            predicted_class,
            explanation_summary,
            model_version
          )
          VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
          ON CONFLICT (application_id)
          DO UPDATE SET
            loan_application_id = EXCLUDED.loan_application_id,
            customer_id = EXCLUDED.customer_id,
            loan_amount = EXCLUDED.loan_amount,
            duration_months = EXCLUDED.duration_months,
            risk_probability = EXCLUDED.risk_probability,
            predicted_class = EXCLUDED.predicted_class,
            explanation_summary = EXCLUDED.explanation_summary,
            model_version = EXCLUDED.model_version
          RETURNING *
          `,
          [
            loan_application_id,
            loan_application_id,
            customer_id,
            application.loan_amount,
            application.duration_months,
            result.risk_probability,
            result.predicted_class,
            explanationSummary,
            "finsage_v1"
          ]
        );

        const prediction = predictionResult.rows[0];
        const probability = Number(prediction.risk_probability);

        let caseNote = "Low-risk credit review record";
        let riskLevel = "low";

        if (probability >= 0.6 || prediction.predicted_class === "high_risk") {
          caseNote = "High-risk credit review suggested";
          riskLevel = "high";
        } else if (probability >= 0.45) {
          caseNote = "Borderline credit review suggested";
          riskLevel = "medium";
        }

        const existingCase = await pool.query(
          `
          SELECT id
          FROM credit_cases
          WHERE credit_prediction_id = $1
          `,
          [prediction.id]
        );

        let caseCreated = false;

        if (existingCase.rows.length === 0) {
          const caseResult = await pool.query(
            `
            INSERT INTO credit_cases (
              credit_prediction_id,
              assigned_user_id,
              decision,
              notes,
              status,
              risk_level
            )
            VALUES ($1,$2,$3,$4,$5,$6)
            RETURNING *
            `,
            [
              prediction.id,
              null,
              null,
              caseNote,
              "open",
              riskLevel
            ]
          );

          console.log("Credit case inserted:", caseResult.rows[0]);
          caseCreated = true;
        } else {
          console.log("Credit case already exists for prediction:", prediction.id);
        }

        res.status(201).json({
          ...prediction,
          insights: result.insights || [],
          evidence_used: result.evidence_used || {},
          case_created: caseCreated,
          case_note: caseNote,
          risk_level: riskLevel
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