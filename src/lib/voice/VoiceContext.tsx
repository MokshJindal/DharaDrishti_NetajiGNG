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
  route?: string;
}

interface CommandRoute {
  keywords: string[];
  route: string;
  labelEn: string;
  labelHi: string;
  speechEn: string;
  speechHi: string;
}

export const VOICE_ROUTES: CommandRoute[] = [
  {
    keywords: [
      'field', 'fields', 'khet', 'खेत', 'नक्शा', 'naksha', 'boundary', 'सीमा', 'walk', 'ਚਲੋ', 'ਪਲਾਟ',
      'plot', 'zameen', 'जमीन', 'रकबा', 'rakba', 'naap', 'नापो', 'मेड़', 'med', 'gps', 'map'
    ],
    route: '/fields',
    labelEn: 'Field Map & Boundaries',
    labelHi: 'खेत और मेड़ का नक्शा',
    speechEn: 'Opening field boundary map.',
    speechHi: 'खेत और मेड़ का नक्शा खोल दिया गया है।'
  },
  {
    keywords: [
      'disease', 'diseases', 'bimar', 'बीमार', 'रोग', 'rog', 'पत्ती', 'patti', 'कीड़ा', 'कीट', 'keeda',
      'leaf', 'spray', 'diagnose', 'diagnosis', 'camera', 'कैमरा', 'डॉक्टर', 'doctor', 'patta', 'पत्ता',
      'chhidkaw', 'छिड़काव', 'dawa', 'दवा', 'ilaj', 'इलाज', 'fungus', 'फफूंद', 'peela', 'पीला', 'yellow'
    ],
    route: '/diagnose',
    labelEn: 'Crop Doctor & Leaf Disease',
    labelHi: 'फसल रोग पहचान डॉक्टर',
    speechEn: 'Opening Crop Doctor for leaf diagnosis.',
    speechHi: 'फसल रोग पहचान डॉक्टर खोल दिया गया है। पत्ती की फोटो लें।'
  },
  {
    keywords: [
      'water', 'pani', 'पानी', 'सिंचाई', 'sinchai', 'irrigate', 'irrigation', 'ट्यूबवेल', 'tubewell',
      'motor', 'मोटर', 'nami', 'नमी', 'जल'
    ],
    route: '/irrigation',
    labelEn: 'Smart Irrigation Plan',
    labelHi: 'स्मार्ट सिंचाई योजना',
    speechEn: 'Opening irrigation plan. Rain expected tomorrow, skip watering today.',
    speechHi: 'सिंचाई का पन्ना खुल गया है। कल बारिश का अनुमान है, आज पानी न लगाएं।'
  },
  {
    keywords: [
      'fertiliser', 'fertilizer', 'khad', 'खाद', 'urea', 'यूरिया', 'dap', 'डीएपी', 'mitti', 'मिट्टी',
      'soil', 'npk', 'एनपीके', 'potash', 'पोटाश', 'poshan', 'पोषण', 'mop'
    ],
    route: '/fertiliser',
    labelEn: 'Soil Health & Fertilizer Dose',
    labelHi: 'मृदा स्वास्थ्य व खाद कैलकुलेटर',
    speechEn: 'Opening fertilizer calculator for exact Urea and DAP bags.',
    speechHi: 'खाद और उर्वरक कैलकुलेटर खुल गया है। यूरिया और डीएपी की मात्रा देखें।'
  },
  {
    keywords: [
      'profit', 'earn', 'earning', 'munafa', 'मुनाफा', 'कमाई', 'kamai', 'mandi', 'मंडी', 'price',
      'bhav', 'भाव', 'rate', 'रेट', 'apmc', 'daam', 'दाम', 'kimat', 'कीमत', 'bechna', 'बेचना', 'market', 'बाजार'
    ],
    route: '/profit',
    labelEn: 'Mandi Rates & Net Profit',
    labelHi: 'मंडी भाव व शुद्ध मुनाफा',
    speechEn: 'Opening mandi rates and profit tracker.',
    speechHi: 'मंडी भाव और मुनाफा कैलकुलेटर खोल दिया गया है।'
  },
  {
    keywords: [
      'weather', 'mausam', 'मौसम', 'barish', 'बारिश', 'rain', 'forecast', 'hawa', 'हवा', 'wind',
      'temperature', 'taapman', 'तापमान', 'toofan', 'तूफान', 'badal', 'बादल'
    ],
    route: '/weather',
    labelEn: 'Live Weather Radar',
    labelHi: 'लाइव मौसम व वर्षा रडार',
    speechEn: 'Opening weather intelligence and spray advisory.',
    speechHi: 'मौसम का हाल खुल गया है। लाइव तापमान और बारिश देखें।'
  },
  {
    keywords: [
      'score', 'health', 'स्कोर', 'हाल', 'kisan score', 'loan', 'लोन', 'kcc', 'केसीसी', 'credit',
      'साख', 'patrata', 'पात्रता', 'eligibility', 'sehat', 'सेहत', 'rating', 'ledger', 'bahi', 'बही', 'stock'
    ],
    route: '/score',
    labelEn: 'Fasal Health Score',
    labelHi: 'फसल क्रेडिट स्कोर व बहीखाता',
    speechEn: 'Opening your Fasal Health Score and ledger.',
    speechHi: 'आपका फसल स्कोर 78 है। केसीसी लोन के लिए आप पात्र हैं।'
  },
  {
    keywords: [
      'chat', 'krishi ai', 'ai', 'बात', 'सवाल', 'पूछ', 'ask', 'कृषि', 'सलाह', 'sahayak', 'सहायक',
      'mitra', 'मित्र', 'bot', 'assistant'
    ],
    route: '/chat',
    labelEn: 'Krishi AI Assistant',
    labelHi: 'कृषि एआई सहायक',
    speechEn: 'Opening Krishi AI. How can I help your crops today?',
    speechHi: 'कृषि एआई सहायक खुल गया है। आज अपनी फसल के बारे में क्या पूछना चाहते हैं?'
  },
  {
    keywords: [
      'home', 'dashboard', 'होम', 'मुख्य', 'शुरुआत', 'main'
    ],
    route: '/',
    labelEn: 'Main Dashboard',
    labelHi: 'मुख्य डैशबोर्ड',
    speechEn: 'Opening main dashboard.',
    speechHi: 'मुख्य डैशबोर्ड खोल दिया गया है।'
  }
];

