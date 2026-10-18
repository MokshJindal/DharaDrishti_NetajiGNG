'use client';

import { useState, useRef, useCallback } from 'react';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import { useVoice } from '@/lib/voice/VoiceContext';

const VOICE_COMMANDS_BY_LANG: Record<string, { label: string; cmd: string; icon: string }[]> = {
  hi: [
    { label: 'खेत और मेड़ नापो (Field Map)', cmd: 'खेत दिखाओ', icon: '🗺️' },
    { label: 'पत्ती की बीमारी जांचो (Leaf Doctor)', cmd: 'पत्ती की बीमारी', icon: '🔬' },
    { label: 'सिंचाई और पानी सलाह (Irrigation)', cmd: 'पानी कब लगाएं', icon: '💧' },
    { label: 'खाद और NPK मात्रा (Fertiliser)', cmd: 'खाद की मात्रा', icon: '🧪' },
    { label: 'ताज़ा मंडी भाव (Mandi Rates)', cmd: 'मंडी भाव', icon: '💰' },
    { label: 'आज और कल का मौसम (Weather)', cmd: 'मौसम बताओ', icon: '⛅' },
    { label: 'फसल क्रेडिट स्कोर (Fasal Score)', cmd: 'फसल स्कोर', icon: '📊' },
  ],
  pa: [
    { label: 'ਖੇਤ ਅਤੇ ਹੱਦ ਵੇਖੋ (Field Map)', cmd: 'ਖੇਤ ਦਿਖਾਓ', icon: '🗺️' },
    { label: 'ਫ਼ਸਲ ਦੀ ਬਿਮਾਰੀ ਜਾਂਚ (Leaf Doctor)', cmd: 'ਬਿਮਾਰੀ ਜਾਂਚ', icon: '🔬' },
    { label: 'ਸਿੰਚਾਈ ਅਤੇ ਪਾਣੀ (Irrigation)', cmd: 'ਪਾਣੀ ਕਦੋਂ ਲਾਈਏ', icon: '💧' },
    { label: 'ਖਾਦ ਦੀ ਮਾਤਰਾ (Fertiliser)', cmd: 'ਖਾਦ ਦੀ ਮਾਤਰਾ', icon: '🧪' },
    { label: 'ਮੰਡੀ ਦਾ ਰੇਟ (Mandi Rates)', cmd: 'ਮੰਡੀ ਰੇਟ', icon: '💰' },
    { label: 'ਮੌਸਮ ਦਾ ਹਾਲ (Weather)', cmd: 'ਮੌਸਮ ਦੱਸੋ', icon: '⛅' },
  ],
  mr: [
    { label: 'शेताचा नकाशा व सीमा (Field Map)', cmd: 'शेत दाखवा', icon: '🗺️' },
    { label: 'पीक रोग निदान (Leaf Doctor)', cmd: 'रोगाची तपासणी', icon: '🔬' },
    { label: 'पाणी व सिंचन सल्ला (Irrigation)', cmd: 'पाणी कधी द्यायचे', icon: '💧' },
    { label: 'खतांची मात्रा (Fertiliser)', cmd: 'खत मात्रा', icon: '🧪' },
    { label: 'बाजार भाव (Mandi Rates)', cmd: 'मंडी भाव', icon: '💰' },
    { label: 'हवामान माहिती (Weather)', cmd: 'हवामान सांगा', icon: '⛅' },
  ],
  en: [
    { label: 'Measure Field Boundary', cmd: 'Show my fields', icon: '🗺️' },
    { label: 'Diagnose Crop Disease', cmd: 'Diagnose leaf', icon: '🔬' },
    { label: 'Irrigation & Rain Radar', cmd: 'Check irrigation', icon: '💧' },
    { label: 'Fertiliser & NPK Dose', cmd: 'Fertiliser dose', icon: '🧪' },
    { label: 'APMC Mandi Rates', cmd: 'Mandi price', icon: '💰' },
    { label: 'Weather & Spray Advice', cmd: 'Check weather', icon: '⛅' },
    { label: 'Fasal Health Score', cmd: 'Fasal score', icon: '📊' },
  ],
};

