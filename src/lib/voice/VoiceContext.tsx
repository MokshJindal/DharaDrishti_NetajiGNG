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
  error: string | null;
  toggleListening: () => void;
  startListening: () => void;
  stopListening: () => void;
  speak: (text: string, langOverride?: string) => void;
  stopSpeaking: () => void;
  lastAction: VoiceActionResult | null;
  registerActionHandler: (handler: (transcript: string) => boolean) => () => void;
  routeVoiceCommand: (text: string) => Promise<void>;
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

// Global event bus for page-level voice triggers
export const voiceEventBus = new EventTarget();

// Multilingual Voice Feedback for all Indian Languages
const VOICE_FEEDBACK: Record<string, Record<LanguageCode, string>> = {
  nav_fields: {
    en: 'Opening your fields and boundary map.',
    hi: 'खेत और मेड़ का नक्शा खोल दिया गया है।',
    pa: 'ਤੁਹਾਡੇ ਖੇਤ ਅਤੇ ਹੱਦ ਵਾਲਾ ਨਕਸ਼ਾ ਖੋਲ੍ਹ ਦਿੱਤਾ ਗਿਆ ਹੈ।',
    mr: 'आपल्या शेताचा व हद्दीचा नकाशा उघडला आहे.',
    ta: 'உங்கள் நில வரைபடம் திறக்கப்பட்டது.',
    te: 'మీ పొలం మ్యాప్ తెరవబడింది.',
    gu: 'તમારા ખેતરનો નકશો ખોલવામાં આવ્યો છે.',
    bn: 'আপনার জমির মানচিত্র খোলা হয়েছে।',
    kn: 'ನಿಮ್ಮ ಜಮೀನಿನ ನಕ್ಷೆ ತೆರೆಯಲಾಗಿದೆ.',
    ml: 'നിങ്ങളുടെ കൃഷിയിട ഭൂപടം തുറന്നു.',
  },
  nav_diagnose: {
    en: 'Opening Crop Doctor. Please take or choose a leaf photo.',
    hi: 'फसल रोग पहचान डॉक्टर खोल दिया गया है। कृपया पत्ती की फोटो लें।',
    pa: 'ਫ਼ਸਲ ਡਾਕਟਰ ਖੋਲ੍ਹ ਦਿੱਤਾ ਗਿਆ ਹੈ। ਕਿਰਪਾ ਕਰਕੇ ਪੱਤੇ ਦੀ ਫੋਟੋ ਲਵੋ।',
    mr: 'पीक डॉक्टर उघडला आहे. कृपया पानाचा फोटो घ्या.',
    ta: 'பயிர் மருத்துவர் திறக்கப்பட்டது. இலை புகைப்படத்தை எடுக்கவும்.',
    te: 'పంట డాక్టర్ తెరవబడింది. దయచేసి ఆకు ఫోటో తీయండి.',
    gu: 'પાક ડોક્ટર ખોલવામાં આવ્યો છે. કૃપા કરીને પાંદડાનો ફોટો લો.',
    bn: 'ফসল ডাক্তার খোলা হয়েছে। পাতার ছবি তুলুন।',
    kn: 'ಬೆಳೆ ವೈದ್ಯ ತೆರೆಯಲಾಗಿದೆ. ದಯವಿಟ್ಟು ಎಲೆಯ ಫೋಟೋ ತೆಗೆಯಿರಿ.',
    ml: 'വിള ഡോക്ടർ തുറന്നു. ഇലയുടെ ഫോട്ടോ എടുക്കുക.',
  },
  nav_irrigation: {
    en: 'Opening irrigation plan. Rain expected in 24 hours, skip watering today to save power.',
    hi: 'सिंचाई का पन्ना खुल गया है। कल बारिश का अनुमान है, आज पानी न लगाएं।',
    pa: 'ਸਿੰਚਾਈ ਪੰਨਾ ਖੁੱਲ੍ਹ ਗਿਆ ਹੈ। ਕੱਲ੍ਹ ਮੀਂਹ ਦਾ ਅਨੁਮਾਨ ਹੈ, ਅੱਜ ਪਾਣੀ ਨਾ ਲਾਓ।',
    mr: 'पाणी व्यवस्थापन उघडले आहे. उद्या पावसाचा अंदाज असल्याने आज पाणी देऊ नका.',
    ta: 'பாசனப் பக்கம் திறக்கப்பட்டது. நாளை மழை வாய்ப்புள்ளதால் இன்று நீர் பாய்ச்ச வேண்டாம்.',
    te: 'నీటి పారుదల తెరవబడింది. రేపు వర్షం కురిసే అవకాశం ఉంది, ఈరోజు నీరు పెట్టవద్దు.',
    gu: 'સિંચાઈ યોજના ખોલવામાં આવી છે. કાલે વરસાદની આગાહી છે, આજે પાણી ન આપો.',
    bn: 'সেচ পরিকল্পনা খোলা হয়েছে। কাল বৃষ্টির সম্ভাবনা আছে, আজ জল দেবেন না।',
    kn: 'ನೀರಾವರಿ ಯೋಜನೆ ತೆರೆಯಲಾಗಿದೆ. ನಾಳೆ ಮಳೆಯಾಗುವ ಸಾಧ್ಯತೆಯಿದೆ, ಇಂದು ನೀರುಣಿಸಬೇಡಿ.',
    ml: 'നനയ്ക്കൽ പദ്ധതി തുറന്നു. നാളെ മഴയ്ക്ക് സാധ്യതയുള്ളതിനാൽ ഇന്ന് നനയ്ക്കരുത്.',
  },
  nav_fertiliser: {
    en: 'Fertiliser calculator opened: Urea, DAP, and MOP bag recommendations ready.',
    hi: 'खाद और उर्वरक कैलकुलेटर खुल गया है। यूरिया, डीएपी और पोटाश की सटीक मात्रा देखें।',
    pa: 'ਖਾਦ ਕੈਲਕੁਲੇਟਰ ਖੁੱਲ੍ਹ ਗਿਆ ਹੈ। ਯੂਰੀਆ, ਡੀਏਪੀ ਅਤੇ ਪੋਟਾਸ਼ ਦੀ ਮਾਤਰਾ ਵੇਖੋ।',
    mr: 'खत कॅल्क्युलेटर उघडले आहे. युरिया, डीएपी आणि पोटॅशची मात्रा पहा.',
    ta: 'உர கால்குலேட்டர் திறக்கப்பட்டது. யூரியா மற்றும் டிஏபி அளவை சரிபார்க்கவும்.',
    te: 'ఎరువుల కాలిక్యులేటర్ తెరవబడింది. యూరియా మరియు డీఏపీ మోతాదు చూడండి.',
    gu: 'ખાતર ગણતરી ખુલી ગઈ છે. યુરિયા અને ડીએપીનું પ્રમાણ જુઓ.',
    bn: 'সার ক্যালকুলেটর খোলা হয়েছে। ইউরিয়া ও ডিএপি সুপারিশ প্রস্তুত।',
    kn: 'ಗೊಬ್ಬರ ಕ್ಯಾಲ್ಕುಲೇಟರ್ ತೆರೆಯಲಾಗಿದೆ. ಯೂರಿಯಾ ಮತ್ತು ಡಿಎಪಿ ಶಿಫಾರಸು ಲಭ್ಯವಿದೆ.',
    ml: 'വള കണക്കുകൂട്ടൽ തുറന്നു. യൂറിയ, ഡിഎപി അളവ് കാണുക.',
  },
  nav_profit: {
    en: 'Opening Profit Estimator. Wheat mandi rate is 2,480 rupees per quintal.',
    hi: 'मुनाफा कैलकुलेटर खोल दिया है। गेहूं का ताज़ा मंडी भाव ₹2,480 प्रति क्विंटल है।',
    pa: 'ਮੰਡੀ ਮੁਨਾਫਾ ਕੈਲਕੁਲੇਟਰ ਖੁੱਲ੍ਹ ਗਿਆ ਹੈ। ਕਣਕ ਦਾ ਮੰਡੀ ਰੇਟ ₹2,480 ਪ੍ਰਤੀ ਕੁਇੰਟਲ ਹੈ।',
    mr: 'बाजार भाव कॅल्क्युलेटर उघडले आहे. गव्हाचा दर ₹2,480 प्रति क्विंटल आहे.',
    ta: 'சந்தை விலை கணக்கீடு திறக்கப்பட்டது. கோதுமை விலை குவிண்டாலுக்கு ₹2,480.',
    te: 'మార్కెట్ ధరల కాలిక్యులేటర్ తెరవబడింది. గోధుమ క్వింటాల్‌కు ₹2,480.',
    gu: 'મંડી નફા ગણતરી ખુલી ગઈ છે. ઘઉંનો ભાવ ક્વિન્ટલ દીઠ ₹2,480 છે.',
    bn: 'মান্ডি দর খোলা হয়েছে। গমের দর কুইন্টাল প্রতি ₹২,৪৮০।',
    kn: 'ಮಂಡಿ ಬೆಲೆ ತೆರೆಯಲಾಗಿದೆ. ಗೋಧಿ ದರ ಕ್ವಿಂಟಾಲ್‌ಗೆ ₹2,480.',
    ml: 'മാർക്കറ്റ് നിരക്ക് തുറന്നു. ഗോതമ്പ് നിരക്ക് ക്വിന്റലിന് ₹2,480.',
  },
  nav_weather: {
    en: 'Opening weather intelligence. Live Open-Meteo forecasts and spray advisory ready.',
    hi: 'मौसम का हाल खुल गया है। लाइव तापमान, बारिश और लीचिंग जोखिम देखें।',
    pa: 'ਮੌਸਮ ਦਾ ਹਾਲ ਖੁੱਲ੍ਹ ਗਿਆ ਹੈ। ਲਾਈਵ ਤਾਪਮਾਨ ਅਤੇ ਮੀਂਹ ਦੀ ਜਾਣਕਾਰੀ ਵੇਖੋ।',
    mr: 'हवामान माहिती उघडली आहे. थेट तापमान आणि पावसाचा अंदाज पहा.',
    ta: 'வானிலை தகவல் திறக்கப்பட்டது. நேரடி மழை மற்றும் வெப்பநிலை விபரம்.',
    te: 'వాతావరణ సమాచారం తెరవబడింది. ప్రత్యక్ష ఉష్ణోగ్రత మరియు వర్ష సూచన.',
    gu: 'હવામાન માહિતી ખુલી ગઈ છે. તાપમાન અને વરસાદની આગાહી જુઓ.',
    bn: 'আবহাওয়া তথ্য খোলা হয়েছে। সরাসরি বৃষ্টির পূর্বাভাস দেখুন।',
    kn: 'ಹವಾಮಾನ ಮಾಹಿತಿ ತೆರೆಯಲಾಗಿದೆ. ನೇರ ಮಳೆಯ ಮುನ್ಸೂಚನೆ ನೋಡಿ.',
    ml: 'കാലാവസ്ഥാ വിവരം തുറന്നു. തത്സമയ മഴയും താപനിലയും കാണുക.',
  },
  nav_score: {
    en: 'Your Fasal Score is 78 out of 100, which is Very Good. You qualify for prime KCC loan limits.',
    hi: 'आपका फसल स्कोर 78/100 यानी बहुत अच्छा है। केसीसी लोन के लिए आप पूरी तरह पात्र हैं।',
    pa: 'ਤੁਹਾਡਾ ਫ਼ਸਲ ਸਕੋਰ 78/100 ਹੈ। ਕੇਸੀਸੀ ਲੋਨ ਲਈ ਤੁਸੀਂ ਪੂਰੀ ਤਰ੍ਹਾਂ ਯੋਗ ਹੋ।',
    mr: 'आपला पीक गुण 78/100 आहे. केसीसी कर्जासाठी आपण पात्र आहात.',
    ta: 'உங்கள் பயிர் மதிப்பீடு 78/100. கேசிசி கடனுக்கு நீங்கள் தகுதியானவர்.',
    te: 'మీ పంట స్కోరు 78/100. మీరు కేసీసీ రుణానికి అర్హులు.',
    gu: 'તમારો પાક સ્કોર 78/100 છે. કેસીસી લોન માટે તમે પાત્ર છો.',
    bn: 'আপনার ফসল স্কোর ৭৮/১০০। কেসিসি লোনের জন্য আপনি যোগ্য।',
    kn: 'ನಿಮ್ಮ ಬೆಳೆ ಸ್ಕೋರ್ 78/100. ಕೆಸಿಸಿ ಸಾಲಕ್ಕೆ ನೀವು ಅರ್ಹರು.',
    ml: 'നിങ്ങളുടെ വിള സ്കോർ 78/100 ആണ്. കെസിസി വായ്പയ്ക്ക് നിങ്ങൾ അർഹനാണ്.',
  },
  nav_chat: {
    en: 'Opening Krishi AI conversation. How can I help with your crops today?',
    hi: 'कृषि एआई सहायक खुल गया है। आज अपनी फसल के बारे में क्या पूछना चाहते हैं?',
    pa: 'ਕ੍ਰਿਸ਼ੀ ਏਆਈ ਖੁੱਲ੍ਹ ਗਿਆ ਹੈ। ਅੱਜ ਤੁਸੀਂ ਆਪਣੀ ਫ਼ਸਲ ਬਾਰੇ ਕੀ ਪੁੱਛਣਾ ਚਾਹੁੰਦੇ ਹੋ?',
    mr: 'कृषी एआय उघडले आहे. आज आपल्या पिकाबद्दल काय विचारायचे आहे?',
    ta: 'கிருஷி AI திறக்கப்பட்டது. உங்கள் பயிர் பற்றி என்ன கேட்க விரும்புகிறீர்கள்?',
    te: 'కృషి AI తెరవబడింది. మీ పంట గురించి ఏమి అడగాలనుకుంటున్నారు?',
    gu: 'કૃષિ AI ખુલી ગયું છે. તમારા પાક વિશે શું પૂછવું છે?',
    bn: 'কৃষি এআই খোলা হয়েছে। ফসলের বিষয়ে কী জানতে চান?',
    kn: 'ಕೃಷಿ AI ತೆರೆಯಲಾಗಿದೆ. ನಿಮ್ಮ ಬೆಳೆಯ ಬಗ್ಗೆ ಏನು ಕೇಳಬೇಕಿದೆ?',
    ml: 'കൃഷി AI തുറന്നു. നിങ്ങളുടെ വിളയെക്കുറിച്ച് എന്താണ് ചോദിക്കേണ്ടത്?',
  },
  nav_home: {
    en: 'Opened main farm dashboard.',
    hi: 'मुख्य डैशबोर्ड खोल दिया गया है।',
    pa: 'ਮੁੱਖ ਡੈਸ਼ਬੋਰਡ ਖੋਲ੍ਹ ਦਿੱਤਾ ਗਿਆ ਹੈ।',
    mr: 'मुख्य डॅशबोर्ड उघडला आहे.',
    ta: 'முதன்மை பலகை திறக்கப்பட்டது.',
    te: 'ప్రధాన డ్యాஷ்‌బోర్డ్ తెరవబడింది.',
    gu: 'મુખ્ય ડેશબોર્ડ ખોલવામાં આવ્યું છે.',
    bn: 'मूल ড্যাশবোর্ড খোলা হয়েছে।',
    kn: 'ಮುಖ್ಯ ಡ್ಯಾಶ್‌ಬೋರ್ಡ್ ತೆರೆಯಲಾಗಿದೆ.',
    ml: 'പ്രധാന ഡാഷ്‌ബോർഡ് തുറന്നു.',
  },
};

