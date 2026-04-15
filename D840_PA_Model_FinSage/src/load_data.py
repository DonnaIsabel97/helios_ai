from pathlib import Path
import pandas as pd


def load_credit_data(file_path=None):
    if file_path is None:
        base_dir = Path(__file__).resolve().parents[1]
        file_path = base_dir / "data" / "german_credit_numeric.csv"

    df = pd.read_csv(file_path, sep=r"\s+", header=None)
    return df


def assign_column_names(df):
    columns = [f"feature_{i}" for i in range(1, 25)] + ["target"]
    df.columns = columns
    return df


def summarize_dataset(df):
    print("Dataset shape:", df.shape)

    print("\nColumns:")
    print(df.columns.tolist())

    print("\nMissing values:")
    print(df.isnull().sum())

    print("\nTarget distribution:")
    print(df["target"].value_counts())


if __name__ == "__main__":
    df = load_credit_data()
    df = assign_column_names(df)

    print(df.head())
    summarize_dataset(df)