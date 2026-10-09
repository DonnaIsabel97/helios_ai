import sys
import json
import joblib
import pandas as pd
import math
from pathlib import Path

#Resolve artifact path relative to this script
OUTPUT_DIR = Path(__file__).resolve().parent / "outputs"
MODEL_PATH = OUTPUT_DIR / "FinGuard_Optimize.pkl"
SCALER_PATH = OUTPUT_DIR / "amount_scaler.pkl"

#Keep the same feature names and order used during traning
FEATURE_COLUMNS = [
    "Time",
    *[f"V{i}" for i in range(1,29)],
    "Amount",
]

def validate_payload(payload):
    #Check that every required featur contains a finite number
    if not isinstance(payload, dict):
        raise ValueError("Input must be a JSON object.")

    #Missing features should produce an error instead of becoming zero
    missing=[name for name in FEATURE_COLUMNS if name not in payload]

    if missing:
        raise ValueError(f"Missing required features: {', '.join(missing)}")

    validated ={}

    for name in FEATURE_COLUMNS:
        value = payload[name]

        # Reject strings, nulls, and booleans as model inputs.
        if isinstance(value, bool) or not isinstance(value, (int, float)):
            raise ValueError(f"{name} must be a number.")

        # NaN and infinity are not valid transaction feature values.
        if not math.isfinite(value):
            raise ValueError(f"{name} must be a finite number.")

        validated[name] = float(value)

    return validated


def main():
    try:
        # Read the transaction JSON sent by Node.js or a local test.
        payload = json.loads(sys.stdin.read())
        features = validate_payload(payload)

        # Load the trained model and its matching training scaler.
        model = joblib.load(MODEL_PATH)
        amount_scaler = joblib.load(SCALER_PATH)

        # Create a separate model input, leaving the original payload unchanged.
        model_input = pd.DataFrame([features], columns=FEATURE_COLUMNS)

        # Reuse the training transformation. Never fit a scaler on this transaction.
        model_input["Amount"] = amount_scaler.transform(
            model_input[["Amount"]]
        ).ravel()

        # Obtain the predicted class and the score for class 1 (fraud).
        prediction = int(model.predict(model_input)[0])
        fraud_class_index = list(model.classes_).index(1)
        fraud_score = float(
            model.predict_proba(model_input)[0][fraud_class_index]
        )

        # Preserve the response fields already expected by the backend.
        result = {
            "fraud_score": fraud_score,
            "predicted_label": "fraud" if prediction == 1 else "legit",
        }

        # Standard output contains only JSON so Node.js can parse it.
        print(json.dumps(result, allow_nan=False))

    except Exception as error:
        # Return a structured error and signal failure to the calling process.
        print(json.dumps({"error": str(error)}))
        sys.exit(1)


if __name__ == "__main__":
    main()