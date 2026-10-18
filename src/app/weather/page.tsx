'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import { useVoice, voiceEventBus } from '@/lib/voice/VoiceContext';

interface WeatherIntelligenceData {
  location: {
    latitude: number;
    longitude: number;
    name: string;
  };
  current: {
    temperature: number;
    humidity: number;
    windSpeed: number;
    weatherCode: number;
    description: string;
    descriptionHi: string;
    icon: string;
  };
  advisory: {
    status: 'HOLD' | 'DELAY_24H' | 'SWITCH_METHOD' | 'SAFE_TO_IRRIGATE';
    summaryBanner: string;
    summaryBannerHi: string;
    rainTriggered: boolean;
    precip48h: number;
    maxProb48h: number;
    leachingVulnerabilityIndex: {
      lvi: number;
      level: string;
      details: string;
      detailsHi: string;
    };
    fungalDiseaseRisk: {
      riskLevel: string;
      avgHumidity3d: number;
      hoursAbove80: number;
      overcastHours: number;
      recommendation: string;
      recommendationHi: string;
    };
  };
  daily: Array<{
    date: string;
    tempMax: number;
    tempMin: number;
    rainMm: number;
    rainProb: number;
    windSpeed: number;
    weatherCode: number;
    description: string;
    descriptionHi: string;
    icon: string;
  }>;
}

interface GeocodingResult {
  id: number;
  name: string;
  latitude: number;
  longitude: number;
  admin1?: string;
  country?: string;
}

const PRESET_HUBS = [
  { name: 'Shirur, Pune', fullName: 'Shirur, Pune (Maharashtra)', lat: 18.8262, lon: 74.3731, state: 'MH' },
  { name: 'Ludhiana', fullName: 'Ludhiana (Punjab)', lat: 30.901, lon: 75.8573, state: 'PB' },
  { name: 'Karnal', fullName: 'Karnal (Haryana)', lat: 29.6857, lon: 76.9905, state: 'HR' },
  { name: 'Indore', fullName: 'Indore (Madhya Pradesh)', lat: 22.7196, lon: 75.8577, state: 'MP' },
  { name: 'Varanasi', fullName: 'Varanasi (Uttar Pradesh)', lat: 25.3176, lon: 82.9739, state: 'UP' },
  { name: 'Guntur', fullName: 'Guntur (Andhra Pradesh)', lat: 16.3067, lon: 80.4365, state: 'AP' },
];

