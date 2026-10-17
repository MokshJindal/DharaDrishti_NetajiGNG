'use client';

import React from 'react';
import Link from 'next/link';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import { useVoice } from '@/lib/voice/VoiceContext';
import {
  PRIMARY_FIELD,
  MOCK_WEATHER_FORECAST,
  MOCK_FASAL_SCORE_DETAILS,
} from '@/lib/data/mockData';

export default function DashboardPage() {
  const { t, language } = useLanguage();
  const { isListening, toggleListening, speak, lastAction } = useVoice();

  const todayWeather = MOCK_WEATHER_FORECAST[0];
  const tomorrowWeather = MOCK_WEATHER_FORECAST[1];

  const quickCards = [
    {
      title: t('myFields', 'My Fields & Geo-fence'),
      href: '/fields',
      icon: '🗺️',
      color: 'bg-[#186049] text-white',
      badge: `${PRIMARY_FIELD.totalAreaAcres} ${t('acres', 'Acres')}`,
      desc: 'GPS boundary walk & sub-plot mapping',
    },
    {
      title: t('diagnose', 'Disease Detection'),
      href: '/diagnose',
      icon: '🔬',
      color: 'bg-[#4A943E] text-white',
      badge: 'AI Doctor',
      desc: 'Leaf photo scan & organic remedy',
    },
    {
      title: t('irrigation', 'Water & Fertiliser'),
      href: '/irrigation',
      icon: '💧',
      color: 'bg-[#186049] text-white',
      badge: 'ICAR Rules',
      desc: 'Skip rain alert & Soil Health Card',
    },
    {
      title: t('profit', 'Crop Choice & Profit'),
      href: '/profit',
      icon: '💰',
      color: 'bg-[#B98327] text-white',
      badge: 'APMC Mandi',
      desc: 'Live prices, cost & net profit',
    },
    {
      title: t('weather', 'Weather Intelligence'),
      href: '/weather',
      icon: '⛅',
      color: 'bg-[#4A943E] text-white',
      badge: `${todayWeather.tempMax}°C`,
      desc: '7-day forecast & spray warnings',
    },
    {
      title: t('fasalScore', 'Fasal Score & Stock'),
      href: '/score',
      icon: '📊',
      color: 'bg-[#186049] text-white',
      badge: `${MOCK_FASAL_SCORE_DETAILS.overallScore}/100`,
      desc: 'Farm health score & voice ledger',
    },
  ];

  const playVoiceSummary = () => {
    const summaryText =
      language === 'hi'
        ? `राम राम किसान भाई! आपके खेत का क्षेत्रफल 4.8 एकड़ है। आज मौसम साफ और तापमान 32 डिग्री है। कल 18 मिमी बारिश की संभावना है, इसलिए आज पानी न दें। आपका फसल स्कोर 78 है जो उत्तम है।`
        : `Welcome! Your farm area is 4.8 acres. Today is clear at 32°C. 18 mm rain expected tomorrow, so skip watering today. Your Fasal Score is 78.`;
    speak(summaryText);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner: Greeting, Field Snapshot, Voice Trigger */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#186049] via-[#1b6b52] to-[#186049] p-6 text-white shadow-xl border-2 border-[#ECE8AF]/30">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#ECE8AF]">
              <span className="w-2.5 h-2.5 rounded-full bg-[#4A943E] animate-ping" />
              <span>{PRIMARY_FIELD.village}, {PRIMARY_FIELD.district}</span>
              <span>•</span>
              <span>{PRIMARY_FIELD.name}</span>
            </div>
            <h1 className="mt-1 text-2xl md:text-3xl font-extrabold text-white tracking-tight">
              {t('welcomeKisan', 'Welcome, Farmer!')}
            </h1>
            <p className="mt-1 text-sm text-[#ECE8AF]/90 max-w-xl">
              {t('voiceActivePrompt', 'Tap mic or say: "Check weather", "Should I water?", "Diagnose leaf"')}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={playVoiceSummary}
              className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-[#ECE8AF] text-[#186049] font-bold text-sm shadow hover:bg-white transition active:scale-95"
            >
              <span>🔊</span>
              <span>{t('listenReply', 'Listen to advice')}</span>
            </button>
            <button
              onClick={toggleListening}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl font-bold text-sm shadow transition active:scale-95 ${
                isListening
                  ? 'bg-[#B98327] text-white animate-pulse'
                  : 'bg-[#4A943E] text-white hover:bg-[#3d7d33]'
              }`}
            >
              <span>🎤</span>
              <span>{isListening ? t('voiceListening', 'Listening...') : 'बोलें'}</span>
            </button>
          </div>
        </div>

        {/* Real-time Voice action notification pill */}
        {lastAction && (
          <div className="mt-4 inline-flex items-center gap-2 rounded-xl bg-black/30 backdrop-blur-md px-3 py-1.5 text-xs text-[#ECE8AF] border border-[#ECE8AF]/20">
            <span>✨</span>
            <span className="font-medium">{lastAction.feedback}</span>
          </div>
        )}
      </div>

      {/* Critical Action Banner: Rain Expected Smart Skip */}
      <div className="rounded-2xl bg-[#ECE8AF] p-4 text-[#186049] shadow-md border-l-8 border-[#B98327] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="text-3xl">⛈️</span>
          <div>
            <div className="font-bold text-base text-[#186049]">
              {t('waterDecision', 'Smart Recommendation Today')}
            </div>
            <p className="text-xs sm:text-sm text-[#186049]/90 font-medium">
              {t('skipWateringReason', 'Do not water today. Rain expected in 24 hours — saves power & prevents root rot.')}
            </p>
          </div>
        </div>
        <Link
          href="/irrigation"
          className="whitespace-nowrap px-4 py-2 rounded-xl bg-[#186049] text-white text-xs sm:text-sm font-bold shadow hover:bg-[#124b39] transition"
        >
          {t('irrigationSchedule', 'View Schedule')} →
        </Link>
      </div>

      {/* Weather Snapshot & Fasal Score Gauge */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Weather Card */}
        <Link
          href="/weather"
          className="group rounded-3xl bg-white p-5 shadow-md border border-[#186049]/10 hover:shadow-xl transition"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-gray-500">
              {t('weather', 'Weather Today')}
            </span>
            <span className="text-2xl">{todayWeather.icon}</span>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-4xl font-extrabold text-[#186049]">{todayWeather.tempMax}°C</span>
            <span className="text-sm text-gray-500 font-medium">/ {todayWeather.tempMin}°C</span>
          </div>
          <p className="mt-1 text-sm font-semibold text-gray-700">{todayWeather.condition}</p>
          <div className="mt-3 flex items-center justify-between text-xs text-gray-600 border-t border-gray-100 pt-2 font-medium">
            <span>💧 {todayWeather.humidity}% Humidity</span>
            <span>💨 {todayWeather.windSpeedKmh} km/h</span>
            <span>☀️ ET₀ {todayWeather.et0Mm} mm</span>
          </div>
          <div className="mt-2 text-xs text-[#B98327] font-bold">
            Tomorrow: {tomorrowWeather.rainfallMm}mm rain 🌧️
          </div>
        </Link>

        {/* Fasal Score Card */}
        <Link
          href="/score"
          className="group rounded-3xl bg-white p-5 shadow-md border border-[#186049]/10 hover:shadow-xl transition"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-gray-500">
              {t('fasalScoreTitle', 'Fasal Health Score')}
            </span>
            <span className="text-xs px-2.5 py-1 rounded-full bg-[#4A943E]/10 text-[#4A943E] font-bold">
              {MOCK_FASAL_SCORE_DETAILS.grade}
            </span>
          </div>
          <div className="mt-3 flex items-center gap-4">
            <div className="relative w-16 h-16 rounded-full flex items-center justify-center bg-[#186049] text-white text-2xl font-black shadow-inner">
              78
            </div>
            <div>
              <div className="text-sm font-bold text-gray-800">Field Health: Optimal</div>
              <p className="text-xs text-gray-500 mt-0.5">Top in Shirur Tehsil</p>
              <div className="mt-1 text-xs text-[#4A943E] font-semibold">
                +4 points this month
              </div>
            </div>
          </div>
          <div className="mt-3 w-full bg-gray-100 rounded-full h-2 overflow-hidden">
            <div className="bg-[#4A943E] h-2 rounded-full w-[78%]" />
          </div>
        </Link>

        {/* Live Mandi Wheat Rate */}
        <Link
          href="/profit"
          className="group rounded-3xl bg-white p-5 shadow-md border border-[#186049]/10 hover:shadow-xl transition"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-gray-500">
              {t('liveMandiPrices', 'Mandi Rate (Wheat)')}
            </span>
            <span className="text-xs font-bold text-[#4A943E] bg-[#4A943E]/10 px-2 py-0.5 rounded">
              ▲ +₹60
            </span>
          </div>
          <div className="mt-3 flex items-baseline gap-1">
            <span className="text-3xl font-extrabold text-[#186049]">₹2,480</span>
            <span className="text-xs text-gray-500 font-medium">/ Quintal</span>
          </div>
          <p className="mt-1 text-sm font-semibold text-gray-700">Shirur APMC Market</p>
          <div className="mt-3 flex items-center justify-between text-xs text-gray-600 border-t border-gray-100 pt-2 font-medium">
            <span>MSP: ₹2,425</span>
            <span className="text-[#186049] font-bold">Profit: ₹42,500/acre</span>
          </div>
          <div className="mt-2 text-xs text-gray-500">Tap to calculate net profit range →</div>
        </Link>
      </div>

      {/* 6 Quick Action Grid */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-extrabold text-[#186049]">
            {t('quickActions', 'Quick Voice Actions')}
          </h2>
          <span className="text-xs text-gray-500">All features voice-enabled</span>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {quickCards.map((c) => (
            <Link
              key={c.href}
              href={c.href}
              className="group relative flex flex-col justify-between rounded-3xl bg-white p-5 shadow-sm border border-gray-200 hover:border-[#186049] hover:shadow-lg transition active:scale-[0.98]"
            >
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-3xl">{c.icon}</span>
                  <span className="text-[11px] font-bold px-2 py-1 rounded-lg bg-gray-100 text-gray-700 group-hover:bg-[#ECE8AF] group-hover:text-[#186049] transition">
                    {c.badge}
                  </span>
                </div>
                <h3 className="mt-3 text-base font-bold text-[#186049] group-hover:text-[#4A943E] transition">
                  {c.title}
                </h3>
                <p className="mt-1 text-xs text-gray-500 leading-relaxed">{c.desc}</p>
              </div>

              <div className="mt-4 flex items-center text-xs font-bold text-[#186049] group-hover:translate-x-1 transition">
                <span>Open</span>
                <span className="ml-1">→</span>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Live Agri Alerts Feed */}
      <div className="rounded-3xl bg-white p-5 shadow-md border border-[#186049]/10">
        <div className="flex items-center justify-between border-b border-gray-100 pb-3">
          <div className="flex items-center gap-2">
            <span className="text-xl">📢</span>
            <h3 className="font-extrabold text-base text-[#186049]">
              {t('recentAlerts', 'Live Agri Advisories')}
            </h3>
          </div>
          <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-[#186049]/10 text-[#186049]">
            District: Pune
          </span>
        </div>

        <div className="mt-4 space-y-3">
          <div className="flex items-start gap-3 rounded-2xl bg-amber-50 p-3.5 border border-amber-200">
            <span className="text-xl">⚠️</span>
            <div className="flex-1 text-xs sm:text-sm">
              <div className="font-bold text-amber-900">
                Weather Advisory: Heavy Rain & Gusty Wind
              </div>
              <p className="text-amber-800 mt-0.5">
                {t('doNotSpray', 'Do not spray pesticides tomorrow — High winds & scattered showers expected.')}
              </p>
            </div>
            <button
              onClick={() =>
                speak(
                  language === 'hi'
                    ? 'कल कीटनाशक का छिड़काव न करें। तेज़ हवा और बारिश का अनुमान है।'
                    : 'Do not spray pesticides tomorrow due to high winds and rain.'
                )
              }
              className="text-xs bg-amber-200/80 px-2.5 py-1.5 rounded-xl font-bold text-amber-900"
            >
              🔊
            </button>
          </div>

          <div className="flex items-start gap-3 rounded-2xl bg-emerald-50 p-3.5 border border-emerald-200">
            <span className="text-xl">🌾</span>
            <div className="flex-1 text-xs sm:text-sm">
              <div className="font-bold text-emerald-900">
                Pest Sentinel: Yellow Rust Notice
              </div>
              <p className="text-emerald-800 mt-0.5">
                Minor yellow rust detected in Shirur block wheat fields. Inspect flag leaves early morning for powdery yellow stripes.
              </p>
            </div>
            <Link
              href="/diagnose"
              className="text-xs bg-emerald-200/80 px-2.5 py-1.5 rounded-xl font-bold text-emerald-900"
            >
              Scan Leaf
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
