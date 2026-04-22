import os
import json
import random
import pandas as pd
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
PREDICT_SCRIPT = BASE_DIR / "ml" / "finguard" / "predict_finguard.py"
SOURCE_CSV = BASE_DIR / "ml" / "finguard" / "data" / "creditcard.csv"

if not PYTHON_PATH.exists():
    raise FileNotFoundError(f"Python executable not found: {PYTHON_PATH}")

if not PREDICT_SCRIPT.exists():
    raise FileNotFoundError(f"Predict script not found: {PREDICT_SCRIPT}")

if not SOURCE_CSV.exists():
    raise FileNotFoundError(f"Source CSV not found: {SOURCE_CSV}")

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

df = pd.read_csv(SOURCE_CSV).head(500)

processed = 0

for i, row in df.iterrows():
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

    proc = subprocess.run(
        [str(PYTHON_PATH), str(PREDICT_SCRIPT)],
        input=json.dumps(payload),
        text=True,
        capture_output=True
    )

    if proc.returncode != 0:
        print(f"Prediction failed for transaction {i}: {proc.stderr or proc.stdout}")
        continue

    result = json.loads(proc.stdout)

    fraud_score = float(result["fraud_score"])
    predicted_label = result["predicted_label"]

    prediction_status = "flagged" if (predicted_label == "fraud" or fraud_score >= 0.7) else "normal"

    transaction_id = f"TX-{i+1:05d}"

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

    prediction_id = cur.fetchone()[0]

    if fraud_score >= 0.85 or predicted_label == "fraud":
        priority = "high"
        note = "High-risk fraud review suggested"
    elif fraud_score >= 0.6:
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

    processed += 1

conn.commit()
cur.close()
conn.close()

print(f"Processed {processed} transactions into fraud_predictions and fraud_cases")