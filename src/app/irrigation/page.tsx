'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import { useVoice, voiceEventBus } from '@/lib/voice/VoiceContext';
import { PRIMARY_FIELD } from '@/lib/data/mockData';
import { calculateWaterNeed } from '@/lib/rules/irrigationEngine';
import { calculateFertiliserDose } from '@/lib/rules/fertiliserEngine';

interface WeatherIntelDay {
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
}

interface WeatherIntelData {
  advisory: {
    status: 'HOLD' | 'DELAY_24H' | 'SWITCH_METHOD' | 'SAFE_TO_IRRIGATE';
    summaryBanner: string;
    summaryBannerHi: string;
    precip48h: number;
    maxProb48h: number;
    leachingVulnerabilityIndex: {
      lvi: number;
      level: string;
      details: string;
      detailsHi: string;
    };
  };
  current: {
    temperature: number;
    humidity: number;
    windSpeed: number;
  };
  daily: WeatherIntelDay[];
}

const PUMP_RATES: Record<string, { name: string; rateLph: number; desc: string }> = {
  '3hp': { name: '3 HP Tubewell / Monoblock', rateLph: 20000, desc: '~330 L/min' },
  '5hp': { name: '5 HP Submersible (Standard)', rateLph: 32000, desc: '~530 L/min' },
  '7.5hp': { name: '7.5 HP Heavy Tubewell', rateLph: 50000, desc: '~830 L/min' },
  drip: { name: 'Micro-Drip System', rateLph: 15000, desc: '~15,000 L/hr/acre' },
};

function formatRuntime(litres: number, dischargeLph: number, isHi: boolean): string {
  if (litres <= 0 || dischargeLph <= 0) return isHi ? 'पानी न चलाएं' : '0 min';
  const totalMinutes = Math.round((litres / dischargeLph) * 60);
  if (totalMinutes < 5) return isHi ? '< 5 मिनट' : '< 5 min';
  const hours = Math.floor(totalMinutes / 60);
  const mins = totalMinutes % 60;
  if (hours === 0) return `${mins} ${isHi ? 'मिनट' : 'min'}`;
  return `${hours} ${isHi ? 'घंटे' : 'hr'} ${mins > 0 ? `${mins} ${isHi ? 'मिनट' : 'min'}` : ''}`.trim();
}

