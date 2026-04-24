import os
import json
import psycopg2
import subprocess
import sys
import time
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

print("=== BACKFILL FINSAGE START ===")
print("Current interpreter:", sys.executable)
print("Prediction interpreter:", PYTHON_PATH)
print("Prediction script:", PREDICT_SCRIPT)

conn = psycopg2.connect(SUPABASE_URL)
cur = conn.cursor()

cur.execute("""
    SELECT id, customer_id, loan_amount, duration_months
    FROM loan_applications
    ORDER BY created_at
""")
applications = cur.fetchall()

print(f"Loaded {len(applications)} loan applications")

def build_payload(loan_amount, duration_months):
    return {
        "feature_1": 1,
        "feature_2": int(duration_months),
        "feature_5": float(loan_amount),
        "feature_6": 2,
        "feature_7": 3
    }

processed = 0
failed = 0
max_rows = 50

for index, (application_id, customer_id, loan_amount, duration_months) in enumerate(applications[:max_rows], start=1):
    print(f"\n[{index}/{min(len(applications), max_rows)}] Processing application {application_id}")

    payload = build_payload(loan_amount, duration_months)
    print("Payload:", payload)

    start_time = time.time()

    try:
        proc = subprocess.run(
            [str(PYTHON_PATH), str(PREDICT_SCRIPT)],
            input=json.dumps(payload),
            text=True,
            capture_output=True,
            timeout=20
        )
    except subprocess.TimeoutExpired:
        print(f"Timeout while predicting application {application_id}")
        failed += 1
        continue

    elapsed = round(time.time() - start_time, 2)
    print(f"Subprocess finished in {elapsed}s")
    print("Return code:", proc.returncode)

    if proc.stdout:
        print("STDOUT:", proc.stdout.strip())

    if proc.stderr:
        print("STDERR:", proc.stderr.strip())

    if proc.returncode != 0:
        print(f"Prediction failed for application {application_id}")
        failed += 1
        continue

    try:
        result = json.loads(proc.stdout)
    except json.JSONDecodeError:
        print(f"Invalid JSON output for application {application_id}")
        failed += 1
        continue

    if result.get("error"):
        print(f"Model returned error for application {application_id}: {result['error']}")
        failed += 1
        continue

    explanation_summary = "Generated from Discrete Bayesian Network inference"
    if result.get("insights"):
        explanation_summary = " | ".join(
            f"{item['feature']}={item['value']} ({item['direction']}, impact={item['impact']})"
            for item in result["insights"]
        )

    risk_probability = float(result["risk_probability"])
    predicted_class = result["predicted_class"]

    try:
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

        conn.commit()
        processed += 1
        print(f"Inserted/updated prediction and case for application {application_id}")

    except Exception as db_error:
        conn.rollback()
        print(f"Database error for application {application_id}: {db_error}")
        failed += 1
        continue

print("\n=== BACKFILL FINSAGE DONE ===")
print(f"Processed successfully: {processed}")
print(f"Failed: {failed}")

cur.close()
conn.close()