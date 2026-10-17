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

export default function HomePage() {
  const { t, language } = useLanguage();
  const { isListening, toggleListening, speak, lastAction } = useVoice();

  const todayWeather = MOCK_WEATHER_FORECAST[0];
  const tomorrowWeather = MOCK_WEATHER_FORECAST[1];

  const playVoiceGreeting = () => {
    const text =
      language === 'hi'
        ? `राम राम किसान भाई! आपके 4.8 एकड़ खेत में आज मौसम साफ है। कल 18 मिलीमीटर बारिश का अनुमान है, इसलिए आज खेत में पानी न दें। आपका फसल स्कोर 78 है।`
        : language === 'pa'
        ? `ਸਤਿ ਸ੍ਰੀ ਅਕਾਲ ਕਿਸਾਨ ਵੀਰ! ਤੁਹਾਡੇ 4.8 ਏਕੜ ਖੇਤ ਵਿੱਚ ਅੱਜ ਮੌਸਮ ਸਾਫ਼ ਹੈ। ਕੱਲ੍ਹ 18 ਮਿਲੀਮੀਟਰ ਮੀਂਹ ਦੀ ਸੰਭਾਵਨਾ ਹੈ, ਇਸ ਲਈ ਅੱਜ ਪਾਣੀ ਨਾ ਦਿਓ।`
        : language === 'mr'
        ? `राम राम शेतकरी बंधू! आपल्या 4.8 एकर शेतात आज हवामान स्वच्छ आहे. उद्या 18 मिमी पावसाचा अंदाज असल्याने आज पाणी देऊ नका.`
        : `Welcome! Your 4.8 acre farm has clear weather today at 32°C. 18mm rain is expected tomorrow, so please skip watering today. Your Fasal Score is 78.`;
    speak(text);
  };

  const pillars = [
    {
      id: 'fields',
      title: t('pillarFieldsTitle', 'My Land & Geofencing'),
      desc: t('pillarFieldsDesc', 'Walk farm boundary with phone GPS and calculate acreage.'),
      stat: `${PRIMARY_FIELD.totalAreaAcres} ${t('acres', 'Acres')}`,
      icon: '🗺️',
      href: '/fields',
      badge: 'GPS GIS',
      highlightColor: 'border-l-3 border-[#186049]',
    },
    {
      id: 'crop',
      title: t('pillarCropTitle', 'Crop Doctor & Soil'),
      desc: t('pillarCropDesc', 'Photo diagnosis for plant diseases with organic & chemical cures.'),
      stat: 'SHC-MH-2026',
      icon: '🌿',
      href: '/diagnose',
      badge: 'AI Doctor',
      highlightColor: 'border-l-3 border-[#4A943E]',
    },
    {
      id: 'water',
      title: t('pillarWaterTitle', 'Water & Weather'),
      desc: t('pillarWaterDesc', 'ET₀ irrigation schedule and rain-radar to avoid over-watering.'),
      stat: `${todayWeather.tempMax}°C • Rain Tomorrow`,
      icon: '💧',
      href: '/irrigation',
      badge: 'ET₀ Radar',
      highlightColor: 'border-l-3 border-[#B98327]',
    },
    {
      id: 'mandi',
      title: t('pillarMandiTitle', 'Mandi Rates & Profit'),
      desc: t('pillarMandiDesc', 'Today’s APMC rates, cost calculations, and expected net income.'),
      stat: '₹2,480/q Wheat',
      icon: '💰',
      href: '/profit',
      badge: 'APMC Live',
      highlightColor: 'border-l-3 border-[#186049]',
    },
  ];

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      
      {/* ──────────────────────────────────────────────────────────
          1. CLEAN WELCOME & VOICE SEARCH BAR (Subtle, Not Cluttered)
          ────────────────────────────────────────────────────────── */}
      <section className="rounded-2xl bg-white border border-[#e6eae4] p-5 sm:p-7 shadow-[0_2px_8px_rgba(24,96,73,0.04)]">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-gray-500">
              <span className="h-2 w-2 rounded-full bg-[#4A943E]" />
              <span>{PRIMARY_FIELD.village}, {PRIMARY_FIELD.district}</span>
              <span>•</span>
              <span>{PRIMARY_FIELD.totalAreaAcres} {t('acres', 'Acres')}</span>
            </div>
            <h1 className="mt-1 text-2xl sm:text-3xl font-extrabold tracking-tight text-[#186049]">
              {t('welcomeKisan', 'Welcome, Farmer!')}
            </h1>
            <p className="mt-0.5 text-xs sm:text-sm text-gray-600 font-medium">
              {t('tagline', 'Vision of the Earth — Voice-First Farm Assistant')}
            </p>
          </div>

          {/* Audio Listen Button */}
          <button
            onClick={playVoiceGreeting}
            className="self-start sm:self-auto flex items-center gap-2 px-3.5 py-2 rounded-xl bg-[#ECE8AF]/70 text-[#186049] text-xs font-bold hover:bg-[#ECE8AF] transition shadow-xs active:scale-95"
            title="Listen to today's summary"
          >
            <span>🔊</span>
            <span>{t('listenReply', 'Listen Brief')}</span>
          </button>
        </div>

        {/* Clean Voice Input Box */}
        <div className="mt-5 relative">
          <div
            onClick={toggleListening}
            role="button"
            tabIndex={0}
            className={`flex items-center justify-between gap-3 w-full rounded-xl border px-4 py-3 cursor-pointer transition shadow-xs ${
              isListening
                ? 'border-[#B98327] bg-[#ECE8AF]/30 animate-voice-pulse'
                : 'border-gray-200 bg-gray-50/70 hover:border-[#186049]/40 hover:bg-white'
            }`}
          >
            <div className="flex items-center gap-3">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#186049] text-white text-base">
                🎙️
              </span>
              <span className="text-xs sm:text-sm font-semibold text-gray-600">
                {isListening
                  ? t('voiceListening', 'Listening… Speak your question now')
                  : t('speakQuestion', 'Tap mic to speak your question... "Should I water today?"')}
              </span>
            </div>

            <button
              onClick={(e) => {
                e.stopPropagation();
                toggleListening();
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition shadow-xs ${
                isListening
                  ? 'bg-[#B98327] text-white'
                  : 'bg-[#186049] text-white hover:bg-[#0f3d2e]'
              }`}
            >
              {isListening ? t('voiceListening', 'Listening…') : t('voiceActivePrompt', 'बोलें')}
            </button>
          </div>

          {/* Quick Voice Prompt Shortcuts */}
          <div className="mt-2.5 flex items-center gap-2 flex-wrap text-[11px] text-gray-500 font-medium">
            <span className="text-gray-400">Try saying:</span>
            <button
              onClick={() => speak(language === 'hi' ? 'आज का मौसम साफ है, तापमान 32 डिग्री है।' : 'Today is clear at 32 degrees.')}
              className="px-2 py-0.5 rounded-md bg-gray-100 hover:bg-gray-200 transition text-gray-700"
            >
              ⛅ {t('weather', 'Weather')}
            </button>
            <button
              onClick={() => speak(language === 'hi' ? 'कल बारिश होने वाली है, आज पानी न दें।' : 'Rain tomorrow. Skip watering.')}
              className="px-2 py-0.5 rounded-md bg-gray-100 hover:bg-gray-200 transition text-gray-700"
            >
              💧 {t('irrigation', 'Water')}
            </button>
            <button
              onClick={() => speak(language === 'hi' ? 'शिरूर मंडी में गेहूं का भाव 2480 रुपये प्रति क्विंटल है।' : 'Wheat rate is 2480 rupees per quintal.')}
              className="px-2 py-0.5 rounded-md bg-gray-100 hover:bg-gray-200 transition text-gray-700"
            >
              💰 {t('profit', 'Mandi')}
            </button>
          </div>

          {/* Voice Action Notification Pill */}
          {lastAction && (
            <div className="mt-2.5 inline-flex items-center gap-2 rounded-lg bg-[#186049]/10 px-3 py-1 text-xs text-[#186049] font-medium">
              <span>✨</span>
              <span>{lastAction.feedback}</span>
            </div>
          )}
        </div>
      </section>

      {/* ──────────────────────────────────────────────────────────
          2. TODAY'S FARM AT-A-GLANCE (Single Calm Status Card)
          ────────────────────────────────────────────────────────── */}
      <section className="rounded-2xl bg-white border border-[#e6eae4] p-4 sm:p-5 shadow-xs">
        <div className="flex items-center justify-between border-b border-gray-100 pb-2.5">
          <div className="flex items-center gap-2">
            <span className="text-base">📋</span>
            <h2 className="text-sm font-bold text-[#186049]">
              {t('farmSummary', 'Today’s Farm Summary')}
            </h2>
          </div>
          <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-[#186049]/10 text-[#186049]">
            {t('fasalScore', 'Fasal Score')}: {MOCK_FASAL_SCORE_DETAILS.overallScore}/100
          </span>
        </div>

        <div className="mt-3.5 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          {/* Weather status */}
          <Link
            href="/weather"
            className="flex items-center gap-3 p-3 rounded-xl bg-gray-50/70 hover:bg-gray-100/70 transition"
          >
            <span className="text-2xl">{todayWeather.icon}</span>
            <div>
              <span className="text-gray-500 font-medium block">
                {t('weather', 'Weather Today')}
              </span>
              <span className="text-sm font-bold text-[#186049]">
                {todayWeather.tempMax}°C • {todayWeather.condition}
              </span>
            </div>
          </Link>

          {/* Irrigation Decision */}
          <Link
            href="/irrigation"
            className="flex items-center gap-3 p-3 rounded-xl bg-[#ECE8AF]/30 hover:bg-[#ECE8AF]/50 transition border border-[#B98327]/20"
          >
            <span className="text-2xl">💧</span>
            <div>
              <span className="text-[#B98327] font-bold block">
                {language === 'hi' ? 'सिंचाई सलाह' : 'Water Status'}
              </span>
              <span className="text-xs font-bold text-[#186049]">
                {language === 'hi' ? 'आज पानी न दें (कल बारिश)' : 'Skip watering today (Rain)'}
              </span>
            </div>
          </Link>

          {/* Mandi Rate */}
          <Link
            href="/profit"
            className="flex items-center gap-3 p-3 rounded-xl bg-gray-50/70 hover:bg-gray-100/70 transition"
          >
            <span className="text-2xl">💰</span>
            <div>
              <span className="text-gray-500 font-medium block">
                {t('liveMandiPrices', 'Shirur Mandi')}
              </span>
              <span className="text-sm font-bold text-[#186049]">
                ₹2,480/q • गेहूं <span className="text-[10px] text-green-700 font-semibold">(+₹60)</span>
              </span>
            </div>
          </Link>
        </div>
      </section>

      {/* ──────────────────────────────────────────────────────────
          3. SYSTEMATIC 4 CORE PILLARS (Clean, Organized 2x2 Grid)
          ────────────────────────────────────────────────────────── */}
      <section>
        <div className="flex items-center justify-between mb-3 px-1">
          <h2 className="text-sm font-bold uppercase tracking-wider text-gray-500">
            {language === 'hi' ? 'मुख्य सुविधाएं' : 'Core Farm Features'}
          </h2>
          <span className="text-xs text-gray-400">
            {language === 'hi' ? 'क्लिक करके शुरू करें' : 'Tap to start'}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {pillars.map((pillar) => (
            <Link
              key={pillar.id}
              href={pillar.href}
              className={`group flex flex-col justify-between rounded-2xl bg-white p-5 border border-[#e6eae4] hover:border-[#186049]/40 hover:shadow-md transition-all ${pillar.highlightColor}`}
            >
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-2xl">{pillar.icon}</span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-gray-100 text-gray-600 group-hover:bg-[#186049]/10 group-hover:text-[#186049] transition">
                    {pillar.badge}
                  </span>
                </div>

                <h3 className="mt-3 text-base font-bold text-[#186049] group-hover:text-[#4A943E] transition">
                  {pillar.title}
                </h3>

                <p className="mt-1 text-xs text-gray-600 font-medium leading-relaxed">
                  {pillar.desc}
                </p>
              </div>

              <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between text-xs">
                <span className="font-bold text-[#B98327]">{pillar.stat}</span>
                <span className="inline-flex items-center gap-1 font-bold text-[#186049] group-hover:translate-x-1 transition">
                  <span>{t('openFeature', 'Open')}</span>
                  <span>→</span>
                </span>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* ──────────────────────────────────────────────────────────
          4. SINGLE CALM ADVISORY (Non-Intrusive, Subtle)
          ────────────────────────────────────────────────────────── */}
      <section className="rounded-2xl bg-[#ECE8AF]/30 border border-[#B98327]/30 p-4 text-[#186049] flex items-start sm:items-center justify-between gap-3">
        <div className="flex items-start gap-3">
          <span className="text-2xl">🌦️</span>
          <div className="text-xs sm:text-sm">
            <span className="font-bold text-[#186049] block">
              {t('recentAlerts', 'Weather Advisory')}
            </span>
            <p className="text-gray-700 mt-0.5 font-medium">
              {t('skipWaterAlert', 'Do not irrigate today • 18mm rain expected tomorrow')}
            </p>
          </div>
        </div>

        <Link
          href="/weather"
          className="whitespace-nowrap px-3.5 py-1.5 rounded-lg bg-[#186049] text-white text-xs font-bold hover:bg-[#0f3d2e] transition"
        >
          {t('weather', 'Forecast')} →
        </Link>
      </section>

    </div>
  );
}
