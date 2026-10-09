"""FinSage USD Bayesian inference with preprocessing fitted on training data only."""
from pathlib import Path
import hashlib
import json
import math
import sys
import joblib
import numpy as np
from pgmpy.inference import VariableElimination

VERSION = "finsage_usd_v3"
MODEL_PATH = Path(__file__).resolve().parent / "outputs" / (VERSION + ".pkl")
FIELDS = ("loan_amount", "annual_income", "debt_to_income", "loan_to_income")

def validate(payload):
    for key in ("loan_amount", "annual_income", "debt_to_income"):
        value=payload.get(key)
        if isinstance(value,bool) or not isinstance(value,(int,float)) or not math.isfinite(value):
            raise ValueError("Enter a valid amount, annual income and debt-to-income percentage.")
    if not 0 < payload["loan_amount"] <= 1e9 or not 0 < payload["annual_income"] <= 1e9:
        raise ValueError("Loan amount and annual income must be positive and no more than 1 billion.")
    if not 0 <= payload["debt_to_income"] <= 100:
        raise ValueError("Debt-to-income must be between 0 and 100 percent.")
    if isinstance(payload.get("duration_months"),bool) or payload.get("duration_months") not in (36,60):
        raise ValueError("Choose a 36- or 60-month term.")

def evidence_for(payload,artifact):
    validate(payload)
    values={**payload,"loan_to_income":payload["loan_amount"]/payload["annual_income"]}
    # Open end bins allow estimates beyond the observed range without invented coefficients.
    evidence={key:int(np.searchsorted(artifact["bin_edges"][key],values[key],side="left")) for key in FIELDS}
    evidence["term"]=int(payload["duration_months"])
    return evidence

def posterior(model,evidence):
    result=VariableElimination(model).query(variables=["target"],evidence=evidence,show_progress=False)
    return float(result.values[result.state_names["target"].index(1)])

def calibrate(probability,calibrator):
    clipped=np.clip(probability,1e-8,1-1e-8)
    logit=float(np.log(clipped/(1-clipped)))
    return float(calibrator.predict_proba([[logit]])[0,1])

def predict(payload):
    artifact=joblib.load(MODEL_PATH)
    evidence=evidence_for(payload,artifact)
    raw=posterior(artifact["model"],evidence)
    probability=calibrate(raw,artifact["calibrator"])
    if not math.isfinite(probability) or not 0 <= probability <= 1: raise ValueError("Invalid model probability.")
    outside=[]
    for key in ("loan_amount","annual_income","debt_to_income"):
        lo,hi=artifact["training_ranges"][key]
        if not lo <= payload[key] <= hi: outside.append(key)
    return {"risk_probability":probability,"raw_probability":raw,
        "predicted_class":"high_risk" if probability>=artifact["threshold"] else "low_risk",
        "decision_threshold":artifact["threshold"],"model_version":VERSION,
        "model_sha256":hashlib.sha256(MODEL_PATH.read_bytes()).hexdigest(),
        "evidence_used":evidence,"amount_unit":"USD","outside_training_range":outside,
        "warnings":["This scenario goes beyond the examples used for training; the result is approximate."] if outside else []}

if __name__ == "__main__":
    try: print(json.dumps(predict(json.load(sys.stdin)),allow_nan=False))
    except Exception as error:
        print(json.dumps({"error":str(error)}));sys.exit(1)