export default function WeatherPage() {
  const { t, language } = useLanguage();
  const { speak, registerActionHandler } = useVoice();
  const isHi = language === 'hi';

  // Active Location
  const [selectedLocation, setSelectedLocation] = useState({
    name: 'Shirur, Pune (Maharashtra)',
    lat: 18.8262,
    lon: 74.3731,
  });

  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<GeocodingResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Weather Data state
  const [weatherData, setWeatherData] = useState<WeatherIntelligenceData | null>(null);
  const [loading, setLoading] = useState(true);

  // Interactive Microclimate Simulator state
  const [isSimulating, setIsSimulating] = useState(false);
  const [simTemp, setSimTemp] = useState<number>(31);
  const [simRain, setSimRain] = useState<number>(0);
  const [simHumidity, setSimHumidity] = useState<number>(55);
  const [simWind, setSimWind] = useState<number>(10);
  const [simUrea, setSimUrea] = useState<boolean>(false);

  // Load weather data from API
  const fetchWeather = useCallback(
    async (
      lat: number,
      lon: number,
      locName: string,
      overrides?: { temp?: number; rain?: number; humidity?: number; wind?: number; urea?: boolean }
    ) => {
      try {
        setLoading(true);
        let url = `/api/weather/intelligence?lat=${lat}&lon=${lon}&location_name=${encodeURIComponent(locName)}`;
        if (overrides?.urea) url += `&urea_applied=true`;
        if (typeof overrides?.temp === 'number') url += `&temp=${overrides.temp}`;
        if (typeof overrides?.rain === 'number') url += `&rain=${overrides.rain}`;
        if (typeof overrides?.humidity === 'number') url += `&humidity=${overrides.humidity}`;
        if (typeof overrides?.wind === 'number') url += `&wind=${overrides.wind}`;

        const res = await fetch(url);
        const data = await res.json();
        if (data.success) {
          setWeatherData(data);
          if (!isSimulating && !overrides) {
            setSimTemp(Math.round(data.current.temperature));
            setSimHumidity(Math.round(data.current.humidity));
            setSimWind(Math.round(data.current.windSpeed));
            setSimRain(Math.round(data.advisory.precip48h));
          }
        }
      } catch (err) {
        console.error('Failed to load weather intelligence:', err);
      } finally {
        setLoading(false);
      }
    },
    [isSimulating]
  );

  // Initial load or location change
  useEffect(() => {
    if (!isSimulating) {
      fetchWeather(selectedLocation.lat, selectedLocation.lon, selectedLocation.name);
    } else {
      fetchWeather(selectedLocation.lat, selectedLocation.lon, selectedLocation.name, {
        temp: simTemp,
        rain: simRain,
        humidity: simHumidity,
        wind: simWind,
        urea: simUrea,
      });
    }
  }, [selectedLocation, isSimulating, simTemp, simRain, simHumidity, simWind, simUrea, fetchWeather]);

  // Geocoding Search Debounce
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value;
    setSearchQuery(query);

    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);

    if (!query.trim() || query.length < 2) {
      setSearchResults([]);
      setShowDropdown(false);
      return;
    }

    setIsSearching(true);
    searchTimeoutRef.current = setTimeout(async () => {
      try {
        const res = await fetch(
          `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(
            query.trim()
          )}&count=6&language=en&format=json`
        );
        if (res.ok) {
          const json = await res.json();
          setSearchResults(json.results || []);
          setShowDropdown(true);
        }
      } catch (e) {
        console.warn('Geocoding search failed:', e);
      } finally {
        setIsSearching(false);
      }
    }, 350);
  };

  const selectLocation = (loc: { name: string; lat: number; lon: number }) => {
    setSelectedLocation(loc);
    setSearchQuery('');
    setShowDropdown(false);
  };

  const handleUseGPS = () => {
    if (!navigator.geolocation) {
      alert(isHi ? 'आपके ब्राउज़र में जीपीएस उपलब्ध नहीं है।' : 'Geolocation not supported by browser.');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = Number(pos.coords.latitude.toFixed(4));
        const lon = Number(pos.coords.longitude.toFixed(4));
        selectLocation({
          name: `My Farm (${lat}, ${lon})`,
          lat,
          lon,
        });
      },
      (err) => {
        alert(isHi ? 'स्थान प्राप्त करने में त्रुटि: कृपया लोकेशन अनुमति दें।' : `Location error: ${err.message}`);
      }
    );
  };

  const resetSimulation = () => {
    setIsSimulating(false);
    setSimUrea(false);
    fetchWeather(selectedLocation.lat, selectedLocation.lon, selectedLocation.name);
  };

  const speakWeatherForecast = useCallback(() => {
    if (!weatherData) return;

    const curr = weatherData.current;
    const adv = weatherData.advisory;

    const text = isHi
      ? `स्थान ${selectedLocation.name}: वर्तमान तापमान ${curr.temperature} डिग्री सेल्सियस है। स्थिति: ${curr.descriptionHi}। हवा की गति ${curr.windSpeed} किलोमीटर प्रति घंटा और आर्द्रता ${curr.humidity} प्रतिशत है। कृषि सलाह: ${adv.summaryBannerHi}। लीचिंग स्तर ${adv.leachingVulnerabilityIndex.level} है।`
      : `Weather for ${selectedLocation.name}: Currently ${curr.temperature}°C, ${curr.description}. Wind speed is ${curr.windSpeed} km/h with humidity at ${curr.humidity}%. Advisory: ${adv.summaryBanner}. Leaching risk is ${adv.leachingVulnerabilityIndex.level}.`;

    speak(text);
  }, [weatherData, selectedLocation.name, isHi, speak]);

  // Voice command listener
  useEffect(() => {
    const unregister = registerActionHandler((spoken: string) => {
      if (
        spoken.includes('weather') ||
        spoken.includes('mausam') ||
        spoken.includes('मौसम') ||
        spoken.includes('barish') ||
        spoken.includes('बारिश') ||
        spoken.includes('rain') ||
        spoken.includes('तापमान') ||
        spoken.includes('temperature')
      ) {
        speakWeatherForecast();
        return true;
      }
      return false;
    });

    return unregister;
  }, [registerActionHandler, speakWeatherForecast]);

  // Voice event bus listener
  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const handleVoiceAction = (e: any) => {
      const detail = e.detail;
      if (detail?.action === 'check_weather') {
        speakWeatherForecast();
      }
    };
    voiceEventBus.addEventListener('voice_action', handleVoiceAction as EventListener);
    return () => {
      voiceEventBus.removeEventListener('voice_action', handleVoiceAction as EventListener);
    };
  }, [speakWeatherForecast]);

  // Spray conditions calculation
  const currTemp = weatherData?.current.temperature ?? 28;
  const currWind = weatherData?.current.windSpeed ?? 10;
  const precip48 = weatherData?.advisory.precip48h ?? 0;
  const isHighWind = currWind > 15;
  const isRainRisk = precip48 > 2;
  const isHighHeat = currTemp > 35;
  const isOptimalSpray = !isHighWind && !isRainRisk && !isHighHeat;

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <div className="bg-white p-5 rounded-3xl shadow-sm border border-gray-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-bold text-[#4A943E] uppercase tracking-wider flex items-center gap-1.5">
            <span>⛅</span> Open-Meteo & IMD Hyperlocal Live Meteorological Station
          </span>
          <h1 className="text-2xl font-black text-[#186049]">
            {t('weatherTitle', 'Weather Intelligence & Farm Advisories')}
          </h1>
          <p className="text-xs sm:text-sm text-gray-500 mt-0.5">
            {isHi
              ? 'स्थान चुनें अथवा तापमान व मौसम बदलकर कृषि सलाह और लीचिंग जोखिम का परीक्षण करें।'
              : 'Real-time satellite feeds, dynamic microclimate simulator, and ICAR spray safety models.'}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsSimulating(!isSimulating)}
            className={`px-4 py-2.5 rounded-2xl font-bold text-xs sm:text-sm transition flex items-center gap-2 shadow-sm ${
              isSimulating
                ? 'bg-amber-500 text-white hover:bg-amber-600 ring-2 ring-amber-300'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <span>⚡</span>
            <span>{isSimulating ? (isHi ? 'सिमुलेशन चालू' : 'Simulator Active') : (isHi ? 'तापमान/मौसम बदलें' : 'Simulate / Adjust')}</span>
          </button>

          <button
            onClick={speakWeatherForecast}
            disabled={!weatherData}
            className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-[#186049] text-white font-bold text-xs sm:text-sm shadow hover:bg-[#124b39] transition active:scale-95 disabled:opacity-50"
          >
            <span>🔊</span>
            <span>{t('listenReply', 'Listen to Weather')}</span>
          </button>
        </div>
      </div>

      {/* Location Selector Bar */}
      <div className="bg-white p-4 rounded-3xl shadow-sm border border-gray-100 space-y-3">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
          {/* Search Input */}
          <div className="relative flex-1">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400">🔍</span>
            <input
              type="text"
              value={searchQuery}
              onChange={handleSearchChange}
              onFocus={() => searchQuery.length >= 2 && setShowDropdown(true)}
              placeholder={isHi ? 'कोई भी जिला या शहर खोजें (उदा. Ludhiana, Pune, Indore...)' : 'Search any district or city (e.g. Ludhiana, Pune, Indore, Karnal)...'}
              className="w-full pl-10 pr-4 py-2.5 text-xs sm:text-sm border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#186049] bg-gray-50 focus:bg-white"
            />
            {isSearching && (
              <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs text-gray-400 animate-spin">
                ⏳
              </span>
            )}

            {/* Dropdown Results */}
            {showDropdown && searchResults.length > 0 && (
              <div className="absolute z-20 left-0 right-0 mt-1 bg-white border border-gray-200 rounded-2xl shadow-xl overflow-hidden divide-y divide-gray-100">
                {searchResults.map((res) => (
                  <button
                    key={res.id}
                    onClick={() =>
                      selectLocation({
                        name: `${res.name}${res.admin1 ? `, ${res.admin1}` : ''} (${res.country || 'India'})`,
                        lat: res.latitude,
                        lon: res.longitude,
                      })
                    }
                    className="w-full px-4 py-2.5 text-left text-xs sm:text-sm hover:bg-emerald-50 flex items-center justify-between text-gray-800"
                  >
                    <div>
                      <span className="font-bold">{res.name}</span>
                      <span className="text-xs text-gray-500 ml-2">
                        {res.admin1 ? `${res.admin1}, ` : ''}{res.country}
                      </span>
                    </div>
                    <span className="text-[11px] text-gray-400 font-mono">
                      {res.latitude.toFixed(2)}°, {res.longitude.toFixed(2)}°
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* GPS Button */}
          <button
            onClick={handleUseGPS}
            className="px-4 py-2.5 rounded-2xl bg-emerald-50 text-[#186049] border border-emerald-200 font-bold text-xs sm:text-sm hover:bg-emerald-100 transition flex items-center justify-center gap-1.5 whitespace-nowrap"
          >
            <span>📍</span>
            <span>{isHi ? 'मेरा स्थान (GPS)' : 'Use GPS'}</span>
          </button>
        </div>

        {/* Quick District Presets */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
          <span className="text-gray-400 font-bold whitespace-nowrap mr-1">
            {isHi ? 'प्रमुख कृषि क्षेत्र:' : 'Agri Hubs:'}
          </span>
          {PRESET_HUBS.map((hub) => (
            <button
              key={hub.name}
              onClick={() =>
                selectLocation({
                  name: hub.fullName,
                  lat: hub.lat,
                  lon: hub.lon,
                })
              }
              className={`px-3 py-1.5 rounded-xl font-semibold whitespace-nowrap transition border ${
                selectedLocation.name.includes(hub.name)
                  ? 'bg-[#186049] text-white border-[#186049]'
                  : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'
              }`}
            >
              🌾 {hub.name}
            </button>
          ))}
        </div>
      </div>

      {/* ─────────────────── WEATHER & TEMPERATURE SIMULATOR ─────────────────── */}
      {isSimulating && (
        <div className="p-5 rounded-3xl bg-amber-50/80 border-2 border-amber-300 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-amber-200 pb-3">
            <div>
              <span className="text-xs font-black uppercase text-amber-800 tracking-wider flex items-center gap-1.5">
                <span>⚡</span> {isHi ? 'सूक्ष्म जलवायु सिमुलेटर (Microclimate Simulator)' : 'Interactive Weather & Temperature Simulator'}
              </span>
              <p className="text-xs text-amber-900 mt-0.5">
                {isHi
                  ? 'स्लाइडर हिलाकर तापमान, बारिश या हवा बदलें और देखें कि फसल स्प्रे, सिंचाई और लीचिंग पर क्या प्रभाव पड़ता है।'
                  : 'Adjust temperature, rainfall, or wind sliders to simulate heatwave, heavy rain, or spray conditions.'}
              </p>
            </div>

            <button
              onClick={resetSimulation}
              className="px-3.5 py-1.5 rounded-xl bg-white text-amber-900 border border-amber-300 text-xs font-bold hover:bg-amber-100 transition self-start sm:self-auto"
            >
              🔄 {isHi ? 'लाइव मौसम पर रीसेट करें' : 'Reset to Live Feed'}
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            {/* Temp Slider */}
            <div className="p-3.5 rounded-2xl bg-white border border-amber-200 space-y-2">
              <div className="flex justify-between items-center text-xs">
                <span className="font-bold text-gray-700">🌡️ {isHi ? 'तापमान (Temperature)' : 'Temperature'}:</span>
                <span className="font-black text-amber-900 text-sm">{simTemp}°C</span>
              </div>
              <input
                type="range"
                min="10"
                max="48"
                step="1"
                value={simTemp}
                onChange={(e) => setSimTemp(Number(e.target.value))}
                className="w-full accent-amber-600 cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-gray-400">
                <span>10°C (शीत)</span>
                <span>48°C (लू / Heatwave)</span>
              </div>
            </div>

            {/* Rain Slider */}
            <div className="p-3.5 rounded-2xl bg-white border border-amber-200 space-y-2">
              <div className="flex justify-between items-center text-xs">
                <span className="font-bold text-gray-700">🌧️ {isHi ? 'बारिश (Rainfall)' : 'Rainfall (48h)'}:</span>
                <span className="font-black text-blue-700 text-sm">{simRain} mm</span>
              </div>
              <input
                type="range"
                min="0"
                max="80"
                step="2"
                value={simRain}
                onChange={(e) => setSimRain(Number(e.target.value))}
                className="w-full accent-blue-600 cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-gray-400">
                <span>0 mm (सूखा)</span>
                <span>80 mm (मूसलाधार)</span>
              </div>
            </div>

            {/* Humidity Slider */}
            <div className="p-3.5 rounded-2xl bg-white border border-amber-200 space-y-2">
              <div className="flex justify-between items-center text-xs">
                <span className="font-bold text-gray-700">💧 {isHi ? 'आर्द्रता (Humidity)' : 'Humidity'}:</span>
                <span className="font-black text-cyan-800 text-sm">{simHumidity}%</span>
              </div>
              <input
                type="range"
                min="15"
                max="98"
                step="1"
                value={simHumidity}
                onChange={(e) => setSimHumidity(Number(e.target.value))}
                className="w-full accent-cyan-600 cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-gray-400">
                <span>15% (शुष्क)</span>
                <span>98% (फफूंद खतरा)</span>
              </div>
            </div>

            {/* Wind Slider */}
            <div className="p-3.5 rounded-2xl bg-white border border-amber-200 space-y-2">
              <div className="flex justify-between items-center text-xs">
                <span className="font-bold text-gray-700">💨 {isHi ? 'हवा (Wind Speed)' : 'Wind Speed'}:</span>
                <span className="font-black text-emerald-800 text-sm">{simWind} km/h</span>
              </div>
              <input
                type="range"
                min="2"
                max="50"
                step="1"
                value={simWind}
                onChange={(e) => setSimWind(Number(e.target.value))}
                className="w-full accent-emerald-600 cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-gray-400">
                <span>2 km/h (शांत)</span>
                <span>50 km/h (आंधी)</span>
              </div>
            </div>
          </div>

          {/* Fertilizer Toggle in simulation */}
          <div className="flex items-center justify-between p-3 rounded-2xl bg-white border border-amber-200 text-xs">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={simUrea}
                onChange={(e) => setSimUrea(e.target.checked)}
                className="accent-amber-600 h-4 w-4 rounded cursor-pointer"
              />
              <span className="font-bold text-gray-800">
                {isHi ? 'यूरिया हाल ही में डाला गया है (नाइट्रेट लीचिंग जोखिम परीक्षण)' : 'Recent Urea application (Test Nitrate flush risk)'}
              </span>
            </label>
            <span className="text-[11px] text-gray-500 hidden sm:inline">
              {simUrea ? 'Multiplier: 1.35x applied to LVI' : 'Normal soil nitrogen model'}
            </span>
          </div>
        </div>
      )}

      {/* Loading Indicator */}
      {loading && !weatherData && (
        <div className="p-8 text-center bg-white rounded-3xl border border-gray-100">
          <div className="inline-block animate-spin text-3xl mb-2">⏳</div>
          <p className="text-sm font-semibold text-gray-600">
            {isHi ? 'लाइव मौसम डेटा लोड हो रहा है...' : 'Fetching live satellite & radar weather data...'}
          </p>
        </div>
      )}

      {weatherData && (
        <>
          {/* Advisory Banner from Weather_Logic */}
          <div
            className={`p-4 rounded-2xl border-2 flex items-start gap-3 transition ${
              weatherData.advisory.status === 'HOLD'
                ? 'bg-red-50 border-red-300 text-red-900'
                : weatherData.advisory.status === 'SWITCH_METHOD'
                ? 'bg-amber-50 border-amber-300 text-amber-900'
                : 'bg-emerald-50 border-emerald-300 text-emerald-900'
            }`}
          >
            <span className="text-2xl mt-0.5">
              {weatherData.advisory.status === 'HOLD' ? '🛑' : weatherData.advisory.status === 'SWITCH_METHOD' ? '⚠️' : '✅'}
            </span>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="text-xs font-black uppercase tracking-wider">
                  {isHi ? 'मौसम आधारित सिंचाई सलाह' : 'Meteorological Irrigation Advisory'}
                </span>
                <span className="text-[10px] px-2 py-0.5 font-bold rounded-full bg-white/80 border">
                  {weatherData.advisory.status}
                </span>
                {isSimulating && (
                  <span className="text-[10px] px-2 py-0.5 font-bold rounded-full bg-amber-500 text-white">
                    SIMULATED
                  </span>
                )}
              </div>
              <p className="font-bold text-sm sm:text-base mt-1">
                {isHi ? weatherData.advisory.summaryBannerHi : weatherData.advisory.summaryBanner}
              </p>
            </div>
          </div>

          {/* Hero: Current Conditions & Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {/* Today Card */}
            <div className="md:col-span-2 rounded-3xl bg-gradient-to-br from-[#186049] via-[#1d6b52] to-[#186049] p-6 text-white shadow-xl border-2 border-[#ECE8AF]/30 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between text-xs text-[#ECE8AF] font-bold uppercase tracking-wider">
                  <span>📍 {weatherData.location.name}</span>
                  <span className="bg-white/10 px-2 py-0.5 rounded-full">
                    {isSimulating ? '⚡ Custom Simulation' : 'Live IMD / Open-Meteo'}
                  </span>
                </div>

                <div className="mt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <div className="text-6xl font-black text-white tracking-tight">
                      {weatherData.current.temperature}°C
                    </div>
                    <div className="text-base font-semibold text-[#ECE8AF] mt-1">
                      {isHi ? weatherData.current.descriptionHi : weatherData.current.description}
                    </div>
                    <p className="text-xs text-white/80 mt-1 max-w-sm">
                      {isHi
                        ? 'हवा की गति और नमी को ध्यान में रखकर कीटनाशक छिड़काव और सिंचाई की योजना बनाएं।'
                        : 'Real-time ground station and satellite atmospheric readings.'}
                    </p>
                  </div>

                  <span className="text-7xl self-end sm:self-center">
                    {weatherData.current.icon}
                  </span>
                </div>
              </div>

              {/* Meteorological Metrics */}
              <div className="mt-6 pt-4 border-t border-white/20 grid grid-cols-4 gap-2 text-center text-xs">
                <div className="p-2 rounded-xl bg-white/10">
                  <span className="text-white/70 block text-[10px] uppercase">
                    {isHi ? 'नमी (Humidity)' : 'Humidity'}
                  </span>
                  <span className="font-extrabold text-sm">{weatherData.current.humidity}%</span>
                </div>
                <div className="p-2 rounded-xl bg-white/10">
                  <span className="text-white/70 block text-[10px] uppercase">
                    {isHi ? 'हवा की गति' : 'Wind Speed'}
                  </span>
                  <span className="font-extrabold text-sm">{weatherData.current.windSpeed} km/h</span>
                </div>
                <div className="p-2 rounded-xl bg-white/10">
                  <span className="text-white/70 block text-[10px] uppercase">
                    {isHi ? '48h वर्षा' : '48h Precip'}
                  </span>
                  <span className="font-extrabold text-sm">{weatherData.advisory.precip48h} mm</span>
                </div>
                <div className="p-2 rounded-xl bg-white/10">
                  <span className="text-white/70 block text-[10px] uppercase">
                    {isHi ? 'बारिश संभावना' : 'Rain Prob'}
                  </span>
                  <span className="font-extrabold text-sm text-[#ECE8AF]">
                    {weatherData.advisory.maxProb48h}%
                  </span>
                </div>
              </div>
            </div>

            {/* Action Alert Card: Leaching & Fungal Risk */}
            <div className="rounded-3xl bg-[#ECE8AF] p-5 text-[#186049] shadow-md border-2 border-[#B98327] flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-2xl">🌾</span>
                  <span className="text-xs font-black uppercase text-[#B98327] tracking-wider">
                    {isHi ? 'लीचिंग व फफूंद जोखिम' : 'Agronomic Risk Engine'}
                  </span>
                </div>

                {/* Leaching Vulnerability Index (LVI) */}
                <div className="mt-3 p-3 rounded-2xl bg-white/90 border border-[#B98327]/30">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-bold text-gray-700">Leaching Index (LVI):</span>
                    <span
                      className={`px-2 py-0.5 rounded-full font-black text-[11px] ${
                        weatherData.advisory.leachingVulnerabilityIndex.level === 'CRITICAL'
                          ? 'bg-red-600 text-white'
                          : weatherData.advisory.leachingVulnerabilityIndex.level === 'HIGH'
                          ? 'bg-orange-500 text-white'
                          : weatherData.advisory.leachingVulnerabilityIndex.level === 'MODERATE'
                          ? 'bg-yellow-400 text-black'
                          : 'bg-emerald-600 text-white'
                      }`}
                    >
                      {weatherData.advisory.leachingVulnerabilityIndex.lvi} / 100 ({weatherData.advisory.leachingVulnerabilityIndex.level})
                    </span>
                  </div>
                  <p className="text-[11px] text-gray-600 mt-1 leading-snug">
                    {isHi
                      ? weatherData.advisory.leachingVulnerabilityIndex.detailsHi
                      : weatherData.advisory.leachingVulnerabilityIndex.details}
                  </p>
                </div>

                {/* Fungal Disease Alert */}
                <div className="mt-3 p-3 rounded-2xl bg-white/90 border border-[#B98327]/30">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-bold text-gray-700">Fungal Spore Risk:</span>
                    <span className="px-2 py-0.5 rounded-full font-black text-[11px] bg-blue-100 text-blue-900">
                      {weatherData.advisory.fungalDiseaseRisk.riskLevel}
                    </span>
                  </div>
                  <p className="text-[11px] text-gray-600 mt-1 leading-snug">
                    {isHi
                      ? weatherData.advisory.fungalDiseaseRisk.recommendationHi
                      : weatherData.advisory.fungalDiseaseRisk.recommendation}
                  </p>
                </div>
              </div>

              <div className="mt-3 pt-2 text-[10px] text-gray-500 text-center">
                72h Humid Hours: {weatherData.advisory.fungalDiseaseRisk.hoursAbove80} hrs • Overcast: {weatherData.advisory.fungalDiseaseRisk.overcastHours} hrs
              </div>
            </div>
          </div>

          {/* ICAR Spray Advisory Window */}
          <div className="rounded-3xl bg-white p-5 shadow-sm border border-gray-100 flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="text-3xl">{isOptimalSpray ? '🌱' : '⚠️'}</span>
              <div>
                <span className="text-xs font-bold text-gray-400 uppercase">
                  {isHi ? 'आईसीएआर कीटनाशक छिड़काव खिड़की' : 'ICAR Pesticide Spray Window'}
                </span>
                <h4 className="text-base font-extrabold text-[#186049]">
                  {isOptimalSpray
                    ? (isHi ? 'छिड़काव के लिए आदर्श मौसम (हवा और तापमान अनुकूल)' : 'Optimal Spraying Conditions (Low drift hazard)')
                    : (isHi ? 'छिड़काव में सावधानी आवश्यक' : 'Adverse Spraying Window')}
                </h4>
                <p className="text-xs text-gray-500">
                  {isHighWind
                    ? (isHi ? 'हवा की गति 15 किमी/घंटा से अधिक है — दवा हवा में उड़ जाएगी।' : 'Wind speed exceeds 15 km/h; pesticide drift hazard is high.')
                    : isRainRisk
                    ? (isHi ? 'बारिश की संभावना है — दवा धुलने का खतरा है।' : 'Precipitation expected; chemical wash-off will occur.')
                    : isHighHeat
                    ? (isHi ? 'तापमान 35°C से अधिक है — केवल सुबह या शाम को छिड़काव करें।' : 'High heat causes rapid droplet evaporation; spray early morning or late evening.')
                    : (isHi ? 'शांत हवा और सामान्य तापमान, पत्तियों पर दवा अच्छी तरह टिकेगी।' : 'Favorable wind and ambient temperature ensures effective foliar retention.')}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 self-start md:self-auto text-xs font-bold">
              <span className={`px-3 py-1.5 rounded-xl ${isHighWind ? 'bg-red-100 text-red-800' : 'bg-emerald-50 text-emerald-800'}`}>
                💨 Wind: {currWind} km/h
              </span>
              <span className={`px-3 py-1.5 rounded-xl ${isRainRisk ? 'bg-red-100 text-red-800' : 'bg-emerald-50 text-emerald-800'}`}>
                🌧️ Rain: {precip48} mm
              </span>
              <span className={`px-3 py-1.5 rounded-xl ${isHighHeat ? 'bg-amber-100 text-amber-800' : 'bg-emerald-50 text-emerald-800'}`}>
                🌡️ Temp: {currTemp}°C
              </span>
            </div>
          </div>

          {/* 7-Day Farm Forecast Timeline */}
          <div className="rounded-3xl bg-white p-6 shadow-sm border border-gray-100">
            <h3 className="font-extrabold text-base text-[#186049] mb-4">
              {isHi ? '7-दिवसीय मौसम पूर्वानुमान एवं कृषि कार्ययोजना' : '7-Day Live Weather & Farm Advisory Timeline'}
            </h3>

            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-3">
              {weatherData.daily.slice(0, 7).map((w, idx) => (
                <div
                  key={idx}
                  className={`p-3.5 rounded-2xl border text-center transition flex flex-col justify-between ${
                    w.rainMm > 5 || w.rainProb > 50
                      ? 'bg-blue-50 border-blue-200 shadow-sm'
                      : 'bg-gray-50 border-gray-100 hover:bg-gray-100'
                  }`}
                >
                  <div>
                    <span className="text-xs font-bold text-gray-600 uppercase block">
                      {new Date(w.date).toLocaleDateString(isHi ? 'hi-IN' : 'en-US', {
                        weekday: 'short',
                        day: 'numeric',
                      })}
                    </span>
                    <div className="text-3xl my-2">{w.icon}</div>
                    <div className="text-[11px] font-semibold text-gray-600 line-clamp-1">
                      {isHi ? w.descriptionHi : w.description}
                    </div>
                    <div className="font-extrabold text-sm text-[#186049] mt-1">
                      {Math.round(w.tempMax)}° / {Math.round(w.tempMin)}°
                    </div>
                  </div>

                  <div className="mt-3 pt-2 border-t border-gray-200 text-[11px]">
                    {w.rainMm > 0 ? (
                      <span className="font-bold text-blue-700 block">
                        💧 {w.rainMm} mm ({w.rainProb}%)
                      </span>
                    ) : (
                      <span className="text-gray-400 block">{isHi ? 'वर्षा नहीं' : 'No rain'}</span>
                    )}
                    <span className="text-[10px] text-gray-500 mt-1 block">
                      💨 {Math.round(w.windSpeed)} km/h
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
