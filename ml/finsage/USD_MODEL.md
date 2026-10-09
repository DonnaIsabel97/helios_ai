# FinSage USD model (v3)

This version retrains FinSage's **Discrete Bayesian Network** approach with LendingClub data. It does not replace the original capstone artifact. The active scenario runner uses `usd_model.py`; earlier prediction endpoints and stored application assessments still use their original versions. New simulations do not overwrite application decisions or original scores.

## Reproduce

From the project root:

```powershell
.venv/Scripts/python.exe ml/finsage/download_lendingclub.py
.venv/Scripts/python.exe ml/finsage/train_usd.py
.venv/Scripts/python.exe ml/finsage/test_usd.py
```

The source is Kaggle `wordsforthewise/lending-club`, version 3, file `accepted_2007_to_2018Q4.csv.gz` (392,582,231 bytes). The download script pins and checks its SHA-256. Source URL and checksum are stored in `data/lendingclub/source.json`. Raw data/cache are excluded from Git. Kaggle lists CC0; the uploader also notes upstream usage restrictions, so review provenance before redistribution or commercial reuse.

Dataset: https://www.kaggle.com/datasets/wordsforthewise/lending-club

## Inputs and target

- loan amount, in USD
- duration: 36 or 60 months (unsupported terms are rejected)
- annual income, in USD
- debt-to-income percentage: existing monthly debt, excluding mortgage and the proposed loan, divided by monthly income

The UI asks for monthly debt dollars and the server calculates DTI. Missing income/debt is not guessed. Derived loan-to-income ratio is computed from the entered values. No savings field is inferred from income. Only data available at origination is used: repayment totals, recoveries, last payments and final balances are excluded. Target is observed lifetime **Charged Off** vs **Fully Paid**, not approval, a fixed-horizon default probability, or a causal forecast.

## Training and evaluation

The downloaded file has 2,260,701 rows. Training uses 39,786 resolved loans from 2007–2011. Probability calibration and decision-threshold selection use 53,367 resolved loans from 2012. A later held-out test contains 134,804 resolved loans from 2013. These cohorts allow the observed 36/60 month terms to mature before the snapshot. Other statuses, invalid inputs and duplicates are excluded and reported. The model applies to previously accepted loans; rejected-loan outcomes are unavailable.

Train-only decile bins are learned for amount, income, DTI and loan/income ratio. All feed a smoothed discrete Bayesian network: target -> features, plus amount -> loan/income ratio to model their dependency. BDeu equivalent sample size=20. A sigmoid calibrator is fitted on the 2012 cohort; the test set never fits bins, network parameters, calibration or threshold. Threshold maximizes calibration F1; it is a demo review rule, not lending policy. The UI focuses on the probability.

Held-out results: ROC-AUC 0.6394; Brier score 0.12738 vs constant-rate baseline 0.13167; default prevalence 15.60%. At the chosen threshold 0.1481, recall is 69.0% and precision 20.5%; accuracy 53.4% versus majority accuracy 84.4%. The threshold trades many false positives for recall. This is modest discrimination, not production underwriting. Metrics on the former German dataset are not directly comparable. The full report and reliability bins are in `outputs/finsage_usd_v3.json`.

## Larger scenarios and history

Amounts above the observed range are accepted (up to a validation ceiling of $1 billion). They use the learned end bins and the loan/income ratio. This is an approximate conditional estimate, not validated extrapolation: outputs may plateau once all relevant bins stop changing. Amount changes within a bin can also leave the result unchanged. No hand-written percentage increments or invented trend is used.

The backend saves exact dollar inputs, derived DTI, model hash/version, raw and calibrated probabilities, threshold, evidence bins, out-of-range fields, author and timestamp in the existing simulation JSON. Old records retain their original metadata; the user's UI preference uses dollar notation while keeping earlier values unchanged. Earlier records must not be reinterpreted as USD-trained predictions. The model version is available in stored audit metadata. The interface shows only a percentage and a brief approximation notice when applicable.

Historical data/calibration is not evidence of present-day lending validity. Better discrimination requires additional known applicant features and representative recent data. Do not fabricate missing credit information or claim a scenario change causes a reduction in default.
