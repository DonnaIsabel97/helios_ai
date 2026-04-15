from pathlib import Path
import pandas as pd
from sklearn.model_selection import train_test_split
from load_data import load_credit_data, assign_column_names


def preprocess_data():
    df = load_credit_data()
    df = assign_column_names(df)

    df["target"] = df["target"].apply(lambda x: 0 if x == 1 else 1)

    X = df.drop(columns=["target"])
    y = df["target"]

    X_train, X_test, y_train, y_test = train_test_split(
        X,
        y,
        test_size=0.2,
        random_state=42,
        stratify=y
    )

    return X_train, X_test, y_train, y_test


if __name__ == "__main__":
    X_train, X_test, y_train, y_test = preprocess_data()

    print("Train shape:", X_train.shape)
    print("Test shape:", X_test.shape)

    print("\nTarget distribution (train):")
    print(y_train.value_counts())