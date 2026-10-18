'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import { useVoice, voiceEventBus } from '@/lib/voice/VoiceContext';
import { MOCK_MANDI_PRICES } from '@/lib/data/mockData';
import { calculateProfit } from '@/lib/rules/profitEngine';

export default function ProfitPage() {
  const { t, language } = useLanguage();
  const { speak, registerActionHandler } = useVoice();

  const [selectedCrop, setSelectedCrop] = useState('wheat');
  const [areaAcres, setAreaAcres] = useState(3.2);
  const [expectedYieldPerAcre, setExpectedYieldPerAcre] = useState(20); // quintals/acre
  const [qualityGrade, setQualityGrade] = useState<'A+' | 'A' | 'B'>('A');
  const [mandiPrice, setMandiPrice] = useState(2480); // ₹ / quintal

  // Run deterministic profit engine
  const profitData = calculateProfit({
    crop: selectedCrop,
    area_acres: areaAcres,
    yield_per_acre: expectedYieldPerAcre,
    quality_grade: qualityGrade,
    mandi_price: mandiPrice,
  });

  const speakProfitSummary = useCallback(() => {
    const text =
      language === 'hi'
        ? `मुनाफा अनुमान: ${areaAcres} एकड़ ${selectedCrop} से कुल आय लगभग ₹${profitData.revenue_expected.toLocaleString()} होगी। लागत ₹${profitData.total_cost.toLocaleString()} घटाकर आपकी शुद्ध बचत लगभग ₹${profitData.net_profit.toLocaleString()} अनुमानित है।`
        : `Profit estimate: For ${areaAcres} acres of ${selectedCrop}, expected revenue is ₹${profitData.revenue_expected.toLocaleString()}. After costs of ₹${profitData.total_cost.toLocaleString()}, your net profit is estimated at ₹${profitData.net_profit.toLocaleString()}.`;
    speak(text);
  }, [areaAcres, language, profitData.net_profit, profitData.revenue_expected, profitData.total_cost, selectedCrop, speak]);

  // Register Voice Commands
  useEffect(() => {
    const unregister = registerActionHandler((spoken: string) => {
      if (
        spoken.includes('profit') ||
        spoken.includes('earn') ||
        spoken.includes('मुनाफा') ||
        spoken.includes('कमाई') ||
        spoken.includes('बचत') ||
        spoken.includes('ਕਮਾਈ')
      ) {
        speakProfitSummary();
        return true;
      }
      if (
        spoken.includes('mandi') ||
        spoken.includes('price') ||
        spoken.includes('मंडी') ||
        spoken.includes('भाव') ||
        spoken.includes('ਰੇਟ')
      ) {
        const text =
          language === 'hi'
            ? `शिरूर मंडी में गेहूं का भाव ₹2,480 और सरसों का भाव ₹5,650 प्रति क्विंटल है।`
            : `Shirur Mandi: Wheat rate is ₹2,480 and Mustard is ₹5,650 per quintal.`;
        speak(text);
        return true;
      }
      return false;
    });

    return unregister;
  }, [language, registerActionHandler, speak, speakProfitSummary]);

  // Global voice action listener
  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const handleVoiceAction = (e: any) => {
      const detail = e.detail;
      if (detail?.action === 'calc_profit') {
        speakProfitSummary();
      } else if (detail?.action === 'check_mandi') {
        const text =
          language === 'hi'
            ? 'शिरूर मंडी में गेहूं का भाव ₹2,480 और सरसों का भाव ₹5,650 प्रति क्विंटल है।'
            : 'Shirur Mandi: Wheat rate is ₹2,480 and Mustard is ₹5,650 per quintal.';
        speak(text);
      }
    };
    voiceEventBus.addEventListener('voice_action', handleVoiceAction as EventListener);
    return () => {
      voiceEventBus.removeEventListener('voice_action', handleVoiceAction as EventListener);
    };
  }, [language, speak, speakProfitSummary]);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-5 rounded-3xl shadow-sm border border-gray-100">
        <div>
          <span className="text-xs font-bold text-[#B98327] uppercase tracking-wider">
            💰 APMC Mandi & Economics Engine
          </span>
          <h1 className="text-2xl font-black text-[#186049]">
            {t('profitTitle', 'Crop Profit & Live Mandi Tracker')}
          </h1>
          <p className="text-xs sm:text-sm text-gray-500 mt-0.5">
            Transparent net profit calculation: expected yield × market rate minus real cultivation costs.
          </p>
        </div>

        <button
          onClick={speakProfitSummary}
          className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-[#186049] text-white font-bold text-sm shadow hover:bg-[#124b39] transition active:scale-95"
        >
          <span>🔊</span>
          <span>{t('listenReply', 'Listen to Profit Summary')}</span>
        </button>
      </div>

      {/* Main Net Profit Highlights */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Net Profit Card */}
        <div className="rounded-3xl bg-gradient-to-br from-[#186049] to-[#257a60] p-6 text-white shadow-xl border-2 border-[#ECE8AF]/40">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase text-[#ECE8AF]">
              {t('netProfit', 'Estimated Net Farmer Profit')}
            </span>
            <span className="text-2xl">🌾</span>
          </div>

          <div className="mt-3 text-4xl font-black text-[#ECE8AF]">
            ₹{profitData.net_profit.toLocaleString()}
          </div>
          <p className="text-xs text-white/80 mt-1">
            ₹{Math.round(profitData.net_profit / areaAcres).toLocaleString()} per acre net savings
          </p>

          <div className="mt-4 pt-4 border-t border-white/20 flex items-center justify-between text-xs">
            <span>Range:</span>
            <span className="font-bold text-[#ECE8AF]">
              ₹{(profitData.revenue_low - profitData.total_cost).toLocaleString()} – ₹
              {(profitData.revenue_high - profitData.total_cost).toLocaleString()}
            </span>
          </div>
        </div>

        {/* Expected Revenue Range */}
        <div className="rounded-3xl bg-white p-6 shadow-sm border border-gray-100">
          <span className="text-xs font-bold uppercase text-gray-500">
            {t('expectedRevenue', 'Gross Revenue (Range)')}
          </span>
          <div className="mt-3 text-3xl font-extrabold text-[#186049]">
            ₹{profitData.revenue_expected.toLocaleString()}
          </div>
          <p className="text-xs text-gray-400 mt-1">
            Total {areaAcres * expectedYieldPerAcre} quintals expected harvest
          </p>

          <div className="mt-4 space-y-1.5 text-xs text-gray-600 border-t pt-3">
            <div className="flex justify-between">
              <span>Conservative (Low):</span>
              <span className="font-bold">₹{profitData.revenue_low.toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span>Optimistic (High):</span>
              <span className="font-bold text-[#4A943E]">
                ₹{profitData.revenue_high.toLocaleString()}
              </span>
            </div>
          </div>
        </div>

        {/* Cost of Cultivation */}
        <div className="rounded-3xl bg-white p-6 shadow-sm border border-gray-100">
          <span className="text-xs font-bold uppercase text-gray-500">
            {t('costOfCultivation', 'Cultivation Cost (Total)')}
          </span>
          <div className="mt-3 text-3xl font-extrabold text-red-600">
            ₹{profitData.total_cost.toLocaleString()}
          </div>
          <p className="text-xs text-gray-400 mt-1">
            ₹{Math.round(profitData.total_cost / areaAcres).toLocaleString()} / acre operational cost
          </p>

          <div className="mt-4 space-y-1 text-[11px] text-gray-500 border-t pt-3">
            <div className="flex justify-between">
              <span>Seeds & Ploughing:</span>
              <span>₹{profitData.cost_breakdown.seed + profitData.cost_breakdown.other}</span>
            </div>
            <div className="flex justify-between">
              <span>Fertiliser & Water:</span>
              <span>₹{profitData.cost_breakdown.fertiliser + profitData.cost_breakdown.water}</span>
            </div>
            <div className="flex justify-between">
              <span>Labour & Harvesting:</span>
              <span>₹{profitData.cost_breakdown.labour}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Interactive Controls & Live Mandi Prices */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Interactive Estimator Form */}
        <div className="rounded-3xl bg-white p-6 shadow-sm border border-gray-100 space-y-4">
          <h3 className="font-extrabold text-base text-[#186049]">
            Adjust Harvest & Price Assumptions
          </h3>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Crop</label>
              <select
                value={selectedCrop}
                onChange={(e) => {
                  setSelectedCrop(e.target.value);
                  if (e.target.value === 'mustard') setMandiPrice(5650);
                  if (e.target.value === 'wheat') setMandiPrice(2480);
                  if (e.target.value === 'rice') setMandiPrice(2350);
                }}
                className="w-full px-3 py-2 text-sm border rounded-xl"
              >
                <option value="wheat">Wheat (गेहूं)</option>
                <option value="mustard">Mustard (सरसों)</option>
                <option value="rice">Paddy / Rice (धान)</option>
                <option value="cotton">Cotton (कपास)</option>
                <option value="soybean">Soybean (सोयाबीन)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                Area ({t('acres', 'Acres')})
              </label>
              <input
                type="number"
                step="0.1"
                value={areaAcres}
                onChange={(e) => setAreaAcres(Number(e.target.value))}
                className="w-full px-3 py-2 text-sm border rounded-xl font-bold"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                Expected Yield (qtl/acre)
              </label>
              <input
                type="number"
                value={expectedYieldPerAcre}
                onChange={(e) => setExpectedYieldPerAcre(Number(e.target.value))}
                className="w-full px-3 py-2 text-sm border rounded-xl font-bold"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                Mandi Price (₹/qtl)
              </label>
              <input
                type="number"
                value={mandiPrice}
                onChange={(e) => setMandiPrice(Number(e.target.value))}
                className="w-full px-3 py-2 text-sm border rounded-xl font-bold text-[#186049]"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">
              Quality Grade
            </label>
            <div className="grid grid-cols-3 gap-2">
              {(['A+', 'A', 'B'] as const).map((grade) => (
                <button
                  key={grade}
                  onClick={() => setQualityGrade(grade)}
                  className={`py-2 text-xs font-bold rounded-xl border transition ${
                    qualityGrade === grade
                      ? 'bg-[#186049] text-white border-[#186049]'
                      : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  Grade {grade} {grade === 'A+' ? '(+10%)' : grade === 'B' ? '(-15%)' : ''}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Live Nearby Mandi Table */}
        <div className="rounded-3xl bg-white p-6 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between border-b pb-3 mb-3">
            <div>
              <h3 className="font-extrabold text-base text-[#186049]">
                {t('liveMandiPrices', 'Live APMC Mandi Rates')}
              </h3>
              <p className="text-xs text-gray-400">Official Agmarknet / e-NAM feeds</p>
            </div>
            <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800">
              Live Today
            </span>
          </div>

          <div className="space-y-3">
            {MOCK_MANDI_PRICES.map((m, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between p-3 rounded-2xl bg-gray-50 border border-gray-100 hover:border-[#186049]/30 transition"
              >
                <div>
                  <h4 className="font-bold text-xs sm:text-sm text-gray-900">{m.mandi}</h4>
                  <span className="text-xs text-gray-500">
                    {m.crop} ({m.variety}) • {m.state}
                  </span>
                </div>

                <div className="text-right">
                  <div className="text-base font-extrabold text-[#186049]">
                    ₹{m.modalPrice.toLocaleString()}
                  </div>
                  <span className="text-[10px] text-gray-400">
                    Min ₹{m.minPrice} / Max ₹{m.maxPrice}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
