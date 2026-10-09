"""Shared preprocessing for the corrected three-input FinSage scenario model."""
import hashlib
import math
from pathlib import Path
import joblib
from pgmpy.inference import VariableElimination

VERSION = "finsage_scenario_v2"
MODEL_PATH = Path(__file__).resolve().parent / "outputs" / (VERSION + ".pkl")
SAVINGS = {"A61": "Below 100", "A62": "100 to below 500", "A63": "500 to below 1000", "A64": "1000 or more", "A65": "Unknown / no savings account"}

def evidence_for(payload):
    # Explicit raw-column mapping replaces the ambiguous numeric feature_N mapping.
    amount, duration, savings = payload.get("loan_amount"), payload.get("duration_months"), payload.get("savings")
    if isinstance(amount, bool) or not isinstance(amount, (int,float)) or not math.isfinite(amount) or not 0 < amount <= 1e12:
        raise ValueError("Enter a positive finite loan amount.")
    if isinstance(duration, bool) or not isinstance(duration, (int,float)) or not math.isfinite(duration) or int(duration) != duration or not 1 <= duration <= 600:
        raise ValueError("Duration must be a whole number between 1 and 600 months.")
    if savings not in SAVINGS:
        raise ValueError("Choose one of the five documented savings categories.")
    return {"amount_band": "low" if amount <= 2000 else "medium" if amount <= 5000 else "high",
            "duration_band": "short" if duration <= 12 else "medium" if duration <= 24 else "long",
            "savings": savings}

def predict(payload):
    evidence = evidence_for(payload)
    artifact = joblib.load(MODEL_PATH)
    result = VariableElimination(artifact["model"]).query(variables=["target"], evidence=evidence, show_progress=False)
    probability = float(result.values[result.state_names["target"].index(1)])
    if not math.isfinite(probability) or not 0 <= probability <= 1:
        raise ValueError("The model returned an invalid probability.")
    warnings = []
    for key in ("loan_amount", "duration_months"):
        lo, hi = artifact["training_ranges"][key]
        if not lo <= payload[key] <= hi:
            warnings.append(f"{key} is outside the training range ({lo:g}–{hi:g}).")
    return {"risk_probability": probability, "predicted_class": "high_risk" if probability >= .5 else "low_risk",
            "evidence_used": evidence, "model_version": VERSION,
            "model_sha256": hashlib.sha256(MODEL_PATH.read_bytes()).hexdigest(),
            "amount_unit": "historical_DM_demo", "warnings": warnings}
