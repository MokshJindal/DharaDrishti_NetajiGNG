'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import { useVoice } from '@/lib/voice/VoiceContext';
import { PRIMARY_FIELD } from '@/lib/data/mockData';

interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  timestamp: string;
  citation?: string;
}

export default function ChatPage() {
  const { t, language } = useLanguage();
  const { isListening, toggleListening, transcript, speak, registerActionHandler } = useVoice();

  const [inputQuery, setInputQuery] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'msg-01',
      sender: 'assistant',
      text:
        language === 'hi'
          ? `नमस्ते रमेश जी! मैं आपका खेत सलाहकार हूँ। मुझे आपके 4.8 एकड़ खेत (3.2 एकड़ गेहूं व 1.6 एकड़ सरसों) की मिट्टी और मौसम का पूरा ज्ञान है। कोई भी सवाल पूछें या बोलें!`
          : `Hello! I am your DharaDrishti Farm Assistant. I have the context of your 4.8 acre field (Wheat & Mustard) with soil test SHC-MH-2026-8841. Ask or speak any farming question!`,
      timestamp: 'Just now',
      citation: 'DharaDrishti Field Context Engine',
    },
  ]);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = useCallback(
    (queryText: string) => {
      const q = queryText.trim();
      if (!q) return;

      const userMsg: ChatMessage = {
        id: `msg-${Date.now()}`,
        sender: 'user',
        text: q,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      setMessages((prev) => [...prev, userMsg]);
      setInputQuery('');

      // Generate intelligent field-grounded response
      const lower = q.toLowerCase();
      setTimeout(() => {
        let reply = '';
        let source = 'ICAR Wheat Research Directorate (IIWBR)';

        if (lower.includes('water') || lower.includes('पानी') || lower.includes('सिंचाई')) {
          reply =
            language === 'hi'
              ? `आपके खेत के लिए सलाह: कल शाम 18 मिमी बारिश की संभावना है। इसलिए आज पानी बिल्कुल न लगाएं। बारिश के बाद यदि पानी भर जाए तो मेड़ खोलकर निकासी कर दें।`
              : `Field recommendation: 18 mm rain forecasted for tomorrow. Skip watering today to save electricity and prevent root waterlogging.`;
          source = 'Open-Meteo & ICAR Water Management Guidelines';
        } else if (lower.includes('rust') || lower.includes('रतुआ') || lower.includes('पीला') || lower.includes('disease')) {
          reply =
            language === 'hi'
              ? `गेहूं में पीला रतुआ (Yellow Rust) की रोकथाम के लिए तुरंत 5% नीम तेल (NSKE) या ट्राइकोडर्मा का छिड़काव करें। यदि प्रकोप 5% से अधिक पत्तों पर हो तो प्रोपिकोनाज़ोल 25% EC @ 1 मिली प्रति लीटर पानी में मिलाकर छिड़कें।`
              : `To control Yellow Rust in wheat, spray 5% Neem extract or Trichoderma harzianum. For severe patches, apply Propiconazole 25% EC at 1 ml/L.`;
          source = 'ICAR Crop Protection Manual';
        } else if (lower.includes('fertiliser') || lower.includes('खाद') || lower.includes('यूरिया')) {
          reply =
            language === 'hi'
              ? `आपके 3.2 एकड़ गेहूं के लिए सॉइल हेल्थ कार्ड के अनुसार नाइट्रोजन कम (215 kg/ha) है। आपको कुल 120 किलो यूरिया 3 बराबर किस्तों में (बुवाई, कल्ले फूटते समय व बालियां निकलते समय) देना चाहिए।`
              : `Based on your Soil Health Card, Nitrogen is low (215 kg/ha). Recommended dose is 120 kg Urea split into 3 dressings (basal, tillering, and booting stages).`;
          source = 'Soil Health Card #SHC-MH-2026-8841';
        } else {
          reply =
            language === 'hi'
              ? `आपके खेत (4.8 एकड़) के लिए यह निर्णय उत्तम है। वर्तमान मौसम साफ है। कल की बारिश के बाद नाइट्रोजन टॉप-ड्रेसिंग करें। किसी भी समस्या पर तुरंत पूछें।`
              : `For your 4.8 acre field in Shirur, conditions are favorable. Follow up after tomorrow's rain with recommended top-dressing.`;
          source = 'KVK Baramati Agronomy Advisory';
        }

        const aiMsg: ChatMessage = {
          id: `msg-${Date.now() + 1}`,
          sender: 'assistant',
          text: reply,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          citation: source,
        };

        setMessages((prev) => [...prev, aiMsg]);
        speak(reply);
      }, 1000);
    },
    [language, speak]
  );

  // Sync speech transcript
  useEffect(() => {
    if (transcript && !isListening) {
      handleSend(transcript);
    }
  }, [handleSend, isListening, transcript]);

  // Voice handler
  useEffect(() => {
    const unregister = registerActionHandler((spoken: string) => {
      handleSend(spoken);
      return true;
    });
    return unregister;
  }, [handleSend, registerActionHandler]);

  const quickQuestions = [
    { label: language === 'hi' ? 'क्या आज पानी दूं?' : 'Should I water today?', q: 'Should I water today?' },
    { label: language === 'hi' ? 'गेहूं में पीला रतुआ कैसे रोकें?' : 'How to treat Yellow Rust?', q: 'How to control yellow rust in wheat organically?' },
    { label: language === 'hi' ? 'यूरिया की सही मात्रा?' : 'Correct Urea dosage?', q: 'What is the recommended Urea dose for my soil?' },
  ];

  return (
    <div className="space-y-4 max-w-4xl mx-auto">
      {/* Header */}
      <div className="bg-white p-5 rounded-3xl shadow-sm border border-gray-100 flex items-center justify-between">
        <div>
          <span className="text-xs font-bold text-[#186049] uppercase tracking-wider">
            💬 Grounded ICAR / KVK Chatbot
          </span>
          <h1 className="text-2xl font-black text-[#186049]">
            {t('chatbot', 'Kisan AI Chatbot')}
          </h1>
          <p className="text-xs text-gray-500 mt-0.5">
            Context: {PRIMARY_FIELD.name} ({PRIMARY_FIELD.totalAreaAcres} Acres, Wheat & Mustard)
          </p>
        </div>

        <button
          onClick={toggleListening}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-2xl font-bold text-xs shadow transition active:scale-95 ${
            isListening
              ? 'bg-[#B98327] text-white animate-pulse'
              : 'bg-[#4A943E] text-white hover:bg-[#3d7d33]'
          }`}
        >
          <span>🎤</span>
          <span>{isListening ? 'Listening...' : 'Speak Question'}</span>
        </button>
      </div>

      {/* Suggested Quick Question Chips */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
        {quickQuestions.map((chip, idx) => (
          <button
            key={idx}
            onClick={() => handleSend(chip.q)}
            className="whitespace-nowrap px-3.5 py-1.5 rounded-full bg-white border border-[#186049]/20 text-[#186049] font-bold shadow-sm hover:bg-[#ECE8AF] transition"
          >
            💡 {chip.label}
          </button>
        ))}
      </div>

      {/* Chat Messages Log */}
      <div className="min-h-[420px] max-h-[520px] overflow-y-auto rounded-3xl bg-white p-5 shadow-sm border border-gray-100 space-y-4">
        {messages.map((m) => (
          <div
            key={m.id}
            className={`flex flex-col ${
              m.sender === 'user' ? 'items-end' : 'items-start'
            }`}
          >
            <div
              className={`max-w-[85%] rounded-3xl p-4 text-xs sm:text-sm font-medium leading-relaxed shadow-sm ${
                m.sender === 'user'
                  ? 'bg-[#186049] text-white rounded-br-xs'
                  : 'bg-[#f4f7f4] text-gray-800 rounded-bl-xs border border-[#186049]/10'
              }`}
            >
              <div className="flex items-center justify-between gap-3 text-[11px] opacity-75 mb-1 font-semibold">
                <span>{m.sender === 'user' ? 'You (Farmer)' : '🌾 Kisan AI'}</span>
                <span>{m.timestamp}</span>
              </div>
              <p>{m.text}</p>

              {m.citation && (
                <div className="mt-2 pt-2 border-t border-black/10 text-[10px] text-gray-500 font-bold flex items-center justify-between">
                  <span>📖 Source: {m.citation}</span>
                  <button
                    onClick={() => speak(m.text)}
                    className="text-[#186049] hover:underline"
                  >
                    🔊 Read
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Bar */}
      <div className="flex items-center gap-2 bg-white p-2 rounded-2xl shadow-sm border border-gray-200">
        <button
          onClick={toggleListening}
          className={`p-3 rounded-xl transition ${
            isListening ? 'bg-[#B98327] text-white' : 'bg-[#186049]/10 text-[#186049] hover:bg-[#186049]/20'
          }`}
          title="Speak Question"
        >
          🎤
        </button>
        <input
          type="text"
          value={inputQuery}
          onChange={(e) => setInputQuery(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSend(inputQuery)}
          placeholder={t('speakOrType', 'Speak by clicking mic or type question...')}
          className="flex-1 px-3 py-2 text-xs sm:text-sm bg-transparent focus:outline-none"
        />
        <button
          onClick={() => handleSend(inputQuery)}
          className="px-5 py-2.5 rounded-xl bg-[#186049] text-white font-bold text-xs sm:text-sm hover:bg-[#124b39] transition"
        >
          Send
        </button>
      </div>
    </div>
  );
}
