from pathlib import Path
import joblib
import matplotlib.pyplot as plt
from xgboost import XGBClassifier
from sklearn.model_selection import GridSearchCV
from sklearn.metrics import (
    classification_report,
    roc_auc_score,
    roc_curve,
    confusion_matrix,
    ConfusionMatrixDisplay,
    precision_score,
    recall_score,
    f1_score,
)
from preprocess import prepare_finguard_data


def optimize_finguard():
    base_dir = Path(__file__).resolve().parents[1]
    output_dir = base_dir / "outputs"
    output_dir.mkdir(parents=True, exist_ok=True)

    X_train, X_val, X_test, y_train, y_val, y_test = prepare_finguard_data()

    scale_pos_weight = (y_train == 0).sum() / (y_train == 1).sum()

    base_model = XGBClassifier(
        random_state=42,
        eval_metric="logloss",
        scale_pos_weight=scale_pos_weight,
        n_jobs=-1
    )

    param_grid = {
        "n_estimators": [100, 200],
        "max_depth": [4, 6],
        "learning_rate": [0.05, 0.1],
        "subsample": [0.8, 1.0],
        "colsample_bytree": [0.8, 1.0]
    }

    grid_search = GridSearchCV(
        estimator=base_model,
        param_grid=param_grid,
        scoring="f1",
        cv=3,
        verbose=1,
        n_jobs=-1
    )

    grid_search.fit(X_train, y_train)

    best_model = grid_search.best_estimator_

    print("Best Parameters:")
    print(grid_search.best_params_)
    print()

    y_test_pred = best_model.predict(X_test)
    y_test_proba = best_model.predict_proba(X_test)[:, 1]

    precision = precision_score(y_test, y_test_pred, zero_division=0)
    recall = recall_score(y_test, y_test_pred, zero_division=0)
    f1 = f1_score(y_test, y_test_pred, zero_division=0)
    roc_auc = roc_auc_score(y_test, y_test_proba)

    print("Optimized FinGuard Test Metrics")
    print("-------------------------------")
    print(f"Precision: {precision:.4f}")
    print(f"Recall: {recall:.4f}")
    print(f"F1 Score: {f1:.4f}")
    print(f"ROC-AUC: {roc_auc:.4f}")
    print()
    print(classification_report(y_test, y_test_pred, zero_division=0))

    joblib.dump(best_model, output_dir / "D804_PA_Model_FinGuard_Optimized.pkl")

    cm = confusion_matrix(y_test, y_test_pred)
    disp = ConfusionMatrixDisplay(confusion_matrix=cm)
    disp.plot()
    plt.title("Optimized FinGuard Confusion Matrix")
    plt.savefig(output_dir / "finguard_optimized_confusion_matrix.png", bbox_inches="tight")
    plt.close()

    fpr, tpr, _ = roc_curve(y_test, y_test_proba)
    plt.figure()
    plt.plot(fpr, tpr, label=f"ROC-AUC = {roc_auc:.4f}")
    plt.plot([0, 1], [0, 1], linestyle="--")
    plt.xlabel("False Positive Rate")
    plt.ylabel("True Positive Rate")
    plt.title("Optimized FinGuard ROC Curve")
    plt.legend()
    plt.savefig(output_dir / "finguard_optimized_roc_curve.png", bbox_inches="tight")
    plt.close()

    print("\nSaved optimized model and evaluation plots.")


if __name__ == "__main__":
    optimize_finguard()