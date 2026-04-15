from pathlib import Path
import joblib
import pandas as pd
import matplotlib.pyplot as plt
from sklearn.metrics import (
    accuracy_score,
    precision_score,
    recall_score,
    f1_score,
    classification_report,
    confusion_matrix,
    ConfusionMatrixDisplay,
)
from pgmpy.inference import VariableElimination
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


def evaluate_finsage():
    base_dir = Path(__file__).resolve().parents[1]
    output_dir = base_dir / "outputs"
    output_dir.mkdir(parents=True, exist_ok=True)

    model_path = output_dir / "D804_PA_Model_FinSage.pkl"
    model = joblib.load(model_path)

    df = prepare_bayesian_data()

    test_df = df.sample(frac=0.2, random_state=42).copy()
    X_test = test_df.drop(columns=["target"])
    y_test = test_df["target"].astype(str)

    infer = VariableElimination(model)

    predictions = []

    for _, row in X_test.iterrows():
        evidence = {
            "feature_1": row["feature_1"],
            "feature_2": row["feature_2"],
            "feature_5": row["feature_5"],
            "feature_6": row["feature_6"],
            "feature_7": row["feature_7"],
        }

        result = infer.query(variables=["target"], evidence=evidence)
        pred = result.state_names["target"][result.values.argmax()]
        predictions.append(str(pred))

    accuracy = accuracy_score(y_test, predictions)
    precision = precision_score(y_test, predictions, pos_label="1", zero_division=0)
    recall = recall_score(y_test, predictions, pos_label="1", zero_division=0)
    f1 = f1_score(y_test, predictions, pos_label="1", zero_division=0)

    print("FinSage Test Metrics")
    print("--------------------")
    print(f"Accuracy: {accuracy:.4f}")
    print(f"Precision: {precision:.4f}")
    print(f"Recall: {recall:.4f}")
    print(f"F1 Score: {f1:.4f}")
    print()
    print(classification_report(y_test, predictions, zero_division=0))

    cm = confusion_matrix(y_test, predictions, labels=["0", "1"])
    disp = ConfusionMatrixDisplay(confusion_matrix=cm, display_labels=["0", "1"])
    disp.plot()
    plt.title("FinSage Confusion Matrix")
    plt.savefig(output_dir / "finsage_confusion_matrix.png", bbox_inches="tight")
    plt.close()


if __name__ == "__main__":
    evaluate_finsage()