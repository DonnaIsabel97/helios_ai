import sys
import json
import joblib
import pandas as pd
from pathlib import Path

MODEL_PATH = Path(__file__).resolve().parent / "outputs" / "D804_PA_Model_FinGuard_Optimized.pkl"

def main():
    try:
        raw_input = sys.stdin.read()
        payload = json.loads(raw_input)

        model = joblib.load(MODEL_PATH)

        feature_columns = [
            "Time", "V1", "V2", "V3", "V4", "V5", "V6", "V7", "V8", "V9",
            "V10", "V11", "V12", "V13", "V14", "V15", "V16", "V17", "V18",
            "V19", "V20", "V21", "V22", "V23", "V24", "V25", "V26", "V27",
            "V28", "Amount"
        ]

        input_row = {col: payload.get(col, 0) for col in feature_columns}
        df = pd.DataFrame([input_row])

        prediction = model.predict(df)[0]
        probability = model.predict_proba(df)[0][1]

        result = {
            "fraud_score": round(float(probability), 4),
            "predicted_label": "fraud" if int(prediction) == 1 else "legit"
        }

        print(json.dumps(result))
    except Exception as e:
        print(json.dumps({"error": str(e)}))
        sys.exit(1)

if __name__ == "__main__":
    main()