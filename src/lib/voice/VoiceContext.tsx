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
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [lastAction, setLastAction] = useState<VoiceActionResult | null>(null);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognitionRef = useRef<any>(null);
  const customHandlersRef = useRef<((t: string) => boolean)[]>([]);

  // Stop speaking
  const stopSpeaking = useCallback(() => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    }
  }, []);

  // Text-To-Speech with Indic Language support
  const speak = useCallback(
    (text: string, langOverride?: string) => {
      if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
      window.speechSynthesis.cancel();

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = langOverride || BCP47_MAP[language] || 'hi-IN';
      utterance.rate = 0.95; // Slightly slower, clear cadence for farmers
      utterance.pitch = 1.0;

      utterance.onstart = () => setIsSpeaking(true);
      utterance.onend = () => setIsSpeaking(false);
      utterance.onerror = () => setIsSpeaking(false);

      window.speechSynthesis.speak(utterance);
    },
    [language]
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
    (text: string) => {
      const lower = text.toLowerCase().trim();

      // 1. Try custom page-specific handlers first
      for (const handler of customHandlersRef.current) {
        if (handler(lower)) {
          return;
        }
      }

      // 2. Language Switch Intents
      if (lower.includes('hindi') || lower.includes('हिंदी') || lower.includes('हिन्दी')) {
        setLanguage('hi');
        speak('भाषा बदलकर हिंदी कर दी गई है।', 'hi-IN');
        setLastAction({ intent: 'lang_switch', feedback: 'हिंदी चुनी गई' });
        return;
      }
      if (lower.includes('punjabi') || lower.includes('ਪੰਜਾਬੀ')) {
        setLanguage('pa');
        speak('ਬੋਲੀ ਬਦਲ ਕੇ ਪੰਜਾਬੀ ਕਰ ਦਿੱਤੀ ਗਈ ਹੈ।', 'pa-IN');
        setLastAction({ intent: 'lang_switch', feedback: 'ਪੰਜਾਬੀ ਚੁਣੀ ਗਈ' });
        return;
      }
      if (lower.includes('english') || lower.includes('अंग्रेजी')) {
        setLanguage('en');
        speak('Language changed to English.', 'en-IN');
        setLastAction({ intent: 'lang_switch', feedback: 'English selected' });
        return;
      }
      if (lower.includes('tamil') || lower.includes('தமிழ்')) {
        setLanguage('ta');
        speak('மொழி தமிழுக்கு மாற்றப்பட்டது.', 'ta-IN');
        setLastAction({ intent: 'lang_switch', feedback: 'தமிழ் தேர்ந்தெடுக்கப்பட்டது' });
        return;
      }
      if (lower.includes('telugu') || lower.includes('తెలుగు')) {
        setLanguage('te');
        speak('భాష తెలుగులోకి మార్చబడింది.', 'te-IN');
        setLastAction({ intent: 'lang_switch', feedback: 'తెలుగు ఎంపిక చేయబడింది' });
        return;
      }
      if (lower.includes('marathi') || lower.includes('मराठी')) {
        setLanguage('mr');
        speak('भाषा बदलून मराठी केली आहे.', 'mr-IN');
        setLastAction({ intent: 'lang_switch', feedback: 'मराठी निवडली' });
        return;
      }
      if (lower.includes('gujarati') || lower.includes('ગુજરાતી')) {
        setLanguage('gu');
        speak('ભાષા બદલીને ગુજરાતી કરવામાં આવી છે.', 'gu-IN');
        setLastAction({ intent: 'lang_switch', feedback: 'ગુજરાતી પસંદ કરી' });
        return;
      }

      // 3. Navigation & Feature Intents
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
        lower.includes('diagnose')
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
        lower.includes('rain')
      ) {
        router.push('/irrigation');
        const reply =
          language === 'hi'
            ? 'सिंचाई और खाद का पन्ना खुल गया है। कल बारिश की संभावना है, इसलिए आज पानी न दें।'
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
        lower.includes('dap')
      ) {
        router.push('/irrigation');
        const reply =
          language === 'hi'
            ? 'खाद अनुशंसा: आपके 4.8 एकड़ गेहूं के लिए 120 किलो यूरिया और 50 किलो डीएपी की सलाह है।'
            : 'Fertiliser dose: 120 kg Urea and 50 kg DAP recommended for your wheat plot.';
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
        lower.includes('भाव')
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
        lower.includes('बारिश')
      ) {
        router.push('/weather');
        const reply =
          language === 'hi'
            ? 'आज का तापमान 32 डिग्री सेल्सियस है। कल शाम हल्की बारिश का अनुमान है।'
            : 'Current temperature is 32°C. Light showers forecasted tomorrow evening.';
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
        lower.includes('how is my farm')
      ) {
        router.push('/score');
        const reply =
          language === 'hi'
            ? 'आपका फसल स्कोर 78/100 यानी बहुत अच्छा है। आपकी सिंचाई और मृदा स्वास्थ्य उत्तम है।'
            : 'Your Fasal Score is 78/100 (Very Good). Irrigation discipline and crop health are strong.';
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

      // Chatbot
      if (
        lower.includes('chat') ||
        lower.includes('ask') ||
        lower.includes('mitra') ||
        lower.includes('सलाह') ||
        lower.includes('बात')
      ) {
        router.push('/chat');
        const reply =
          language === 'hi'
            ? 'किसान एआई सलाहकार तैयार है। अपना सवाल बोलें।'
            : 'Kisan AI Chatbot is ready. Please speak your farming question.';
        speak(reply);
        setLastAction({ intent: 'nav_chat', feedback: reply });
        return;
      }

      // Fallback
      const genericReply =
        language === 'hi'
          ? `मैंने सुना: "${text}"। आप बोल सकते हैं: "खेत दिखाओ", "बीमारी जांचो", "मौसम बताओ", "मुनाफा कितना होगा"।`
          : `Heard: "${text}". Try saying: "Show my field", "Diagnose leaf", "Check weather", "What will I earn?"`;
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