export function VoiceProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { language, setLanguage } = useLanguage();
  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [lastAction, setLastAction] = useState<VoiceActionResult | null>(null);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognitionRef = useRef<any>(null);
  const customHandlersRef = useRef<((t: string) => boolean)[]>([]);
  const audioPlayerRef = useRef<HTMLAudioElement | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const latestTranscriptRef = useRef<string>('');
  const hasRoutedRef = useRef<boolean>(false);

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

  // Text-To-Speech with Multi-Tier Fallback (Server Sarvam -> Client Sarvam -> Browser Speech)
  const speak = useCallback(
    async (text: string, langOverride?: string) => {
      if (!text || typeof window === 'undefined') return;

      const targetLang = (langOverride || language) as LanguageCode;
      stopSpeaking();

      const cleanSpeechText = (raw: string) => {
        return raw
          .replace(/```[\s\S]*?```/g, '')
          .replace(/`([^`]+)`/g, '$1')
          .replace(/!\[([^\]]*)\]\([^)]*\)/g, '')
          .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
          .replace(/^#{1,6}\s+/gm, '')
          .replace(/\*\*([^*]+)\*\*/g, '$1')
          .replace(/\*([^*]+)\*/g, '$1')
          .replace(/^[\s]*[-*+]\s+/gm, '')
          .replace(/^[\s]*\d+\.\s+/gm, '')
          .replace(/^>\s+/gm, '')
          .replace(/---/g, '')
          .replace(/\|/g, ' ')
          .replace(/[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, '')
          .replace(/\s+/g, ' ')
          .trim();
      };

      const cleaned = cleanSpeechText(text);
      if (!cleaned) return;

      // 1. Try Server Next.js API Route (/api/voice/tts)
      try {
        const response = await fetch('/api/voice/tts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text: cleaned,
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
        console.warn('Server TTS route unavailable, attempting direct fallback:', err);
      }

      // 2. Client-side Web Speech API Fallback
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(cleaned);
        const bcpCode = BCP47_MAP[targetLang] || 'en-IN';
        utterance.lang = bcpCode;

        const voices = window.speechSynthesis.getVoices();
        const matchedVoice = voices.find(
          (v) =>
            v.lang === bcpCode ||
            v.lang.toLowerCase().includes(targetLang) ||
            v.name.toLowerCase().includes('india') ||
            v.name.toLowerCase().includes('hindi')
        );
        if (matchedVoice) utterance.voice = matchedVoice;

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
      if (!lower) return;

      hasRoutedRef.current = true;
      setError(null);

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
      if (lower.includes('english') || lower.includes('अंग्रेजी') || lower.includes('ਅੰਗਰੇਜ਼ੀ')) {
        setLanguage('en');
        speak('Language changed to English.', 'en');
        setLastAction({ intent: 'lang_switch', feedback: 'English selected' });
        return;
      }
      if (lower.includes('marathi') || lower.includes('मराठी')) {
        setLanguage('mr');
        speak('भाषा बदलून मराठी केली आहे.', 'mr');
        setLastAction({ intent: 'lang_switch', feedback: 'मराठी निवडली' });
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
      if (lower.includes('gujarati') || lower.includes('ગુજરાતી')) {
        setLanguage('gu');
        speak('ભાષા બદલીને ગુજરાતી કરવામાં આવી છે.', 'gu');
        setLastAction({ intent: 'lang_switch', feedback: 'ગુજરાતી પસંદ કરી' });
        return;
      }

      // 3. Fast Direct Navigation Intents & Synonyms
      // Geofencing / Fields
      if (
        lower.includes('field') ||
        lower.includes('khet') ||
        lower.includes('खेत') ||
        lower.includes('नक्शा') ||
        lower.includes('boundary') ||
        lower.includes('सीमा') ||
        lower.includes('walk') ||
        lower.includes('ਚਲੋ') ||
        lower.includes('ਪਲਾਟ') ||
        lower.includes('plot') ||
        lower.includes('zameen') ||
        lower.includes('जमीन') ||
        lower.includes('रकबा') ||
        lower.includes('naap') ||
        lower.includes('नापो') ||
        lower.includes('मेड़') ||
        lower.includes('med') ||
        lower.includes('gps')
      ) {
        router.push('/fields');
        const reply = VOICE_FEEDBACK.nav_fields[language] || VOICE_FEEDBACK.nav_fields.en;
        speak(reply);
        setLastAction({ intent: 'nav_fields', feedback: reply });
        return;
      }

      // Disease Detection / Crop Doctor
      if (
        lower.includes('disease') ||
        lower.includes('bimar') ||
        lower.includes('बीमार') ||
        lower.includes('रोग') ||
        lower.includes('पत्ती') ||
        lower.includes('कीड़ा') ||
        lower.includes('कीट') ||
        lower.includes('leaf') ||
        lower.includes('spray') ||
        lower.includes('diagnose') ||
        lower.includes('camera') ||
        lower.includes('डॉक्टर') ||
        lower.includes('doctor') ||
        lower.includes('patta') ||
        lower.includes('पत्ता') ||
        lower.includes('chhidkaw') ||
        lower.includes('छिड़काव') ||
        lower.includes('dawa') ||
        lower.includes('दवा') ||
        lower.includes('ilaj') ||
        lower.includes('इलाज') ||
        lower.includes('fungus') ||
        lower.includes('peela') ||
        lower.includes('पीला')
      ) {
        router.push('/diagnose');
        const reply = VOICE_FEEDBACK.nav_diagnose[language] || VOICE_FEEDBACK.nav_diagnose.en;
        speak(reply);
        setLastAction({ intent: 'nav_diagnose', feedback: reply });
        return;
      }

      // Irrigation / Water Advisory
      if (
        lower.includes('water') ||
        lower.includes('pani') ||
        lower.includes('पानी') ||
        lower.includes('सिंचाई') ||
        lower.includes('sinchai') ||
        lower.includes('irrigate') ||
        lower.includes('ट्यूबवेल') ||
        lower.includes('tubewell') ||
        lower.includes('motor') ||
        lower.includes('मोटर') ||
        lower.includes('nami') ||
        lower.includes('नमी') ||
        lower.includes('जल')
      ) {
        router.push('/irrigation');
        const reply = VOICE_FEEDBACK.nav_irrigation[language] || VOICE_FEEDBACK.nav_irrigation.en;
        speak(reply);
        setLastAction({ intent: 'nav_irrigation', feedback: reply });
        return;
      }

      // Fertiliser / Khad / Soil Health
      if (
        lower.includes('fertiliser') ||
        lower.includes('fertilizer') ||
        lower.includes('khad') ||
        lower.includes('खाद') ||
        lower.includes('urea') ||
        lower.includes('यूरिया') ||
        lower.includes('dap') ||
        lower.includes('mitti') ||
        lower.includes('मिट्टी') ||
        lower.includes('soil') ||
        lower.includes('npk') ||
        lower.includes('potash') ||
        lower.includes('पोटाश') ||
        lower.includes('poshan') ||
        lower.includes('पोषण')
      ) {
        router.push('/fertiliser');
        const reply = VOICE_FEEDBACK.nav_fertiliser[language] || VOICE_FEEDBACK.nav_fertiliser.en;
        speak(reply);
        setLastAction({ intent: 'nav_fertiliser', feedback: reply });
        return;
      }

      // Profit / APMC Mandi Rates / Selling
      if (
        lower.includes('profit') ||
        lower.includes('earn') ||
        lower.includes('munafa') ||
        lower.includes('मुनाफा') ||
        lower.includes('कमाई') ||
        lower.includes('kamai') ||
        lower.includes('mandi') ||
        lower.includes('मंडी') ||
        lower.includes('price') ||
        lower.includes('भाव') ||
        lower.includes('bhav') ||
        lower.includes('rate') ||
        lower.includes('रेट') ||
        lower.includes('apmc') ||
        lower.includes('daam') ||
        lower.includes('दाम') ||
        lower.includes('kimat') ||
        lower.includes('कीमत') ||
        lower.includes('bechna') ||
        lower.includes('बेचना') ||
        lower.includes('market') ||
        lower.includes('बाजार')
      ) {
        router.push('/profit');
        const reply = VOICE_FEEDBACK.nav_profit[language] || VOICE_FEEDBACK.nav_profit.en;
        speak(reply);
        setLastAction({ intent: 'nav_profit', feedback: reply });
        return;
      }

      // Weather / Monsoon Radar
      if (
        lower.includes('weather') ||
        lower.includes('mausam') ||
        lower.includes('मौसम') ||
        lower.includes('barish') ||
        lower.includes('बारिश') ||
        lower.includes('rain') ||
        lower.includes('forecast') ||
        lower.includes('hawa') ||
        lower.includes('हवा') ||
        lower.includes('temperature') ||
        lower.includes('taapman') ||
        lower.includes('तापमान') ||
        lower.includes('toofan') ||
        lower.includes('तूफान')
      ) {
        router.push('/weather');
        const reply = VOICE_FEEDBACK.nav_weather[language] || VOICE_FEEDBACK.nav_weather.en;
        speak(reply);
        setLastAction({ intent: 'nav_weather', feedback: reply });
        return;
      }

      // Fasal Score / Kisan Credit / Land Health
      if (
        lower.includes('score') ||
        lower.includes('health') ||
        lower.includes('स्कोर') ||
        lower.includes('हाल') ||
        lower.includes('kisan score') ||
        lower.includes('loan') ||
        lower.includes('लोन') ||
        lower.includes('kcc') ||
        lower.includes('credit') ||
        lower.includes('साख') ||
        lower.includes('patrata') ||
        lower.includes('पात्रता') ||
        lower.includes('eligibility') ||
        lower.includes('sehat') ||
        lower.includes('सेहत') ||
        lower.includes('rating') ||
        lower.includes('ledger') ||
        lower.includes('bahi') ||
        lower.includes('बही')
      ) {
        router.push('/score');
        const reply = VOICE_FEEDBACK.nav_score[language] || VOICE_FEEDBACK.nav_score.en;
        speak(reply);
        setLastAction({ intent: 'nav_score', feedback: reply });
        return;
      }

      // Krishi AI Chat / Questions
      if (
        lower.includes('chat') ||
        lower.includes('krishi ai') ||
        lower.includes('ai') ||
        lower.includes('बात') ||
        lower.includes('सवाल') ||
        lower.includes('पूछ') ||
        lower.includes('ask') ||
        lower.includes('कृषि') ||
        lower.includes('सलाह') ||
        lower.includes('sahayak') ||
        lower.includes('सहायक') ||
        lower.includes('mitra') ||
        lower.includes('मित्र')
      ) {
        router.push('/chat');
        const reply = VOICE_FEEDBACK.nav_chat[language] || VOICE_FEEDBACK.nav_chat.en;
        speak(reply);
        setLastAction({ intent: 'nav_chat', feedback: reply });
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
        const reply = VOICE_FEEDBACK.nav_home[language] || VOICE_FEEDBACK.nav_home.en;
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
        language === 'en'
          ? `Heard: "${text}". Try saying: "Show field", "Diagnose leaf", "Weather forecast", "Mandi rates", or "Fertilizer dose".`
          : language === 'hi'
          ? `मैंने सुना: "${text}"। आप बोल सकते हैं: "खेत दिखाओ", "पत्ती की बीमारी", "मौसम बताओ", "मंडी भाव", या "खाद की मात्रा"।`
          : language === 'pa'
          ? `ਮੈਂ ਸੁਣਿਆ: "${text}"। ਤੁਸੀਂ ਕਹਿ ਸਕਦੇ ਹੋ: "ਖੇਤ ਦਿਖਾਓ", "ਬਿਮਾਰੀ ਜਾਂਚ", "ਮੌਸਮ", ਜਾਂ "ਮੰਡੀ ਰੇਟ"।`
          : `Heard: "${text}". Opening requested feature.`;
      speak(genericReply);
      setLastAction({ intent: 'generic', feedback: genericReply });
    },
    [language, router, setLanguage, speak]
  );

  // Process recorded audio with Sarvam AI Speech-to-Text (`saarika:v2.5`)
  const transcribeAudioWithSarvam = useCallback(
    async (audioBlob: Blob) => {
      try {
        setIsProcessing(true);
        const formData = new FormData();
        formData.append('file', audioBlob);
        formData.append('language', language);

        const res = await fetch('/api/voice/stt', {
          method: 'POST',
          body: formData,
        });

        if (res.ok) {
          const data = await res.json();
          const recognizedText = (data.transcript || '').trim();
          if (recognizedText) {
            setTranscript(recognizedText);
            latestTranscriptRef.current = recognizedText;
            routeVoiceCommand(recognizedText);
            return;
          }
        }
      } catch (err) {
        console.warn('Sarvam STT failed:', err);
      } finally {
        setIsProcessing(false);
      }

      // If nothing recognized
      if (!latestTranscriptRef.current) {
        setError(
          language === 'hi'
            ? 'आवाज़ साफ सुनाई नहीं दी। कृपया दोबारा बोलें।'
            : 'Could not hear clearly. Please try speaking again.'
        );
      }
    },
    [language, routeVoiceCommand]
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
      rec.lang = BCP47_MAP[language] || 'en-IN';

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      rec.onresult = (event: any) => {
        const result = event.results[event.results.length - 1];
        const spoken = result[0].transcript;
        setTranscript(spoken);
        latestTranscriptRef.current = spoken;

        if (result.isFinal) {
          setIsListening(false);
          routeVoiceCommand(spoken);
        }
      };

      rec.onend = () => {
        setIsListening(false);
        // CRITICAL BUG FIX: If result was not marked isFinal before onend, route what was heard!
        if (latestTranscriptRef.current && !hasRoutedRef.current) {
          routeVoiceCommand(latestTranscriptRef.current);
        }
      };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      rec.onerror = (e: any) => {
        console.warn('SpeechRecognition error:', e?.error);
        setIsListening(false);
        if (e?.error === 'not-allowed') {
          setError(
            language === 'hi'
              ? 'माइक्रोफोन की अनुमति नहीं मिली। कृपया ब्राउज़र सेटिंग्स में माइक्रोफोन ऑन करें।'
              : 'Microphone access denied. Please allow microphone permissions.'
          );
        }
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

  // Start listening (with dual engine: Web Speech + MediaRecorder for Sarvam STT fallback)
  const startListening = useCallback(async () => {
    stopSpeaking();
    setError(null);
    setTranscript('');
    latestTranscriptRef.current = '';
    hasRoutedRef.current = false;
    audioChunksRef.current = [];

    // 1. Start MediaRecorder in parallel for foolproof Sarvam STT
    if (typeof navigator !== 'undefined' && navigator.mediaDevices?.getUserMedia) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const recorder = new MediaRecorder(stream);
        mediaRecorderRef.current = recorder;

        recorder.ondataavailable = (e) => {
          if (e.data.size > 0) {
            audioChunksRef.current.push(e.data);
          }
        };

        recorder.onstop = () => {
          stream.getTracks().forEach((track) => track.stop());
          const audioBlob = new Blob(audioChunksRef.current, { type: recorder.mimeType || 'audio/webm' });
          // If native web speech did not produce a transcript, use Sarvam STT!
          if (!hasRoutedRef.current && audioChunksRef.current.length > 0) {
            transcribeAudioWithSarvam(audioBlob);
          }
        };

        recorder.start(100);
      } catch (micErr: any) {
        console.warn('Microphone stream error:', micErr);
        if (micErr?.name === 'NotAllowedError') {
          setError(
            language === 'hi'
              ? 'माइक्रोफोन की अनुमति दें (Allow Mic) ताकि आप बोल सकें।'
              : 'Please allow microphone access to use voice commands.'
          );
        }
      }
    }

    // 2. Start Web Speech Recognition if available
    if (recognitionRef.current) {
      try {
        recognitionRef.current.lang = BCP47_MAP[language] || 'en-IN';
        recognitionRef.current.start();
        setIsListening(true);
        return;
      } catch (err) {
        console.warn('Native speech recognition start failed:', err);
      }
    }

    // If native speech not available, MediaRecorder is already active
    setIsListening(true);
  }, [language, stopSpeaking, transcribeAudioWithSarvam]);

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
