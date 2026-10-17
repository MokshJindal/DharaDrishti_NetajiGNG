# DharaDrishti (धरादृष्टि) 🌾
> **Vision of the Earth — Voice-First Smart Farm Assistant for Indian Farmers**

DharaDrishti is an AI-powered, voice-first agricultural platform built to empower farmers with little schooling or tech experience. It provides field-specific, hyper-local guidance across geo-fencing, disease detection, weather-aware irrigation, crop profitability, and farm health scoring — completely accessible by voice in **10 Indian regional languages**.

---

## 🎨 Color Theme
Crafted with an earth-inspired palette tailored for outdoor visibility:
- **Primary Dark (`#186049`)**: Deep forest green representing healthy canopy & structured navigation
- **Primary Leaf Green (`#4A943E`)**: Vitality, positive health actions, boundary polygons
- **Accent Wheat Light (`#ECE8AF`)**: Golden wheat harvest, card containers, alert backgrounds
- **Accent Harvest Amber (`#B98327`)**: Pulses, warnings, mustard crop sub-plots

---

## 🌐 10 Regional Languages
DharaDrishti dynamically translates all features, map overlays, agronomy terms, and spoken voice synthesizers:
- **हिन्दी (Hindi)** — Default
- **English**
- **ਪੰਜਾਬੀ (Punjabi)**
- **தமிழ் (Tamil)**
- **తెలుగు (Telugu)**
- **मराठी (Marathi)**
- **ગુજરાતી (Gujarati)**
- **বাংলা (Bengali)**
- **ಕನ್ನಡ (Kannada)**
- **മലയാളം (Malayalam)**

---

## 🚀 Core Features (from Project Specification)

### 0. 🎤 Voice Layer (Speech In, Speech Out)
- **Web Speech API**: Real-time STT tuned for Indian accents and dialects.
- **Natural Voice Synthesis**: App reads back diagnosis, water recommendations, and scores aloud in the farmer's chosen tongue.
- **Global Voice Command Router**: Speak commands like *"खेत दिखाओ"* (Show fields), *"क्या पानी दूं?"* (Should I water?), *"पत्ती जांचो"* (Diagnose leaf), or *"२५ क्विंटल गेहूं काटा"* (Record harvest).

### 1. 🗺️ Frontend Geo-Fencing & Satellite Mapping
- **Live GPS Walk Mode**: Walk along field bunds with your phone; live coordinates are tracked with accuracy filters (<15m threshold).
- **Satellite Point-and-Click Drawing**: Tap corners directly on satellite imagery to define your farm boundary.
- **Real-Time Acre Calculation**: Shoelace formula computes exact acreage automatically.
- **Crop Sub-Plots**: Partition the farm into distinct plots (e.g. 3.2 Acres Wheat, 1.6 Acres Mustard).
- **Geotagged Disease Pins**: Disease outbreaks are plotted directly on the farm map to monitor spread over time.

### 2. 🔬 AI Crop Disease Doctor
- **Leaf Photo Inspection**: Upload or capture diseased leaves with your camera.
- **Diagnostic Breakdown**: Condition, confidence %, severity rating, and root cause.
- **Remedies**: Organic / biological remedies first (Neem oil, Trichoderma, Gomutra) followed by verified chemical spray guidelines.
- **KVK Escalation**: Automatic advisories to contact the local Krishi Vigyan Kendra for high-severity or low-confidence cases.

### 3. 💧 Irrigation & Fertiliser Advice (Rules Engine)
- **FAO Penman-Monteith ET₀ Engine**: Combines evapotranspiration with 5-day weather forecasts.
- **Smart Decision Banner**: Proactive alerts like *"Skip watering today — 18mm rain expected tomorrow"*.
- **Soil Health Card NPK Dosage**: Uses ICAR nutrient recommendation tables to calculate commercial Urea (46% N), DAP (18:46), and MOP (60% K) bag counts.

### 4. 💰 Crop Choice & Live Mandi Profit Estimator
- **Live APMC Mandi Feeds**: Modal prices across nearby agricultural markets.
- **Realistic Net Profit Math**: Expected yield × mandi rate minus operational cultivation costs (seeds, ploughing, fertilizer, water, labor).
- **Three-Tier Range**: Displays Conservative (Low), Expected, and Optimistic (High) net income.

### 5. ⛅ Weather Intelligence & Spray Advisories
- **7-Day Hyperlocal Forecast**: Temperature, humidity, wind gusts, and rainfall mm.
- **Actionable Spray Advisories**: Real-time warnings (e.g. *"Do not spray pesticides tomorrow — High winds and scattered rain"*).

### 6. 📊 Fasal Score & Harvest Voice Ledger
- **Transparent 0–100 Rating**: Evaluates Crop Health (25%), Stock Value (15%), Irrigation Discipline (20%), Weather Risk (20%), and Yield Outlook (20%).
- **Voice Harvest Ledger**: Speak harvest updates like *"I harvested 25 quintal wheat"* to log storage stock.

### 7. 💬 Kisan AI Chatbot
- Context-aware agronomy assistant that answers farm questions using your specific field boundary, soil values, and weather history with ICAR/KVK citations.

---

## 🛠️ Tech Stack
- **Framework**: Next.js 14+ (App Router)
- **Styling**: Tailwind CSS with custom palette variables
- **Maps & Geofencing**: Leaflet with Esri World Imagery satellite tiles
- **Geometry**: Geodesic Shoelace & Haversine mathematical algorithms
- **Speech**: Web Speech API (SpeechRecognition + SpeechSynthesis)
- **Celebration Effects**: Canvas Confetti

---

## 📦 Getting Started

### 1. Install Dependencies
```bash
npm install
```

### 2. Start Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

### 3. Build for Production
```bash
npm run build
npm start
```

---

## 📄 License
MIT License. Built for the Hackathon with pride for Indian agriculture.
