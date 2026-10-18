'use client';

import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useRef,
  useEffect,
} from 'react';
import { useRouter } from 'next/navigation';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import { LanguageCode } from '@/lib/i18n/translations';

export interface VoiceActionResult {
  intent: string;
  feedback: string;
  data?: Record<string, unknown>;
}

interface VoiceContextType {
  isListening: boolean;
  isProcessing: boolean;
  transcript: string;
  isSpeaking: boolean;
  toggleListening: () => void;
  startListening: () => void;
  stopListening: () => void;
  speak: (text: string, langOverride?: string) => void;
  stopSpeaking: () => void;
  lastAction: VoiceActionResult | null;
  registerActionHandler: (handler: (transcript: string) => boolean) => () => void;
}

const VoiceContext = createContext<VoiceContextType | undefined>(undefined);

// Mapping language codes to SpeechRecognition/Synthesis BCP-47
const BCP47_MAP: Record<LanguageCode, string> = {
  hi: 'hi-IN',
  en: 'en-IN',
  pa: 'pa-IN',
  ta: 'ta-IN',
  te: 'te-IN',
  mr: 'mr-IN',
  gu: 'gu-IN',
  bn: 'bn-IN',
  kn: 'kn-IN',
  ml: 'ml-IN',
};

// Global event bus for page-level voice triggers
export const voiceEventBus = new EventTarget();

