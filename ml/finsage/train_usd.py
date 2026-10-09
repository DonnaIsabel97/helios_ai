"""Retrain FinSage's discrete Bayesian approach on resolved LendingClub loans."""
from pathlib import Path
import hashlib
import json
import joblib
import numpy as np
import pandas as pd
from pgmpy.models import DiscreteBayesianNetwork
from pgmpy.estimators import BayesianEstimator
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import roc_auc_score,average_precision_score,brier_score_loss,log_loss,precision_recall_curve,precision_score,recall_score,accuracy_score,confusion_matrix
from usd_model import MODEL_PATH,VERSION,FIELDS,posterior

base=Path(__file__).resolve().parent
data_dir=base/"data/lendingclub"
# Read only application-time inputs plus the target/date; repayment fields never become predictors.
cache=data_dir/"selected_columns.pkl"
if cache.exists():
    df=pd.read_pickle(cache)
else:
    columns=["id","loan_amnt","term","annual_inc","dti","issue_d","loan_status","application_type"]
    df=pd.read_csv(data_dir/"accepted_2007_to_2018Q4.csv.gz",usecols=columns,low_memory=False)
    df.to_pickle(cache)
source_rows=len(df)
df["year"]=pd.to_datetime(df.issue_d,format="%b-%Y",errors="coerce").dt.year
# All terms in the evaluation cohort have had at least 60 months to mature by the snapshot.
cohort=df[df.year.between(2007,2013)].copy()
statuses=cohort.loan_status.value_counts().to_dict()
df=cohort[cohort.loan_status.isin(["Fully Paid","Charged Off"])].copy()
df=df.drop_duplicates("id")
df["loan_amount"]=pd.to_numeric(df.loan_amnt,errors="coerce")
df["annual_income"]=pd.to_numeric(df.annual_inc,errors="coerce")
df["debt_to_income"]=pd.to_numeric(df.dti,errors="coerce")
df["term"]=pd.to_numeric(df.term.str.strip().str.split().str[0],errors="coerce")
before_clean=len(df)
df=df[df.loan_amount.between(1,1e9)&df.annual_income.between(1,1e9)&df.debt_to_income.between(0,100)&df.term.isin([36,60])].copy()
df["loan_to_income"]=df.loan_amount/df.annual_income
df["target"]=(df.loan_status=="Charged Off").astype(int)
train=df[df.year<=2011].copy(); calibration=df[df.year==2012].copy(); test=df[df.year==2013].copy()
assert len(train)>1000 and len(calibration)>1000 and len(test)>1000
assert not set(train.id)&set(calibration.id) and not set(train.id)&set(test.id)
# Learned quantile boundaries use training data only; no new thresholds from the test set.
edges={key:np.unique(np.quantile(train[key],np.arange(1,10)/10)).tolist() for key in FIELDS}
def encode(frame):
    out=pd.DataFrame({key:np.searchsorted(edges[key],frame[key].to_numpy(),side="left") for key in FIELDS},index=frame.index)
    out["term"]=frame.term.astype(int);out["target"]=frame.target
    return out
encoded=encode(train)
# Bayesian network with a dependency between amount and the derived loan/income ratio.
model=DiscreteBayesianNetwork([("target",key) for key in (*FIELDS,"term")]+[("loan_amount","loan_to_income")])
states={key:list(range(len(edges[key])+1)) for key in FIELDS};states.update({"term":[36,60],"target":[0,1]})
model.fit(encoded,estimator=BayesianEstimator,prior_type="BDeu",equivalent_sample_size=20,state_names=states)
assert model.check_model()
# Multiply the learned Bayesian CPDs in vectorized form; target is the only unobserved node.
def probabilities(frame):
    evidence=encode(frame)
    weights=[]
    for target in [0,1]:
        likelihood=np.ones(len(frame))
        for cpd in model.get_cpds():
            indices=[]
            for name in cpd.variables:
                if name=="target":indices.append(np.full(len(frame),cpd.state_names[name].index(target)))
                else:
                    mapping={state:i for i,state in enumerate(cpd.state_names[name])}
                    indices.append(evidence[name].map(mapping).to_numpy(dtype=int))
            likelihood*=cpd.values[tuple(indices)]
        weights.append(likelihood)
    return weights[1]/(weights[0]+weights[1])
