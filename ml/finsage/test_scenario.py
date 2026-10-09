"""Contract checks for the corrected scenario artifact and its JSON interface."""
import json
import math
import subprocess
import sys
import unittest
import joblib
from scenario_model import predict, evidence_for, MODEL_PATH

class ScenarioTests(unittest.TestCase):
    def test_mapping_boundaries(self):
        for amount, expected in [(2000,"low"),(2000.01,"medium"),(5000,"medium"),(5000.01,"high")]:
            self.assertEqual(evidence_for({"loan_amount":amount,"duration_months":12,"savings":"A65"})["amount_band"],expected)
        for duration, expected in [(12,"short"),(13,"medium"),(24,"medium"),(25,"long")]:
            self.assertEqual(evidence_for({"loan_amount":1000,"duration_months":duration,"savings":"A61"})["duration_band"],expected)

    def test_reject_invalid_inputs(self):
        base={"loan_amount":1000,"duration_months":12,"savings":"A61"}
        for key,value in [("loan_amount",float("nan")),("loan_amount",-1),("duration_months",12.5),("savings","Low"),("savings","")]:
            with self.assertRaises(ValueError): evidence_for({**base,key:value})

    def test_json_matches_independent_bayes_calculation(self):
        payload={"loan_amount":3500,"duration_months":24,"savings":"A62"}
        model=joblib.load(MODEL_PATH)["model"]
        evidence=evidence_for(payload)
        # Independently multiply learned CPDs rather than reusing VariableElimination.
        weights=[]
        for target in [0,1]:
            value=model.get_cpds("target").get_value(target=target)
            for name,state in evidence.items(): value*=model.get_cpds(name).get_value(**{name:state,"target":target})
            weights.append(value)
        expected=float(weights[1]/sum(weights))
        process=subprocess.run([sys.executable,str(MODEL_PATH.parents[1]/"predict_scenario.py")],input=json.dumps(payload),text=True,capture_output=True,check=True)
        result=json.loads(process.stdout)
        self.assertAlmostEqual(result["risk_probability"],expected,places=12)
        self.assertEqual(result["evidence_used"],evidence)

    def test_model_responds_to_each_input(self):
        base={"loan_amount":1500,"duration_months":12,"savings":"A61"}
        original=predict(base)["risk_probability"]
        for changes in [{"loan_amount":8000},{"duration_months":48},{"savings":"A64"}]:
            result=predict({**base,**changes})["risk_probability"]
            self.assertTrue(math.isfinite(result) and 0<=result<=1)
            self.assertNotAlmostEqual(result,original,places=8)
        self.assertTrue(predict({**base,"loan_amount":50000})["warnings"])

    def test_holdout_is_separate(self):
        report=json.loads(MODEL_PATH.with_suffix(".json").read_text())
        self.assertFalse(set(report["train_indices"]) & set(report["test_indices"]))
        self.assertEqual(len(report["test_indices"]),200)

if __name__ == "__main__": unittest.main()
