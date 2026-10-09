import json
import sys
from scenario_model import predict

# JSON only on stdout so Express can parse one unambiguous response.
if __name__ == "__main__":
    try:
        print(json.dumps(predict(json.load(sys.stdin)), allow_nan=False))
    except Exception as error:
        print(json.dumps({"error": str(error)}))
        sys.exit(1)
