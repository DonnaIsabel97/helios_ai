import os
import uuid
import random
import psycopg2
from dotenv import load_dotenv
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parents[3]
load_dotenv(BASE_DIR / "backend" / ".env")

SUPABASE_URL = os.getenv("DATABASE_URL")

if not SUPABASE_URL:
    raise ValueError("DATABASE_URL not found in backend/.env")

conn = psycopg2.connect(SUPABASE_URL)
cur = conn.cursor()

cur.execute("""
    SELECT a.id, a.customer_id
    FROM accounts a
    ORDER BY a.created_at
""")
accounts = cur.fetchall()

if not accounts:
    cur.close()
    conn.close()
    raise ValueError("No accounts found. Seed customers/accounts first.")

inserted = 0

for i, (account_id, customer_id) in enumerate(accounts):
    card_type = random.choice(["debit", "credit"])

    cur.execute(
        """
        INSERT INTO cards (
            id,
            customer_id,
            account_id,
            card_number_masked,
            card_type,
            status
        )
        VALUES (%s, %s, %s, %s, %s, %s)
        """,
        (
            str(uuid.uuid4()),
            customer_id,
            account_id,
            f"****-****-****-{1000 + i}",
            card_type,
            "active"
        )
    )
    inserted += 1

conn.commit()
cur.close()
conn.close()

print(f"Inserted {inserted} cards")