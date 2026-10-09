"""Download the public, pinned Kaggle accepted-loans source for FinSage."""
from pathlib import Path
import hashlib
import json
import urllib.request

folder=Path(__file__).resolve().parent/"data/lendingclub"
folder.mkdir(parents=True,exist_ok=True)
file=folder/"accepted_2007_to_2018Q4.csv.gz"
url="https://www.kaggle.com/api/v1/datasets/download/wordsforthewise/lending-club/accepted_2007_to_2018Q4.csv.gz?datasetVersionNumber=3"
expected="55c16f75120f897683f02e7aabcf080d0e4a20c4832feb1d592cfa941bd62a2d"
if not file.exists():
    temporary=folder/"accepted.download"
    with urllib.request.urlopen(url,timeout=60) as response, temporary.open("wb") as out:
        while chunk:=response.read(4*1024*1024):out.write(chunk)
    with temporary.open("rb") as downloaded:
        if hashlib.file_digest(downloaded,"sha256").hexdigest()!=expected:raise ValueError("Dataset checksum mismatch; source was not installed.")
    temporary.rename(file)
with file.open("rb") as downloaded:
    actual=hashlib.file_digest(downloaded,"sha256").hexdigest()
if actual!=expected:raise ValueError("Existing dataset checksum mismatch.")
(folder/"source.json").write_text(json.dumps({"url":url,"dataset":"wordsforthewise/lending-club","version":3,"sha256":actual,"bytes":file.stat().st_size},indent=2))
print("Verified LendingClub accepted-loans source.")
