'use client';

import React, { useState, useEffect, useCallback } from 'react';
import confetti from 'canvas-confetti';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import { useVoice, voiceEventBus } from '@/lib/voice/VoiceContext';
import {
  MOCK_FASAL_SCORE_DETAILS,
  MOCK_STOCK_LEDGER,
  StockLedgerEntry,
} from '@/lib/data/mockData';

export default function FasalScorePage() {
  const { t, language } = useLanguage();
  const { speak, registerActionHandler } = useVoice();

  const [ledgerEntries, setLedgerEntries] = useState<StockLedgerEntry[]>(MOCK_STOCK_LEDGER);
  const [scoreDetails] = useState(MOCK_FASAL_SCORE_DETAILS);
  const [showAddStockModal, setShowAddStockModal] = useState(false);
  const [newCrop, setNewCrop] = useState('Wheat');
  const [newQuantity, setNewQuantity] = useState(25);
  const [statusMessage, setStatusMessage] = useState('');

  const speakScoreBreakdown = useCallback(() => {
    const text =
      language === 'hi'
        ? `आपका समग्र फसल स्वास्थ्य स्कोर 78/100 यानी उत्तम है। फसल स्वास्थ्य 84, स्टॉक मूल्य 72, और सिंचाई नियम पालन 88 है। आपके बहीखाते में 49 क्विंटल उपज सुरक्षित रखी है।`
        : `Your overall Fasal Score is 78/100 (Very Good). Crop Health is 84, Stock Value is 72, and Irrigation Discipline is 88. You have 49 quintals recorded in your storage ledger.`;
    speak(text);
  }, [language, speak]);

  const addStockItem = useCallback((crop: string, qty: number) => {
    const newEntry: StockLedgerEntry = {
      id: `stk-${Date.now()}`,
      crop,
      variety: 'Farm Harvest',
      quantityQuintals: qty,
      qualityGrade: 'A',
      harvestDate: new Date().toISOString().split('T')[0],
      estimatedValueRs: qty * (crop.toLowerCase() === 'mustard' ? 5650 : 2480),
      storageLocation: 'Pucca Godown (Village)',
    };

    setLedgerEntries((prev) => [newEntry, ...prev]);
    confetti({ particleCount: 70, spread: 60, origin: { y: 0.6 } });

    const msg =
      language === 'hi'
        ? `बहीखाते में दर्ज हुआ: ${qty} क्विंटल ${crop}! फसल स्कोर अपडेट हो गया।`
        : `Recorded in ledger: ${qty} quintals of ${crop}! Fasal Score updated.`;
    setStatusMessage(msg);
    speak(msg);
  }, [language, speak]);

  // Listen to Global voice events (e.g. from any page saying "Harvested 25 quintal wheat")
  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const handleVoiceStock = (e: any) => {
      const detail = e.detail;
      if (detail && detail.crop && detail.quantity) {
        addStockItem(detail.crop, detail.quantity);
      }
    };

    voiceEventBus.addEventListener('stock_added', handleVoiceStock);
    return () => {
      voiceEventBus.removeEventListener('stock_added', handleVoiceStock);
    };
  }, [addStockItem]);

  // Global voice action listener
  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const handleVoiceAction = (e: any) => {
      const detail = e.detail;
      if (detail?.action === 'check_score') {
        speakScoreBreakdown();
      }
    };
    voiceEventBus.addEventListener('voice_action', handleVoiceAction as EventListener);
    return () => {
      voiceEventBus.removeEventListener('voice_action', handleVoiceAction as EventListener);
    };
  }, [speakScoreBreakdown]);

  // Voice commands on this page
  useEffect(() => {
    const unregister = registerActionHandler((spoken: string) => {
      if (
        spoken.includes('score') ||
        spoken.includes('स्कोर') ||
        spoken.includes('health') ||
        spoken.includes('हाल') ||
        spoken.includes('how is my farm')
      ) {
        speakScoreBreakdown();
        return true;
      }
      if (
        spoken.includes('harvest') ||
        spoken.includes('काटा') ||
        spoken.includes('उपज') ||
        spoken.includes('क्विंटल') ||
        spoken.includes('quintal')
      ) {
        const cropMatch = spoken.includes('mustard') || spoken.includes('सरसों') ? 'Mustard' : 'Wheat';
        addStockItem(cropMatch, 20);
        return true;
      }
      return false;
    });

    return unregister;
  }, [addStockItem, registerActionHandler, speakScoreBreakdown]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-5 rounded-3xl shadow-sm border border-gray-100">
        <div>
          <span className="text-xs font-bold text-[#186049] uppercase tracking-wider">
            📊 Transparent Farm Health Index
          </span>
          <h1 className="text-2xl font-black text-[#186049]">
            {t('fasalScoreTitle', 'Fasal Health Score & Stock Ledger')}
          </h1>
          <p className="text-xs sm:text-sm text-gray-500 mt-0.5">
            Transparent composite farm rating (0–100) combining crop health, irrigation, weather risk, and stored harvest.
          </p>
        </div>

        <button
          onClick={speakScoreBreakdown}
          className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-[#186049] text-white font-bold text-sm shadow hover:bg-[#124b39] transition active:scale-95"
        >
          <span>🔊</span>
          <span>{t('listenReply', 'Listen to Score Breakdown')}</span>
        </button>
      </div>

      {statusMessage && (
        <div className="rounded-2xl bg-[#ECE8AF] p-4 text-[#186049] text-sm font-bold border-l-4 border-[#B98327] flex items-center justify-between">
          <span>{statusMessage}</span>
          <button onClick={() => setStatusMessage('')} className="text-xs text-[#186049]/70">✕</button>
        </div>
      )}

      {/* Main Score Gauge & 5 Transparent Sub-Scores */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Score Gauge Card */}
        <div className="rounded-3xl bg-gradient-to-br from-[#186049] via-[#1b6b52] to-[#186049] p-6 text-white shadow-xl border-2 border-[#ECE8AF]/40 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-xs text-[#ECE8AF] font-bold uppercase tracking-wider">
              <span>Overall Rating</span>
              <span>{scoreDetails.grade}</span>
            </div>

            <div className="mt-6 flex flex-col items-center text-center">
              <div className="relative w-36 h-36 rounded-full border-8 border-[#4A943E] flex flex-col items-center justify-center bg-white/10 shadow-2xl">
                <span className="text-5xl font-black text-white">
                  {scoreDetails.overallScore}
                </span>
                <span className="text-xs text-[#ECE8AF] font-bold">/ 100</span>
              </div>
              <h3 className="text-lg font-extrabold text-white mt-4">
                Farm Health: Excellent
              </h3>
              <p className="text-xs text-white/80 mt-1 max-w-xs leading-relaxed">
                {t('scoreExplanation', 'Transparent breakdown based on disease history, irrigation timing, soil nutrition & weather safety.')}
              </p>
            </div>
          </div>

          <div className="mt-4 pt-4 border-t border-white/20 text-center text-xs text-[#ECE8AF] font-medium">
            Eligible for Priority Crop Insurance & KCC Credit
          </div>
        </div>

        {/* 5 Transparent Sub-Score Pillars */}
        <div className="md:col-span-2 rounded-3xl bg-white p-6 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between border-b pb-3 mb-4">
            <h3 className="font-extrabold text-base text-[#186049]">
              Transparent Score Formula Breakdown
            </h3>
            <span className="text-xs text-gray-400">Sum of 5 weighted pillars</span>
          </div>

          <div className="space-y-4">
            {scoreDetails.pillars.map((p, idx) => (
              <div key={idx} className="space-y-1.5">
                <div className="flex items-center justify-between text-xs font-bold">
                  <span className="text-gray-800">{p.name} ({p.weight})</span>
                  <span className="text-[#186049] font-black">{p.score}/100</span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-2.5 overflow-hidden">
                  <div
                    className="h-2.5 rounded-full transition-all duration-500"
                    style={{
                      width: `${p.score}%`,
                      backgroundColor: p.color,
                    }}
                  />
                </div>
                <div className="text-[11px] text-gray-500">{p.status}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Voice-Enabled Harvest Stock Ledger */}
      <div className="rounded-3xl bg-white p-6 shadow-sm border border-gray-100 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b pb-3 gap-2">
          <div>
            <h3 className="font-extrabold text-base text-[#186049]">
              {t('stockLedger', 'Harvested Stock Voice Ledger')}
            </h3>
            <p className="text-xs text-gray-500">
              {t('voiceLedgerPrompt', 'Say e.g.: "I harvested 25 quintal wheat" or "Stored 10 quintal mustard"')}
            </p>
          </div>

          <button
            onClick={() => setShowAddStockModal(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#4A943E] text-white text-xs font-bold hover:bg-[#3d7d33] shadow"
          >
            <span>➕</span>
            <span>Add Harvest Entry</span>
          </button>
        </div>

        {/* Ledger Entries Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b text-gray-500 uppercase text-[11px] font-bold">
                <th className="pb-2">Crop & Variety</th>
                <th className="pb-2">Harvest Date</th>
                <th className="pb-2">Quantity</th>
                <th className="pb-2">Grade</th>
                <th className="pb-2">Storage Godown</th>
                <th className="pb-2 text-right">Est. Market Value</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {ledgerEntries.map((item) => (
                <tr key={item.id} className="hover:bg-gray-50">
                  <td className="py-3 font-bold text-[#186049]">
                    {item.crop} ({item.variety})
                  </td>
                  <td className="py-3 text-gray-500">{item.harvestDate}</td>
                  <td className="py-3 font-extrabold text-gray-800">
                    {item.quantityQuintals} Quintals
                  </td>
                  <td className="py-3">
                    <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold text-[10px]">
                      Grade {item.qualityGrade}
                    </span>
                  </td>
                  <td className="py-3 text-gray-500">{item.storageLocation}</td>
                  <td className="py-3 text-right font-black text-[#186049]">
                    ₹{item.estimatedValueRs.toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Manual Stock Entry Modal */}
      {showAddStockModal && (
        <div className="fixed inset-0 z-[600] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm bg-white rounded-3xl p-6 shadow-2xl space-y-4 border-2 border-[#186049]">
            <div className="flex items-center justify-between border-b pb-2">
              <h3 className="font-bold text-base text-[#186049]">
                Add Harvested Stock Entry
              </h3>
              <button onClick={() => setShowAddStockModal(false)} className="text-gray-400">✕</button>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Crop</label>
              <select
                value={newCrop}
                onChange={(e) => setNewCrop(e.target.value)}
                className="w-full px-3 py-2 text-sm border rounded-xl"
              >
                <option value="Wheat">Wheat (गेहूं)</option>
                <option value="Mustard">Mustard (सरसों)</option>
                <option value="Paddy">Paddy (धान)</option>
                <option value="Cotton">Cotton (कपास)</option>
                <option value="Soybean">Soybean (सोयाबीन)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                Harvested Quantity (Quintals)
              </label>
              <input
                type="number"
                value={newQuantity}
                onChange={(e) => setNewQuantity(Number(e.target.value))}
                className="w-full px-3 py-2 text-sm border rounded-xl font-bold"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setShowAddStockModal(false)}
                className="px-4 py-2 text-xs rounded-xl font-semibold text-gray-600"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  addStockItem(newCrop, newQuantity);
                  setShowAddStockModal(false);
                }}
                className="px-4 py-2 text-xs rounded-xl bg-[#186049] text-white font-bold"
              >
                Save Entry
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
