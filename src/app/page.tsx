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
  const { language } = useLanguage();
  const { isListening, toggleListening, speak, lastAction } = useVoice();

  const isHi = language === 'hi';
  const todayWeather = MOCK_WEATHER_FORECAST[0];

  const playVoiceGreeting = () => {
    const text = isHi
      ? `राम राम किसान भाई! धरादृष्टि में आपका स्वागत है। आपके शिरूर खेत का कुल रकबा 4.8 एकड़ है। आज मौसम साफ है और तापमान 32 डिग्री है। कल 18 मिलीमीटर बारिश का अनुमान है, इसलिए आज खेत में पानी न दें। आपका फसल स्वास्थ्य स्कोर 78 है जो बहुत बढ़िया है। किसी भी सवाल के लिए माइक दबाकर बोलें।`
      : `Welcome to DharaDrishti! Your farm in Shirur measures 4.8 acres. Today is clear at 32°C. 18mm rainfall is forecast tomorrow, so please skip irrigation today to save water and electricity. Your Fasal Score is 78. Tap the microphone anytime to speak.`;
    speak(text);
  };

  const featureCards = [
    {
      title: isHi ? 'खेत सीमांकन व जीपीएस वॉक' : 'Field Geofencing & GPS Walk',
      desc: isHi
        ? 'फोन लेकर मेड़ पर चलें, खेत का नक्शा बनाएं और सटीक एकड़ क्षेत्रफल जानें।'
        : 'Walk farm boundaries with phone GPS, draw polygons, and auto-calculate acreage.',
      icon: '🗺️',
      href: '/fields',
      stat: '4.8 Acres',
      tag: isHi ? 'सटीक जीआईएस' : 'Live GPS GIS',
      borderTop: 'border-t-4 border-[#3498db]',
      btnBg: 'bg-[#186049] hover:bg-[#0f3d2e]',
    },
    {
      title: isHi ? 'मृदा स्वास्थ्य व खाद कैलकुलेटर' : 'Soil Health & Fertilizer Dose',
      desc: isHi
        ? 'सॉइल हेल्थ कार्ड अनुसार यूरिया, डीएपी और पोटाश की सटीक बोरियों की मात्रा जानें।'
        : 'Instant Urea, DAP & MOP bag calculations based on ICAR agronomy rules.',
      icon: '🧪',
      href: '/fertiliser',
      stat: 'ICAR Formula',
      tag: isHi ? 'खाद गणना' : 'NPK Dosage',
      borderTop: 'border-t-4 border-[#4A943E]',
      btnBg: 'bg-[#4A943E] hover:bg-[#37732d]',
    },
    {
      title: isHi ? 'पत्ता डॉक्टर (रोग पहचान)' : 'AI Crop Doctor & Clinic',
      desc: isHi
        ? 'पत्ते की फोटो खींचें और तुरंत जैविक (नीम/छाछ) व रासायनिक उपचार पाएं।'
        : 'Scan diseased leaves for instant organic & chemical spray solutions.',
      icon: '🌿',
      href: '/diagnose',
      stat: 'Claude Vision',
      tag: isHi ? 'रोग निदान' : 'Leaf Clinic',
      borderTop: 'border-t-4 border-[#e65100]',
      btnBg: 'bg-[#186049] hover:bg-[#0f3d2e]',
    },
    {
      title: isHi ? 'स्मार्ट सिंचाई व बारिश रडar' : 'Smart Irrigation & Rain Skip',
      desc: isHi
        ? 'उपग्रह वाष्पोत्सर्जन (ET₀) और ओपन-मेटियो से पानी बचाएं। कल बारिश है तो पानी न दें।'
        : 'Penman-Monteith ET₀ calculation skips wasteful watering before forecasted rain.',
      icon: '💧',
      href: '/irrigation',
      stat: 'Save 30% Water',
      tag: isHi ? 'बारिश रडार' : 'Rain Radar',
      borderTop: 'border-t-4 border-[#B98327]',
      btnBg: 'bg-[#B98327] hover:bg-[#92651b]',
    },
    {
      title: isHi ? 'मंडी भाव व शुद्ध मुनाफा' : 'APMC Mandi Rates & Profit',
      desc: isHi
        ? 'गेहूं, चना व मक्का के आज के मंडी भाव देखें और लागत काटकर शुद्ध मुनाफा जानें।'
        : 'Compare live mandi prices across Shirur, Pune & Nashik with net profit range.',
      icon: '💰',
      href: '/profit',
      stat: '₹2,480/q Wheat',
      tag: isHi ? 'लाइव मंडी' : 'Live Mandi',
      borderTop: 'border-t-4 border-[#2e7d32]',
      btnBg: 'bg-[#4A943E] hover:bg-[#37732d]',
    },
    {
      title: isHi ? 'फसल स्कोर व भंडार खाता' : 'Fasal Health Score & Ledger',
      desc: isHi
        ? 'मिट्टी, पानी और मौसम के आधार पर 100 में से खेत का स्वास्थ्य स्कोर और उपज खाता।'
        : '0-100 farm health audit across soil, water & weather with storage ledger.',
      icon: '📊',
      href: '/score',
      stat: '78/100 Optimal',
      tag: isHi ? 'केसीसी पात्र' : 'KCC Eligible',
      borderTop: 'border-t-4 border-[#186049]',
      btnBg: 'bg-[#186049] hover:bg-[#0f3d2e]',
    },
  ];

  return (
    <div className="space-y-6">
      {/* ──────────────────────────────────────────────────────────
          1. JANSETU-INSPIRED CITIZEN/FARMER HERO OVERVIEW
          ────────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#0f3d2e] via-[#186049] to-[#124b39] text-white shadow-xl border border-white/20">
        <div className="relative z-10 px-6 py-8 sm:px-10 sm:py-10">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div className="max-w-2xl">
              <div className="inline-flex items-center gap-2 rounded-full bg-black/30 backdrop-blur-md px-3.5 py-1 text-xs font-bold text-[#ECE8AF] border border-[#ECE8AF]/30">
                <span className="h-2 w-2 rounded-full bg-green-400 animate-ping" />
                <span>
                  {isHi
                    ? 'धरादृष्टि किसान डैशबोर्ड • शिरूर, पुणे (महाराष्ट्र)'
                    : 'DharaDrishti Farmer Hub • Shirur, Pune (Maharashtra)'}
                </span>
              </div>

              <h1 className="mt-3 text-2xl sm:text-4xl font-black text-white tracking-tight">
                {isHi
                  ? 'स्मार्ट कृषि मानचित्रण एवं वॉयस नेविगेशन'
                  : 'Smart Agri-GIS, Voice Navigator & Crop Intelligence'}
              </h1>

              <p className="mt-2.5 text-xs sm:text-sm text-emerald-100/90 leading-relaxed max-w-xl">
                {isHi
                  ? 'जीपीएस से खेत नापें, पत्तियों के रोग पहचानें, मौसम अनुसार पानी बचाएं और किसी भी सेवा तक सिर्फ बोलकर पहुंचें।'
                  : 'Measure farm boundaries with GPS, diagnose crop diseases, time irrigation to prevent nitrogen leaching, and navigate every feature using voice.'}
              </p>
            </div>

            {/* Direct Quick Action Buttons */}
            <div className="flex flex-wrap items-center gap-3">
              <Link
                href="/fields"
                className="flex items-center gap-2 px-5 py-3 rounded-2xl bg-[#4A943E] hover:bg-[#3d7d33] text-white text-xs sm:text-sm font-black shadow-md transition active:scale-95"
              >
                <span>🗺️</span>
                <span>{isHi ? 'खेत का नक्शा देखें' : 'Explore Farm Map'}</span>
                <span>→</span>
              </Link>

              <button
                onClick={toggleListening}
                className={`flex items-center gap-2 px-5 py-3 rounded-2xl text-xs sm:text-sm font-black shadow-md transition active:scale-95 ${
                  isListening
                    ? 'bg-red-600 text-white animate-pulse'
                    : 'bg-[#ECE8AF] text-[#186049] hover:bg-white'
                }`}
              >
                <span>🎙️</span>
                <span>
                  {isListening
                    ? (isHi ? 'सुन रहा हूँ...' : 'Listening...')
                    : (isHi ? 'बोलकर काम करें' : 'Speak Command')}
                </span>
              </button>

              <button
                onClick={playVoiceGreeting}
                className="flex items-center gap-1.5 px-3.5 py-3 rounded-2xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold border border-white/20 transition active:scale-95"
                title="Audio Briefing"
              >
                <span>🔊</span>
              </button>
            </div>
          </div>

          {lastAction && (
            <div className="mt-4 inline-flex items-center gap-2 rounded-xl bg-black/40 px-3 py-1 text-xs text-[#ECE8AF]">
              <span>✨</span>
              <span>{lastAction.feedback}</span>
            </div>
          )}
        </div>

        <div className="h-1.5 w-full bg-gradient-to-r from-[#B98327] via-[#ECE8AF] to-[#4A943E]" />
      </section>

      {/* ──────────────────────────────────────────────────────────
          2. FOUR HIGH-CONTRAST STATS CARDS (Matching JanSetu Style)
          ────────────────────────────────────────────────────────── */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4">
        {/* Card 1: Total Land Acreage */}
        <Link
          href="/fields"
          className="rounded-2xl bg-white p-4 shadow-sm border border-gray-100 border-t-4 border-t-[#3498db] hover:shadow-md transition flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center justify-between text-xs font-bold text-gray-500 uppercase">
              <span>{isHi ? 'कुल खेत रकबा' : 'Total Field Area'}</span>
              <span>🗺️</span>
            </div>
            <div className="text-2xl sm:text-3xl font-black text-[#1a3a5a] mt-2">
              {PRIMARY_FIELD.totalAreaAcres} <span className="text-sm font-bold text-gray-500">{isHi ? 'एकड़' : 'Acres'}</span>
            </div>
          </div>
          <p className="text-xs text-gray-500 mt-2 font-medium">
            {PRIMARY_FIELD.subPlots.length} {isHi ? 'फसल हिस्से • जीपीएस मैप्ड' : 'Sub-plots • GPS Mapped'}
          </p>
        </Link>

        {/* Card 2: Fasal Health Score */}
        <Link
          href="/score"
          className="rounded-2xl bg-white p-4 shadow-sm border border-gray-100 border-t-4 border-t-[#2e7d32] hover:shadow-md transition flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center justify-between text-xs font-bold text-gray-500 uppercase">
              <span>{isHi ? 'फसल स्वास्थ्य स्कोर' : 'Fasal Health Score'}</span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-green-100 text-green-800">
                {MOCK_FASAL_SCORE_DETAILS.grade}
              </span>
            </div>
            <div className="text-2xl sm:text-3xl font-black text-[#2e7d32] mt-2">
              78 <span className="text-sm font-bold text-gray-400">/ 100</span>
            </div>
          </div>
          <div className="mt-2 w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
            <div className="bg-[#2e7d32] h-1.5 rounded-full w-[78%]" />
          </div>
        </Link>

        {/* Card 3: Irrigation Status */}
        <Link
          href="/irrigation"
          className="rounded-2xl bg-white p-4 shadow-sm border border-gray-100 border-t-4 border-t-[#e65100] hover:shadow-md transition flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center justify-between text-xs font-bold text-gray-500 uppercase">
              <span>{isHi ? 'सिंचाई सलाह' : 'Irrigation Status'}</span>
              <span>💧</span>
            </div>
            <div className="text-lg sm:text-xl font-black text-[#e65100] mt-2">
              {isHi ? 'सिंचाई रोकें' : 'Hold Irrigation'}
            </div>
          </div>
          <p className="text-xs text-gray-500 mt-2 font-medium">
            {isHi ? 'कल 18 मिमी बारिश का अनुमान' : '18mm rain expected in 24h'}
          </p>
        </Link>

        {/* Card 4: Mandi Rate */}
        <Link
          href="/profit"
          className="rounded-2xl bg-white p-4 shadow-sm border border-gray-100 border-t-4 border-t-[#186049] hover:shadow-md transition flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center justify-between text-xs font-bold text-gray-500 uppercase">
              <span>{isHi ? 'मंडी भाव (गेहूं)' : 'APMC Wheat Rate'}</span>
              <span className="text-[10px] font-bold text-green-700 bg-green-100 px-1.5 py-0.5 rounded">
                ▲ +₹60
              </span>
            </div>
            <div className="text-2xl sm:text-3xl font-black text-[#186049] mt-2">
              ₹2,480 <span className="text-xs font-medium text-gray-500">{isHi ? '/ क्विंटल' : '/ quintal'}</span>
            </div>
          </div>
          <p className="text-xs text-gray-500 mt-2 font-medium">
            {isHi ? 'एमएसपी से ₹55 अधिक' : 'MSP: ₹2,425/q • Profit high'}
          </p>
        </Link>
      </section>

      {/* ──────────────────────────────────────────────────────────
          3. KEY SERVICES GRID (Clean, Structured, Interactive)
          ────────────────────────────────────────────────────────── */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg sm:text-xl font-black text-[#186049]">
              {isHi ? 'प्रमुख किसान सेवाएं' : 'Key Farm Services'}
            </h2>
            <p className="text-xs text-gray-500">
              {isHi ? 'सभी सुविधाएं बोलकर या छूकर तुरंत खोलें' : 'Access any feature with touch or instant voice command'}
            </p>
          </div>
          <span className="text-xs font-bold text-[#186049] bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-full">
            🎙️ Voice Enabled
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {featureCards.map((card, idx) => (
            <div
              key={idx}
              className={`rounded-3xl bg-white p-5 shadow-sm border border-gray-100 hover:shadow-md transition flex flex-col justify-between ${card.borderTop}`}
            >
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-3xl p-2.5 rounded-2xl bg-gray-50">{card.icon}</span>
                  <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-gray-100 text-gray-600">
                    {card.tag}
                  </span>
                </div>

                <h3 className="mt-3.5 text-base font-black text-[#186049]">
                  {card.title}
                </h3>

                <p className="mt-1 text-xs text-gray-600 leading-relaxed font-medium">
                  {card.desc}
                </p>
              </div>

              <div className="mt-5 pt-3 border-t border-gray-100 flex items-center justify-between">
                <span className="text-xs font-bold text-[#B98327]">{card.stat}</span>
                <Link
                  href={card.href}
                  className={`px-4 py-1.5 rounded-xl text-xs font-black text-white shadow-xs transition active:scale-95 ${card.btnBg}`}
                >
                  {isHi ? 'खोलें →' : 'Open →'}
                </Link>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ──────────────────────────────────────────────────────────
          4. RECENT ALERTS & ADVISORY TRACK
          ────────────────────────────────────────────────────────── */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Spray & Weather Warning */}
        <div className="rounded-3xl bg-amber-50/80 p-5 border border-amber-200 flex items-start gap-3.5">
          <span className="text-3xl">⚠️</span>
          <div className="flex-1">
            <span className="text-[10px] font-black uppercase text-amber-900 tracking-wider">
              {isHi ? 'छिड़काव चेतावनी' : 'Pesticide Warning'}
            </span>
            <h4 className="text-sm font-black text-amber-900 mt-0.5">
              {isHi ? 'कल दोपहर कीटनाशक न छिड़कें' : 'Do not spray pesticides tomorrow'}
            </h4>
            <p className="mt-1 text-xs text-amber-800 leading-relaxed font-medium">
              {isHi
                ? 'कल दोपहर 25 किमी/घंटा हवा और बूंदाबांदी का अनुमान है। दवा धुलने से पैसे का नुकसान होगा।'
                : 'Gusty winds and showers expected tomorrow afternoon. Avoid spraying to prevent chemical runoff.'}
            </p>
          </div>
        </div>

        {/* Krishi AI Direct Link */}
        <div className="rounded-3xl bg-gradient-to-r from-[#186049] to-[#1d6b52] p-5 text-white shadow-md flex items-center justify-between gap-4">
          <div>
            <span className="text-[10px] font-black uppercase text-[#ECE8AF] tracking-wider">
              24x7 Claude Agronomist
            </span>
            <h4 className="text-base font-black text-white mt-0.5">
              {isHi ? 'कृषि एआई सहायक से पूछें' : 'Chat with Krishi AI'}
            </h4>
            <p className="mt-1 text-xs text-emerald-100 font-medium max-w-xs">
              {isHi
                ? 'खाद, बीज, रोग या सरकारी योजनाओं का समाधान पाएं।'
                : 'Ask questions about pests, seeds, and soil in your language.'}
            </p>
          </div>
          <Link
            href="/chat"
            className="px-4 py-2.5 rounded-xl bg-[#ECE8AF] text-[#186049] text-xs font-black shadow hover:bg-white transition whitespace-nowrap active:scale-95"
          >
            {isHi ? 'चैट करें →' : 'Chat Now →'}
          </Link>
        </div>
      </section>
    </div>
  );
}
