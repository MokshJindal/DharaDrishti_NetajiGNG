'use client';

import { useState, useRef, useCallback } from 'react';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import { useVoice } from '@/lib/voice/VoiceContext';

const VOICE_SUGGESTIONS = [
  'Show my fields',
  'Check weather',
  'Diagnose crop',
  'Irrigation schedule',
  'Fasal score',
];

export default function VoiceButton() {
  const { t } = useLanguage();
  const { isListening, transcript, toggleListening } = useVoice();
  const [showSuggestions, setShowSuggestions] = useState(false);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handlePointerDown = useCallback(() => {
    longPressTimer.current = setTimeout(() => {
      setShowSuggestions(true);
    }, 600);
  }, []);

  const handlePointerUp = useCallback(() => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  }, []);

  const handleClick = useCallback(() => {
    if (showSuggestions) {
      setShowSuggestions(false);
      return;
    }
    toggleListening();
  }, [showSuggestions, toggleListening]);

  return (
    <div className="fixed bottom-20 right-4 z-50 md:bottom-6 md:right-6">
      {/* Transcript bubble */}
      {isListening && transcript && (
        <div className="animate-fadeIn absolute bottom-16 right-0 mb-2 w-56 rounded-xl bg-white p-3 text-sm text-gray-700 shadow-lg">
          <p className="leading-relaxed">{transcript}</p>
          <div className="absolute -bottom-1.5 right-5 h-3 w-3 rotate-45 bg-white" />
        </div>
      )}

      {/* Voice suggestions */}
      {showSuggestions && (
        <div className="animate-slideUp absolute bottom-16 right-0 mb-2 w-52 overflow-hidden rounded-xl bg-white shadow-lg">
          <div className="border-b border-gray-100 px-3 py-2">
            <p className="text-xs font-medium text-gray-500">
              {t('voiceCommands', 'Try saying…')}
            </p>
          </div>
          {VOICE_SUGGESTIONS.map((suggestion) => (
            <button
              key={suggestion}
              className="block w-full px-3 py-2 text-left text-sm text-gray-700 transition-colors hover:bg-gray-50"
              onClick={() => setShowSuggestions(false)}
            >
              &ldquo;{suggestion}&rdquo;
            </button>
          ))}
        </div>
      )}

      {/* Mic button */}
      <button
        onClick={handleClick}
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
        aria-label={
          isListening
            ? t('voiceStop', 'Stop listening')
            : t('voiceStart', 'Start voice command')
        }
        className={`flex h-14 w-14 items-center justify-center rounded-full shadow-lg transition-all duration-200 active:scale-95 ${
          isListening
            ? 'animate-voice-pulse bg-[#B98327] text-white'
            : 'bg-[#4A943E] text-white hover:bg-[#3d7d33]'
        }`}
      >
        {isListening ? (
          /* Animated bars while listening */
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden="true"
          >
            <rect
              x="4"
              y="8"
              width="3"
              height="8"
              rx="1.5"
              fill="currentColor"
              className="animate-pulse-slow"
            />
            <rect
              x="10.5"
              y="5"
              width="3"
              height="14"
              rx="1.5"
              fill="currentColor"
              className="animate-pulse-slow"
              style={{ animationDelay: '0.2s' }}
            />
            <rect
              x="17"
              y="7"
              width="3"
              height="10"
              rx="1.5"
              fill="currentColor"
              className="animate-pulse-slow"
              style={{ animationDelay: '0.4s' }}
            />
          </svg>
        ) : (
          /* Microphone icon */
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden="true"
          >
            <rect
              x="9"
              y="2"
              width="6"
              height="12"
              rx="3"
              fill="currentColor"
            />
            <path
              d="M5 11a7 7 0 0 0 14 0"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            />
            <line
              x1="12"
              y1="18"
              x2="12"
              y2="22"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            />
            <line
              x1="8"
              y1="22"
              x2="16"
              y2="22"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
        )}
      </button>
    </div>
  );
}
