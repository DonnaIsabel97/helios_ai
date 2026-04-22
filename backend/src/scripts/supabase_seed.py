import os
import uuid
import random
import pandas as pd
import psycopg2
import kagglehub
from dotenv import load_dotenv

# =========================
# CONFIG
# =========================
load_dotenv()

SUPABASE_URL = os.getenv("DATABASE_URL")

if not SUPABASE_URL:
    raise ValueError("DATABASE_URL not found in .env")

conn = psycopg2.connect(SUPABASE_URL)
cur = conn.cursor()

# =========================
# HELPERS
# =========================
def find_candidate_csv(dataset_path):
    csv_files = []

    for root, _, files in os.walk(dataset_path):
        for file in files:
            if file.lower().endswith(".csv"):
                csv_files.append(os.path.join(root, file))

    if not csv_files:
        raise FileNotFoundError("No CSV files found in downloaded dataset")

    preferred_keywords = ["customer", "client", "user", "people", "person"]

    for path in csv_files:
        filename = os.path.basename(path).lower()
        if any(keyword in filename for keyword in preferred_keywords):
            return path

    return csv_files[0]


def pick_column(columns, candidates):
    lower_map = {col.lower(): col for col in columns}

    for candidate in candidates:
        if candidate.lower() in lower_map:
            return lower_map[candidate.lower()]

    for col in columns:
        col_lower = col.lower()
        for candidate in candidates:
            if candidate.lower() in col_lower:
                return col

    return None


def safe_value(row, column_name, default=None):
    if column_name is None:
        return default

    value = row.get(column_name, default)

    if pd.isna(value):
        return default

    return value


# =========================
# DOWNLOAD DATASET
# =========================
dataset_path = kagglehub.dataset_download(
    "akrambelha/synthetic-banking-dataset-csv-sql-sqlite"
)

print("Downloaded dataset to:", dataset_path)

csv_path = find_candidate_csv(dataset_path)
print("Using CSV file:", csv_path)

# =========================
# LOAD CSV
# =========================
df = pd.read_csv(csv_path)

if df.empty:
    raise ValueError("Loaded CSV is empty")

df = df.head(500)

print("Loaded rows:", len(df))
print("Columns found:", list(df.columns))

# Try to detect likely columns
name_col = pick_column(df.columns, ["name", "full_name", "customer_name"])
email_col = pick_column(df.columns, ["email", "email_address"])
phone_col = pick_column(df.columns, ["phone", "phone_number", "mobile"])

print("Detected name column:", name_col)
print("Detected email column:", email_col)
print("Detected phone column:", phone_col)

# =========================
# INSERT CUSTOMERS
# =========================
customer_ids = []

for i, row in df.iterrows():
    customer_id = str(uuid.uuid4())

    full_name = safe_value(row, name_col, f"Customer {i + 1}")
    email = safe_value(row, email_col, None)
    phone = safe_value(row, phone_col, None)

    cur.execute(
        """
        INSERT INTO customers (id, customer_number, full_name, email, phone)
        VALUES (%s, %s, %s, %s, %s)
        """,
        (
            customer_id,
            f"CUST-{100000 + i}",
            str(full_name),
            None if email is None else str(email),
            None if phone is None else str(phone),
        ),
    )

    customer_ids.append(customer_id)

conn.commit()
print("Inserted customers:", len(customer_ids))

# =========================
# INSERT ACCOUNTS
# =========================
account_ids = []

for i, customer_id in enumerate(customer_ids):
    account_id = str(uuid.uuid4())

    cur.execute(
        """
        INSERT INTO accounts (id, customer_id, account_number, account_type, balance)
        VALUES (%s, %s, %s, %s, %s)
        """,
        (
            account_id,
            customer_id,
            f"ACC-{200000 + i}",
            random.choice(["checking", "savings"]),
            round(random.uniform(100, 10000), 2),
        ),
    )

    account_ids.append(account_id)

conn.commit()
print("Inserted accounts:", len(account_ids))

# =========================
# INSERT LOAN APPLICATIONS
# =========================
loan_count = min(500, len(customer_ids))

for i in range(loan_count):
    cur.execute(
        """
        INSERT INTO loan_applications (
            id,
            customer_id,
            application_number,
            loan_amount,
            duration_months
        )
        VALUES (%s, %s, %s, %s, %s)
        """,
        (
            str(uuid.uuid4()),
            customer_ids[i],
            f"APP-{300000 + i}",
            round(random.uniform(1000, 50000), 2),
            random.choice([12, 24, 36, 48]),
        ),
    )

conn.commit()
print("Inserted loan applications:", loan_count)

# =========================
# DONE
# =========================
cur.close()
conn.close()

print("Seeding complete")