"""Train a separate Bayesian scenario model; never overwrite capstone artifacts."""
import hashlib
import json
from pathlib import Path
import joblib
import pandas as pd
import sklearn
import pgmpy
from pgmpy.models import DiscreteBayesianNetwork
from pgmpy.estimators import BayesianEstimator
from pgmpy.inference import VariableElimination
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score, precision_score, recall_score, f1_score, roc_auc_score, brier_score_loss, confusion_matrix
from scenario_model import evidence_for, MODEL_PATH, VERSION, SAVINGS

base = Path(__file__).resolve().parent
source = base / "data/german_original.data"
raw = pd.read_csv(source, sep=r"\s+", header=None)
assert raw.shape == (1000,21)
# Original UCI layout: column 2 duration, column 5 amount, column 6 savings, column 21 target.
inputs = pd.DataFrame({"loan_amount":raw[4], "duration_months":raw[1], "savings":raw[5]})
data = pd.DataFrame([evidence_for(row) for row in inputs.to_dict("records")])
data["target"] = raw[20].map({1:0,2:1})
assert not data.isna().any().any()
train_idx,test_idx = train_test_split(data.index,test_size=.2,stratify=data.target,random_state=42)
# A small, smoothed Bayesian network avoids the sparse huge conditional table of the old model.
model = DiscreteBayesianNetwork([("target", name) for name in ("amount_band","duration_band","savings")])
model.fit(data.loc[train_idx], estimator=BayesianEstimator, prior_type="BDeu", equivalent_sample_size=10,
          state_names={"target":[0,1],"amount_band":["low","medium","high"],"duration_band":["short","medium","long"],"savings":list(SAVINGS)})
assert model.check_model()
infer = VariableElimination(model)
probabilities=[]
for row in data.loc[test_idx].drop(columns="target").to_dict("records"):
    result=infer.query(variables=["target"],evidence=row,show_progress=False)
    probabilities.append(float(result.values[result.state_names["target"].index(1)]))
y=data.loc[test_idx,"target"]
pred=[int(p>=.5) for p in probabilities]
metrics={"accuracy":accuracy_score(y,pred),"precision":precision_score(y,pred,zero_division=0),"recall":recall_score(y,pred,zero_division=0),"f1":f1_score(y,pred,zero_division=0),"roc_auc":roc_auc_score(y,probabilities),"brier_score":brier_score_loss(y,probabilities),"confusion_matrix":confusion_matrix(y,pred,labels=[0,1]).tolist(),"majority_baseline_accuracy":float((y==0).mean())}
ranges={key:[float(inputs.loc[train_idx,key].min()),float(inputs.loc[train_idx,key].max())] for key in ("loan_amount","duration_months")}
artifact={"model":model,"model_version":VERSION,"training_ranges":ranges}
MODEL_PATH.parent.mkdir(exist_ok=True)
joblib.dump(artifact,MODEL_PATH)
report={"model_version":VERSION,"source_sha256":hashlib.sha256(source.read_bytes()).hexdigest(),"model_sha256":hashlib.sha256(MODEL_PATH.read_bytes()).hexdigest(),"train_rows":len(train_idx),"test_rows":len(test_idx),"train_indices":train_idx.tolist(),"test_indices":test_idx.tolist(),"random_state":42,"metrics":metrics,"training_ranges":ranges,"versions":{"pgmpy":pgmpy.__version__,"sklearn":sklearn.__version__},"limitations":["Three-feature scenario demo, not full applicant underwriting.","Historical DM amounts; no USD conversion or current-market calibration.","Original stored capstone predictions are not comparable baselines.","Not a causal model; changes are conditional estimates."]}
(MODEL_PATH.with_suffix(".json")).write_text(json.dumps(report,indent=2),encoding="utf-8")
print(json.dumps({"model_version":VERSION,"metrics":metrics,"training_ranges":ranges},indent=2))