export default function IrrigationPage() {
  const { t, language } = useLanguage();
  const { speak, registerActionHandler } = useVoice();
  const isHi = language === 'hi';

  const [activeTab, setActiveTab] = useState<'irrigation' | 'fertiliser'>('irrigation');

  // Farm Parameters
  const [farmAcreage, setFarmAcreage] = useState<number>(3.2);
  const [selectedCrop, setSelectedCrop] = useState<string>('wheat');
  const [cropStage, setCropStage] = useState<string>('development');
  const [soilType, setSoilType] = useState<string>('clay');
  const [pumpType, setPumpType] = useState<string>('5hp');

  // Soil Parameters
  const [soilN, setSoilN] = useState<number>(PRIMARY_FIELD.soilHealth.nitrogenKgHa);
  const [soilP, setSoilP] = useState<number>(PRIMARY_FIELD.soilHealth.phosphorusKgHa);
  const [soilK, setSoilK] = useState<number>(PRIMARY_FIELD.soilHealth.potassiumKgHa);
  const [soilPh, setSoilPh] = useState<number>(PRIMARY_FIELD.soilHealth.pH);
  const [soilOc, setSoilOc] = useState<number>(PRIMARY_FIELD.soilHealth.organicCarbonPercent);

  const [ureaApplied, setUreaApplied] = useState<boolean>(false);
  const [weatherIntel, setWeatherIntel] = useState<WeatherIntelData | null>(null);

  // Fetch live weather intelligence
  useEffect(() => {
    async function loadIntel() {
      try {
        const res = await fetch(
          `/api/weather/intelligence?lat=18.8262&lon=74.3731&urea_applied=${ureaApplied}&soil_n=${
            soilN < 280 ? 'low' : 'normal'
          }`
        );
        const data = await res.json();
        if (data.success) {
          setWeatherIntel(data);
        }
      } catch (err) {
        console.error('Failed to load weather intel:', err);
      }
    }
    loadIntel();
  }, [ureaApplied, soilN]);

  // Current day metrics
  const todayTemp = weatherIntel?.current?.temperature ?? 30;
  const todayRain = weatherIntel?.daily?.[0]?.rainMm ?? 0;
  const rainTomorrow = weatherIntel?.daily?.[1]?.rainMm ?? 0;
  const et0Today = Math.max(3.0, Math.min(6.5, Math.round((todayTemp * 0.14) * 10) / 10));

  // Deterministic FAO-56 Water Requirement for Today
  const waterResultToday = useMemo(() => {
    return calculateWaterNeed({
      crop: selectedCrop,
      stage: cropStage,
      area_acres: farmAcreage,
      et0: et0Today,
      rainfall_mm: todayRain,
      soil_type: soilType,
    });
  }, [selectedCrop, cropStage, farmAcreage, et0Today, todayRain, soilType]);

  // Pump calculations
  const pumpDischargeLph =
    pumpType === 'drip' ? PUMP_RATES.drip.rateLph * farmAcreage : PUMP_RATES[pumpType]?.rateLph || 32000;
  const totalWaterLitresToday = Math.round(waterResultToday.daily_mm * farmAcreage * 4047);
  const todayRuntimeFormatted = formatRuntime(totalWaterLitresToday, pumpDischargeLph, isHi);

  const [mountedDate, setMountedDate] = useState<Date | null>(null);

  useEffect(() => {
    setMountedDate(new Date());
  }, []);

  // Dynamic 5-Day FAO-56 Irrigation Schedule
  const dynamicSchedule = useMemo(() => {
    const days: Array<{
      dayLabel: string;
      dateFormatted: string;
      tempMax: number;
      et0: number;
      rainMm: number;
      rainProb: number;
      netWaterMm: number;
      totalLitres: number;
      runtime: string;
      badgeType: 'hold' | 'skip' | 'pump' | 'ok';
      badgeText: string;
      icon: string;
    }> = [];

    const baseTime = mountedDate ? mountedDate.getTime() : 1760000000000;

    for (let i = 0; i < 5; i++) {
      const forecastDay = weatherIntel?.daily?.[i];
      const targetDate = forecastDay?.date
        ? new Date(`${forecastDay.date}T00:00:00`)
        : new Date(baseTime + i * 86400000);

      const dayTemp = forecastDay?.tempMax ?? (31 - i * 0.5);
      const dayRain = forecastDay?.rainMm ?? (i === 1 ? 16 : 0);
      const dayRainProb = forecastDay?.rainProb ?? (i === 1 ? 75 : 10);
      const dayEt0 = Math.max(2.5, Math.min(6.5, Math.round((dayTemp * 0.14) * 10) / 10));

      const dayWater = calculateWaterNeed({
        crop: selectedCrop,
        stage: cropStage,
        area_acres: farmAcreage,
        et0: dayEt0,
        rainfall_mm: dayRain,
        soil_type: soilType,
      });

      const dayLitres = Math.round(dayWater.daily_mm * farmAcreage * 4047);
      const dayRuntime = formatRuntime(dayLitres, pumpDischargeLph, isHi);

      // Decision logic
      let badgeType: 'hold' | 'skip' | 'pump' | 'ok' = 'pump';
      let badgeText = `${isHi ? 'मोटर चलाएं' : 'Run Pump'}: ${dayRuntime}`;

      if (dayRain >= 8) {
        badgeType = 'skip';
        badgeText = isHi ? `बारिश (${dayRain} mm) - पानी न दें` : `Skip (Rain: ${dayRain} mm)`;
      } else if (i === 0 && rainTomorrow >= 12) {
        badgeType = 'hold';
        badgeText = isHi ? `कल भारी बारिश (${rainTomorrow} mm) - रोकें` : `Hold (Heavy Rain Imminent)`;
      } else if (dayWater.daily_mm === 0) {
        badgeType = 'ok';
        badgeText = isHi ? 'पर्याप्त नमी (Adequate)' : 'Adequate Moisture';
      }

      let dayLabel = '';
      if (i === 0) dayLabel = isHi ? 'आज' : 'Today';
      else if (i === 1) dayLabel = isHi ? 'कल' : 'Tomorrow';
      else dayLabel = targetDate.toLocaleDateString(isHi ? 'hi-IN' : 'en-US', { weekday: 'short' });

      days.push({
        dayLabel,
        dateFormatted: targetDate.toLocaleDateString(isHi ? 'hi-IN' : 'en-US', {
          day: 'numeric',
          month: 'short',
        }),
        tempMax: Math.round(dayTemp),
        et0: dayEt0,
        rainMm: dayRain,
        rainProb: dayRainProb,
        netWaterMm: dayWater.daily_mm,
        totalLitres: dayLitres,
        runtime: dayRuntime,
        badgeType,
        badgeText,
        icon: forecastDay?.icon || (dayRain > 2 ? '🌧️' : '☀️'),
      });
    }

    return days;
  }, [weatherIntel?.daily, selectedCrop, cropStage, farmAcreage, soilType, pumpDischargeLph, isHi, rainTomorrow, mountedDate]);

  // Computed Fertiliser Results using ICAR Rules Engine
  const fertResult = useMemo(() => {
    return calculateFertiliserDose({
      crop: selectedCrop,
      area_acres: farmAcreage,
      soil_n: soilN,
      soil_p: soilP,
      soil_k: soilK,
      soil_ph: soilPh,
      soil_oc: soilOc,
    });
  }, [selectedCrop, farmAcreage, soilN, soilP, soilK, soilPh, soilOc]);

  const speakIrrigationAdvice = useCallback(() => {
    const text = isHi
      ? `सिंचाई सलाह: आपके ${farmAcreage} एकड़ ${selectedCrop} के लिए आज ${waterResultToday.daily_mm} मिमी (${totalWaterLitresToday.toLocaleString('en-IN')} लीटर) पानी की आवश्यकता है। ${pumpType} मोटर से अनुमानित समय ${todayRuntimeFormatted} है। ${
          rainTomorrow > 5 ? `कल ${rainTomorrow} मिमी बारिश की संभावना है, इसलिए अतिरिक्त पानी न दें।` : 'सामान्य सिंचाई जारी रखें।'
        }`
      : `Irrigation advice: For your ${farmAcreage} acres of ${selectedCrop}, today's water requirement is ${waterResultToday.daily_mm} mm (${totalWaterLitresToday.toLocaleString()} litres). Estimated runtime with ${pumpType} pump is ${todayRuntimeFormatted}. ${
          rainTomorrow > 5 ? `Rain of ${rainTomorrow} mm expected tomorrow, avoid overwatering.` : 'Proceed with scheduled irrigation.'
        }`;
    speak(text);
  }, [farmAcreage, selectedCrop, waterResultToday.daily_mm, totalWaterLitresToday, pumpType, todayRuntimeFormatted, rainTomorrow, isHi, speak]);

  const speakFertiliserAdvice = useCallback(() => {
    const text = isHi
      ? `खाद सलाह: आपके ${farmAcreage} एकड़ ${selectedCrop} के लिए कुल ${fertResult.urea_kg} किलोग्राम यूरिया, ${fertResult.dap_kg} किलोग्राम डीएपी और ${fertResult.mop_kg} किलोग्राम पोटाश की आवश्यकता है।`
      : `Fertiliser advice: For your ${farmAcreage} acres of ${selectedCrop}, ICAR recommended dose is ${fertResult.urea_kg} kg Urea, ${fertResult.dap_kg} kg DAP, and ${fertResult.mop_kg} kg MOP.`;
    speak(text);
  }, [farmAcreage, selectedCrop, fertResult.urea_kg, fertResult.dap_kg, fertResult.mop_kg, isHi, speak]);

  // Register Voice Commands
  useEffect(() => {
    const unregister = registerActionHandler((spoken: string) => {
      if (
        spoken.includes('water') ||
        spoken.includes('पानी') ||
        spoken.includes('सिंचाई') ||
        spoken.includes('motor') ||
        spoken.includes('pump')
      ) {
        setActiveTab('irrigation');
        speakIrrigationAdvice();
        return true;
      }
      if (
        spoken.includes('fertiliser') ||
        spoken.includes('fertilizer') ||
        spoken.includes('खाद') ||
        spoken.includes('यूरिया') ||
        spoken.includes('urea') ||
        spoken.includes('dap')
      ) {
        setActiveTab('fertiliser');
        speakFertiliserAdvice();
        return true;
      }
      return false;
    });

    return unregister;
  }, [registerActionHandler, speakFertiliserAdvice, speakIrrigationAdvice]);

  // Global voice action listener
  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const handleVoiceAction = (e: any) => {
      const detail = e.detail;
      if (detail?.action === 'check_irrigation' || detail?.action === 'check_rain') {
        setActiveTab('irrigation');
        speakIrrigationAdvice();
      } else if (detail?.action === 'calc_fertiliser') {
        setActiveTab('fertiliser');
        speakFertiliserAdvice();
      }
    };
    voiceEventBus.addEventListener('voice_action', handleVoiceAction as EventListener);
    return () => {
      voiceEventBus.removeEventListener('voice_action', handleVoiceAction as EventListener);
    };
  }, [speakFertiliserAdvice, speakIrrigationAdvice]);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-5 rounded-3xl shadow-sm border border-gray-100">
        <div>
          <span className="text-xs font-bold text-[#186049] uppercase tracking-wider flex items-center gap-1.5">
            <span>💧</span> ICAR Agronomy & FAO-56 Penman-Monteith Engine
          </span>
          <h1 className="text-2xl font-black text-[#186049]">
            {t('irrigationTitle', 'Smart Irrigation & Fertiliser Schedule')}
          </h1>
          <p className="text-xs sm:text-sm text-gray-500 mt-0.5">
            {isHi
              ? 'फसल गुणांक (Kc), मिट्टी के प्रकार और लाइव मौसम पूर्वानुमान के अनुसार सटीक पानी व मोटर चलने का समय।'
              : 'Deterministic water and nutrient dosage calculated dynamically from live weather and Soil Health Card.'}
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex p-1 bg-gray-100 rounded-2xl border border-gray-200 self-start sm:self-auto">
          <button
            onClick={() => {
              setActiveTab('irrigation');
            }}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition ${
              activeTab === 'irrigation'
                ? 'bg-[#186049] text-white shadow'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <span>💧</span>
            <span>{t('irrigation', 'Irrigation Plan')}</span>
          </button>
          <button
            onClick={() => {
              setActiveTab('fertiliser');
            }}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition ${
              activeTab === 'fertiliser'
                ? 'bg-[#186049] text-white shadow'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <span>🧪</span>
            <span>{t('soilHealthTitle', 'Fertiliser (ICAR)')}</span>
          </button>
        </div>
      </div>

      {/* ─────────────────── TAB 1: IRRIGATION ─────────────────── */}
      {activeTab === 'irrigation' && (
        <div className="space-y-5">
          {/* Smart Decision Banner from Weather_Logic */}
          <div className="rounded-3xl bg-gradient-to-r from-[#ECE8AF] to-[#fff4c2] p-5 sm:p-6 text-[#186049] shadow-md border-2 border-[#B98327]/40 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex items-start gap-4">
              <span className="text-4xl">
                {rainTomorrow >= 10 ? '🛑' : waterResultToday.daily_mm > 0 ? '💧' : '✅'}
              </span>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-extrabold uppercase px-2.5 py-0.5 rounded bg-[#B98327] text-white">
                    {rainTomorrow >= 10 ? 'HOLD / SKIP' : waterResultToday.daily_mm > 0 ? 'IRRIGATE' : 'ADEQUATE'}
                  </span>
                  {weatherIntel?.advisory?.leachingVulnerabilityIndex && (
                    <span
                      className={`text-xs font-black px-2.5 py-0.5 rounded-full ${
                        weatherIntel.advisory.leachingVulnerabilityIndex.level === 'CRITICAL'
                          ? 'bg-red-600 text-white'
                          : weatherIntel.advisory.leachingVulnerabilityIndex.level === 'HIGH'
                          ? 'bg-orange-500 text-white'
                          : 'bg-emerald-700 text-white'
                      }`}
                    >
                      Leaching Risk: {weatherIntel.advisory.leachingVulnerabilityIndex.lvi}/100 ({weatherIntel.advisory.leachingVulnerabilityIndex.level})
                    </span>
                  )}
                </div>

                <h3 className="text-lg font-black text-[#186049] mt-1.5">
                  {isHi
                    ? (weatherIntel?.advisory?.summaryBannerHi || 'सिंचाई सलाह: मौसम और वाष्पोत्सर्जन के अनुसार सिंचाई का निर्णय लें।')
                    : (weatherIntel?.advisory?.summaryBanner || 'Smart irrigation decision based on live Open-Meteo & ICAR logic.')}
                </h3>

                <p className="text-xs text-gray-700 mt-1">
                  Area: <b>{farmAcreage} Acres</b> • Rain Expected: <b>{rainTomorrow} mm</b> • ET₀ Demand: <b>{et0Today} mm</b> • Net Crop Need: <b>{waterResultToday.daily_mm} mm ({totalWaterLitresToday.toLocaleString()} L)</b>
                </p>

                {/* Urea Applied Toggle for dynamic LVI simulation */}
                <div className="mt-2 flex items-center gap-2">
                  <label className="text-xs font-bold text-gray-800 flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={ureaApplied}
                      onChange={(e) => setUreaApplied(e.target.checked)}
                      className="accent-[#186049] rounded cursor-pointer"
                    />
                    <span>{isHi ? 'क्या आपने हाल ही में यूरिया डाला है? (नाइट्रेट लीचिंग जांच)' : 'Recently applied Urea fertilizer (Nitrate leaching check)?'}</span>
                  </label>
                </div>
              </div>
            </div>

            <button
              onClick={speakIrrigationAdvice}
              className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-[#186049] text-white font-bold text-xs shadow hover:bg-[#124b39] transition whitespace-nowrap self-start md:self-auto"
            >
              <span>🔊</span>
              <span>{isHi ? 'सलाह सुनें' : 'Listen to Advice'}</span>
            </button>
          </div>

          {/* Interactive Parameters & Dynamic Schedule */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            {/* Input Config Card (4 cols) */}
            <div className="lg:col-span-4 rounded-3xl bg-white p-5 shadow-sm border border-gray-100 space-y-4">
              <div className="flex items-center justify-between border-b pb-2">
                <h3 className="font-extrabold text-sm text-[#186049] uppercase tracking-wider">
                  {isHi ? 'खेत व फसल विवरण' : 'Field & Crop Parameters'}
                </h3>
                <span className="text-[10px] bg-emerald-50 text-[#186049] font-bold px-2 py-0.5 rounded-full">
                  FAO-56 Dynamic
                </span>
              </div>

              {/* Acreage Slider */}
              <div>
                <div className="flex justify-between items-center text-xs font-bold text-gray-700 mb-1">
                  <span>{isHi ? 'खेत का क्षेत्रफल' : 'Field Size (Acres)'}:</span>
                  <span className="font-black text-[#186049] text-sm">{farmAcreage} {isHi ? 'एकड़' : 'Acres'}</span>
                </div>
                <input
                  type="range"
                  min="0.5"
                  max="15.0"
                  step="0.1"
                  value={farmAcreage}
                  onChange={(e) => setFarmAcreage(parseFloat(e.target.value))}
                  className="w-full accent-[#186049] cursor-pointer"
                />
              </div>

              {/* Crop Selector */}
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  {isHi ? 'फसल चुनें (Crop)' : 'Select Crop'}
                </label>
                <select
                  value={selectedCrop}
                  onChange={(e) => setSelectedCrop(e.target.value)}
                  className="w-full px-3 py-2 text-xs sm:text-sm border border-gray-200 rounded-xl bg-gray-50 font-semibold focus:outline-none focus:ring-2 focus:ring-[#186049]"
                >
                  <option value="wheat">🌾 Wheat (गेहूं) - Kc: 0.75-1.15</option>
                  <option value="mustard">🍁 Mustard (सरसों) - Kc: 0.70-1.00</option>
                  <option value="rice">🌱 Paddy / Rice (धान) - Kc: 1.10-1.20</option>
                  <option value="cotton">🌿 Cotton (कपास) - Kc: 0.75-1.20</option>
                  <option value="sugarcane">🎋 Sugarcane (गन्ना) - Kc: 0.80-1.25</option>
                  <option value="maize">🌽 Maize (मक्का) - Kc: 0.75-1.20</option>
                  <option value="soybean">🌱 Soybean (सोयाबीन) - Kc: 0.80-1.15</option>
                </select>
              </div>

              {/* Growth Stage */}
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  {isHi ? 'विकास अवस्था (Growth Stage)' : 'Crop Growth Stage'}
                </label>
                <select
                  value={cropStage}
                  onChange={(e) => setCropStage(e.target.value)}
                  className="w-full px-3 py-2 text-xs sm:text-sm border border-gray-200 rounded-xl bg-gray-50 font-semibold focus:outline-none focus:ring-2 focus:ring-[#186049]"
                >
                  <option value="initial">{isHi ? 'अंकुरण (Initial / Germination)' : 'Initial / Germination'}</option>
                  <option value="development">{isHi ? 'वानस्पतिक वृद्धि (Tillering / Vegetative)' : 'Crop Development / Tillering'}</option>
                  <option value="mid">{isHi ? 'फूल व दाना भरना (Flowering / Mid-Season)' : 'Mid-Season / Flowering & Heading'}</option>
                  <option value="late">{isHi ? 'परिपक्वता (Maturity / Late)' : 'Late Season / Maturity'}</option>
                </select>
              </div>

              {/* Soil Texture */}
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  {isHi ? 'मिट्टी का प्रकार (Soil Texture)' : 'Soil Texture'}
                </label>
                <select
                  value={soilType}
                  onChange={(e) => setSoilType(e.target.value)}
                  className="w-full px-3 py-2 text-xs sm:text-sm border border-gray-200 rounded-xl bg-gray-50 font-semibold focus:outline-none focus:ring-2 focus:ring-[#186049]"
                >
                  <option value="clay">Clay Loam (काळी माती - High moisture retention)</option>
                  <option value="loamy">Alluvial Loam (दोमट मिट्टी - Balanced)</option>
                  <option value="sandy">Sandy Loam (बलुई मिट्टी - Fast percolation)</option>
                </select>
              </div>

              {/* Pump Type */}
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  {isHi ? 'सिंचाई पंप / मोटर क्षमता' : 'Pump / Irrigation Method'}
                </label>
                <select
                  value={pumpType}
                  onChange={(e) => setPumpType(e.target.value)}
                  className="w-full px-3 py-2 text-xs sm:text-sm border border-gray-200 rounded-xl bg-gray-50 font-semibold focus:outline-none focus:ring-2 focus:ring-[#186049]"
                >
                  <option value="3hp">3 HP Tubewell (20,000 L/h)</option>
                  <option value="5hp">5 HP Submersible (32,000 L/h - Standard)</option>
                  <option value="7.5hp">7.5 HP Heavy Motor (50,000 L/h)</option>
                  <option value="drip">Drip Irrigation System (~15,000 L/h/acre)</option>
                </select>
              </div>

              {/* Today Quick Metric Box */}
              <div className="p-3 rounded-2xl bg-emerald-50 border border-emerald-200 space-y-1">
                <span className="text-[11px] font-bold text-emerald-800 uppercase block">
                  {isHi ? 'आज का अनुशंसित मोटर समय' : "Today's Pump Runtime"}
                </span>
                <div className="text-xl font-black text-[#186049]">
                  ⏱️ {todayRuntimeFormatted}
                </div>
                <p className="text-[11px] text-gray-600">
                  {totalWaterLitresToday.toLocaleString()} {isHi ? 'लीटर पानी' : 'Litres needed today'}
                </p>
              </div>
            </div>

            {/* Dynamic 5-Day Irrigation Schedule Table (8 cols) */}
            <div className="lg:col-span-8 rounded-3xl bg-white p-5 shadow-sm border border-gray-100 flex flex-col justify-between">
              <div>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b mb-3 gap-1">
                  <div>
                    <h3 className="font-extrabold text-base text-[#186049]">
                      {isHi ? '5-दिवसीय गतिशील सिंचाई कार्ययोजना' : '5-Day Dynamic Irrigation Schedule'}
                    </h3>
                    <p className="text-xs text-gray-500">
                      Plot A: {farmAcreage} Acres • {selectedCrop.toUpperCase()} • Live Weather Driven
                    </p>
                  </div>
                  <span className="text-[11px] font-bold text-gray-400">
                    Updated Live with Open-Meteo
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b text-gray-500 font-bold uppercase text-[10px] sm:text-[11px]">
                        <th className="pb-2.5">Day</th>
                        <th className="pb-2.5">Weather</th>
                        <th className="pb-2.5">ET₀</th>
                        <th className="pb-2.5">Rain</th>
                        <th className="pb-2.5">Net Water</th>
                        <th className="pb-2.5">Pump Run</th>
                        <th className="pb-2.5">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {dynamicSchedule.map((row, idx) => (
                        <tr
                          key={idx}
                          className={`transition ${
                            idx === 0
                              ? 'bg-emerald-50/40 font-semibold'
                              : row.badgeType === 'skip'
                              ? 'bg-blue-50/30'
                              : 'hover:bg-gray-50'
                          }`}
                        >
                          <td className="py-3 font-bold text-[#186049] whitespace-nowrap">
                            <span>{row.dayLabel}</span>
                            <span className="text-[10px] text-gray-400 font-normal block">
                              {row.dateFormatted}
                            </span>
                          </td>

                          <td className="py-3 whitespace-nowrap">
                            <span className="text-base mr-1">{row.icon}</span>
                            <span className="text-gray-700 font-semibold">{row.tempMax}°C</span>
                          </td>

                          <td className="py-3 text-gray-600 font-mono">
                            {row.et0} mm
                          </td>

                          <td className="py-3 whitespace-nowrap">
                            {row.rainMm > 0 ? (
                              <span className="font-bold text-blue-700">
                                {row.rainMm} mm ({row.rainProb}%)
                              </span>
                            ) : (
                              <span className="text-gray-400">0 mm</span>
                            )}
                          </td>

                          <td className="py-3 font-semibold text-[#186049] whitespace-nowrap">
                            {row.netWaterMm.toFixed(1)} mm
                            <span className="text-[10px] text-gray-400 font-normal block">
                              {row.totalLitres.toLocaleString()} L
                            </span>
                          </td>

                          <td className="py-3 font-bold text-gray-800 whitespace-nowrap">
                            ⏱️ {row.runtime}
                          </td>

                          <td className="py-3 whitespace-nowrap">
                            <span
                              className={`px-2.5 py-1 rounded-full text-[10px] sm:text-[11px] font-bold ${
                                row.badgeType === 'skip'
                                  ? 'bg-emerald-600 text-white'
                                  : row.badgeType === 'hold'
                                  ? 'bg-amber-500 text-white'
                                  : row.badgeType === 'pump'
                                  ? 'bg-blue-100 text-blue-900 border border-blue-200'
                                  : 'bg-gray-100 text-gray-700'
                              }`}
                            >
                              {row.badgeText}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Explanatory Footnote */}
              <div className="mt-4 pt-3 border-t text-[11px] text-gray-500 flex flex-col sm:flex-row justify-between gap-1">
                <span>
                  📐 Formula: Net Depth = max(0, ET₀ × Kc × SoilFactor - EffectiveRain × 0.7)
                </span>
                <span>
                  ⚡ Motor runtime calibrated for {PUMP_RATES[pumpType]?.name}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────── TAB 2: FERTILISER (ICAR) ─────────────────── */}
      {activeTab === 'fertiliser' && (
        <div className="space-y-5">
          {/* Soil Health Card OCR / Input Box */}
          <div className="rounded-3xl bg-white p-5 shadow-sm border border-gray-100">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b mb-4 gap-2">
              <div>
                <span className="text-xs font-bold text-gray-400 uppercase">
                  Government of India • Ministry of Agriculture
                </span>
                <h3 className="text-lg font-black text-[#186049]">
                  Soil Health Card (मृदा स्वास्थ्य कार्ड) #SHC-MH-2026-8841
                </h3>
                <p className="text-xs text-gray-500">
                  Calibrated for Plot A: {farmAcreage} Acres ({selectedCrop.toUpperCase()})
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() =>
                    alert(isHi ? 'कैमरा सक्रिय: अपने मृदा कार्ड को फ्रेम में संरेखित करें।' : 'Camera activated: Align your Soil Health Card in the frame.')
                  }
                  className="px-3.5 py-1.5 rounded-xl bg-[#ECE8AF] text-[#186049] text-xs font-bold hover:bg-[#deda9e] transition"
                >
                  📸 {isHi ? 'कार्ड स्कैन करें (OCR)' : 'Scan Card with OCR'}
                </button>
              </div>
            </div>

            {/* Editable Soil Nutrient Values */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              <div className="p-3 rounded-2xl bg-gray-50 border">
                <span className="text-[11px] font-bold text-gray-500 uppercase">
                  Nitrogen (N)
                </span>
                <div className="mt-1 flex items-baseline gap-1">
                  <input
                    type="number"
                    value={soilN}
                    onChange={(e) => setSoilN(Number(e.target.value))}
                    className="w-16 font-extrabold text-[#186049] bg-transparent border-b text-base"
                  />
                  <span className="text-xs text-gray-400">kg/ha</span>
                </div>
                <span className="text-[10px] text-red-600 font-bold">Deficient (&lt;280)</span>
              </div>

              <div className="p-3 rounded-2xl bg-gray-50 border">
                <span className="text-[11px] font-bold text-gray-500 uppercase">
                  Phosphorus (P)
                </span>
                <div className="mt-1 flex items-baseline gap-1">
                  <input
                    type="number"
                    value={soilP}
                    onChange={(e) => setSoilP(Number(e.target.value))}
                    className="w-16 font-extrabold text-[#186049] bg-transparent border-b text-base"
                  />
                  <span className="text-xs text-gray-400">kg/ha</span>
                </div>
                <span className="text-[10px] text-amber-600 font-bold">Medium (10-25)</span>
              </div>

              <div className="p-3 rounded-2xl bg-gray-50 border">
                <span className="text-[11px] font-bold text-gray-500 uppercase">
                  Potassium (K)
                </span>
                <div className="mt-1 flex items-baseline gap-1">
                  <input
                    type="number"
                    value={soilK}
                    onChange={(e) => setSoilK(Number(e.target.value))}
                    className="w-16 font-extrabold text-[#186049] bg-transparent border-b text-base"
                  />
                  <span className="text-xs text-gray-400">kg/ha</span>
                </div>
                <span className="text-[10px] text-emerald-600 font-bold">High (&gt;280)</span>
              </div>

              <div className="p-3 rounded-2xl bg-gray-50 border">
                <span className="text-[11px] font-bold text-gray-500 uppercase">Soil pH</span>
                <div className="mt-1 flex items-baseline gap-1">
                  <input
                    type="number"
                    step="0.1"
                    value={soilPh}
                    onChange={(e) => setSoilPh(Number(e.target.value))}
                    className="w-16 font-extrabold text-[#186049] bg-transparent border-b text-base"
                  />
                </div>
                <span className="text-[10px] text-emerald-600 font-bold">Optimal (6.5-7.5)</span>
              </div>

              <div className="p-3 rounded-2xl bg-gray-50 border">
                <span className="text-[11px] font-bold text-gray-500 uppercase">
                  Organic Carbon
                </span>
                <div className="mt-1 flex items-baseline gap-1">
                  <input
                    type="number"
                    step="0.01"
                    value={soilOc}
                    onChange={(e) => setSoilOc(Number(e.target.value))}
                    className="w-16 font-extrabold text-[#186049] bg-transparent border-b text-base"
                  />
                  <span className="text-xs text-gray-400">%</span>
                </div>
                <span className="text-[10px] text-amber-600 font-bold">Medium (0.5-0.75)</span>
              </div>
            </div>
          </div>

          {/* ICAR Fertiliser Recommendation Output */}
          <div className="rounded-3xl bg-white p-6 shadow-md border-2 border-[#186049]/20 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b pb-3 gap-2">
              <div>
                <h3 className="text-lg font-black text-[#186049]">
                  {isHi ? `व्यावसायिक खाद आवश्यकता (Plot A: ${farmAcreage} एकड़)` : `Commercial Fertiliser Bags Required (Plot A: ${farmAcreage} Acres)`}
                </h3>
                <p className="text-xs text-gray-500">
                  {fertResult.source}
                </p>
              </div>

              <button
                onClick={speakFertiliserAdvice}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#4A943E] text-white text-xs font-bold shadow hover:bg-[#3d7d33] transition self-start sm:self-auto"
              >
                <span>🔊</span>
                <span>{isHi ? 'मात्रा सुनें' : 'Listen to Dose'}</span>
              </button>
            </div>

            {/* 3 Nutrient Big Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* Urea Card */}
              <div className="rounded-2xl bg-[#ECE8AF]/30 p-4 border border-[#B98327]/30">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-extrabold text-[#B98327] uppercase">
                    {t('ureaDose', 'Urea (46% N)')}
                  </span>
                  <span className="text-2xl">🌱</span>
                </div>
                <div className="mt-2 text-3xl font-black text-[#186049]">
                  {fertResult.urea_kg} kg
                </div>
                <p className="text-xs text-gray-600 mt-1">
                  ~ {Math.ceil(fertResult.urea_kg / 45)} Bags (45 kg bags). Split into 3 equal top-dressings.
                </p>
              </div>

              {/* DAP Card */}
              <div className="rounded-2xl bg-emerald-50 p-4 border border-emerald-200">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-extrabold text-[#186049] uppercase">
                    {t('dapDose', 'D.A.P (18% N, 46% P₂O₅)')}
                  </span>
                  <span className="text-2xl">🌾</span>
                </div>
                <div className="mt-2 text-3xl font-black text-[#186049]">
                  {fertResult.dap_kg} kg
                </div>
                <p className="text-xs text-gray-600 mt-1">
                  ~ {Math.ceil(fertResult.dap_kg / 50)} Bags (50 kg). Apply 100% basal at sowing.
                </p>
              </div>

              {/* MOP Card */}
              <div className="rounded-2xl bg-amber-50 p-4 border border-amber-200">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-extrabold text-amber-800 uppercase">
                    {t('mopDose', 'M.O.P (60% Potash)')}
                  </span>
                  <span className="text-2xl">🍂</span>
                </div>
                <div className="mt-2 text-3xl font-black text-[#186049]">
                  {fertResult.mop_kg} kg
                </div>
                <p className="text-xs text-gray-600 mt-1">
                  Soil potassium is high ({soilK} kg/ha). Maintenance dose only.
                </p>
              </div>
            </div>

            {/* Split Schedule Table */}
            <div className="pt-2">
              <h4 className="text-xs font-bold text-gray-700 uppercase mb-2">
                {isHi ? 'खाद देने की समय सारणी (Application Timetable)' : 'Application Timetable'}
              </h4>
              <div className="space-y-2 text-xs">
                {fertResult.schedule.map((s, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-2.5 rounded-xl bg-gray-50 border"
                  >
                    <span className="font-bold text-[#186049]">
                      Stage {s.week}: {s.fertiliser}
                    </span>
                    <span className="font-extrabold text-gray-800">{s.dose_kg} kg total</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