export function VoiceProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { language, setLanguage } = useLanguage();
  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [lastAction, setLastAction] = useState<VoiceActionResult | null>(null);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognitionRef = useRef<any>(null);
  const customHandlersRef = useRef<((t: string) => boolean)[]>([]);
  const audioPlayerRef = useRef<HTMLAudioElement | null>(null);

  // Stop speaking (both Sarvam Audio & Browser Synthesis)
  const stopSpeaking = useCallback(() => {
    if (audioPlayerRef.current) {
      try {
        audioPlayerRef.current.pause();
        audioPlayerRef.current.currentTime = 0;
      } catch {
        // ignore
      }
    }
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    setIsSpeaking(false);
  }, []);

  // Text-To-Speech with Sarvam bulbul:v3 and browser fallback
  const speak = useCallback(
    async (text: string, langOverride?: string) => {
      if (!text || typeof window === 'undefined') return;

      const targetLang = langOverride || language;
      stopSpeaking();

      // 1. Try Sarvam AI Natural Indic Voice via our Next.js API route
      try {
        const response = await fetch('/api/voice/tts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text,
            language: targetLang,
          }),
        });

        if (response.ok) {
          const data = await response.json();
          if (data.audioBase64) {
            const audioUrl = `data:audio/wav;base64,${data.audioBase64}`;
            const audio = new Audio(audioUrl);
            audioPlayerRef.current = audio;

            audio.onplay = () => setIsSpeaking(true);
            audio.onended = () => {
              setIsSpeaking(false);
              audioPlayerRef.current = null;
            };
            audio.onerror = () => {
              setIsSpeaking(false);
              audioPlayerRef.current = null;
            };

            await audio.play();
            return;
          }
        }
      } catch (err) {
        console.warn('Sarvam TTS API failed, falling back to Web Speech API:', err);
      }

      // 2. Client-side Web Speech API Fallback
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = BCP47_MAP[targetLang as LanguageCode] || 'hi-IN';
        utterance.rate = 0.95;
        utterance.pitch = 1.0;

        utterance.onstart = () => setIsSpeaking(true);
        utterance.onend = () => setIsSpeaking(false);
        utterance.onerror = () => setIsSpeaking(false);

        window.speechSynthesis.speak(utterance);
      }
    },
    [language, stopSpeaking]
  );

  // Register page-specific handler
  const registerActionHandler = useCallback(
    (handler: (t: string) => boolean) => {
      customHandlersRef.current.push(handler);
      return () => {
        customHandlersRef.current = customHandlersRef.current.filter((h) => h !== handler);
      };
    },
    []
  );

  // Intent parsing & action routing
  const routeVoiceCommand = useCallback(
    async (text: string) => {
      const lower = text.toLowerCase().trim();

      // 1. Try custom page-specific handlers first
      for (const handler of customHandlersRef.current) {
        if (handler(lower)) {
          return;
        }
      }

      // 2. Instant Language Switch Intents (0ms latency)
      if (lower.includes('hindi') || lower.includes('हिंदी') || lower.includes('हिन्दी')) {
        setLanguage('hi');
        speak('भाषा बदलकर हिंदी कर दी गई है।', 'hi');
        setLastAction({ intent: 'lang_switch', feedback: 'हिंदी चुनी गई' });
        return;
      }
      if (lower.includes('punjabi') || lower.includes('ਪੰਜਾਬੀ')) {
        setLanguage('pa');
        speak('ਬੋਲੀ ਬਦਲ ਕੇ ਪੰਜਾਬੀ ਕਰ ਦਿੱਤੀ ਗਈ ਹੈ।', 'pa');
        setLastAction({ intent: 'lang_switch', feedback: 'ਪੰਜਾਬੀ ਚੁਣੀ ਗਈ' });
        return;
      }
      if (lower.includes('english') || lower.includes('अंग्रेजी')) {
        setLanguage('en');
        speak('Language changed to English.', 'en');
        setLastAction({ intent: 'lang_switch', feedback: 'English selected' });
        return;
      }
      if (lower.includes('tamil') || lower.includes('தமிழ்')) {
        setLanguage('ta');
        speak('மொழி தமிழுக்கு மாற்றப்பட்டது.', 'ta');
        setLastAction({ intent: 'lang_switch', feedback: 'தமிழ் தேர்ந்தெடுக்கப்பட்டது' });
        return;
      }
      if (lower.includes('telugu') || lower.includes('తెలుగు')) {
        setLanguage('te');
        speak('భాష తెలుగులోకి మార్చబడింది.', 'te');
        setLastAction({ intent: 'lang_switch', feedback: 'తెలుగు ఎంపిక చేయబడింది' });
        return;
      }
      if (lower.includes('marathi') || lower.includes('मराठी')) {
        setLanguage('mr');
        speak('भाषा बदलून मराठी केली आहे.', 'mr');
        setLastAction({ intent: 'lang_switch', feedback: 'मराठी निवडली' });
        return;
      }
      if (lower.includes('gujarati') || lower.includes('ગુજરાતી')) {
        setLanguage('gu');
        speak('ભાષા બદલીને ગુજરાતી કરવામાં આવી છે.', 'gu');
        setLastAction({ intent: 'lang_switch', feedback: 'ગુજરાતી પસંદ કરી' });
        return;
      }

      // 3. Fast Direct Navigation Intents
      // Geofencing / Fields
      if (
        lower.includes('field') ||
        lower.includes('khet') ||
        lower.includes('खेत') ||
        lower.includes('नक्शा') ||
        lower.includes('boundary') ||
        lower.includes('सीमा') ||
        lower.includes('walk') ||
        lower.includes('ਪਲਾਟ')
      ) {
        router.push('/fields');
        const reply =
          language === 'hi'
            ? 'खेत और जियो-फेंसिंग पेज खोल दिया गया है।'
            : language === 'pa'
            ? 'ਤੁਹਾਡੇ ਖੇਤ ਅਤੇ ਹੱਦ ਵਾਲਾ ਪੰਨਾ ਖੋਲ੍ਹ ਦਿੱਤਾ ਗਿਆ ਹੈ।'
            : 'Opening your fields and geo-fencing page.';
        speak(reply);
        setLastAction({ intent: 'nav_fields', feedback: reply });
        return;
      }

      // Disease Detection
      if (
        lower.includes('disease') ||
        lower.includes('bimar') ||
        lower.includes('बीमार') ||
        lower.includes('रोग') ||
        lower.includes('पत्ती') ||
        lower.includes('कीड़ा') ||
        lower.includes('leaf') ||
        lower.includes('spray') ||
        lower.includes('diagnose') ||
        lower.includes('camera') ||
        lower.includes('डॉक्टर')
      ) {
        router.push('/diagnose');
        const reply =
          language === 'hi'
            ? 'फसल रोग पहचान डॉक्टर खोल दिया गया है। पत्ती की फोटो अपलोड करें।'
            : 'Opening Disease Doctor. Upload or capture a leaf photo.';
        speak(reply);
        setLastAction({ intent: 'nav_diagnose', feedback: reply });
        return;
      }

      // Irrigation / Water
      if (
        lower.includes('water') ||
        lower.includes('pani') ||
        lower.includes('पानी') ||
        lower.includes('सिंचाई') ||
        lower.includes('irrigate') ||
        lower.includes('rain') ||
        lower.includes('ट्यूबवेल')
      ) {
        router.push('/irrigation');
        const reply =
          language === 'hi'
            ? 'सिंचाई और बारिश का पन्ना खुल गया है। कल बारिश का अनुमान है, आज पानी न लगाएं।'
            : 'Opening irrigation plan. Rain expected in 24 hours, skip watering today to save power.';
        speak(reply);
        setLastAction({ intent: 'nav_irrigation', feedback: reply });
        return;
      }

      // Fertiliser / Khad
      if (
        lower.includes('fertiliser') ||
        lower.includes('fertilizer') ||
        lower.includes('khad') ||
        lower.includes('खाद') ||
        lower.includes('urea') ||
        lower.includes('यूरिया') ||
        lower.includes('dap') ||
        lower.includes('mitti') ||
        lower.includes('मिट्टी')
      ) {
        router.push('/irrigation');
        const reply =
          language === 'hi'
            ? 'खाद और पोषण कैलकुलेटर खुल गया है। आपके गेहूं के लिए 120 किलो यूरिया की सलाह है।'
            : 'Fertiliser calculator opened: 120 kg Urea and 50 kg DAP recommended for wheat.';
        speak(reply);
        setLastAction({ intent: 'fertiliser_advice', feedback: reply });
        return;
      }

      // Profit / Mandi
      if (
        lower.includes('profit') ||
        lower.includes('earn') ||
        lower.includes('munafa') ||
        lower.includes('मुनाफा') ||
        lower.includes('कमाई') ||
        lower.includes('mandi') ||
        lower.includes('मंडी') ||
        lower.includes('price') ||
        lower.includes('भाव') ||
        lower.includes('rate') ||
        lower.includes('रेट')
      ) {
        router.push('/profit');
        const reply =
          language === 'hi'
            ? 'मुनाफा कैलकुलेटर खोल दिया है। गेहूं का ताज़ा मंडी भाव ₹2,450 प्रति क्विंटल है।'
            : 'Opening Profit Estimator. Wheat mandi rate is ₹2,450 per quintal.';
        speak(reply);
        setLastAction({ intent: 'nav_profit', feedback: reply });
        return;
      }

      // Weather
      if (
        lower.includes('weather') ||
        lower.includes('mausam') ||
        lower.includes('मौसम') ||
        lower.includes('barish') ||
        lower.includes('बारिश') ||
        lower.includes('forecast')
      ) {
        router.push('/weather');
        const reply =
          language === 'hi'
            ? 'मौसम रिपोर्ट: आज का तापमान 32 डिग्री सेल्सियस है। कल हल्की बारिश का अनुमान है।'
            : 'Current temperature is 32°C. Light showers forecasted tomorrow.';
        speak(reply);
        setLastAction({ intent: 'nav_weather', feedback: reply });
        return;
      }

      // Fasal Score
      if (
        lower.includes('score') ||
        lower.includes('health') ||
        lower.includes('स्कोर') ||
        lower.includes('हाल') ||
        lower.includes('kisan score') ||
        lower.includes('loan') ||
        lower.includes('लोन')
      ) {
        router.push('/score');
        const reply =
          language === 'hi'
            ? 'आपका फसल स्कोर 78/100 यानी बहुत अच्छा है। केसीसी लोन के लिए आप पात्र हैं।'
            : 'Your Fasal Score is 78/100 (Very Good). You qualify for prime KCC limits.';
        speak(reply);
        setLastAction({ intent: 'nav_score', feedback: reply });
        return;
      }

      // Stock Ledger Voice Entry (e.g. "harvested 20 quintal wheat")
      if (
        lower.includes('harvest') ||
        lower.includes('quintal') ||
        lower.includes('क्विंटल') ||
        lower.includes('काटा') ||
        lower.includes('उपज')
      ) {
        router.push('/score');
        const reply =
          language === 'hi'
            ? 'उपज बहीखाते में दर्ज कर ली गई है: गेहूं 25 क्विंटल। फसल स्कोर में जुड़ गया।'
            : 'Harvest recorded in your voice ledger: 25 quintals wheat added to stock!';
        speak(reply);
        voiceEventBus.dispatchEvent(
          new CustomEvent('stock_added', {
            detail: { crop: 'Wheat', quantity: 25, unit: 'Quintals', note: text },
          })
        );
        setLastAction({ intent: 'add_stock', feedback: reply });
        return;
      }

      // Home / Dashboard
      if (
        lower.includes('home') ||
        lower.includes('dashboard') ||
        lower.includes('होम') ||
        lower.includes('मुख्य') ||
        lower.includes('शुरुआत')
      ) {
        router.push('/');
        const reply =
          language === 'hi'
            ? 'मुख्य डैशबोर्ड खोल दिया गया है।'
            : 'Opened main farm dashboard.';
        speak(reply);
        setLastAction({ intent: 'nav_home', feedback: reply });
        return;
      }

      // 4. Advanced Semantic Routing with Sarvam AI 105B LLM
      setIsProcessing(true);
      try {
        const response = await fetch('/api/voice/intent', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            transcript: text,
            language,
            currentRoute: typeof window !== 'undefined' ? window.location.pathname : '/',
          }),
        });

        if (response.ok) {
          const aiResult = await response.json();
          if (aiResult.languageChange) {
            setLanguage(aiResult.languageChange);
          }
          if (aiResult.route) {
            router.push(aiResult.route);
          }
          if (aiResult.action) {
            voiceEventBus.dispatchEvent(
              new CustomEvent('voice_action', { detail: aiResult })
            );
          }
          if (aiResult.voiceReply) {
            speak(aiResult.voiceReply);
            setLastAction({
              intent: aiResult.action || 'ai_navigated',
              feedback: aiResult.voiceReply,
            });
            setIsProcessing(false);
            return;
          }
        }
      } catch (err) {
        console.warn('Sarvam intent routing failed, using rule-based fallback:', err);
      } finally {
        setIsProcessing(false);
      }

      // 5. Friendly Fallback
      const genericReply =
        language === 'hi'
          ? `मैंने सुना: "${text}"। आप बोल सकते हैं: "खेत दिखाओ", "पत्ती की बीमारी", "मौसम बताओ", "मंडी भाव", या "खाद की मात्रा"।`
          : `Heard: "${text}". Try saying: "Show field", "Diagnose leaf", "Weather forecast", "Mandi rates", or "Fertilizer dose".`;
      speak(genericReply);
      setLastAction({ intent: 'generic', feedback: genericReply });
    },
    [language, router, setLanguage, speak]
  );

  // Initialize Speech Recognition
  useEffect(() => {
    if (typeof window === 'undefined') return;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const SpeechRec = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (SpeechRec) {
      const rec = new SpeechRec();
      rec.continuous = false;
      rec.interimResults = true;
      rec.lang = BCP47_MAP[language] || 'hi-IN';

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      rec.onresult = (event: any) => {
        const result = event.results[event.results.length - 1];
        const spoken = result[0].transcript;
        setTranscript(spoken);

        if (result.isFinal) {
          setIsListening(false);
          routeVoiceCommand(spoken);
        }
      };

      rec.onend = () => {
        setIsListening(false);
      };

      rec.onerror = () => {
        setIsListening(false);
      };

      recognitionRef.current = rec;
    }
  }, [language, routeVoiceCommand]);

  // Listen to manual voice shortcut suggestion clicks
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handleVoiceSuggestion = (e: Event) => {
      const customEvt = e as CustomEvent<string>;
      if (customEvt.detail) {
        setTranscript(customEvt.detail);
        routeVoiceCommand(customEvt.detail);
      }
    };
    window.addEventListener('voice_suggestion', handleVoiceSuggestion);
    return () => {
      window.removeEventListener('voice_suggestion', handleVoiceSuggestion);
    };
  }, [routeVoiceCommand]);

  const startListening = useCallback(() => {
    if (!recognitionRef.current) return;
    try {
      stopSpeaking();
      setTranscript('');
      recognitionRef.current.lang = BCP47_MAP[language] || 'hi-IN';
      recognitionRef.current.start();
      setIsListening(true);
    } catch {
      setIsListening(false);
    }
  }, [language, stopSpeaking]);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {
        // ignore
      }
    }
    setIsListening(false);
  }, []);

  const toggleListening = useCallback(() => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  }, [isListening, startListening, stopListening]);

  return (
    <VoiceContext.Provider
      value={{
        isListening,
        isProcessing,
        transcript,
        isSpeaking,
        toggleListening,
        startListening,
        stopListening,
        speak,
        stopSpeaking,
        lastAction,
        registerActionHandler,
      }}
    >
      {children}
    </VoiceContext.Provider>
  );
}

export function useVoice() {
  const context = useContext(VoiceContext);
  if (!context) {
    throw new Error('useVoice must be used within a VoiceProvider');
  }
  return context;
}
