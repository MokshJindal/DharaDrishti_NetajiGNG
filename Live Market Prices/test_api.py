import os
import json
import requests

API_KEY = "579b464db66ec23bdd00000187f830168d634db342dea205372b047d"

# Known Agmarknet Resource IDs on data.gov.in
# 9ef84268-d588-465a-a308-a864a43d0070 is the primary daily mandi price resource
RESOURCE_ID = "9ef84268-d588-465a-a308-a864a43d0070"

def test_agmarknet_api(api_key, resource_id=RESOURCE_ID, limit=5, commodity=None, state=None):
    url = f"https://api.data.gov.in/resource/{resource_id}"
    params = {
        "api-key": api_key,
        "format": "json",
        "limit": limit
    }
    if commodity:
        params["filters[commodity]"] = commodity
    if state:
        params["filters[state]"] = state

    print(f"[*] Calling Agmarknet API via data.gov.in ...")
    print(f"[*] Endpoint: {url}")
    print(f"[*] Query Params: {params}\n")

    try:
        response = requests.get(url, params=params, timeout=15)
        print(f"[+] HTTP Status Code: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print("[+] Success! Response payload structure:")
            print(f"    - Status: {data.get('status')}")
            print(f"    - Total records available: {data.get('total')}")
            print(f"    - Count returned: {data.get('count')}")
            print(f"    - Title: {data.get('title')}")
            print("\n--- Sample Records ---")
            records = data.get("records", [])
            for i, r in enumerate(records, start=1):
                print(f"Record {i}:")
                print(f"  • State      : {r.get('state')}")
                print(f"  • District   : {r.get('district')}")
                print(f"  • Market     : {r.get('market')}")
                print(f"  • Commodity  : {r.get('commodity')}")
                print(f"  • Variety    : {r.get('variety')}")
                print(f"  • Arrival Dt : {r.get('arrival_date')}")
                print(f"  • Min Price  : ₹{r.get('min_price')}/quintal")
                print(f"  • Max Price  : ₹{r.get('max_price')}/quintal")
                print(f"  • Modal Price: ₹{r.get('modal_price')}/quintal\n")
            return data
        else:
            print(f"[-] API returned error: {response.status_code}")
            print(response.text)
            return None
    except Exception as e:
        print(f"[!] Request failed with exception: {e}")
        return None

if __name__ == "__main__":
    test_agmarknet_api(API_KEY)
