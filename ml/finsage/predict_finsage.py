import sys
import json
import joblib
import warnings
from pathlib import Path
from pgmpy.inference import VariableElimination

warnings.filterwarnings("ignore", category=FutureWarning)

MODEL_PATH = Path(__file__).resolve().parent / "outputs" / "D804_PA_Model_FinSage_Optimized.pkl"


def bucket_duration(value):
    value = int(value)
    if value <= 12:
        return "short"
    if value <= 24:
        return "medium"
    return "long"


def bucket_amount(value):
    value = float(value)
    if value <= 2000:
        return "low"
    if value <= 5000:
        return "medium"
    return "high"


def get_allowed_states(model, variable):
    cpd = model.get_cpds(variable)
    return cpd.state_names[variable]


def coerce_state(value, allowed_states, fallback=None):
    if value in allowed_states:
        return value
    if fallback in allowed_states:
        return fallback
    return allowed_states[0]


def extract_high_risk_probability(result):
    labels = result.state_names["target"]
    probs = result.values.tolist()
    prob_map = dict(zip(labels, probs))

    if "1" in prob_map:
        return float(prob_map["1"])
    if 1 in prob_map:
        return float(prob_map[1])

    return float(list(prob_map.values())[-1])


def generate_model_based_insights(infer, evidence, full_high_risk_prob):
    insights = []

    for feature, value in evidence.items():
        reduced_evidence = {k: v for k, v in evidence.items() if k != feature}

        reduced_result = infer.query(
            variables=["target"],
            evidence=reduced_evidence
        )

        reduced_high_risk_prob = extract_high_risk_probability(reduced_result)
        impact = full_high_risk_prob - reduced_high_risk_prob

        if impact > 0:
            direction = "increased_risk"
        elif impact < 0:
            direction = "reduced_risk"
        else:
            direction = "no_effect"

        insights.append({
            "feature": feature,
            "value": value,
            "impact": round(float(impact), 4),
            "direction": direction
        })

    insights.sort(key=lambda x: abs(x["impact"]), reverse=True)
    return insights[:3]


def main():
    try:
        raw_input = sys.stdin.read()
        payload = json.loads(raw_input)

        model = joblib.load(MODEL_PATH)
        infer = VariableElimination(model)

        feature_2_value = bucket_duration(payload.get("feature_2", 12))
        feature_5_value = bucket_amount(payload.get("feature_5", 1000))

        allowed_feature_1 = get_allowed_states(model, "feature_1")
        allowed_feature_2 = get_allowed_states(model, "feature_2")
        allowed_feature_5 = get_allowed_states(model, "feature_5")
        allowed_feature_6 = get_allowed_states(model, "feature_6")
        allowed_feature_7 = get_allowed_states(model, "feature_7")

        evidence = {
            "feature_1": coerce_state(int(payload.get("feature_1", 1)), allowed_feature_1),
            "feature_2": coerce_state(feature_2_value, allowed_feature_2, "short"),
            "feature_5": coerce_state(feature_5_value, allowed_feature_5, "low"),
            "feature_6": coerce_state(int(payload.get("feature_6", 1)), allowed_feature_6),
            "feature_7": coerce_state(int(payload.get("feature_7", 1)), allowed_feature_7)
        }

        full_result = infer.query(
            variables=["target"],
            evidence=evidence
        )

        high_risk_prob = extract_high_risk_probability(full_result)
        predicted_class = "high_risk" if high_risk_prob >= 0.5 else "low_risk"

        top_insights = generate_model_based_insights(
            infer,
            evidence,
            high_risk_prob
        )

        output = {
            "risk_probability": round(high_risk_prob, 4),
            "predicted_class": predicted_class,
            "insights": top_insights,
            "evidence_used": evidence
        }

        print(json.dumps(output))
    except Exception as e:
        print(json.dumps({"error": str(e)}))
        sys.exit(1)


if __name__ == "__main__":
    main()