export default function VoiceButton() {
  const { language, t } = useLanguage();
  const {
    isListening,
    isProcessing,
    isSpeaking,
    transcript,
    toggleListening,
    stopSpeaking,
    speak,
  } = useVoice();

  const [showSuggestions, setShowSuggestions] = useState(false);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const suggestions =
    VOICE_COMMANDS_BY_LANG[language] || VOICE_COMMANDS_BY_LANG.hi;

  const handlePointerDown = useCallback(() => {
    longPressTimer.current = setTimeout(() => {
      setShowSuggestions(true);
    }, 500);
  }, []);

  const handlePointerUp = useCallback(() => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  }, []);

  const handleMicClick = useCallback(() => {
    if (isSpeaking) {
      stopSpeaking();
      return;
    }
    if (showSuggestions) {
      setShowSuggestions(false);
      return;
    }
    toggleListening();
  }, [isSpeaking, showSuggestions, stopSpeaking, toggleListening]);

  const handleSuggestionClick = useCallback(
    (cmd: string) => {
      setShowSuggestions(false);
      // Trigger voice command directly
      const inputEvent = new CustomEvent('voice_suggestion', { detail: cmd });
      window.dispatchEvent(inputEvent);
      // Also speak confirmation
      speak(cmd);
    },
    [speak]
  );

  return (
    <div className="fixed bottom-20 right-4 z-50 md:bottom-6 md:right-6">
      {/* Live Transcript / Status bubble */}
      {(isListening || isProcessing || isSpeaking) && (
        <div className="animate-fadeIn absolute bottom-16 right-0 mb-3 w-64 rounded-2xl bg-white p-3.5 shadow-xl border border-gray-100">
          <div className="flex items-center justify-between pb-1.5 border-b border-gray-100 mb-2">
            <span className="text-[11px] font-bold tracking-wider uppercase text-[#186049] flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-ping" />
              {isListening
                ? (language === 'en' ? 'Listening...' : 'सुन रहा हूँ... (Listening)')
                : isProcessing
                ? (language === 'en' ? 'Analyzing voice command...' : 'AI समझ रहा है... (Analyzing)')
                : (language === 'en' ? 'Speaking...' : 'बोल रहा हूँ... (Speaking)')}
            </span>
            {isSpeaking && (
              <button
                onClick={stopSpeaking}
                className="text-[10px] font-bold bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full hover:bg-amber-200"
              >
                {language === 'en' ? 'Stop' : 'चुप रहें (Stop)'}
              </button>
            )}
          </div>
          <p className="text-xs text-gray-800 font-medium leading-relaxed">
            {transcript ||
              (isProcessing
                ? (language === 'en' ? 'Routing to feature...' : 'आदेश का विश्लेषण जारी है... (Routing)')
                : (language === 'en' ? 'Speak your command...' : 'कृपया अपना सवाल या आदेश बोलें... (Speak)'))}
          </p>
          <div className="absolute -bottom-1.5 right-6 h-3 w-3 rotate-45 bg-white border-b border-r border-gray-100" />
        </div>
      )}

      {/* Voice suggestions modal for low-tech farmers */}
      {showSuggestions && (
        <div className="animate-slideUp absolute bottom-16 right-0 mb-3 w-72 overflow-hidden rounded-2xl bg-white shadow-2xl border border-emerald-100">
          <div className="bg-[#186049] text-white px-4 py-2.5 flex items-center justify-between">
            <div>
              <p className="text-xs font-bold">
                {language === 'en'
                  ? 'Voice Command Shortcuts'
                  : language === 'pa'
                  ? 'ਬੋਲਣ ਦੀਆਂ ਉਦਾਹਰਣਾਂ (Shortcuts)'
                  : language === 'mr'
                  ? 'बोलण्याचे उदाहरण (Shortcuts)'
                  : 'बोलने के उदाहरण (Voice Shortcuts)'}
              </p>
              <p className="text-[10px] text-emerald-100 opacity-90">
                {language === 'en'
                  ? 'Tap the mic and speak in your language'
                  : 'माइक दबाकर अपनी भाषा में बोलें (Tap & Speak)'}
              </p>
            </div>
            <button
              onClick={() => setShowSuggestions(false)}
              className="text-white hover:text-gray-200 text-lg font-bold px-1"
            >
              ×
            </button>
          </div>
          <div className="p-2 divide-y divide-gray-50 max-h-72 overflow-y-auto">
            {suggestions.map((item) => (
              <button
                key={item.cmd}
                className="w-full px-3 py-2 text-left text-xs font-semibold text-gray-700 transition-colors hover:bg-emerald-50 rounded-lg flex items-center gap-2.5 group"
                onClick={() => handleSuggestionClick(item.cmd)}
              >
                <span className="text-base group-hover:scale-110 transition-transform">
                  {item.icon}
                </span>
                <span className="flex-1">{item.label}</span>
                <span className="text-[10px] font-mono text-gray-400 group-hover:text-[#4A943E]">
                  &ldquo;{item.cmd}&rdquo;
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Mic Floating Action Button */}
      <div className="relative group">
        <button
          onClick={handleMicClick}
          onPointerDown={handlePointerDown}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerUp}
          aria-label={
            isSpeaking
              ? (language === 'en' ? 'Stop speaking' : 'बोलना बंद करें (Stop)')
              : isListening
              ? (language === 'en' ? 'Stop listening' : 'सुनना बंद करें (Stop)')
              : (language === 'en' ? 'Start voice navigator' : 'बोलकर काम करें (Voice)')
          }
          className={`flex h-14 w-14 items-center justify-center rounded-full shadow-2xl transition-all duration-300 active:scale-95 border-2 ${
            isSpeaking
              ? 'bg-[#B98327] border-amber-300 text-white animate-pulse'
              : isListening
              ? 'bg-red-600 border-red-300 text-white animate-pulse ring-4 ring-red-200'
              : isProcessing
              ? 'bg-[#186049] border-emerald-300 text-white animate-spin'
              : 'bg-[#4A943E] hover:bg-[#3d7d33] border-emerald-400 text-white hover:scale-105'
          }`}
        >
          {isListening ? (
            /* Animated audio spectrum bars while listening */
            <div className="flex items-center gap-1">
              <span className="w-1 h-5 bg-white rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
              <span className="w-1 h-7 bg-white rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
              <span className="w-1 h-4 bg-white rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
          ) : isSpeaking ? (
            /* Speaker sound waves icon */
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" fill="currentColor" />
              <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
              <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
            </svg>
          ) : isProcessing ? (
            /* Loading spinner */
            <svg
              className="animate-spin h-6 w-6 text-white"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8v8H4z"
              />
            </svg>
          ) : (
            /* Clean high-contrast Mic icon */
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <rect x="9" y="2" width="6" height="12" rx="3" fill="currentColor" stroke="none" />
              <path d="M5 10v1a7 7 0 0 0 14 0v-1" />
              <line x1="12" y1="18" x2="12" y2="22" />
              <line x1="8" y1="22" x2="16" y2="22" />
            </svg>
          )}
        </button>

        {/* Quick tooltip on desktop hover */}
        {!isListening && !isSpeaking && !showSuggestions && (
          <div className="hidden md:group-hover:flex absolute right-16 top-2.5 items-center bg-gray-900 text-white text-xs font-semibold px-2.5 py-1.5 rounded-lg whitespace-nowrap shadow-lg">
            <span>{language === 'en' ? 'Speak Voice Command' : 'बोलकर पूछें (Voice Navigator)'}</span>
            <span className="ml-2 text-[10px] text-gray-400">
              {language === 'en' ? 'Hold: examples' : 'दबाए रखें: विकल्प (Hold)'}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
