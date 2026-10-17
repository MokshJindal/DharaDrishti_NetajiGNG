"""
Live Mandi & Crop Market Price Service
Data Source: Agmarknet via data.gov.in (Government of India)
"""

import os
import urllib.request
import urllib.parse
import json
import ssl
from typing import Optional, Dict, Any
from pathlib import Path

def load_env(env_path: Optional[str] = None):
    """
    Lightweight .env loader (zero external dependencies).
    Loads key=value pairs into os.environ if not already present.
    """
    if env_path is None:
        env_path = Path(__file__).resolve().parent / ".env"
    else:
        env_path = Path(env_path)

    if env_path.is_file():
        with open(env_path, "r", encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if not line or line.startswith("#"):
                    continue
                if "=" in line:
                    k, v = line.split("=", 1)
                    k = k.strip()
                    v = v.strip().strip('"').strip("'")
                    if k not in os.environ:
                        os.environ[k] = v

# Automatically load .env on import
load_env()

API_KEY = os.getenv("DATA_GOV_API_KEY", "")
RESOURCE_ID = os.getenv("AGMARKNET_RESOURCE_ID", "9ef84268-d588-465a-a308-a864a43d0070")
TIMEOUT_SECONDS = int(os.getenv("API_TIMEOUT_SECONDS", "25"))
BASE_URL = f"https://api.data.gov.in/resource/{RESOURCE_ID}"


class MandiPriceService:
    def __init__(self, api_key: Optional[str] = None, timeout: Optional[int] = None):
        self.api_key = api_key or os.getenv("DATA_GOV_API_KEY", "")
        self.timeout = timeout or TIMEOUT_SECONDS
        self.ctx = ssl.create_default_context()

        if not self.api_key:
            raise ValueError(
                "DATA_GOV_API_KEY is not set! Please check your .env file."
            )

    def fetch_prices(
        self,
        commodity: Optional[str] = None,
        state: Optional[str] = None,
        district: Optional[str] = None,
        market: Optional[str] = None,
        limit: int = 10,
        offset: int = 0,
    ) -> Dict[str, Any]:
        """
        Fetch crop prices from data.gov.in with optional filters.
        """
        params = {
            "api-key": self.api_key,
            "format": "json",
            "limit": str(limit),
            "offset": str(offset),
        }

        if commodity:
            params["filters[commodity]"] = commodity
        if state:
            params["filters[state]"] = state
        if district:
            params["filters[district]"] = district
        if market:
            params["filters[market]"] = market

        query_string = urllib.parse.urlencode(params)
        full_url = f"{BASE_URL}?{query_string}"

        req = urllib.request.Request(
            full_url,
            headers={
                "User-Agent": "Mozilla/5.0 (FarmersTechPlatform/1.0)",
                "Accept": "application/json",
            },
        )

        try:
            with urllib.request.urlopen(req, timeout=self.timeout, context=self.ctx) as resp:
                data = json.loads(resp.read().decode("utf-8"))

            raw_records = data.get("records", [])
            formatted = []
            for r in raw_records:
                modal_p = float(r.get("modal_price", 0)) if r.get("modal_price") else 0
                formatted.append({
                    "state": r.get("state"),
                    "district": r.get("district"),
                    "market": r.get("market"),
                    "commodity": r.get("commodity"),
                    "variety": r.get("variety"),
                    "grade": r.get("grade"),
                    "arrival_date": r.get("arrival_date"),
                    "min_price_quintal": r.get("min_price"),
                    "max_price_quintal": r.get("max_price"),
                    "modal_price_quintal": r.get("modal_price"),
                    "modal_price_kg": round(modal_p / 100, 2),
                })

            return {
                "success": True,
                "total_records": data.get("total", 0),
                "count": len(formatted),
                "records": formatted,
            }

        except Exception as e:
            return {"success": False, "error": str(e), "records": []}


if __name__ == "__main__":
    print("=" * 65)
    print(f"🔑 Loaded API Key from .env: {API_KEY[:8]}...{API_KEY[-4:]}")
    print("=" * 65)

    service = MandiPriceService()

    # Quick test using .env loaded key
    print("\n🔍 Fetching latest 'Mustard' prices...")
    res = service.fetch_prices(commodity="Mustard", limit=2)
    if res["success"]:
        print(f"Total matching records: {res['total_records']}")
        for i, item in enumerate(res["records"], start=1):
            print(f" {i}. {item['commodity']} ({item['variety']})")
            print(f"    Mandi: {item['market']}, District: {item['district']}, State: {item['state']}")
            print(f"    Modal Price: ₹{item['modal_price_quintal']}/quintal (₹{item['modal_price_kg']}/kg) | Date: {item['arrival_date']}")
    else:
        print(f"Error: {res.get('error')}")
