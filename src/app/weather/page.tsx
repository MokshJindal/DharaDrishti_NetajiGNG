'use client';

import React, { useEffect, useCallback } from 'react';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import { useVoice } from '@/lib/voice/VoiceContext';
import { MOCK_WEATHER_FORECAST, PRIMARY_FIELD } from '@/lib/data/mockData';

export default function WeatherPage() {
  const { t, language } = useLanguage();
  const { speak, registerActionHandler } = useVoice();

  const today = MOCK_WEATHER_FORECAST[0];
  const tomorrow = MOCK_WEATHER_FORECAST[1];

  const speakWeatherForecast = useCallback(() => {
    const text =
      language === 'hi'
        ? `मौसम रिपोर्ट: आज तापमान अधिकतम 32 और न्यूनतम 21 डिग्री है। कल 18 मिमी बारिश और आंधी की संभावना है। सलाह: कल कीटनाशक न छिड़कें और सिंचाई रोक दें।`
        : `Weather report: Today is clear at 32°C. Tomorrow expects 18 mm rain with thunderstorms. Advisory: Do not spray pesticides tomorrow and hold irrigation.`;
    speak(text);
  }, [language, speak]);

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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-5 rounded-3xl shadow-sm border border-gray-100">
        <div>
          <span className="text-xs font-bold text-[#4A943E] uppercase tracking-wider">
            ⛅ Open-Meteo & IMD Hyperlocal Feed
          </span>
          <h1 className="text-2xl font-black text-[#186049]">
            {t('weatherTitle', 'Weather Intelligence & Farm Advisories')}
          </h1>
          <p className="text-xs sm:text-sm text-gray-500 mt-0.5">
            Forecasts converted into immediate field decisions: spraying, irrigation, and heat protection.
          </p>
        </div>

        <button
          onClick={speakWeatherForecast}
          className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-[#186049] text-white font-bold text-sm shadow hover:bg-[#124b39] transition active:scale-95"
        >
          <span>🔊</span>
          <span>{t('listenReply', 'Listen to Weather')}</span>
        </button>
      </div>

      {/* Hero: Current Conditions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Today Card */}
        <div className="md:col-span-2 rounded-3xl bg-gradient-to-br from-[#186049] via-[#1d6b52] to-[#186049] p-6 text-white shadow-xl border-2 border-[#ECE8AF]/30">
          <div className="flex items-center justify-between text-xs text-[#ECE8AF] font-bold uppercase tracking-wider">
            <span>📍 {PRIMARY_FIELD.village}, {PRIMARY_FIELD.district}</span>
            <span>Live Satellite Radar</span>
          </div>

          <div className="mt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="text-6xl font-black text-white tracking-tight">
                {today.tempMax}°C
              </div>
              <div className="text-base font-semibold text-[#ECE8AF] mt-1">
                {today.condition} • Feels like 33°C
              </div>
              <p className="text-xs text-white/80 mt-1 max-w-sm">
                {today.advisory}
              </p>
            </div>

            <span className="text-7xl self-end sm:self-center">{today.icon}</span>
          </div>

          {/* Meteorological Metrics */}
          <div className="mt-6 pt-4 border-t border-white/20 grid grid-cols-4 gap-2 text-center text-xs">
            <div className="p-2 rounded-xl bg-white/10">
              <span className="text-white/70 block text-[10px] uppercase">Humidity</span>
              <span className="font-extrabold text-sm">{today.humidity}%</span>
            </div>
            <div className="p-2 rounded-xl bg-white/10">
              <span className="text-white/70 block text-[10px] uppercase">Wind</span>
              <span className="font-extrabold text-sm">{today.windSpeedKmh} km/h</span>
            </div>
            <div className="p-2 rounded-xl bg-white/10">
              <span className="text-white/70 block text-[10px] uppercase">Rainfall</span>
              <span className="font-extrabold text-sm">{today.rainfallMm} mm</span>
            </div>
            <div className="p-2 rounded-xl bg-white/10">
              <span className="text-white/70 block text-[10px] uppercase">ET₀ Demand</span>
              <span className="font-extrabold text-sm text-[#ECE8AF]">{today.et0Mm} mm</span>
            </div>
          </div>
        </div>

        {/* Action Alert Card: Tomorrow Thunderstorm */}
        <div className="rounded-3xl bg-[#ECE8AF] p-6 text-[#186049] shadow-md border-2 border-[#B98327] flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-2xl">⚠️</span>
              <span className="text-xs font-black uppercase text-[#B98327] tracking-wider">
                High Priority Advisory
              </span>
            </div>
            <h3 className="text-lg font-black text-[#186049] mt-2">
              Thunderstorm Expected Tomorrow
            </h3>
            <p className="text-xs text-gray-800 font-medium mt-2 leading-relaxed">
              {t('doNotSpray', 'Do not spray pesticides tomorrow — High winds & scattered showers expected.')}
            </p>
          </div>

          <div className="mt-4 p-3 rounded-2xl bg-white/80 border text-xs space-y-1">
            <div className="flex justify-between font-bold">
              <span>Expected Rain:</span>
              <span className="text-blue-700">{tomorrow.rainfallMm} mm</span>
            </div>
            <div className="flex justify-between">
              <span>Wind Gusts:</span>
              <span>Up to {tomorrow.windSpeedKmh} km/h</span>
            </div>
          </div>
        </div>
      </div>

      {/* 7-Day Farm Forecast Timeline */}
      <div className="rounded-3xl bg-white p-6 shadow-sm border border-gray-100">
        <h3 className="font-extrabold text-base text-[#186049] mb-4">
          7-Day Weather & Crop Advisory Timeline
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-7 gap-3">
          {MOCK_WEATHER_FORECAST.map((w, idx) => (
            <div
              key={idx}
              className={`p-3.5 rounded-2xl border text-center transition flex flex-col justify-between ${
                idx === 1
                  ? 'bg-blue-50 border-blue-200 shadow-sm'
                  : 'bg-gray-50 border-gray-100 hover:bg-gray-100'
              }`}
            >
              <div>
                <span className="text-xs font-bold text-gray-500 uppercase block">
                  {w.day}
                </span>
                <span className="text-[11px] text-gray-400 block">{w.date}</span>
                <div className="text-3xl my-2">{w.icon}</div>
                <div className="font-extrabold text-sm text-[#186049]">
                  {w.tempMax}° / {w.tempMin}°
                </div>
              </div>

              <div className="mt-3 pt-2 border-t border-gray-200 text-[11px]">
                {w.rainfallMm > 0 ? (
                  <span className="font-bold text-blue-700 block">
                    💧 {w.rainfallMm} mm
                  </span>
                ) : (
                  <span className="text-gray-400 block">No rain</span>
                )}
                <span className="text-[10px] text-gray-500 mt-1 block">
                  ET₀ {w.et0Mm}mm
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
