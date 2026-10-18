# DharaDrishti (धरादृष्टि) 🌾

**Voice-First Smart Farm Assistant**

DharaDrishti helps Indian farmers access field-specific guidance through voice commands in 10 languages. Designed for farmers with limited literacy or technical experience, it brings farm mapping, crop care, weather insights, and profit estimates into one platform.

## ✨ Features

- **Voice Assistant:** Speak commands, hear recommendations, and record harvests using the Web Speech API.
- **Farm Mapping:** Draw boundaries on satellite maps or track them with GPS. Calculate acreage, manage crop sub-plots, and mark disease outbreaks.
- **Crop Disease Detection:** Upload leaf photos for diagnosis, confidence scores, severity, and treatment guidance, with KVK escalation when needed.
- **Irrigation & Fertiliser Advice:** Get weather-aware watering recommendations and NPK-based fertiliser estimates.
- **Mandi & Profit Estimates:** Compare nearby market prices and estimate conservative, expected, and optimistic net returns.
- **Weather & Spray Alerts:** View a 7-day forecast and advisories for irrigation and spraying.
- **Fasal Score & Harvest Ledger:** Track farm health with a transparent 0–100 score and log harvests by voice.
- **Kisan AI Chatbot:** Ask farm-specific questions with ICAR/KVK-backed guidance.

## 🌐 Languages

Hindi (default), English, Punjabi, Tamil, Telugu, Marathi, Gujarati, Bengali, Kannada, and Malayalam.

## 🛠️ Tech Stack

- **Framework:** Next.js 14+ (App Router)
- **Styling:** Tailwind CSS
- **Maps:** Leaflet + Esri World Imagery
- **Geometry:** Geodesic Shoelace and Haversine algorithms
- **Voice:** Web Speech API
- **Effects:** Canvas Confetti

## 🎨 Colour Palette

| Colour | Hex |
|---|---|
| Forest Green | `#186049` |
| Leaf Green | `#4A943E` |
| Wheat Light | `#ECE8AF` |
| Harvest Amber | `#B98327` |

## 🚀 Getting Started

Install dependencies:

```bash
npm install
```

Start the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

Build and run for production:

```bash
npm run build
npm start
```

## 📄 License

MIT License. Built for a hackathon to support Indian agriculture.
