'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import { useVoice, voiceEventBus } from '@/lib/voice/VoiceContext';
import { PRIMARY_FIELD } from '@/lib/data/mockData';

interface NPKEvaluationResult {
  soilParameters: {
    N: number;
    P: number;
    K: number;
    pH: number;
    OC: number;
    EC: number;
  };
  evaluation: {
    assessments: {
      Nitrogen?: { value: number; status: string; statusHi: string };
      Phosphorus?: { value: number; status: string; statusHi: string };
      Potassium?: { value: number; status: string; statusHi: string };
      pH?: { value: number; status: string; statusHi: string };
      OrganicCarbon?: { value: number; status: string; statusHi: string };
    };
    deficiencies: string[];
    deficienciesHi: string[];
    riskLevel: string;
    riskLevelHi: string;
  };
  cropRecommendations: {
    crop: string;
    areaAcres: number;
    fertilizerBags: {
      urea: {
        kg: number;
        bags50kg: number;
        applicationSchedule: string;
        applicationScheduleHi: string;
      };
      dap: {
        kg: number;
        bags50kg: number;
        applicationSchedule: string;
        applicationScheduleHi: string;
      };
      mop: {
        kg: number;
        bags50kg: number;
        applicationSchedule: string;
        applicationScheduleHi: string;
      };
    };
  };
}

