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
        ? `राम राम किसान भाई! धरादृष्टि में आपका स्वागत है। आपके शिरूर खेत का कुल रकबा 4.8 एकड़ है। आज मौसम साफ है और तापमान 32 डिग्री है। कल 18 मिलीमीटर बारिश का अनुमान है, इसलिए आज खेत में पानी न दें। आपका फसल स्वास्थ्य स्कोर 78 है जो बहुत बढ़िया है। किसी भी सवाल के लिए माइक दबाकर बोलें।`
        : language === 'pa'
        ? `ਸਤਿ ਸ੍ਰੀ ਅਕਾਲ ਕਿਸਾਨ ਵੀਰ! ਤੁਹਾਡੇ 4.8 ਏਕੜ ਖੇਤ ਵਿੱਚ ਅੱਜ ਮੌਸਮ ਸਾਫ਼ ਹੈ। ਕੱਲ੍ਹ 18 ਮਿਲੀਮੀਟਰ ਮੀਂਹ ਦੀ ਸੰਭਾਵਨਾ ਹੈ, ਇਸ ਲਈ ਅੱਜ ਪਾਣੀ ਨਾ ਦਿਓ।`
        : language === 'mr'
        ? `राम राम शेतकरी बंधू! आपल्या 4.8 एकर शेतात आज हवामान स्वच्छ आहे. उद्या 18 मिमी पावसाचा अंदाज असल्याने आज पाणी देऊ नका.`
        : `Welcome to DharaDrishti! Your farm in Shirur measures 4.8 acres. Today is clear at 32°C. 18mm rainfall is forecast tomorrow, so please skip irrigation today to save water and electricity. Your Fasal Score is 78. Tap the microphone anytime to speak.`;
    speak(text);
  };

  const featureCards = [
    {
      titleEn: 'Field Geofencing & GPS Walk',
      titleHi: 'खेत सीमांकन व जीपीएस वॉक',
      descEn: 'Walk farm boundaries with phone GPS, draw polygons, and auto-calculate acreage.',
      descHi: 'फोन लेकर मेड़ पर चलें, खेत का नक्शा बनाएं और सटीक एकड़ क्षेत्रफल जानें।',
      icon: '🗺️',
      href: '/fields',
      stat: '4.8 Acres',
      tagEn: 'Live GPS GIS',
      tagHi: 'सटीक जीआईएस',
      accentColor: 'border-l-4 border-[#186049]',
      btnBg: 'bg-[#186049] hover:bg-[#0f3d2e]',
    },
    {
      titleEn: 'Soil Health & NPK Calculator',
      titleHi: 'मृदा स्वास्थ्य व खाद कैलकुलेटर',
      descEn: 'Instant Urea, DAP & MOP bag calculations from official Soil Health Card #SHC-MH-2026.',
      descHi: 'सॉइल हेल्थ कार्ड अनुसार यूरिया, डीएपी और पोटाश की सटीक बोरियों की मात्रा जानें।',
      icon: '🧪',
      href: '/fertiliser',
      stat: 'SHC Verified',
      tagEn: 'ICAR Formula',
      tagHi: 'आईसीएआर फार्मूला',
      accentColor: 'border-l-4 border-[#4A943E]',
      btnBg: 'bg-[#4A943E] hover:bg-[#37732d]',
    },
    {
      titleEn: 'AI Leaf Doctor & Crop Clinic',
      titleHi: 'पत्ता डॉक्टर (फसल रोग निदान)',
      descEn: 'Scan diseased leaves for instant organic (neem/buttermilk) & chemical solutions.',
      descHi: 'पत्ते की फोटो खींचें और तुरंत जैविक (नीम/छाछ) व रासायनिक उपचार पाएं।',
      icon: '🌿',
      href: '/diagnose',
      stat: '94% Accuracy',
      tagEn: 'Organic + Chem',
      tagHi: 'जैविक व रासायनिक',
      accentColor: 'border-l-4 border-[#186049]',
      btnBg: 'bg-[#186049] hover:bg-[#0f3d2e]',
    },
    {
      titleEn: 'Smart Irrigation & Rain Skip',
      titleHi: 'स्मार्ट सिंचाई व बारिश रडार',
      descEn: 'Penman-Monteith ET₀ calculation skips wasteful watering before forecasted rain.',
      descHi: 'उपग्रह वाष्पोत्सर्जन (ET₀) से पानी बचाएं। कल बारिश है तो आज पानी बंद रखें।',
      icon: '💧',
      href: '/irrigation',
      stat: 'Save 30% Water',
      tagEn: 'Rain Radar',
      tagHi: 'बारिश अलर्ट',
      accentColor: 'border-l-4 border-[#B98327]',
      btnBg: 'bg-[#B98327] hover:bg-[#92651b]',
    },
    {
      titleEn: 'APMC Mandi Rates & Net Profit',
      titleHi: 'मंडी भाव व शुद्ध मुनाफा',
      descEn: 'Compare live mandi prices across Shirur, Pune & Nashik with net profit range.',
      descHi: 'गेहूं, चना व मक्का के आज के मंडी भाव देखें और लागत काटकर शुद्ध मुनाफा जानें।',
      icon: '💰',
      href: '/profit',
      stat: '₹2,480/q Wheat',
      tagEn: 'Live Mandi',
      tagHi: 'लाइव मंडी',
      accentColor: 'border-l-4 border-[#4A943E]',
      btnBg: 'bg-[#4A943E] hover:bg-[#37732d]',
    },
    {
      titleEn: 'Fasal Health Score & Ledger',
      titleHi: 'फसल स्कोर व भंडार खाता',
      descEn: '0-100 farm health audit across soil, water & weather with voice harvest entry.',
      descHi: 'मिट्टी, पानी और मौसम के आधार पर 100 में से खेत का स्वास्थ्य स्कोर और उपज खाता।',
      icon: '📊',
      href: '/score',
      stat: '78/100 Optimal',
      tagEn: 'Grade A',
      tagHi: 'उत्कृष्ट',
      accentColor: 'border-l-4 border-[#186049]',
      btnBg: 'bg-[#186049] hover:bg-[#0f3d2e]',
    },
  ];

  return (
    <div className="space-y-6">
      {/* ──────────────────────────────────────────────────────────
          HERO SECTION: High-Class Aerial Topographic Visual Banner
          ────────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#0f3d2e] via-[#186049] to-[#124b39] text-white shadow-2xl border border-[#ECE8AF]/30">
        {/* Topographic Contour Overlay Graphic */}
        <div className="absolute inset-0 bg-topo-pattern opacity-90 pointer-events-none" />

        <div className="relative z-10 px-6 py-8 sm:px-10 sm:py-12 lg:px-12 lg:py-14">
          <div className="max-w-3xl">
            {/* Live Badge */}
            <div className="inline-flex items-center gap-2 rounded-full bg-black/40 backdrop-blur-md px-3.5 py-1 text-xs font-black tracking-wide text-[#ECE8AF] border border-[#ECE8AF]/30">
              <span className="h-2 w-2 rounded-full bg-green-400 animate-ping" />
              <span>
                {language === 'hi'
                  ? 'सक्रिय किसान मंच • खरीफ / रबी 2026'
                  : 'Live Platform • Kharif / Rabi 2026'}
              </span>
            </div>

            {/* Main Headline */}
            <h1 className="mt-4 text-3xl font-black tracking-tight text-white sm:text-4xl lg:text-5xl leading-tight">
              {language === 'hi' ? (
                <>
                  स्मार्ट मैपिंग और आवाज से <br />
                  <span className="text-[#ECE8AF] underline decoration-[#B98327] decoration-4 underline-offset-8">
                    किसान की सुरक्षा व समृद्धि
                  </span>
                </>
              ) : (
                <>
                  Empowering Farmers with <br />
                  <span className="text-[#ECE8AF] underline decoration-[#B98327] decoration-4 underline-offset-8">
                    Smart Mapping & Voice AI
                  </span>
                </>
              )}
            </h1>

            {/* Sub-Headline in Clear Language */}
            <p className="mt-4 text-base sm:text-lg font-medium text-emerald-100/90 leading-relaxed max-w-2xl">
              {language === 'hi'
                ? 'धरादृष्टि से अपने फोन को लेकर खेत की मेड़ पर चलें, उपग्रह से सटीक एकड़ नापें, पत्ते की फोटो खींचकर रोग ठीक करें और बोलकर मंडी भाव जानें — सब कुछ अपनी मातृभाषा में।'
                : 'DharaDrishti helps you walk your field boundaries with GPS, check soil health, get instant leaf disease solutions, time irrigation with satellite ET₀, and track mandi profits — in your mother tongue, just by speaking.'}
            </p>

            {/* Prominent Action Buttons */}
            <div className="mt-8 flex flex-wrap items-center gap-3 sm:gap-4">
              {/* Primary: Explore Farm Map */}
              <Link
                href="/fields"
                className="flex items-center gap-2.5 rounded-2xl bg-[#4A943E] px-6 py-3.5 text-sm sm:text-base font-black text-white shadow-lg shadow-black/20 hover:bg-[#37732d] hover:scale-105 transition active:scale-95 border border-[#ECE8AF]/30"
              >
                <span>🗺️</span>
                <span>{language === 'hi' ? 'खेत का नक्शा देखें' : 'Explore Farm Map'}</span>
                <span>→</span>
              </Link>

              {/* Secondary: Speak / Voice Help */}
              <button
                onClick={toggleListening}
                className={`flex items-center gap-2.5 rounded-2xl px-5 py-3.5 text-sm sm:text-base font-black shadow-lg transition active:scale-95 ${
                  isListening
                    ? 'bg-[#B98327] text-white animate-voice-pulse'
                    : 'bg-[#ECE8AF] text-[#186049] hover:bg-white'
                }`}
              >
                <span className="text-lg">🎙️</span>
                <span>
                  {isListening
                    ? t('voiceListening', 'Listening…')
                    : language === 'hi'
                    ? 'बोलकर पूछें'
                    : 'Speak to Assistant'}
                </span>
              </button>

              {/* Audio Readout Greeting */}
              <button
                onClick={playVoiceGreeting}
                className="flex items-center gap-2 rounded-2xl bg-white/15 backdrop-blur-md px-4 py-3.5 text-sm font-bold text-white hover:bg-white/25 transition active:scale-95 border border-white/20"
                title="Listen to audio summary"
              >
                <span>🔊</span>
                <span className="hidden sm:inline">
                  {language === 'hi' ? 'आवाज में सुनें' : 'Audio Brief'}
                </span>
              </button>
            </div>

            {/* Voice feedback indicator */}
            {lastAction && (
              <div className="mt-4 inline-flex items-center gap-2 rounded-xl bg-black/40 px-3 py-1 text-xs text-[#ECE8AF]">
                <span>✨</span>
                <span>{lastAction.feedback}</span>
              </div>
            )}
          </div>
        </div>

        {/* Bottom Banner Accent Stripe */}
        <div className="h-2 w-full bg-gradient-to-r from-[#B98327] via-[#ECE8AF] to-[#4A943E]" />
      </section>

      {/* ──────────────────────────────────────────────────────────
          LIVE KISAN STATUS TICKER (Instant snapshot for farmer)
          ────────────────────────────────────────────────────────── */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Weather Card */}
        <Link
          href="/weather"
          className="rounded-2xl bg-white p-4 shadow-sm border border-gray-200 hover:border-[#186049] hover:shadow-md transition"
        >
          <div className="flex items-center justify-between text-xs text-gray-500 font-bold">
            <span>{language === 'hi' ? 'आज का मौसम' : "Today's Weather"}</span>
            <span className="text-xl">{todayWeather.icon}</span>
          </div>
          <div className="mt-2 flex items-baseline gap-1">
            <span className="text-2xl sm:text-3xl font-black text-[#186049]">{todayWeather.tempMax}°C</span>
            <span className="text-xs text-gray-500 font-medium">/ {todayWeather.tempMin}°C</span>
          </div>
          <p className="mt-1 text-xs font-semibold text-gray-700 truncate">
            {todayWeather.condition} • {PRIMARY_FIELD.village}
          </p>
        </Link>

        {/* Smart Irrigation Card */}
        <Link
          href="/irrigation"
          className="rounded-2xl bg-[#ECE8AF]/50 p-4 shadow-sm border border-[#B98327]/30 hover:border-[#B98327] hover:shadow-md transition"
        >
          <div className="flex items-center justify-between text-xs text-[#186049] font-bold">
            <span>{language === 'hi' ? 'सिंचाई सलाह' : 'Water Status'}</span>
            <span className="text-xl">⛈️</span>
          </div>
          <div className="mt-2">
            <span className="text-base sm:text-lg font-black text-[#B98327] leading-tight block">
              {language === 'hi' ? 'आज पानी न दें' : 'Skip Watering'}
            </span>
          </div>
          <p className="mt-1 text-xs text-[#186049]/90 font-medium">
            {language === 'hi' ? 'कल 18 मिमी बारिश होगी' : '18mm rain expected tomorrow'}
          </p>
        </Link>

        {/* Mandi Rate Card */}
        <Link
          href="/profit"
          className="rounded-2xl bg-white p-4 shadow-sm border border-gray-200 hover:border-[#4A943E] hover:shadow-md transition"
        >
          <div className="flex items-center justify-between text-xs text-gray-500 font-bold">
            <span>{language === 'hi' ? 'शिरूर मंडी भाव (गेहूं)' : 'APMC Wheat Rate'}</span>
            <span className="text-xs font-bold text-green-700 bg-green-100 px-1.5 py-0.5 rounded">
              ▲ +₹60
            </span>
          </div>
          <div className="mt-2 flex items-baseline gap-1">
            <span className="text-2xl sm:text-3xl font-black text-[#186049]">₹2,480</span>
            <span className="text-xs text-gray-500 font-medium">/ क्विंटल</span>
          </div>
          <p className="mt-1 text-xs text-gray-600 font-medium">
            {language === 'hi' ? 'एमएसपी: ₹2,425 • लाभ: ₹42,500/एकड़' : 'MSP: ₹2,425 • Net Profit: ₹42.5k'}
          </p>
        </Link>

        {/* Fasal Health Score */}
        <Link
          href="/score"
          className="rounded-2xl bg-white p-4 shadow-sm border border-gray-200 hover:border-[#186049] hover:shadow-md transition"
        >
          <div className="flex items-center justify-between text-xs text-gray-500 font-bold">
            <span>{language === 'hi' ? 'खेत स्वास्थ्य स्कोर' : 'Fasal Health'}</span>
            <span className="text-xs font-bold text-[#186049] bg-[#ECE8AF] px-2 py-0.5 rounded-full">
              {MOCK_FASAL_SCORE_DETAILS.grade}
            </span>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-black text-[#186049]">78</span>
            <span className="text-xs text-gray-500 font-medium">/ 100</span>
          </div>
          <div className="mt-1.5 w-full bg-gray-100 rounded-full h-2 overflow-hidden">
            <div className="bg-[#4A943E] h-2 rounded-full w-[78%]" />
          </div>
        </Link>
      </section>

      {/* ──────────────────────────────────────────────────────────
          MAIN FEATURE GRID: Organized, Clean & Aligned Cards
          ────────────────────────────────────────────────────────── */}
      <section>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 mb-4">
          <div>
            <h2 className="text-xl sm:text-2xl font-black text-[#186049] tracking-tight">
              {language === 'hi' ? 'प्रमुख किसान सेवाएं' : 'Key Farm Services'}
            </h2>
            <p className="text-xs sm:text-sm text-gray-600 font-medium">
              {language === 'hi'
                ? 'सभी सुविधाएं बोलकर या स्क्रीन छूकर आसानी से इस्तेमाल करें'
                : 'All features easily operated via voice command or touch'}
            </p>
          </div>
          <span className="text-xs font-bold text-[#B98327] bg-[#ECE8AF]/60 px-3 py-1 rounded-full self-start sm:self-auto">
            100% Voice Enabled 🎙️
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
          {featureCards.map((card, idx) => (
            <div
              key={idx}
              className={`group flex flex-col justify-between rounded-3xl bg-white p-5 sm:p-6 shadow-sm border border-gray-200 hover:shadow-xl transition-all duration-200 ${card.accentColor}`}
            >
              <div>
                {/* Header: Icon + Badge */}
                <div className="flex items-center justify-between">
                  <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#f5f8f4] text-2xl group-hover:scale-110 transition shadow-inner">
                    {card.icon}
                  </span>
                  <span className="text-xs font-extrabold px-2.5 py-1 rounded-full bg-gray-100 text-gray-700 group-hover:bg-[#ECE8AF] group-hover:text-[#186049] transition">
                    {language === 'hi' ? card.tagHi : card.tagEn}
                  </span>
                </div>

                {/* Title */}
                <h3 className="mt-4 text-lg font-black text-[#186049] group-hover:text-[#4A943E] transition leading-snug">
                  {language === 'hi' ? card.titleHi : card.titleEn}
                </h3>

                {/* Description */}
                <p className="mt-2 text-xs sm:text-sm text-gray-600 font-medium leading-relaxed">
                  {language === 'hi' ? card.descHi : card.descEn}
                </p>
              </div>

              {/* Bottom Card Action */}
              <div className="mt-5 pt-4 border-t border-gray-100 flex items-center justify-between">
                <span className="text-xs font-extrabold text-[#B98327]">
                  {card.stat}
                </span>
                <Link
                  href={card.href}
                  className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-black text-white shadow-sm transition active:scale-95 ${card.btnBg}`}
                >
                  <span>{language === 'hi' ? 'खोलें' : 'Open'}</span>
                  <span>→</span>
                </Link>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ──────────────────────────────────────────────────────────
          DIRECT ADVISORY ALERT BANNER
          ────────────────────────────────────────────────────────── */}
      <section className="rounded-3xl bg-white p-5 sm:p-6 shadow-sm border border-gray-200">
        <div className="flex items-center justify-between border-b border-gray-100 pb-3">
          <div className="flex items-center gap-2">
            <span className="text-2xl">📢</span>
            <h3 className="text-base sm:text-lg font-black text-[#186049]">
              {language === 'hi' ? 'कृषि विज्ञान केंद्र (KVK) दैनिक सलाह' : 'KVK Agricultural Advisory'}
            </h3>
          </div>
          <span className="text-xs font-bold text-gray-500">पुणे जिला (Pune)</span>
        </div>

        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
          <div className="rounded-2xl bg-amber-50/80 p-4 border border-amber-200 flex items-start gap-3">
            <span className="text-2xl">⚠️</span>
            <div className="flex-1">
              <h4 className="text-sm font-black text-amber-900">
                {language === 'hi' ? 'कीटनाशक छिड़काव चेतावनी' : 'Spray Weather Warning'}
              </h4>
              <p className="mt-1 text-xs text-amber-800 font-medium leading-relaxed">
                {language === 'hi'
                  ? 'कल दोपहर 25 किमी/घंटा रफ्तार से हवा चलने व हल्की बूंदाबांदी का अनुमान है। कीटनाशक न छिड़कें — दवा बहने से पैसे का नुकसान होगा।'
                  : 'Gusty winds (25 km/h) and showers expected tomorrow afternoon. Do not spray chemicals — runoff will waste expensive sprays.'}
              </p>
            </div>
            <button
              onClick={() =>
                speak(
                  language === 'hi'
                    ? 'कल दोपहर हवा और बारिश का अनुमान है। कीटनाशक का छिड़काव न करें।'
                    : 'Do not spray pesticides tomorrow due to winds and rain.'
                )
              }
              className="rounded-xl bg-amber-200/80 px-2.5 py-1.5 text-xs font-black text-amber-900 shadow-sm"
              title="Speak warning"
            >
              🔊
            </button>
          </div>

          <div className="rounded-2xl bg-emerald-50/80 p-4 border border-emerald-200 flex items-start gap-3">
            <span className="text-2xl">🌾</span>
            <div className="flex-1">
              <h4 className="text-sm font-black text-emerald-900">
                {language === 'hi' ? 'पीला रतुआ (Yellow Rust) निगरानी' : 'Pest Watch: Yellow Rust'}
              </h4>
              <p className="mt-1 text-xs text-emerald-800 font-medium leading-relaxed">
                {language === 'hi'
                  ? 'शिरूर ब्लॉक में गेहूं पर पीले रतुए की हल्की शिकायतें आई हैं। सुबह के समय पत्तों पर पीली धारियां जांचें। संदेह हो तो फोटो खींचकर डॉक्टर में अपलोड करें।'
                  : 'Minor yellow rust notices reported in Shirur block. Inspect morning flag leaves. Scan via Leaf Doctor for instant cure.'}
              </p>
            </div>
            <Link
              href="/diagnose"
              className="rounded-xl bg-emerald-200/80 px-3 py-1.5 text-xs font-black text-emerald-900 shadow-sm self-center whitespace-nowrap"
            >
              {language === 'hi' ? 'पत्ता जांचें' : 'Scan Leaf'}
            </Link>
          </div>
        </div>
      </section>

      {/* ──────────────────────────────────────────────────────────
          KRISHI MITRA QUICK PROMPT BAR
          ────────────────────────────────────────────────────────── */}
      <section className="rounded-3xl bg-gradient-to-r from-[#186049] to-[#4A943E] p-6 text-white shadow-xl flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#ECE8AF] text-3xl text-[#186049] shadow-md">
            💬
          </div>
          <div>
            <h3 className="text-lg font-black text-white">
              {language === 'hi' ? '24x7 कृषि मित्र AI से बात करें' : 'Talk to Krishi Mitra 24x7 AI'}
            </h3>
            <p className="text-xs sm:text-sm text-[#ECE8AF] font-medium">
              {language === 'hi'
                ? 'बीज, खाद, सब्सिडी, मंडी भाव या फसल रोग के बारे में कोई भी सवाल बोलकर पूछें'
                : 'Ask anything about seeds, fertilizers, government schemes, or plant health in your mother tongue'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          <Link
            href="/chat"
            className="flex-1 md:flex-initial text-center rounded-xl bg-white px-5 py-3 text-xs sm:text-sm font-black text-[#186049] shadow hover:bg-[#ECE8AF] transition active:scale-95"
          >
            {language === 'hi' ? 'कृषि मित्र से चैट करें' : 'Open AI Chat'}
          </Link>
          <button
            onClick={toggleListening}
            className="flex-1 md:flex-initial text-center rounded-xl bg-[#B98327] px-5 py-3 text-xs sm:text-sm font-black text-white shadow hover:bg-[#92651b] transition active:scale-95"
          >
            {isListening ? 'सुन रहे हैं…' : 'बोलकर पूछें 🎙️'}
          </button>
        </div>
      </section>
    </div>
  );
}
