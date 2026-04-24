import os
import json
import random
import pandas as pd
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
PREDICT_SCRIPT = BASE_DIR / "ml" / "finguard" / "predict_finguard.py"
SOURCE_CSV = BASE_DIR / "ml" / "finguard" / "data" / "creditcard.csv"

if not PYTHON_PATH.exists():
    raise FileNotFoundError(f"Python executable not found: {PYTHON_PATH}")

if not PREDICT_SCRIPT.exists():
    raise FileNotFoundError(f"Predict script not found: {PREDICT_SCRIPT}")

if not SOURCE_CSV.exists():
    raise FileNotFoundError(f"Source CSV not found: {SOURCE_CSV}")

print("=== BACKFILL FINGUARD START ===")
print("Current interpreter:", sys.executable)
print("Prediction interpreter:", PYTHON_PATH)
print("Prediction script:", PREDICT_SCRIPT)
print("Source CSV:", SOURCE_CSV)

conn = psycopg2.connect(SUPABASE_URL)
cur = conn.cursor()

cur.execute("""
    SELECT c.id, c.customer_id, c.account_id
    FROM cards c
    ORDER BY c.created_at
""")
cards = cur.fetchall()

if not cards:
    cur.close()
    conn.close()
    raise ValueError("No cards found. Run seed_cards.py first.")

df = pd.read_csv(SOURCE_CSV)

if "Class" not in df.columns:
    cur.close()
    conn.close()
    raise ValueError("Source CSV must contain a Class column")

legit_pool = df[df["Class"] == 0]
fraud_pool = df[df["Class"] == 1]

legit_sample_size = min(450, len(legit_pool))
fraud_sample_size = min(50, len(fraud_pool))

legit_df = legit_pool.sample(n=legit_sample_size, random_state=42)
fraud_df = fraud_pool.sample(n=fraud_sample_size, random_state=42)

sample_df = pd.concat([legit_df, fraud_df]).sample(frac=1, random_state=42).reset_index(drop=True)

print(f"Loaded sample size: {len(sample_df)}")
print(f"Legit source rows: {(sample_df['Class'] == 0).sum()}")
print(f"Fraud source rows: {(sample_df['Class'] == 1).sum()}")

processed = 0
failed = 0
fraud_predictions_count = 0
flagged_predictions_count = 0

for i, row in sample_df.iterrows():
    print(f"\n[{i + 1}/{len(sample_df)}] Processing transaction row {i}")

    card_id, customer_id, account_id = random.choice(cards)

    payload = {
        "Time": float(row["Time"]),
        "V1": float(row["V1"]),
        "V2": float(row["V2"]),
        "V3": float(row["V3"]),
        "V4": float(row["V4"]),
        "V5": float(row["V5"]),
        "V6": float(row["V6"]),
        "V7": float(row["V7"]),
        "V8": float(row["V8"]),
        "V9": float(row["V9"]),
        "V10": float(row["V10"]),
        "V11": float(row["V11"]),
        "V12": float(row["V12"]),
        "V13": float(row["V13"]),
        "V14": float(row["V14"]),
        "V15": float(row["V15"]),
        "V16": float(row["V16"]),
        "V17": float(row["V17"]),
        "V18": float(row["V18"]),
        "V19": float(row["V19"]),
        "V20": float(row["V20"]),
        "V21": float(row["V21"]),
        "V22": float(row["V22"]),
        "V23": float(row["V23"]),
        "V24": float(row["V24"]),
        "V25": float(row["V25"]),
        "V26": float(row["V26"]),
        "V27": float(row["V27"]),
        "V28": float(row["V28"]),
        "Amount": float(row["Amount"])
    }

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
        print(f"Timeout while predicting transaction row {i}")
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
        print(f"Prediction failed for transaction row {i}: {proc.stderr or proc.stdout}")
        failed += 1
        continue

    try:
        result = json.loads(proc.stdout)
    except json.JSONDecodeError:
        print(f"Invalid JSON output for transaction row {i}")
        failed += 1
        continue

    if result.get("error"):
        print(f"Model returned error for transaction row {i}: {result['error']}")
        failed += 1
        continue

    fraud_score = float(result["fraud_score"])
    predicted_label = result["predicted_label"]

    prediction_status = "flagged" if (predicted_label == "fraud" or fraud_score >= 0.05) else "normal"

    if predicted_label == "fraud":
        fraud_predictions_count += 1

    if prediction_status == "flagged":
        flagged_predictions_count += 1

    transaction_id = f"TX-{i + 1:05d}"

    try:
        cur.execute(
            """
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
            VALUES (%s,%s,%s,%s,%s,NOW(),%s,%s,%s,%s)
            ON CONFLICT (transaction_id)
            DO NOTHING
            RETURNING id
            """,
            (
                transaction_id,
                customer_id,
                account_id,
                card_id,
                payload["Amount"],
                fraud_score,
                predicted_label,
                prediction_status,
                "finguard_v1"
            )
        )

        prediction_row = cur.fetchone()

        if prediction_row is None:
            print(f"Transaction {transaction_id} already exists, skipping")
            conn.commit()
            continue

        prediction_id = prediction_row[0]

        if fraud_score >= 0.20 or predicted_label == "fraud":
            priority = "high"
            note = "High-risk fraud review suggested"
        elif fraud_score >= 0.05:
            priority = "medium"
            note = "Moderate-risk transaction review suggested"
        else:
            priority = "low"
            note = "Low-risk transaction review record"

        cur.execute(
            """
            SELECT id
            FROM fraud_cases
            WHERE fraud_prediction_id = %s
            """,
            (prediction_id,)
        )
        existing_case = cur.fetchone()

        if not existing_case:
            cur.execute(
                """
                INSERT INTO fraud_cases (
                    fraud_prediction_id,
                    assigned_user_id,
                    priority,
                    decision,
                    notes,
                    status
                )
                VALUES (%s,%s,%s,%s,%s,%s)
                """,
                (
                    prediction_id,
                    None,
                    priority,
                    None,
                    note,
                    "open"
                )
            )

        conn.commit()
        processed += 1
        print(f"Inserted prediction and case for transaction {transaction_id}")
        print(
            f"Source label: {int(row['Class'])} | "
            f"Model label: {predicted_label} | "
            f"Fraud score: {fraud_score}"
        )

    except Exception as db_error:
        conn.rollback()
        print(f"Database error for transaction row {i}: {db_error}")
        failed += 1
        continue

print("\n=== BACKFILL FINGUARD DONE ===")
print(f"Processed successfully: {processed}")
print(f"Failed: {failed}")
print(f"Model predicted fraud count: {fraud_predictions_count}")
print(f"Flagged prediction count: {flagged_predictions_count}")

cur.close()
conn.close()