cal_raw=probabilities(calibration)
# Probability calibration is fitted on a later, separate cohort, never on test outcomes.
logits=lambda p:np.log(np.clip(p,1e-8,1-1e-8)/(1-np.clip(p,1e-8,1-1e-8))).reshape(-1,1)
calibrator=LogisticRegression(C=1e6,max_iter=1000).fit(logits(cal_raw),calibration.target)
cal_probs=calibrator.predict_proba(logits(cal_raw))[:,1]
precision,recall,thresholds=precision_recall_curve(calibration.target,cal_probs)
f1=2*precision[:-1]*recall[:-1]/np.maximum(precision[:-1]+recall[:-1],1e-12)
threshold=float(thresholds[int(np.argmax(f1))])
test_raw=probabilities(test);test_probs=calibrator.predict_proba(logits(test_raw))[:,1]
y=test.target.to_numpy();pred=(test_probs>=threshold).astype(int)
prior=float(calibration.target.mean())
reliability=[]
for lo in np.arange(0,1,.1):
    mask=(test_probs>=lo)&(test_probs<lo+.1)
    if mask.any():reliability.append({"range":[round(float(lo),1),round(float(lo+.1),1)],"count":int(mask.sum()),"mean_prediction":float(test_probs[mask].mean()),"observed_default_rate":float(y[mask].mean())})
metrics={"accuracy":accuracy_score(y,pred),"precision":precision_score(y,pred,zero_division=0),"recall":recall_score(y,pred,zero_division=0),"roc_auc":roc_auc_score(y,test_probs),"average_precision":average_precision_score(y,test_probs),"brier_score":brier_score_loss(y,test_probs),"raw_brier_score":brier_score_loss(y,test_raw),"baseline_brier_score":brier_score_loss(y,np.full(len(y),prior)),"log_loss":log_loss(y,test_probs),"default_rate":float(y.mean()),"majority_accuracy":float(1-y.mean()),"confusion_matrix":confusion_matrix(y,pred).tolist(),"reliability":reliability}
# Release only when ranking and probability error beat a constant-rate baseline.
release_ok=metrics["roc_auc"]>.5 and metrics["brier_score"]<metrics["baseline_brier_score"]
artifact={"model":model,"calibrator":calibrator,"bin_edges":edges,"threshold":threshold,"model_version":VERSION,"training_ranges":{k:[float(train[k].min()),float(train[k].max())] for k in FIELDS}}
report={"model_version":VERSION,"source":json.loads((data_dir/"source.json").read_text()),"source_rows":source_rows,"cohort_statuses":statuses,"dropped_invalid_rows":before_clean-len(df),"splits":{"train":{"years":"2007-2011","rows":len(train)},"calibration":{"years":"2012","rows":len(calibration)},"test":{"years":"2013","rows":len(test)}},"metrics":metrics,"threshold":threshold,"release_ok":release_ok,"training_ranges":artifact["training_ranges"],"bin_edges":edges,"target":"Charged Off vs Fully Paid, lifetime observed outcome","features":["loan_amount","duration_months","annual_income","debt_to_income"],"limitations":["Historical approved-loan population, not all applicants.","Out-of-range scenarios are approximate and end-bin values can plateau.","Discrete bands can give identical percentages for nearby amounts.","Historical cohort calibration is not a current-lending guarantee."]}
MODEL_PATH.with_suffix('.json').write_text(json.dumps(report,indent=2),encoding="utf-8")
if not release_ok:raise RuntimeError("Model did not pass the baseline release check; report saved, no artifact released.")
joblib.dump(artifact,MODEL_PATH)
report["model_sha256"]=hashlib.sha256(MODEL_PATH.read_bytes()).hexdigest()
MODEL_PATH.with_suffix('.json').write_text(json.dumps(report,indent=2),encoding="utf-8")
# Cross-check vectorized evaluation against pgmpy VariableElimination.
for i in range(5):
    sample=encode(test.iloc[i:i+1]).drop(columns="target").iloc[0].to_dict()
    assert abs(posterior(model,sample)-test_raw[i])<1e-10
print(json.dumps({"splits":report["splits"],"metrics":metrics,"threshold":threshold,"release_ok":release_ok},indent=2))
