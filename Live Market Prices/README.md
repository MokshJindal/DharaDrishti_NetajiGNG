# Farmers' Platform - Live Market Price Fetcher

A clean, production-ready backend service module to fetch live agricultural commodity and Mandi prices across India using the official **Agmarknet** data from `data.gov.in` (Ministry of Agriculture & Farmers Welfare).

## Setup & Configuration

1. Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```

2. Add your `data.gov.in` API key to `.env`:
   ```ini
   DATA_GOV_API_KEY=your_actual_api_key_here
   AGMARKNET_RESOURCE_ID=9ef84268-d588-465a-a308-a864a43d0070
   API_TIMEOUT_SECONDS=25
   ```

> **Note**: `.env` is already configured in `.gitignore` so your private API credentials are never committed to GitHub.

## How to Run

Test the service directly:
```bash
python3 mandi_service.py
```

## Integrating with your Main Backend

Import `MandiPriceService` in your FastAPI / Flask / Django route:

```python
from mandi_service import MandiPriceService

service = MandiPriceService()

# Example: Get Wheat prices in Maharashtra
result = service.fetch_prices(commodity="Wheat", state="Maharashtra", limit=10)

if result["success"]:
    crops = result["records"]
    # each item has: market, district, state, commodity, variety,
    # arrival_date, min_price_quintal, max_price_quintal,
    # modal_price_quintal, modal_price_kg
```
