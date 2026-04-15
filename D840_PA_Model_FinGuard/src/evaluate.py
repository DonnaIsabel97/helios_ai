from pathlib import Path
import joblib
import matplotlib.pyplot as plt
from sklearn.metrics import (
    confusion_matrix,
    ConfusionMatrixDisplay,
    roc_curve,
    roc_auc_score,
    precision_score,
    recall_score,
    f1_score,
    classification_report
)
from preprocess import prepare_finguard_data

def evaluate_finguard():
    base_dir = Path(__file__).resolve().parents[1]
    output_dir = base_dir / "outputs"
    output_dir.mkdir(parents=True, exist_ok=True)

    model_path = output_dir / "D840_PA_Model_FinGuard.pkl"
    model = joblib.load(model_path)

    X_train, X_val, X_test, y_train, y_val, y_test = prepare_finguard_data()

    y_test_pred = model.predict(X_test)
    y_test_proba = model.predict_proba(X_test)[:, 1]

    precission = precision_score(y_test, y_test_pred, zero_division=0)
    recall = recall_score(y_test, y_test_pred, zero_division=0)
    f1 = f1_score(y_test, y_test_pred, zero_division=0)
    roc_auc = roc_auc_score(y_test, y_test_proba)

    print("Test Metrics")
    print(f"Precission: {precission:.4f}")
    print(f"Recall: {recall:.4f}")
    print(f"F1 Score: {f1:.4f}")
    print(f"ROC_AUC: {roc_auc:.4f}")
    print()
    print(classification_report(y_test, y_test_pred, zero_division=0))

    cm = confusion_matrix(y_test, y_test_pred)
    disp = ConfusionMatrixDisplay(confusion_matrix=cm)
    disp.plot()
    plt.title("FinGuard Confusion Matrix")
    plt.savefig(output_dir / "finguard_confusion_matrix.png", bbox_inches="tight")
    plt.close()

    fpr, tpr, _ = roc_curve(y_test, y_test_proba)
    plt.figure()
    plt.plot(fpr, tpr, label=f"ROC-AUC = {roc_auc:.4f}")
    plt.plot([0,1], [0,1], linestyle="--")
    plt.xlabel("False Positive Rate")
    plt.ylabel("True Positive Rate")
    plt.title("FinGuard ROC Curve")
    plt.legend()
    plt.savefig( output_dir / "finguard_roc_curve.png", bbox_inches="tight")
    plt.close()

if __name__ == "__main__":
    evaluate_finguard()