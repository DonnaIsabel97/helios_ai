import json
import subprocess
import sys
import unittest
import joblib
import numpy as np
from usd_model import MODEL_PATH,predict,evidence_for,posterior,validate

class UsdTests(unittest.TestCase):
    def setUp(self):
        self.payload={"loan_amount":30000,"duration_months":36,"annual_income":80000,"debt_to_income":15}

    def test_invalid_inputs_are_rejected(self):
        for key,value in [("loan_amount",float("nan")),("loan_amount",0),("annual_income",0),("annual_income",True),("debt_to_income",-1),("debt_to_income",101),("duration_months",24)]:
            with self.assertRaises(ValueError):validate({**self.payload,key:value})

    def test_larger_amount_is_allowed_and_audited(self):
        result=predict({**self.payload,"loan_amount":100000})
        self.assertTrue(0<=result["risk_probability"]<=1)
        self.assertIn("loan_amount",result["outside_training_range"])
        self.assertEqual(result["amount_unit"],"USD")
        self.assertEqual(result["model_version"],"finsage_usd_v3")
        self.assertEqual(len(result["model_sha256"]),64)

    def test_amount_can_change_the_estimate(self):
        low=predict({**self.payload,"loan_amount":5000})
        high=predict(self.payload)
        self.assertNotAlmostEqual(low["risk_probability"],high["risk_probability"],places=5)

    def test_cli_matches_bayesian_and_calibration_steps(self):
        artifact=joblib.load(MODEL_PATH)
        evidence=evidence_for(self.payload,artifact)
        raw=posterior(artifact["model"],evidence)
        logit=np.log(raw/(1-raw))
        expected=artifact["calibrator"].predict_proba([[logit]])[0,1]
        process=subprocess.run([sys.executable,str(MODEL_PATH.parents[1]/"usd_model.py")],input=json.dumps(self.payload),text=True,capture_output=True,check=True)
        result=json.loads(process.stdout)
        self.assertAlmostEqual(result["risk_probability"],expected,places=12)
        self.assertEqual(result["evidence_used"],evidence)

    def test_report_has_later_heldout_cohorts_and_baseline_comparison(self):
        report=json.loads(MODEL_PATH.with_suffix('.json').read_text())
        self.assertEqual(report['splits']['train']['years'],'2007-2011')
        self.assertEqual(report['splits']['calibration']['years'],'2012')
        self.assertEqual(report['splits']['test']['years'],'2013')
        self.assertLess(report['metrics']['brier_score'],report['metrics']['baseline_brier_score'])
        self.assertNotIn('loan_status',report['features'])

if __name__=='__main__':unittest.main()
