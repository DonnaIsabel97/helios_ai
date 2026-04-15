from pathlib import Path
import pandas as pd 
import joblib
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler
from load_data import load_creditCard_data

def prepare_finguard_data(test_size=0.15, val_size=0.15, random_state=42):
    base_dir = Path(__file__).resolve().parents[1]
    output_dir = base_dir / "outputs"
    output_dir.mkdir(parents=True, exist_ok=True)

    df = load_creditCard_data()

    X = df.drop(columns=["Class"])
    y = df["Class"]

    X_train_full, X_test, y_train_full, y_test = train_test_split(
        X,
        y,
        test_size=test_size,
        stratify=y,
        random_state=random_state
    )

    adjusted_val_size = val_size / (1 - test_size)

    X_train, X_val, y_train, y_val = train_test_split(
        X_train_full,
        y_train_full,
        test_size=adjusted_val_size,
        stratify=y_train_full,
        random_state=random_state
    )

    X_train = X_train.copy()
    X_val = X_val.copy()
    X_test = X_test.copy()

    scaler = StandardScaler()

    X_train["Amount"] = scaler.fit_transform(X_train[["Amount"]])
    X_val["Amount"] = scaler.transform(X_val[["Amount"]])
    X_test["Amount"] = scaler.transform(X_test[["Amount"]])

    joblib.dump(scaler, output_dir / "amount_scaler.pkl")

    return X_train, X_val, X_test, y_train, y_val, y_test

if __name__ == "__main__":
    X_train, X_val, X_test, y_val, y_train, y_test = prepare_finguard_data()

    print("Train shape:", X_train.shape, y_train.shape)
    print("Validation shape:", X_val.shape, y_val.shape)
    print("Test shape:", X_test.shape, y_test.shape)

    print("\nFraud ratio in train:", y_train.mean())
    print("Fraud ratio in validation:", y_val.mean())
    print("Fraud ratio in test:", y_test.mean())