export default function FertiliserPage() {
  const { t, language } = useLanguage();
  const { speak, registerActionHandler } = useVoice();

  const [nitrogen, setNitrogen] = useState<number>(PRIMARY_FIELD.soilHealth.nitrogenKgHa);
  const [phosphorus, setPhosphorus] = useState<number>(PRIMARY_FIELD.soilHealth.phosphorusKgHa);
  const [potassium, setPotassium] = useState<number>(PRIMARY_FIELD.soilHealth.potassiumKgHa);
  const [ph, setPh] = useState<number>(PRIMARY_FIELD.soilHealth.pH);
  const [oc, setOc] = useState<number>(PRIMARY_FIELD.soilHealth.organicCarbonPercent);
  const [crop, setCrop] = useState<string>('wheat');
  const [areaAcres, setAreaAcres] = useState<number>(3.2);

  const [result, setResult] = useState<NPKEvaluationResult | null>(null);
  const [loading, setLoading] = useState<boolean>(false);

  const evaluateSoil = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/npk/evaluate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nitrogen,
          phosphorus,
          potassium,
          ph,
          oc,
          crop,
          area_acres: areaAcres,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setResult(data);
      }
    } catch (err) {
      console.error('Failed to evaluate NPK logic:', err);
    } finally {
      setLoading(false);
    }
  }, [nitrogen, phosphorus, potassium, ph, oc, crop, areaAcres]);

  useEffect(() => {
    evaluateSoil();
  }, [evaluateSoil]);

  const speakFertiliserAdvice = useCallback(() => {
    if (!result) return;
    const fb = result.cropRecommendations.fertilizerBags;
    const isHi = language === 'hi';

    const text = isHi
      ? `${areaAcres} एकड़ ${crop} के लिए उर्वरक खुराक: यूरिया ${fb.urea.bags50kg} बोरी (50 किग्रा), डीएपी ${fb.dap.bags50kg} बोरी, और एमओपी पोटाश ${fb.mop.bags50kg} बोरी। डीएपी बुवाई के समय डालें। यूरिया को 3 भागों में दें।`
      : `Fertilizer recommendation for ${areaAcres} acres of ${crop}: Urea ${fb.urea.bags50kg} bags (50kg), DAP ${fb.dap.bags50kg} bags, and MOP Potash ${fb.mop.bags50kg} bags. Apply DAP at sowing, and Urea in 3 split applications.`;

    speak(text);
  }, [result, areaAcres, crop, language, speak]);

  // Voice commands
  useEffect(() => {
    const unregister = registerActionHandler((spoken: string) => {
      if (
        spoken.includes('fertilizer') ||
        spoken.includes('urea') ||
        spoken.includes('khad') ||
        spoken.includes('खाद') ||
        spoken.includes('यूरिया') ||
        spoken.includes('dap') ||
        spoken.includes('npk')
      ) {
        speakFertiliserAdvice();
        return true;
      }
      return false;
    });

    return unregister;
  }, [registerActionHandler, speakFertiliserAdvice]);

  // Global voice action
  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const handleVoiceAction = (e: any) => {
      const detail = e.detail;
      if (detail?.action === 'fertilizer_advice') {
        speakFertiliserAdvice();
      }
    };
    voiceEventBus.addEventListener('voice_action', handleVoiceAction as EventListener);
    return () => {
      voiceEventBus.removeEventListener('voice_action', handleVoiceAction as EventListener);
    };
  }, [speakFertiliserAdvice]);

  const isHi = language === 'hi';

  const resetToSoilCard = () => {
    setNitrogen(PRIMARY_FIELD.soilHealth.nitrogenKgHa);
    setPhosphorus(PRIMARY_FIELD.soilHealth.phosphorusKgHa);
    setPotassium(PRIMARY_FIELD.soilHealth.potassiumKgHa);
    setPh(PRIMARY_FIELD.soilHealth.pH);
    setOc(PRIMARY_FIELD.soilHealth.organicCarbonPercent);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-5 rounded-3xl shadow-sm border border-gray-100">
        <div>
          <span className="text-xs font-bold text-[#4A943E] uppercase tracking-wider">
            🧪 ICAR Soil Testing Standards • NPK_Logic Engine
          </span>
          <h1 className="text-2xl font-black text-[#186049]">
            {isHi ? 'मृदा स्वास्थ्य एवं उर्वरक कैलकुलेटर' : 'Soil Health & Fertilizer Bag Calculator'}
          </h1>
          <p className="text-xs sm:text-sm text-gray-500 mt-0.5">
            {isHi
              ? 'भारतीय कृषि अनुसंधान परिषद (ICAR) मानकों के अनुसार यूरिया, डीएपी और पोटाश की सटीक गणना।'
              : 'Deterministic ICAR agronomic thresholds and exact bag recommendations per acre.'}
          </p>
        </div>

        <button
          onClick={speakFertiliserAdvice}
          disabled={!result}
          className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-[#186049] text-white font-bold text-sm shadow hover:bg-[#124b39] transition active:scale-95 disabled:opacity-50"
        >
          <span>🔊</span>
          <span>{isHi ? 'खाद की सलाह सुनें' : 'Listen to Advice'}</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Soil Parameters & Crop Configuration */}
        <div className="lg:col-span-1 space-y-4">
          <div className="bg-white p-5 rounded-3xl shadow-sm border border-gray-100">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-extrabold text-[#186049] text-base">
                {isHi ? 'मिट्टी परीक्षण विवरण' : 'Soil Test Values'}
              </h2>
              <button
                onClick={resetToSoilCard}
                className="text-xs text-[#4A943E] hover:underline font-bold"
              >
                {isHi ? 'कार्ड से भरें' : 'Reset to Card'}
              </button>
            </div>

            <div className="space-y-3.5 text-xs">
              <div>
                <div className="flex justify-between font-bold text-gray-700 mb-1">
                  <span>{isHi ? 'नाइट्रोजन (N)' : 'Available Nitrogen (N)'}</span>
                  <span className="text-[#186049]">{nitrogen} kg/ha</span>
                </div>
                <input
                  type="range"
                  min="100"
                  max="600"
                  step="5"
                  value={nitrogen}
                  onChange={(e) => setNitrogen(Number(e.target.value))}
                  className="w-full accent-[#186049]"
                />
                <span className="text-[10px] text-gray-400">ICAR Low: &lt;280 • High: &gt;560 kg/ha</span>
              </div>

              <div>
                <div className="flex justify-between font-bold text-gray-700 mb-1">
                  <span>{isHi ? 'फॉस्फोरस (P)' : 'Available Phosphorus (P)'}</span>
                  <span className="text-[#186049]">{phosphorus} kg/ha</span>
                </div>
                <input
                  type="range"
                  min="5"
                  max="50"
                  step="1"
                  value={phosphorus}
                  onChange={(e) => setPhosphorus(Number(e.target.value))}
                  className="w-full accent-[#186049]"
                />
                <span className="text-[10px] text-gray-400">ICAR Low: &lt;10 • High: &gt;25 kg/ha</span>
              </div>

              <div>
                <div className="flex justify-between font-bold text-gray-700 mb-1">
                  <span>{isHi ? 'पोटैशियम (K)' : 'Available Potassium (K)'}</span>
                  <span className="text-[#186049]">{potassium} kg/ha</span>
                </div>
                <input
                  type="range"
                  min="50"
                  max="400"
                  step="5"
                  value={potassium}
                  onChange={(e) => setPotassium(Number(e.target.value))}
                  className="w-full accent-[#186049]"
                />
                <span className="text-[10px] text-gray-400">ICAR Low: &lt;108 • High: &gt;280 kg/ha</span>
              </div>

              <div>
                <div className="flex justify-between font-bold text-gray-700 mb-1">
                  <span>{isHi ? 'मिट्टी का पीएच (pH)' : 'Soil Reaction (pH)'}</span>
                  <span className="text-[#186049]">{ph}</span>
                </div>
                <input
                  type="range"
                  min="4.5"
                  max="9.5"
                  step="0.1"
                  value={ph}
                  onChange={(e) => setPh(Number(e.target.value))}
                  className="w-full accent-[#186049]"
                />
                <span className="text-[10px] text-gray-400">Optimal: 6.5 - 7.5</span>
              </div>

              <div>
                <div className="flex justify-between font-bold text-gray-700 mb-1">
                  <span>{isHi ? 'जैविक कार्बन (OC %)' : 'Organic Carbon (%)'}</span>
                  <span className="text-[#186049]">{oc}%</span>
                </div>
                <input
                  type="range"
                  min="0.1"
                  max="1.5"
                  step="0.05"
                  value={oc}
                  onChange={(e) => setOc(Number(e.target.value))}
                  className="w-full accent-[#186049]"
                />
              </div>
            </div>

            <div className="mt-5 pt-4 border-t border-gray-100 space-y-3">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  {isHi ? 'फसल चुनें' : 'Select Target Crop'}
                </label>
                <select
                  value={crop}
                  onChange={(e) => setCrop(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-gray-200 text-xs font-semibold text-gray-800 bg-white"
                >
                  <option value="wheat">🌾 {isHi ? 'गेहूं (Wheat)' : 'Wheat'}</option>
                  <option value="rice">🌾 {isHi ? 'धान (Paddy/Rice)' : 'Rice / Paddy'}</option>
                  <option value="cotton">🌱 {isHi ? 'कपास (Cotton)' : 'Cotton'}</option>
                  <option value="sugarcane">🎋 {isHi ? 'गन्ना (Sugarcane)' : 'Sugarcane'}</option>
                  <option value="maize">🌽 {isHi ? 'मक्का (Maize)' : 'Maize'}</option>
                  <option value="soybean">🌿 {isHi ? 'सोयाबीन (Soybean)' : 'Soybean'}</option>
                  <option value="onion">🧅 {isHi ? 'प्याज (Onion)' : 'Onion'}</option>
                  <option value="tomato">🍅 {isHi ? 'टमाटर (Tomato)' : 'Tomato'}</option>
                  <option value="gram">🧆 {isHi ? 'चना (Chickpea)' : 'Chickpea / Gram'}</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  {isHi ? 'खेत का क्षेत्रफल (एकड़)' : 'Farm Area (Acres)'}
                </label>
                <input
                  type="number"
                  min="0.5"
                  max="100"
                  step="0.1"
                  value={areaAcres}
                  onChange={(e) => setAreaAcres(Number(e.target.value))}
                  className="w-full p-2.5 rounded-xl border border-gray-200 text-xs font-semibold text-gray-800"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Right 2 Columns: ICAR Assessment & Exact Bags */}
        <div className="lg:col-span-2 space-y-5">
          {result && (
            <>
              {/* Nutrient Health Status Cards */}
              <div className="bg-white p-5 rounded-3xl shadow-sm border border-gray-100">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-extrabold text-[#186049] text-base">
                    {isHi ? 'ICAR मृदा स्वास्थ्य स्थिति' : 'ICAR Nutrient Evaluation'}
                  </h3>
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-black ${
                      result.evaluation.riskLevel === 'Critical Risk'
                        ? 'bg-red-100 text-red-800'
                        : result.evaluation.riskLevel === 'Moderate Risk'
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-emerald-100 text-emerald-800'
                    }`}
                  >
                    {isHi ? result.evaluation.riskLevelHi : result.evaluation.riskLevel}
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="p-3 rounded-2xl bg-gray-50 border border-gray-100 text-center">
                    <span className="text-[10px] text-gray-500 uppercase font-bold block">Nitrogen (N)</span>
                    <span className="text-sm font-black text-gray-800">{result.soilParameters.N} kg/ha</span>
                    <span
                      className={`text-[10px] font-bold block mt-1 ${
                        result.evaluation.assessments.Nitrogen?.status === 'Low'
                          ? 'text-red-600'
                          : 'text-emerald-700'
                      }`}
                    >
                      {isHi ? result.evaluation.assessments.Nitrogen?.statusHi : result.evaluation.assessments.Nitrogen?.status}
                    </span>
                  </div>

                  <div className="p-3 rounded-2xl bg-gray-50 border border-gray-100 text-center">
                    <span className="text-[10px] text-gray-500 uppercase font-bold block">Phosphorus (P)</span>
                    <span className="text-sm font-black text-gray-800">{result.soilParameters.P} kg/ha</span>
                    <span
                      className={`text-[10px] font-bold block mt-1 ${
                        result.evaluation.assessments.Phosphorus?.status === 'Low'
                          ? 'text-red-600'
                          : 'text-emerald-700'
                      }`}
                    >
                      {isHi ? result.evaluation.assessments.Phosphorus?.statusHi : result.evaluation.assessments.Phosphorus?.status}
                    </span>
                  </div>

                  <div className="p-3 rounded-2xl bg-gray-50 border border-gray-100 text-center">
                    <span className="text-[10px] text-gray-500 uppercase font-bold block">Potassium (K)</span>
                    <span className="text-sm font-black text-gray-800">{result.soilParameters.K} kg/ha</span>
                    <span
                      className={`text-[10px] font-bold block mt-1 ${
                        result.evaluation.assessments.Potassium?.status === 'Low'
                          ? 'text-red-600'
                          : 'text-emerald-700'
                      }`}
                    >
                      {isHi ? result.evaluation.assessments.Potassium?.statusHi : result.evaluation.assessments.Potassium?.status}
                    </span>
                  </div>

                  <div className="p-3 rounded-2xl bg-gray-50 border border-gray-100 text-center">
                    <span className="text-[10px] text-gray-500 uppercase font-bold block">Reaction (pH)</span>
                    <span className="text-sm font-black text-gray-800">{result.soilParameters.pH}</span>
                    <span className="text-[10px] font-bold text-gray-700 block mt-1">
                      {isHi ? result.evaluation.assessments.pH?.statusHi : result.evaluation.assessments.pH?.status}
                    </span>
                  </div>
                </div>

                {/* Deficiencies Alerts */}
                {result.evaluation.deficiencies.length > 0 && (
                  <div className="mt-4 p-3 rounded-2xl bg-amber-50 border border-amber-200 space-y-1">
                    <span className="text-xs font-black text-amber-900 block">
                      ⚠️ {isHi ? 'मुख्य कमियां एवं सुधार:' : 'Identified Soil Deficiencies & Reclamation:'}
                    </span>
                    <ul className="list-disc pl-4 text-xs text-amber-800 space-y-0.5">
                      {(isHi ? result.evaluation.deficienciesHi : result.evaluation.deficiencies).map((d, i) => (
                        <li key={i}>{d}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              {/* Exact Fertilizer Bag Recommendation (The farmer's core need) */}
              <div className="bg-gradient-to-br from-[#186049] to-[#124b39] p-6 rounded-3xl text-white shadow-xl">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/20 pb-4">
                  <div>
                    <span className="text-xs uppercase tracking-wider text-[#ECE8AF] font-bold">
                      {isHi ? 'आवश्यक उर्वरक मात्रा' : 'Precise Fertilizer Dosage'}
                    </span>
                    <h2 className="text-xl font-black mt-0.5">
                      {areaAcres} {isHi ? 'एकड़' : 'Acres'} • {crop.toUpperCase()}
                    </h2>
                  </div>
                  <span className="text-xs bg-white/10 px-3 py-1.5 rounded-xl border border-white/20 self-start sm:self-auto font-bold">
                    Standard 50kg Bags
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-5">
                  {/* Urea */}
                  <div className="bg-white/10 p-4 rounded-2xl border border-white/20 flex flex-col justify-between">
                    <div>
                      <div className="flex justify-between items-start">
                        <span className="text-xs font-bold text-[#ECE8AF]">UREA (46% N)</span>
                        <span className="text-lg">🌾</span>
                      </div>
                      <div className="text-3xl font-black mt-2">
                        {result.cropRecommendations.fertilizerBags.urea.bags50kg}
                        <span className="text-xs font-normal text-white/80 ml-1">bags (50kg)</span>
                      </div>
                      <div className="text-xs text-white/70 mt-0.5">
                        Total: {result.cropRecommendations.fertilizerBags.urea.kg} kg
                      </div>
                    </div>
                    <p className="text-[11px] text-white/80 mt-3 pt-2 border-t border-white/10">
                      {isHi
                        ? result.cropRecommendations.fertilizerBags.urea.applicationScheduleHi
                        : result.cropRecommendations.fertilizerBags.urea.applicationSchedule}
                    </p>
                  </div>

                  {/* DAP */}
                  <div className="bg-white/10 p-4 rounded-2xl border border-white/20 flex flex-col justify-between">
                    <div>
                      <div className="flex justify-between items-start">
                        <span className="text-xs font-bold text-[#ECE8AF]">DAP (18-46-0)</span>
                        <span className="text-lg">🌱</span>
                      </div>
                      <div className="text-3xl font-black mt-2">
                        {result.cropRecommendations.fertilizerBags.dap.bags50kg}
                        <span className="text-xs font-normal text-white/80 ml-1">bags (50kg)</span>
                      </div>
                      <div className="text-xs text-white/70 mt-0.5">
                        Total: {result.cropRecommendations.fertilizerBags.dap.kg} kg
                      </div>
                    </div>
                    <p className="text-[11px] text-white/80 mt-3 pt-2 border-t border-white/10">
                      {isHi
                        ? result.cropRecommendations.fertilizerBags.dap.applicationScheduleHi
                        : result.cropRecommendations.fertilizerBags.dap.applicationSchedule}
                    </p>
                  </div>

                  {/* MOP */}
                  <div className="bg-white/10 p-4 rounded-2xl border border-white/20 flex flex-col justify-between">
                    <div>
                      <div className="flex justify-between items-start">
                        <span className="text-xs font-bold text-[#ECE8AF]">MOP (60% K2O)</span>
                        <span className="text-lg">🌿</span>
                      </div>
                      <div className="text-3xl font-black mt-2">
                        {result.cropRecommendations.fertilizerBags.mop.bags50kg}
                        <span className="text-xs font-normal text-white/80 ml-1">bags (50kg)</span>
                      </div>
                      <div className="text-xs text-white/70 mt-0.5">
                        Total: {result.cropRecommendations.fertilizerBags.mop.kg} kg
                      </div>
                    </div>
                    <p className="text-[11px] text-white/80 mt-3 pt-2 border-t border-white/10">
                      {isHi
                        ? result.cropRecommendations.fertilizerBags.mop.applicationScheduleHi
                        : result.cropRecommendations.fertilizerBags.mop.applicationSchedule}
                    </p>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