interface VoiceContextType {
  isListening: boolean;
  isProcessing: boolean;
  transcript: string;
  matchedAction: string | null;
  isSpeaking: boolean;
  error: string | null;
  toggleListening: () => void;
  startListening: () => void;
  stopListening: () => void;
  speak: (text: string, langOverride?: string) => void;
  stopSpeaking: () => void;
  lastAction: VoiceActionResult | null;
  registerActionHandler: (handler: (transcript: string) => boolean) => () => void;
  routeVoiceCommand: (text: string) => boolean;
}

const VoiceContext = createContext<VoiceContextType | undefined>(undefined);

// Mapping language codes to SpeechRecognition/Synthesis BCP-47
const BCP47_MAP: Record<LanguageCode, string> = {
  en: 'en-IN',
  hi: 'hi-IN',
  pa: 'pa-IN',
  ta: 'ta-IN',
  te: 'te-IN',
  mr: 'mr-IN',
  gu: 'gu-IN',
  bn: 'bn-IN',
  kn: 'kn-IN',
  ml: 'ml-IN',
};

export const voiceEventBus = new EventTarget();

export function VoiceProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { language, setLanguage } = useLanguage();
  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [matchedAction, setMatchedAction] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lastAction, setLastAction] = useState<VoiceActionResult | null>(null);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognitionRef = useRef<any>(null);
  const customHandlersRef = useRef<((t: string) => boolean)[]>([]);
  const audioPlayerRef = useRef<HTMLAudioElement | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const hasRoutedRef = useRef<boolean>(false);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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

  const speak = useCallback(
    async (text: string, langOverride?: string) => {
      if (!text || typeof window === 'undefined') return;

      const targetLang = (langOverride || language) as LanguageCode;
      stopSpeaking();

      const cleanText = text
        .replace(/```[\s\S]*?```/g, '')
        .replace(/`([^`]+)`/g, '$1')
        .replace(/!\[([^\]]*)\]\([^)]*\)/g, '')
        .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
        .replace(/^#{1,6}\s+/gm, '')
        .replace(/\*\*([^*]+)\*\*/g, '$1')
        .replace(/\*([^*]+)\*/g, '$1')
        .replace(/[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, '')
        .replace(/\s+/g, ' ')
        .trim();

      if (!cleanText) return;

      // 1. Try Server TTS (/api/voice/tts)
      try {
        const response = await fetch('/api/voice/tts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: cleanText, language: targetLang }),
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
        console.warn('Server TTS unavailable, using SpeechSynthesis fallback:', err);
      }

      // 2. Client-side SpeechSynthesis Fallback
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
        const bcpCode = BCP47_MAP[targetLang] || 'en-IN';
        const voices = window.speechSynthesis.getVoices();

        // STRICT MATCH: Only speak with browser synthesis if a voice matching this language is actually installed
        const matched = voices.find(
          (v) =>
            v.lang === bcpCode ||
            v.lang.toLowerCase().startsWith(targetLang.toLowerCase()) ||
            v.name.toLowerCase().includes(targetLang === 'hi' ? 'hindi' : targetLang)
        );

        // If target is non-English and NO native voice exists on this OS, do NOT speak with an English voice
        // This prevents the bizarre, distorted metallic robotic voice when English engines try to pronounce Hindi
        if (!matched && targetLang !== 'en') {
          console.warn(`[TTS] No native ${targetLang} voice installed in browser. Skipping robotic English fallback.`);
          return;
        }

        const utterance = new SpeechSynthesisUtterance(cleanText);
        utterance.lang = matched?.lang || (targetLang === 'en' ? 'en-IN' : bcpCode);
        if (matched) utterance.voice = matched;

        utterance.rate = 1.0;
        utterance.pitch = 1.0;
        utterance.onstart = () => setIsSpeaking(true);
        utterance.onend = () => setIsSpeaking(false);
        utterance.onerror = () => setIsSpeaking(false);

        window.speechSynthesis.speak(utterance);
      }
    },
    [language, stopSpeaking]
  );

  const registerActionHandler = useCallback(
    (handler: (t: string) => boolean) => {
      customHandlersRef.current.push(handler);
      return () => {
        customHandlersRef.current = customHandlersRef.current.filter((h) => h !== handler);
      };
    },
    []
  );

  // REAL-TIME INSTANT COMMAND ROUTER (0ms Latency Matcher)
  const routeVoiceCommand = useCallback(
    (text: string): boolean => {
      const lower = text.toLowerCase().trim();
      if (!lower) return false;

      // Check custom page-specific handlers
      for (const handler of customHandlersRef.current) {
        if (handler(lower)) {
          hasRoutedRef.current = true;
          return true;
        }
      }

      // Check instant language switches
      if (lower.includes('hindi') || lower.includes('हिंदी') || lower.includes('हिन्दी')) {
        hasRoutedRef.current = true;
        setLanguage('hi');
        setMatchedAction('भाषा: हिंदी');
        speak('भाषा बदलकर हिंदी कर दी गई है।', 'hi');
        setLastAction({ intent: 'lang_switch', feedback: 'हिंदी चुनी गई' });
        return true;
      }
      if (lower.includes('english') || lower.includes('अंग्रेजी') || lower.includes('ਅੰਗਰੇਜ਼ੀ')) {
        hasRoutedRef.current = true;
        setLanguage('en');
        setMatchedAction('Language: English');
        speak('Language changed to English.', 'en');
        setLastAction({ intent: 'lang_switch', feedback: 'English selected' });
        return true;
      }

      // Real-time scan through VOICE_ROUTES
      for (const routeItem of VOICE_ROUTES) {
        const matchedKeyword = routeItem.keywords.find((k) => lower.includes(k.toLowerCase()));
        if (matchedKeyword) {
          hasRoutedRef.current = true;
          const label = language === 'hi' ? routeItem.labelHi : routeItem.labelEn;
          const speechMsg = language === 'hi' ? routeItem.speechHi : routeItem.speechEn;

          setMatchedAction(label);
          setLastAction({ intent: routeItem.route, feedback: speechMsg, route: routeItem.route });

          // Navigate instantly in real time
          router.push(routeItem.route);

          // Audio feedback
          speak(speechMsg);

          // Stop listening once routed
          if (recognitionRef.current) {
            try {
              recognitionRef.current.stop();
            } catch {
              // ignore
            }
          }
          setIsListening(false);
          return true;
        }
      }

      return false;
    },
    [language, router, setLanguage, speak]
  );

  // Deep Semantic Routing Fallback via Sarvam AI
  const routeSemanticFallback = useCallback(
    async (text: string) => {
      if (hasRoutedRef.current) return;
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
          if (aiResult.route) {
            hasRoutedRef.current = true;
            router.push(aiResult.route);
          }
          if (aiResult.action) {
            voiceEventBus.dispatchEvent(
              new CustomEvent('voice_action', { detail: aiResult })
            );
          }
          if (aiResult.voiceReply) {
            speak(aiResult.voiceReply);
            setMatchedAction(aiResult.voiceReply);
            setLastAction({
              intent: aiResult.action || 'ai_navigated',
              feedback: aiResult.voiceReply,
              route: aiResult.route,
            });
            setIsProcessing(false);
            return;
          }
        }
      } catch (err) {
        console.warn('Semantic intent routing failed:', err);
      } finally {
        setIsProcessing(false);
      }

      // Friendly Fallback - show visual feedback without unprompted loud speech
      const genericReply =
        language === 'en'
          ? `Heard: "${text}".`
          : `सुना गया: "${text}"`;
      setLastAction({ intent: 'generic', feedback: genericReply });
    },
    [language, router]
  );

  // Initialize Speech Recognition once
  useEffect(() => {
    if (typeof window === 'undefined') return;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const SpeechRec = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (SpeechRec) {
      const rec = new SpeechRec();
      rec.continuous = true;
      rec.interimResults = true;
      rec.lang = BCP47_MAP[language] || 'en-IN';

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      rec.onresult = (event: any) => {
        let currentSpoken = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          currentSpoken += event.results[i][0].transcript;
        }

        const trimmed = currentSpoken.trim();
        if (!trimmed) return;

        setTranscript(trimmed);

        // REAL-TIME CHECK: If any keyword is spoken, navigate IMMEDIATELY!
        const didRoute = routeVoiceCommand(trimmed);
        if (didRoute) return;

        // If not routed instantly, debounce a semantic fallback call
        if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
        debounceTimerRef.current = setTimeout(() => {
          if (!hasRoutedRef.current && trimmed.length > 3) {
            routeSemanticFallback(trimmed);
          }
        }, 1200);
      };

      rec.onend = () => {
        setIsListening(false);
      };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      rec.onerror = (e: any) => {
        console.warn('SpeechRecognition error:', e?.error);
        if (e?.error === 'not-allowed') {
          setError(
            language === 'hi'
              ? 'माइक्रोफोन की अनुमति दें (Allow Mic) ताकि आप बोल सकें।'
              : 'Microphone permission blocked. Please allow mic in browser settings.'
          );
        }
        setIsListening(false);
      };

      recognitionRef.current = rec;
    }
  }, [language, routeSemanticFallback, routeVoiceCommand]);

  // Transcribe audio using Sarvam AI (`saarika:v2.5`) if native speech fails
  const transcribeWithSarvam = useCallback(
    async (blob: Blob) => {
      try {
        setIsProcessing(true);
        const formData = new FormData();
        formData.append('file', blob);
        formData.append('language', language);

        const res = await fetch('/api/voice/stt', {
          method: 'POST',
          body: formData,
        });

        if (res.ok) {
          const data = await res.json();
          const spoken = (data.transcript || '').trim();
          if (spoken) {
            setTranscript(spoken);
            const didRoute = routeVoiceCommand(spoken);
            if (!didRoute) {
              await routeSemanticFallback(spoken);
            }
            return;
          }
        }
      } catch (err) {
        console.warn('Sarvam STT failed:', err);
      } finally {
        setIsProcessing(false);
      }
    },
    [language, routeSemanticFallback, routeVoiceCommand]
  );

  // Start listening
  const startListening = useCallback(async () => {
    stopSpeaking();
    setError(null);
    setTranscript('');
    setMatchedAction(null);
    hasRoutedRef.current = false;
    audioChunksRef.current = [];

    // 1. Start parallel MediaRecorder for guaranteed Sarvam STT fallback
    if (typeof navigator !== 'undefined' && navigator.mediaDevices?.getUserMedia) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const recorder = new MediaRecorder(stream);
        mediaRecorderRef.current = recorder;

        recorder.ondataavailable = (e) => {
          if (e.data.size > 0) audioChunksRef.current.push(e.data);
        };

        recorder.onstop = () => {
          stream.getTracks().forEach((track) => track.stop());
          const audioBlob = new Blob(audioChunksRef.current, {
            type: recorder.mimeType || 'audio/webm',
          });
          if (!hasRoutedRef.current && audioChunksRef.current.length > 0) {
            transcribeWithSarvam(audioBlob);
          }
        };

        recorder.start(100);
      } catch (err: any) {
        console.warn('MediaRecorder error:', err);
        if (err?.name === 'NotAllowedError') {
          setError(
            language === 'hi'
              ? 'माइक्रोफोन की अनुमति दें (Allow Mic) ताकि आप बोल सकें।'
              : 'Please allow microphone access to use voice commands.'
          );
        }
      }
    }

    // 2. Start native speech recognition for 0ms streaming transcription
    if (recognitionRef.current) {
      try {
        recognitionRef.current.lang = BCP47_MAP[language] || 'en-IN';
        recognitionRef.current.start();
        setIsListening(true);
        return;
      } catch (err) {
        console.warn('Recognition start caught:', err);
      }
    }

    setIsListening(true);
  }, [language, stopSpeaking, transcribeWithSarvam]);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {
        // ignore
      }
    }

    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try {
        mediaRecorderRef.current.stop();
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
        matchedAction,
        isSpeaking,
        error,
        toggleListening,
        startListening,
        stopListening,
        speak,
        stopSpeaking,
        lastAction,
        registerActionHandler,
        routeVoiceCommand,
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
