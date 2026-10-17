'use client';

import React, { useState } from 'react';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import { useVoice } from '@/lib/voice/VoiceContext';
import { PRIMARY_FIELD } from '@/lib/data/mockData';
import { LanguageCode } from '@/lib/i18n/translations';

export default function SettingsPage() {
  const { t, language, setLanguage, languages } = useLanguage();
  const { speak } = useVoice();

  const [voiceSpeed, setVoiceSpeed] = useState('0.95');
  const [offlineStatus, setOfflineStatus] = useState('All field data cached locally in IndexedDB');
  const [voiceConsent, setVoiceConsent] = useState(true);

  const handleLanguageChange = (code: LanguageCode) => {
    setLanguage(code);
    const confirmationText: Record<LanguageCode, string> = {
      hi: 'भाषा बदलकर हिंदी कर दी गई है। धरादृष्टि में आपका स्वागत है।',
      en: 'Language changed to English. Welcome to DharaDrishti.',
      pa: 'ਬੋਲੀ ਬਦਲ ਕੇ ਪੰਜਾਬੀ ਕਰ ਦਿੱਤੀ ਗਈ ਹੈ। ਧਰਾਦ੍ਰਿਸ਼ਟੀ ਵਿੱਚ ਜੀ ਆਇਆਂ ਨੂੰ।',
      ta: 'மொழி தமிழுக்கு மாற்றப்பட்டது. தராதிருஷ்டிக்கு நல்வரவு.',
      te: 'భాష తెలుగులోకి మార్చబడింది. ధరాదృష్టికి స్వాగతం.',
      mr: 'भाषा बदलून मराठी केली आहे. धरादृष्टीमध्ये आपले स्वागत आहे.',
      gu: 'ભાષા બદલીને ગુજરાતી કરવામાં આવી છે. ધરાદ્રષ્ટિમાં આપનું સ્વાગત છે.',
      bn: 'ভাষা পরিবর্তন করে বাংলা করা হয়েছে। ধরাদৃষ্টিতে আপনাকে স্বাগতম।',
      kn: 'ಭಾಷೆಯನ್ನು ಕನ್ನಡಕ್ಕೆ ಬದಲಾಯಿಸಲಾಗಿದೆ. ಧರಾದೃಷ್ಟಿಗೆ ಸುಸ್ವಾಗತ.',
      ml: 'ഭാഷ മലയാളത്തിലേക്ക് മാറ്റി. ധരാദൃഷ്ടിയിലേക്ക് സ്വാഗതം.',
    };
    speak(confirmationText[code] || 'Language updated');
  };

  const handleTestVoice = () => {
    speak(
      language === 'hi'
        ? 'धरादृष्टि आवाज़ परीक्षण सफल रहा। आप किसी भी समय बोलकर खेत का प्रबंधन कर सकते हैं।'
        : 'DharaDrishti voice synthesis test successful. You can speak commands at any time.'
    );
  };

  const handleSyncOffline = () => {
    setOfflineStatus('Syncing GPS traces, disease records, and stock ledger...');
    setTimeout(() => {
      setOfflineStatus('Sync Complete: 1 field, 2 disease photos, 49 qtl stock uploaded safely.');
      speak(language === 'hi' ? 'ऑफलाइन डेटा सुरक्षित सिंक हो गया है।' : 'Offline data synced safely.');
    }, 1500);
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="bg-white p-5 rounded-3xl shadow-sm border border-gray-100 flex items-center justify-between">
        <div>
          <span className="text-xs font-bold text-[#186049] uppercase tracking-wider">
            ⚙️ App Preferences & Localisation
          </span>
          <h1 className="text-2xl font-black text-[#186049]">
            {t('settings', 'Settings & Language Preferences')}
          </h1>
          <p className="text-xs sm:text-sm text-gray-500 mt-0.5">
            Configure regional language, voice assistant speed, offline synchronization, and farmer profile.
          </p>
        </div>
      </div>

      {/* Regional Language Selection Grid */}
      <div className="rounded-3xl bg-white p-6 shadow-sm border border-gray-100 space-y-4">
        <div>
          <h3 className="font-extrabold text-base text-[#186049]">
            🌐 Choose Regional Language (भाषा चुनें)
          </h3>
          <p className="text-xs text-gray-500">
            Entire platform translates instantly across geo-fencing, disease detection, weather, and voice synthesizer.
          </p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          {languages.map((l) => (
            <button
              key={l.code}
              onClick={() => handleLanguageChange(l.code)}
              className={`p-3.5 rounded-2xl border text-center transition flex flex-col items-center justify-center gap-1 active:scale-95 ${
                language === l.code
                  ? 'bg-[#186049] text-white border-[#186049] shadow-md ring-2 ring-[#4A943E]'
                  : 'bg-gray-50 border-gray-200 text-gray-800 hover:bg-[#ECE8AF]/30'
              }`}
            >
              <span className="text-2xl">{l.flag}</span>
              <span className="font-black text-sm">{l.nativeName}</span>
              <span
                className={`text-[11px] ${
                  language === l.code ? 'text-[#ECE8AF]' : 'text-gray-400'
                }`}
              >
                {l.name}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Voice Assistant Controls */}
      <div className="rounded-3xl bg-white p-6 shadow-sm border border-gray-100 space-y-4">
        <div className="flex items-center justify-between border-b pb-3">
          <div>
            <h3 className="font-extrabold text-base text-[#186049]">
              🎤 Voice Engine & Speech Synthesis
            </h3>
            <p className="text-xs text-gray-500">
              Web Speech STT/TTS tuned for rural Indian accents and cadence
            </p>
          </div>
          <button
            onClick={handleTestVoice}
            className="px-4 py-2 rounded-xl bg-[#4A943E] text-white font-bold text-xs hover:bg-[#3d7d33] transition"
          >
            🔊 Test Voice Output
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">
              Speech Rate (Speaking Speed)
            </label>
            <select
              value={voiceSpeed}
              onChange={(e) => setVoiceSpeed(e.target.value)}
              className="w-full px-3 py-2 text-sm border rounded-xl"
            >
              <option value="0.85">Slower (0.85x) — Recommended for noisy fields</option>
              <option value="0.95">Standard Cadence (0.95x)</option>
              <option value="1.0">Fast (1.0x)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">
              Active Voice Model
            </label>
            <div className="p-2.5 rounded-xl bg-gray-50 border text-xs font-semibold text-[#186049]">
              🗣️ Sarvam Indic Voice Synthesis Engine (Fallback: WebSpeech API)
            </div>
          </div>
        </div>
      </div>

      {/* Offline Sync & Storage */}
      <div className="rounded-3xl bg-white p-6 shadow-sm border border-gray-100 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b pb-3 gap-2">
          <div>
            <h3 className="font-extrabold text-base text-[#186049]">
              📶 Offline Capability & Storage Queue
            </h3>
            <p className="text-xs text-gray-500">{offlineStatus}</p>
          </div>

          <button
            onClick={handleSyncOffline}
            className="px-4 py-2 rounded-xl bg-[#186049] text-white font-bold text-xs hover:bg-[#124b39] transition"
          >
            🔄 Sync Cloud Queue
          </button>
        </div>

        <div className="grid grid-cols-3 gap-3 text-center text-xs">
          <div className="p-3 rounded-2xl bg-gray-50 border">
            <span className="text-gray-400 block">GPS Boundaries</span>
            <span className="font-bold text-sm text-[#186049]">1 Cached</span>
          </div>
          <div className="p-3 rounded-2xl bg-gray-50 border">
            <span className="text-gray-400 block">Disease Photos</span>
            <span className="font-bold text-sm text-[#186049]">2 Offline</span>
          </div>
          <div className="p-3 rounded-2xl bg-gray-50 border">
            <span className="text-gray-400 block">Stock Ledger</span>
            <span className="font-bold text-sm text-[#186049]">49 Quintals</span>
          </div>
        </div>
      </div>

      {/* Farmer Profile & Consent */}
      <div className="rounded-3xl bg-white p-6 shadow-sm border border-gray-100 space-y-4">
        <h3 className="font-extrabold text-base text-[#186049]">
          👤 Farmer Profile & Consent Flags
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          <div className="p-3 rounded-2xl bg-gray-50 border">
            <span className="text-gray-400">Farmer Name:</span>
            <div className="font-bold text-sm text-[#186049]">{PRIMARY_FIELD.farmerName}</div>
          </div>
          <div className="p-3 rounded-2xl bg-gray-50 border">
            <span className="text-gray-400">Village & District:</span>
            <div className="font-bold text-sm text-[#186049]">{PRIMARY_FIELD.village}, {PRIMARY_FIELD.district}</div>
          </div>
          <div className="p-3 rounded-2xl bg-gray-50 border">
            <span className="text-gray-400">Soil Card ID:</span>
            <div className="font-bold text-sm text-[#186049]">{PRIMARY_FIELD.soilHealth.sampleId}</div>
          </div>
          <div className="p-3 rounded-2xl bg-gray-50 border flex items-center justify-between">
            <div>
              <span className="text-gray-400">Voice Boundary Consent:</span>
              <div className="font-bold text-[#186049]">{voiceConsent ? 'Granted ✅' : 'Revoked ❌'}</div>
            </div>
            <button
              onClick={() => setVoiceConsent(!voiceConsent)}
              className="text-xs underline text-gray-500 font-semibold"
            >
              Toggle
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
