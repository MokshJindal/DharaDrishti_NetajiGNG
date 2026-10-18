'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import { useVoice, voiceEventBus } from '@/lib/voice/VoiceContext';
import { PRIMARY_FIELD } from '@/lib/data/mockData';

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

export default function WeatherPage() {
  const { t, language } = useLanguage();
  const { speak, registerActionHandler } = useVoice();

  const [weatherData, setWeatherData] = useState<WeatherIntelligenceData | null>(null);
  const [loading, setLoading] = useState(true);

  // Fetch live weather intelligence from Weather_Logic backend API
  useEffect(() => {
    async function loadWeather() {
      try {
        setLoading(true);
        const res = await fetch('/api/weather/intelligence?lat=18.8262&lon=74.3731');
        const data = await res.json();
        if (data.success) {
          setWeatherData(data);
        }
      } catch (err) {
        console.error('Failed to load weather intelligence:', err);
      } finally {
        setLoading(false);
      }
    }
    loadWeather();
  }, []);

  const speakWeatherForecast = useCallback(() => {
    if (!weatherData) return;

    const curr = weatherData.current;
    const adv = weatherData.advisory;
    const isHi = language === 'hi';

    const text = isHi
      ? `मौसम रिपोर्ट: वर्तमान तापमान ${curr.temperature} डिग्री सेल्सियस है। स्थिति: ${curr.descriptionHi}। हवा की गति ${curr.windSpeed} किलोमीटर प्रति घंटा और आर्द्रता ${curr.humidity} प्रतिशत है। कृषि सलाह: ${adv.summaryBannerHi}। फफूंद जोखिम स्तर ${adv.fungalDiseaseRisk.riskLevel} है।`
      : `Weather Report: Currently ${curr.temperature}°C, ${curr.description}. Wind speed is ${curr.windSpeed} km/h with humidity at ${curr.humidity}%. Advisory: ${adv.summaryBanner}. Fungal disease risk level is ${adv.fungalDiseaseRisk.riskLevel}.`;

    speak(text);
  }, [weatherData, language, speak]);

  // Voice commands
  useEffect(() => {
    const unregister = registerActionHandler((spoken: string) => {
      if (
        spoken.includes('weather') ||
        spoken.includes('mausam') ||
        spoken.includes('मौसम') ||
        spoken.includes('barish') ||
        spoken.includes('बारिश') ||
        spoken.includes('rain') ||
        spoken.includes('हवा')
      ) {
        speakWeatherForecast();
        return true;
      }
      return false;
    });

    return unregister;
  }, [registerActionHandler, speakWeatherForecast]);

  // Global voice action listener
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

  const isHi = language === 'hi';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-5 rounded-3xl shadow-sm border border-gray-100">
        <div>
          <span className="text-xs font-bold text-[#4A943E] uppercase tracking-wider">
            ⛅ Open-Meteo & IMD Hyperlocal Feed • Weather_Logic Engine
          </span>
          <h1 className="text-2xl font-black text-[#186049]">
            {t('weatherTitle', 'Weather Intelligence & Farm Advisories')}
          </h1>
          <p className="text-xs sm:text-sm text-gray-500 mt-0.5">
            {isHi
              ? 'ओपन-मेटियो और आईएमडी लाइव डेटा: मौसम पूर्वानुमान, लीचिंग जोखिम व फफूंद चेतावनी।'
              : 'Live meteorological observations, diurnal trend regression, and nitrogen leaching models.'}
          </p>
        </div>

        <button
          onClick={speakWeatherForecast}
          disabled={!weatherData}
          className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-[#186049] text-white font-bold text-sm shadow hover:bg-[#124b39] transition active:scale-95 disabled:opacity-50"
        >
          <span>🔊</span>
          <span>{t('listenReply', 'Listen to Weather')}</span>
        </button>
      </div>

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
            className={`p-4 rounded-2xl border-2 flex items-start gap-3 ${
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
                  {isHi ? 'मौसम आधारित सिंचाई सलाह' : 'Meteorological Advisory'}
                </span>
                <span className="text-[10px] px-2 py-0.5 font-bold rounded-full bg-white/80 border">
                  {weatherData.advisory.status}
                </span>
              </div>
              <p className="font-bold text-sm sm:text-base mt-1">
                {isHi ? weatherData.advisory.summaryBannerHi : weatherData.advisory.summaryBanner}
              </p>
            </div>
          </div>

          {/* Hero: Current Conditions */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {/* Today Card */}
            <div className="md:col-span-2 rounded-3xl bg-gradient-to-br from-[#186049] via-[#1d6b52] to-[#186049] p-6 text-white shadow-xl border-2 border-[#ECE8AF]/30">
              <div className="flex items-center justify-between text-xs text-[#ECE8AF] font-bold uppercase tracking-wider">
                <span>📍 {weatherData.location.name}</span>
                <span>Live IMD / Open-Meteo</span>
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
