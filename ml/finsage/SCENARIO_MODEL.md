# Corrected FinSage scenario model

Run from the project root:

```powershell
.venv/Scripts/python.exe ml/finsage/train_scenario.py
.venv/Scripts/python.exe ml/finsage/test_scenario.py
```

The separate `outputs/finsage_scenario_v2.pkl` artifact serves the scenario simulator only. Existing capstone models, prediction endpoints, and stored historical scores are unchanged. Do not compare their scores as if they came from the same model. The new artifact uses three inputs available in the scenario form, not the full applicant feature set.

## Data and preprocessing

Source: UCI Statlog German Credit, https://doi.org/10.24432/C5NC77 . The original `german.data` file was copied from the local capstone source into `data/german_original.data`. In this original 21-column file, duration is column 2, credit amount column 5, savings column 6, and target column 21 (good=1 -> 0; bad=2 -> 1). These positions must not be applied to the differently encoded numeric file.

Amount bands: <=2000, <=5000, >5000. Duration bands: <=12, <=24, >24 months. Savings uses all five documented categories A61–A65. An unset savings selection is rejected; unknown/no account is an explicit user choice. Training and inference share `scenario_model.evidence_for`.

Amounts are in historical dataset DM units. The simulator treats its entered numbers on that scale and labels them accordingly; no USD conversion is implied. The dataset is historical and is not suitable for current lending deployment without representative data, validation and calibration. Out-of-training-range amounts/durations are recorded with warnings; discretization means changes within a band can produce identical results.

## Training and evaluation

A three-feature discrete Bayesian naive Bayes network uses target -> amount_band, duration_band, savings, with BayesianEstimator BDeu smoothing (equivalent sample size 10). This replaces the sparse full conditional table for this limited-input workflow. Only the 800-row stratified training split is fitted. The held-out 200 rows are never used for fitting or tuning. Seed=42, threshold=.5. The artifact evaluated on the holdout is the deployed artifact, without a later full-data refit.

The adjacent JSON report contains dataset/model hashes, library versions, split row indices, training ranges and held-out metrics. Current accuracy .72 vs majority baseline .70; high-risk recall .20, precision .60, ROC-AUC .6632. These are limited demo results, not production claims. No threshold tuning has been performed on the test set. This is conditional inference, not a causal guarantee that changing an input improves creditworthiness.

## Backend and history

`Run & save simulation` calls the authenticated credit case PATCH endpoint. Express validates inputs, invokes `predict_scenario.py` with bounded execution time, and atomically stores its actual output in credit_case_activity. Model version/hash, exact inputs, discretized evidence, classification, probability, units, warnings, author and timestamp are preserved. A failure creates no history entry. Existing illustrative_v1 history stays labeled illustrative. Original predictions and case decisions are not changed by simulations.

Configure PYTHON_PATH for an alternate Python executable; otherwise the existing project venv is used locally. Install the same pgmpy/joblib dependencies as the training environment when deploying.
