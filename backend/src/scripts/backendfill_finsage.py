import os
import json
import psycopg2
import subprocess
from pathlib import Path
from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parents[3]
load_dotenv(BASE_DIR / "backend" / ".env")

SUPABASE_URL = os.getenv("DATABASE_URL")

if not SUPABASE_URL:
    raise ValueError("DATABASE_URL not found in backend/.env")

PYTHON_PATH = BASE_DIR / ".venv" / "Scripts" / "python.exe"
PREDICT_SCRIPT = BASE_DIR / "ml" / "finsage" / "predict_finsage.py"

if not PYTHON_PATH.exists():
    raise FileNotFoundError(f"Python executable not found: {PYTHON_PATH}")

if not PREDICT_SCRIPT.exists():
    raise FileNotFoundError(f"Predict script not found: {PREDICT_SCRIPT}")

conn = psycopg2.connect(SUPABASE_URL)
cur = conn.cursor()

cur.execute("""
    SELECT id, customer_id, loan_amount, duration_months
    FROM loan_applications
    ORDER BY created_at
""")
applications = cur.fetchall()

def build_payload(loan_amount, duration_months):
    return {
        "feature_1": 1,
        "feature_2": int(duration_months),
        "feature_5": float(loan_amount),
        "feature_6": 2,
        "feature_7": 3
    }

processed = 0

for application_id, customer_id, loan_amount, duration_months in applications:
    payload = build_payload(loan_amount, duration_months)

    proc = subprocess.run(
        [str(PYTHON_PATH), str(PREDICT_SCRIPT)],
        input=json.dumps(payload),
        text=True,
        capture_output=True
    )

    if proc.returncode != 0:
        print(f"Prediction failed for application {application_id}: {proc.stderr or proc.stdout}")
        continue

    result = json.loads(proc.stdout)

    explanation_summary = "Generated from Discrete Bayesian Network inference"
    if result.get("insights"):
        explanation_summary = " | ".join(
            f"{item['feature']}={item['value']} ({item['direction']}, impact={item['impact']})"
            for item in result["insights"]
        )

    risk_probability = float(result["risk_probability"])
    predicted_class = result["predicted_class"]

    cur.execute(
        """
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
        VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s)
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
        RETURNING id
        """,
        (
            application_id,
            application_id,
            customer_id,
            loan_amount,
            duration_months,
            risk_probability,
            predicted_class,
            explanation_summary,
            "finsage_v1"
        )
    )

    prediction_id = cur.fetchone()[0]

    if risk_probability >= 0.6 or predicted_class == "high_risk":
        risk_level = "high"
        note = "High-risk credit review suggested"
    elif risk_probability >= 0.45:
        risk_level = "medium"
        note = "Borderline credit review suggested"
    else:
        risk_level = "low"
        note = "Low-risk credit review record"

    cur.execute(
        """
        SELECT id
        FROM credit_cases
        WHERE credit_prediction_id = %s
        """,
        (prediction_id,)
    )
    existing_case = cur.fetchone()

    if not existing_case:
        cur.execute(
            """
            INSERT INTO credit_cases (
                credit_prediction_id,
                assigned_user_id,
                decision,
                notes,
                status,
                risk_level
            )
            VALUES (%s,%s,%s,%s,%s,%s)
            """,
            (
                prediction_id,
                None,
                None,
                note,
                "open",
                risk_level
            )
        )

    processed += 1

conn.commit()
cur.close()
conn.close()

print(f"Processed {processed} loan applications into credit_predictions and credit_cases")