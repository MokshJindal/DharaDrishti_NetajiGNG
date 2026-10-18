'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import { useVoice } from '@/lib/voice/VoiceContext';
import { PRIMARY_FIELD } from '@/lib/data/mockData';

interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  spokenSummary?: string;
  timestamp: string;
  citation?: string;
}

// Crisp, readable Markdown Formatter for Farm Advisory
function FormattedMessageText({ text }: { text: string }) {
  const lines = text.split('\n');
  return (
    <div className="space-y-1.5 leading-relaxed text-xs sm:text-sm">
      {lines.map((line, idx) => {
        const trimmed = line.trim();
        if (!trimmed) return <div key={idx} className="h-1" />;

        // Horizontal rules
        if (trimmed === '---') return <hr key={idx} className="my-2 border-gray-200" />;

        // Header ###
        if (trimmed.startsWith('### ')) {
          return (
            <h4 key={idx} className="font-extrabold text-[#186049] text-xs sm:text-sm mt-2">
              {trimmed.replace(/^###\s+/, '')}
            </h4>
          );
        }
        // Header ##
        if (trimmed.startsWith('## ')) {
          return (
            <h3 key={idx} className="font-black text-[#186049] text-sm sm:text-base mt-2.5 border-b border-emerald-100 pb-0.5">
              {trimmed.replace(/^##\s+/, '')}
            </h3>
          );
        }
        // Header #
        if (trimmed.startsWith('# ')) {
          return (
            <h2 key={idx} className="font-black text-[#186049] text-base sm:text-lg mt-3">
              {trimmed.replace(/^#\s+/, '')}
            </h2>
          );
        }

        // List item bullet
        const isBullet = trimmed.startsWith('- ') || trimmed.startsWith('* ') || trimmed.startsWith('• ');
        const content = isBullet ? trimmed.replace(/^[-*•]\s+/, '') : trimmed;

        // Render bold segments
        const parts = content.split(/(\*\*[^*]+\*\*)/g);
        const rendered = parts.map((part, pIdx) => {
          if (part.startsWith('**') && part.endsWith('**')) {
            return (
              <strong key={pIdx} className="font-black text-gray-900">
                {part.slice(2, -2)}
              </strong>
            );
          }
          return part;
        });

        if (isBullet) {
          return (
            <div key={idx} className="flex items-start gap-2 pl-1 sm:pl-2">
              <span className="text-[#4A943E] font-black text-xs mt-0.5">•</span>
              <span className="flex-1">{rendered}</span>
            </div>
          );
        }

        return <p key={idx}>{rendered}</p>;
      })}
    </div>
  );
}

export default function ChatPage() {
  const { t, language } = useLanguage();
  const { isListening, toggleListening, transcript, speak, isSpeaking, stopSpeaking, registerActionHandler } = useVoice();

  const [inputQuery, setInputQuery] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [playingMessageId, setPlayingMessageId] = useState<string | null>(null);

  const initialGreeting: ChatMessage = {
    id: 'msg-01',
    sender: 'assistant',
    text:
      language === 'en'
        ? `Hello! I am **Krishi Mitra**, your AI Farm Advisor powered by Claude & ICAR.\n\nI have the complete real-time context of your **4.8 Acre farm in Shirur, Pune**:\n- **Plot A (3.2 Acres):** Wheat HD-2967 (Tillering to Booting)\n- **Plot B (1.6 Acres):** Mustard Pusa Bold\n- **Soil Health Card:** #SHC-MH-2026-8841 (Low N, Med P, High K, pH 7.4)\n- **Weather Radar:** 32°C today, 18mm rainfall forecasted tomorrow afternoon\n\nAsk me any question by voice or typing!`
        : `राम राम रमेश जी! मैं आपका **कृषि मित्र AI सलाहकार** हूँ।\n\nमुझे आपके **4.8 एकड़ खेत (शिरूर, पुणे)** की पूरी जानकारी है:\n- **3.2 एकड़ गेहूं:** टिलरिंग स्टेज\n- **1.6 एकड़ सरसों:** फूल वाली स्टेज\n- **मृदा स्वास्थ्य कार्ड:** #SHC-MH-2026 (नाइट्रोजन कम 215 kg/ha, pH 7.4)\n- **मौसम रडार:** आज 32°C, कल दोपहर 18 मिमी बारिश का अनुमान\n\nखाद, पानी, रोग या मंडी भाव के बारे में कोई भी सवाल पूछें या माइक दबाकर बोलें!`,
    spokenSummary:
      language === 'en'
        ? 'Hello Ramesh! I am Krishi Mitra, your farm advisor. 18 millimeters of rain is forecasted for tomorrow, so skip watering today. Ask me any farming question anytime.'
        : 'राम राम रमेश जी! मैं आपका कृषि मित्र हूँ। कल 18 मिलीमीटर बारिश का अनुमान है, इसलिए आज खेत में पानी न दें। कोई भी सवाल बोलकर पूछें।',
    timestamp: 'Just now',
    citation: 'ICAR-IIWBR & KVK Baramati Advisory',
  };

  const [messages, setMessages] = useState<ChatMessage[]>([initialGreeting]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isGenerating]);

  // Track playing audio state
  useEffect(() => {
    if (!isSpeaking) {
      setPlayingMessageId(null);
    }
  }, [isSpeaking]);

  const handleSend = useCallback(
    async (queryText: string) => {
      const q = queryText.trim();
      if (!q || isGenerating) return;

      const userMsg: ChatMessage = {
        id: `msg-${Date.now()}`,
        sender: 'user',
        text: q,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      setMessages((prev) => [...prev, userMsg]);
      setInputQuery('');
      setIsGenerating(true);

      try {
        const history = messages.slice(-5).map((m) => ({
          role: m.sender,
          content: m.text,
        }));

        const res = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: q,
            messages: history,
            language,
          }),
        });

        if (res.ok) {
          const data = await res.json();
          const replyText = data.reply || 'Advisory generated.';
          const spokenText = data.spokenSummary || replyText;
          const cite = data.citation || 'ICAR & KVK Advisory';

          const aiMsg: ChatMessage = {
            id: `msg-${Date.now() + 1}`,
            sender: 'assistant',
            text: replyText,
            spokenSummary: spokenText,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            citation: cite,
          };

          setMessages((prev) => [...prev, aiMsg]);
          setIsGenerating(false);

          // Automatically speak the natural spoken summary
          if (spokenText) {
            setPlayingMessageId(aiMsg.id);
            speak(spokenText);
          }
          return;
        }
      } catch (err) {
        console.warn('Chat request failed:', err);
      }

      // Fallback in case of network issue
      setIsGenerating(false);
      const fallbackMsg: ChatMessage = {
        id: `msg-${Date.now() + 1}`,
        sender: 'assistant',
        text:
          language === 'en'
            ? 'Tomorrow 18mm rainfall is forecast in Shirur. Skip irrigation today to save power and water. Inspect flag leaves for yellow rust early in the morning.'
            : 'कल शिरूर में 18 मिमी बारिश का अनुमान है। आज गेहूं में पानी बिल्कुल न लगाएं। सुबह के समय पत्तियों पर पीले रतुए की जांच अवश्य करें।',
        spokenSummary:
          language === 'en'
            ? 'Skip watering today because 18 mm rain is expected tomorrow.'
            : 'कल बारिश होने वाली है, इसलिए आज पानी न लगाएं।',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        citation: 'KVK Pune Advisory',
      };
      setMessages((prev) => [...prev, fallbackMsg]);
      speak(fallbackMsg.spokenSummary || fallbackMsg.text);
    },
    [isGenerating, language, messages, speak]
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

  const handleAudioToggle = (msg: ChatMessage) => {
    if (playingMessageId === msg.id && isSpeaking) {
      stopSpeaking();
      setPlayingMessageId(null);
    } else {
      setPlayingMessageId(msg.id);
      const textToSpeak = msg.spokenSummary || msg.text;
      speak(textToSpeak);
    }
  };

  const quickQuestions = [
    {
      label: language === 'en' ? '💧 Should I water today?' : '💧 क्या आज पानी दूं?',
      q: language === 'en' ? 'Should I water my wheat field today given tomorrow\'s weather forecast?' : 'कल बारिश का अनुमान है, क्या आज गेहूं में पानी लगाना चाहिए?',
    },
    {
      label: language === 'en' ? '🍂 Cure Yellow Rust?' : '🍂 गेहूं में पीला रतुआ कैसे रोकें?',
      q: language === 'en' ? 'How to control yellow rust in wheat with organic and chemical sprays?' : 'गेहूं में पीला रतुआ आ गया है, तुरंत कौन सी दवा और जैविक उपचार करें?',
    },
    {
      label: language === 'en' ? '🧪 Urea dose for my soil?' : '🧪 मेरे खेत के लिए यूरिया की मात्रा?',
      q: language === 'en' ? 'What is the recommended Urea dose for my 3.2 acre wheat based on soil health test SHC-MH-2026?' : 'सॉइल हेल्थ कार्ड अनुसार मेरे 3.2 एकड़ गेहूं में यूरिया की सही मात्रा और कब-कब देना है?',
    },
    {
      label: language === 'en' ? '💰 APMC Mandi price?' : '💰 शिरूर मंडी में गेहूं का भाव?',
      q: language === 'en' ? 'What is the current APMC wheat rate compared to MSP and when should I sell?' : 'शिरूर और पुणे मंडी में गेहूं का ताजा भाव और एमएसपी पर क्या स्थिति है?',
    },
  ];

  return (
    <div className="space-y-4 max-w-4xl mx-auto">
      {/* Top Banner Header */}
      <div className="bg-white p-5 rounded-3xl shadow-sm border border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-[#4A943E] uppercase tracking-wider">
              🤖 Claude Haiku • ICAR Grounded
            </span>
            <span className="text-[10px] font-extrabold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full">
              Live Field Context Active
            </span>
          </div>
          <h1 className="text-2xl font-black text-[#186049] mt-0.5">
            {language === 'en' ? 'Krishi Mitra AI Advisor' : `${t('chatbot', 'कृषि मित्र एआई सलाहकार')} (Krishi AI)`}
          </h1>
          <p className="text-xs text-gray-500 mt-0.5">
            Grounded in: {PRIMARY_FIELD.name} ({PRIMARY_FIELD.totalAreaAcres} Acres, Wheat HD-2967 & Mustard)
          </p>
        </div>

        <button
          onClick={toggleListening}
          className={`flex items-center justify-center gap-2 px-5 py-3 rounded-2xl font-bold text-xs shadow-md transition active:scale-95 ${
            isListening
              ? 'bg-red-600 text-white animate-pulse ring-4 ring-red-200'
              : 'bg-[#186049] text-white hover:bg-[#124b39]'
          }`}
        >
          <span className="text-base">🎙️</span>
          <span>
            {isListening
              ? (language === 'en' ? 'Listening to voice…' : 'सुन रहे हैं…')
              : (language === 'en' ? 'Ask by Voice' : `${t('voiceAsk', 'बोलकर पूछें')} (Voice)`)}
          </span>
        </button>
      </div>

      {/* Suggested Quick Question Chips */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs no-scrollbar">
        {quickQuestions.map((chip, idx) => (
          <button
            key={idx}
            onClick={() => handleSend(chip.q)}
            disabled={isGenerating}
            className="whitespace-nowrap px-3.5 py-2 rounded-2xl bg-white border border-[#186049]/15 text-[#186049] font-bold shadow-sm hover:bg-[#ECE8AF] hover:border-[#B98327] transition active:scale-95 disabled:opacity-50"
          >
            {chip.label}
          </button>
        ))}
      </div>

      {/* Chat Messages Log */}
      <div className="min-h-[440px] max-h-[560px] overflow-y-auto rounded-3xl bg-white p-4 sm:p-6 shadow-sm border border-gray-100 space-y-4">
        {messages.map((m) => (
          <div
            key={m.id}
            className={`flex flex-col ${
              m.sender === 'user' ? 'items-end' : 'items-start'
            }`}
          >
            <div
              className={`max-w-[92%] sm:max-w-[85%] rounded-3xl p-4 sm:p-5 shadow-sm ${
                m.sender === 'user'
                  ? 'bg-[#186049] text-white rounded-br-xs'
                  : 'bg-[#FAF8F5] text-gray-800 rounded-bl-xs border border-amber-100/70'
              }`}
            >
              {/* Message Header */}
              <div className="flex items-center justify-between gap-3 text-[11px] opacity-75 mb-2 font-semibold">
                <span className="flex items-center gap-1.5">
                  <span>{m.sender === 'user' ? '🧑‍🌾' : '🌾'}</span>
                  <span>{m.sender === 'user' ? (language === 'en' ? 'You (Farmer)' : 'आप (किसान)') : 'Krishi Mitra AI'}</span>
                </span>
                <span>{m.timestamp}</span>
              </div>

              {/* Message Content */}
              {m.sender === 'user' ? (
                <p className="text-xs sm:text-sm font-medium leading-relaxed">{m.text}</p>
              ) : (
                <FormattedMessageText text={m.text} />
              )}

              {/* Assistant Message Footer: Source Citation & Audio Readout */}
              {m.sender === 'assistant' && (
                <div className="mt-3 pt-3 border-t border-gray-200/60 text-[11px] text-gray-500 font-bold flex flex-wrap items-center justify-between gap-2">
                  <span className="truncate max-w-[280px] sm:max-w-md">
                    📖 {m.citation || 'ICAR & KVK Advisory'}
                  </span>
                  <button
                    onClick={() => handleAudioToggle(m)}
                    className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-bold transition active:scale-95 ${
                      playingMessageId === m.id && isSpeaking
                        ? 'bg-amber-500 text-white animate-pulse'
                        : 'bg-[#186049]/10 text-[#186049] hover:bg-[#186049]/20'
                    }`}
                    title="Listen to audio summary"
                  >
                    <span>{playingMessageId === m.id && isSpeaking ? '⏹️' : '🔊'}</span>
                    <span>
                      {playingMessageId === m.id && isSpeaking
                        ? (language === 'en' ? 'Stop' : 'रोकें')
                        : (language === 'en' ? 'Listen' : 'आवाज में सुनें')}
                    </span>
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}

        {/* AI Typing Loading Indicator */}
        {isGenerating && (
          <div className="flex items-start gap-2">
            <div className="rounded-2xl bg-[#FAF8F5] p-3.5 border border-amber-100/70 flex items-center gap-3">
              <span className="text-lg animate-spin">🌾</span>
              <div className="flex items-center gap-1">
                <span className="h-2 w-2 rounded-full bg-[#186049] animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="h-2 w-2 rounded-full bg-[#186049] animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="h-2 w-2 rounded-full bg-[#186049] animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
              <span className="text-xs font-bold text-[#186049]">
                {language === 'en' ? 'Claude analyzing field context…' : 'कृषि मित्र सलाह तैयार कर रहा है…'}
              </span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Bar */}
      <div className="flex items-center gap-2 bg-white p-2.5 rounded-2xl shadow-sm border border-gray-200 focus-within:border-[#186049] transition">
        <button
          onClick={toggleListening}
          className={`p-3 rounded-xl transition active:scale-95 ${
            isListening
              ? 'bg-red-600 text-white animate-pulse'
              : 'bg-[#186049]/10 text-[#186049] hover:bg-[#186049]/20'
          }`}
          title="Speak Question"
        >
          <span className="text-lg">🎙️</span>
        </button>
        <input
          type="text"
          value={inputQuery}
          onChange={(e) => setInputQuery(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSend(inputQuery)}
          placeholder={
            language === 'en'
              ? 'Ask anything about crops, fertilizer doses, disease, or mandi rates…'
              : 'फसल, खाद की मात्रा, रोग या मंडी भाव के बारे में पूछें या बोलें…'
          }
          className="flex-1 px-3 py-2 text-xs sm:text-sm bg-transparent focus:outline-none text-gray-800 placeholder-gray-400"
        />
        <button
          onClick={() => handleSend(inputQuery)}
          disabled={!inputQuery.trim() || isGenerating}
          className="px-5 py-2.5 rounded-xl bg-[#186049] text-white font-black text-xs sm:text-sm hover:bg-[#124b39] transition active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed shadow-sm"
        >
          {isGenerating ? (language === 'en' ? 'Sending…' : 'भेज रहे हैं…') : (language === 'en' ? 'Send' : 'पूछें')}
        </button>
      </div>
    </div>
  );
}
