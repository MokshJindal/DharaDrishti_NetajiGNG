'use client';

import React, { useState } from 'react';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import { useVoice, VOICE_ROUTES } from '@/lib/voice/VoiceContext';

export default function VoiceButton() {
  const { language } = useLanguage();
  const {
    isListening,
    isProcessing,
    isSpeaking,
    transcript,
    matchedAction,
    error,
    toggleListening,
    stopSpeaking,
    stopListening,
    routeVoiceCommand,
  } = useVoice();

  const [showDrawer, setShowDrawer] = useState(false);
  const [typedText, setTypedText] = useState('');

  const isHi = language === 'hi';

  const handleMicClick = () => {
    if (isSpeaking) {
      stopSpeaking();
      return;
    }
    toggleListening();
  };

  const handleQuickCommand = (route: string) => {
    setShowDrawer(false);
    routeVoiceCommand(route);
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!typedText.trim()) return;
    routeVoiceCommand(typedText.trim());
    setTypedText('');
    setShowDrawer(false);
  };

  return (
    <div className="fixed bottom-6 right-6 z-50">
      {/* ── Real-Time Voice Overlay & Live Transcript ── */}
      {(isListening || isProcessing || isSpeaking || matchedAction || error) && (
        <div className="animate-fadeIn absolute bottom-20 right-0 mb-2 w-80 rounded-3xl bg-white p-4 shadow-2xl border-2 border-emerald-100">
          <div className="flex items-center justify-between pb-2 border-b border-gray-100 mb-2">
            <div className="flex items-center gap-2">
              <span
                className={`h-3 w-3 rounded-full ${
                  isListening
                    ? 'bg-red-500 animate-ping'
                    : isProcessing
                    ? 'bg-amber-500 animate-spin'
                    : isSpeaking
                    ? 'bg-emerald-500 animate-pulse'
                    : 'bg-emerald-600'
                }`}
              />
              <span className="text-xs font-black uppercase tracking-wider text-[#186049]">
                {isListening
                  ? (isHi ? 'सुन रहा हूँ... बोलिए' : 'Listening... Speak now')
                  : isProcessing
                  ? (isHi ? 'पहचान हो रही है...' : 'Analyzing command...')
                  : isSpeaking
                  ? (isHi ? 'बोल रहा हूँ...' : 'Speaking...')
                  : (isHi ? 'सफल ✓' : 'Success ✓')}
              </span>
            </div>

            <div className="flex items-center gap-1.5">
              {isSpeaking && (
                <button
                  onClick={stopSpeaking}
                  className="text-[10px] font-extrabold bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full hover:bg-amber-200"
                >
                  {isHi ? 'चुप रहें' : 'Stop'}
                </button>
              )}
              {isListening && (
                <button
                  onClick={stopListening}
                  className="text-[10px] font-extrabold bg-[#186049] text-white px-2.5 py-0.5 rounded-full hover:bg-[#124b39]"
                >
                  {isHi ? 'हो गया ✓' : 'Done ✓'}
                </button>
              )}
            </div>
          </div>

          {/* Error Notice */}
          {error ? (
            <p className="text-xs text-red-600 font-bold leading-relaxed">{error}</p>
          ) : matchedAction ? (
            /* Matched Route Banner */
            <div className="p-2.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-center animate-bounce">
              <span className="text-xs font-black text-emerald-800 block">
                ✨ {matchedAction}
              </span>
              <span className="text-[10px] text-emerald-600">
                {isHi ? 'नेविगेट किया जा रहा है...' : 'Navigating in real time...'}
              </span>
            </div>
          ) : (
            /* Live Streaming Transcript */
            <div className="min-h-[3rem] flex flex-col justify-center">
              <p className="text-sm font-semibold text-gray-800">
                {transcript || (
                  <span className="text-gray-400 italic text-xs">
                    {isHi
                      ? 'उदाहरण: "खेत दिखाओ", "बीमारी", "पानी", "खाद", "मंडी भाव", "मौसम"'
                      : 'Say: "Fields", "Crop disease", "Irrigation", "Fertiliser", "Weather"'}
                  </span>
                )}
              </p>
            </div>
          )}

          {/* Quick shortcuts launcher link */}
          <div className="mt-2 pt-2 border-t border-gray-100 flex items-center justify-between text-[11px]">
            <button
              onClick={() => setShowDrawer((v) => !v)}
              className="text-[#4A943E] hover:underline font-bold"
            >
              {isHi ? '📋 बोलने के उदाहरण' : '📋 Voice Shortcuts'}
            </button>
            <span className="text-[10px] text-gray-400">
              {isHi ? 'हिंदी • English • क्षेत्रीय' : 'Hindi & English'}
            </span>
          </div>

          {/* Tail */}
          <div className="absolute -bottom-1.5 right-6 h-3 w-3 rotate-45 bg-white border-b border-r border-gray-100" />
        </div>
      )}

      {/* ── Voice Shortcuts & Manual Type Drawer ── */}
      {showDrawer && (
        <div className="animate-slideUp absolute bottom-20 right-0 mb-2 w-80 overflow-hidden rounded-3xl bg-white shadow-2xl border-2 border-emerald-200">
          <div className="bg-[#186049] text-white px-4 py-3 flex items-center justify-between">
            <div>
              <p className="text-xs font-black">
                {isHi ? 'बोलने के उदाहरण (Voice Shortcuts)' : 'Voice Command Shortcuts'}
              </p>
              <p className="text-[10px] text-emerald-100">
                {isHi ? 'माइक दबाकर बोलें या नीचे छूकर खोलें' : 'Speak into mic or tap any tile'}
              </p>
            </div>
            <button
              onClick={() => setShowDrawer(false)}
              className="text-white hover:text-gray-200 text-xl font-bold px-1"
            >
              ×
            </button>
          </div>

          {/* Type input fallback */}
          <form onSubmit={handleFormSubmit} className="p-2.5 border-b border-gray-100 flex gap-1.5">
            <input
              type="text"
              placeholder={isHi ? 'यहाँ लिखकर आदेश दें...' : 'Type command here...'}
              value={typedText}
              onChange={(e) => setTypedText(e.target.value)}
              className="flex-1 px-3 py-1.5 text-xs border rounded-xl focus:outline-none focus:ring-1 focus:ring-[#186049]"
            />
            <button
              type="submit"
              className="px-3 py-1.5 rounded-xl bg-[#186049] text-white text-xs font-bold"
            >
              Go
            </button>
          </form>

          {/* List of shortcuts */}
          <div className="p-2 divide-y divide-gray-50 max-h-72 overflow-y-auto">
            {VOICE_ROUTES.map((item) => (
              <button
                key={item.route}
                className="w-full px-3 py-2 text-left text-xs font-bold text-gray-700 transition hover:bg-emerald-50 rounded-xl flex items-center justify-between group"
                onClick={() => handleQuickCommand(item.keywords[0])}
              >
                <span className="flex-1">
                  {isHi ? item.labelHi : item.labelEn}
                </span>
                <span className="text-[10px] font-mono text-[#4A943E] bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100">
                  &ldquo;{item.keywords[0]}&rdquo;
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── JanSetu-Style Floating Circular Mic Button ── */}
      <button
        onClick={handleMicClick}
        aria-label={isListening ? 'Stop listening' : 'Start voice navigator'}
        className={`flex h-16 w-16 items-center justify-center rounded-full shadow-2xl transition-all duration-300 active:scale-90 border-4 border-white ${
          isListening
            ? 'bg-red-600 text-white animate-pulse ring-4 ring-red-300'
            : isSpeaking
            ? 'bg-[#B98327] text-white animate-pulse'
            : 'bg-[#186049] hover:bg-[#124b39] text-white hover:scale-105 ring-2 ring-[#186049]/30'
        }`}
      >
        {isListening ? (
          /* Animated spectrum bars */
          <div className="flex items-center gap-1">
            <span className="w-1.5 h-5 bg-white rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
            <span className="w-1.5 h-8 bg-white rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
            <span className="w-1.5 h-4 bg-white rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
          </div>
        ) : isSpeaking ? (
          /* Speaker wave icon */
          <svg
            width="26"
            height="26"
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
        ) : (
          /* Clean Crisp Microphone Icon */
          <svg
            width="28"
            height="28"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <rect x="9" y="2" width="6" height="12" rx="3" fill="currentColor" stroke="none" />
            <path d="M5 10v1a7 7 0 0 0 14 0v-1" />
            <line x1="12" y1="18" x2="12" y2="22" strokeWidth="2.5" />
            <line x1="8" y1="22" x2="16" y2="22" strokeWidth="2.5" />
          </svg>
        )}
      </button>
    </div>
  );
}
