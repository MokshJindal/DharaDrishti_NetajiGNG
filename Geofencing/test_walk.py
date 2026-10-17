import time
import requests

BASE = "http://127.0.0.1:8000"

field = requests.post(f"{BASE}/fields", json={"name": "Test farm"}).json()
trace = requests.post(f"{BASE}/traces", json={
    "field_id": field["field_id"],
    "kind": "patch",
    "name": "Field boundary",
}).json()
tid = trace["trace_id"]

corners = [
    (28.6, 77.2),
    (28.600181, 77.2),
    (28.600181, 77.2002048),
    (28.6, 77.2002048),
    (28.6, 77.2),
]

ts = time.time()
for lat, lng in corners:
    requests.post(f"{BASE}/traces/{tid}/points", json={
        "lat": lat, "lng": lng, "accuracy": 3, "timestamp": ts,
    })
    ts += 1

print(requests.post(f"{BASE}/traces/{tid}/finish").json())
print(requests.get(f"{BASE}/fields/{field['field_id']}").json())