from pathlib import Path
import joblib
import pandas as pd
from pgmpy.models import DiscreteBayesianNetwork
from pgmpy.estimators import MaximumLikelihoodEstimator
from load_data import load_credit_data, assign_column_names


def prepare_bayesian_data():
    df = load_credit_data()
    df = assign_column_names(df)

    df["target"] = df["target"].apply(lambda x: 0 if x == 1 else 1)

    required_columns = [
        "feature_1",
        "feature_2",
        "feature_5",
        "feature_6",
        "feature_7",
        "target"
    ]

    df = df[required_columns].copy()

    df["feature_2"] = pd.cut(
        df["feature_2"],
        bins=[0, 12, 24, float("inf")],
        labels=["short", "medium", "long"],
        include_lowest=True
    )

    df["feature_5"] = pd.cut(
        df["feature_5"],
        bins=[0, 2000, 5000, float("inf")],
        labels=["low", "medium", "high"],
        include_lowest=True
    )

    df["feature_1"] = df["feature_1"].astype("category")
    df["feature_6"] = df["feature_6"].astype("category")
    df["feature_7"] = df["feature_7"].astype("category")
    df["feature_2"] = df["feature_2"].astype("category")
    df["feature_5"] = df["feature_5"].astype("category")
    df["target"] = df["target"].astype("category")

    return df


def train_finsage():
    base_dir = Path(__file__).resolve().parents[1]
    output_dir = base_dir / "outputs"
    output_dir.mkdir(parents=True, exist_ok=True)

    df = prepare_bayesian_data()

    model = DiscreteBayesianNetwork([
        ("feature_1", "target"),
        ("feature_6", "target"),
        ("feature_7", "target"),
        ("feature_2", "target"),
        ("feature_5", "target")
    ])

    model.fit(df, estimator=MaximumLikelihoodEstimator)

    model_path = output_dir / "D804_PA_Model_FinSage.pkl"
    joblib.dump(model, model_path)

    print("Discrete Bayesian Network trained successfully.")
    print("\nNodes:")
    print(list(model.nodes()))

    print("\nEdges:")
    print(list(model.edges()))

    print(f"\nSaved model to: {model_path}")

    return model


if __name__ == "__main__":
    train_finsage()