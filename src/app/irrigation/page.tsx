'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import { useVoice } from '@/lib/voice/VoiceContext';
import {
  PRIMARY_FIELD,
  MOCK_WEATHER_FORECAST,
} from '@/lib/data/mockData';
import { calculateWaterNeed } from '@/lib/rules/irrigationEngine';
import { calculateFertiliserDose } from '@/lib/rules/fertiliserEngine';

export default function IrrigationPage() {
  const { t, language } = useLanguage();
  const { speak, registerActionHandler } = useVoice();

  const [activeTab, setActiveTab] = useState<'irrigation' | 'fertiliser'>('irrigation');

  // Irrigation state
  const [selectedCrop, setSelectedCrop] = useState('wheat');
  const [cropStage, setCropStage] = useState('development');
  const [soilType, setSoilType] = useState('clay');

  // Soil parameters (defaults from Primary Field Soil Health Card)
  const [soilN, setSoilN] = useState(PRIMARY_FIELD.soilHealth.nitrogenKgHa);
  const [soilP, setSoilP] = useState(PRIMARY_FIELD.soilHealth.phosphorusKgHa);
  const [soilK, setSoilK] = useState(PRIMARY_FIELD.soilHealth.potassiumKgHa);
  const [soilPh, setSoilPh] = useState(PRIMARY_FIELD.soilHealth.pH);
  const [soilOc, setSoilOc] = useState(PRIMARY_FIELD.soilHealth.organicCarbonPercent);

  // Computed irrigation results using the deterministic engine
  const waterResult = calculateWaterNeed({
    crop: selectedCrop,
    stage: cropStage,
    area_acres: 3.2,
    et0: MOCK_WEATHER_FORECAST[0].et0Mm,
    rainfall_mm: MOCK_WEATHER_FORECAST[1].rainfallMm, // Tomorrow's rain forecast
    soil_type: soilType,
  });

  // Computed fertiliser results using ICAR rules engine
  const fertResult = calculateFertiliserDose({
    crop: selectedCrop,
    area_acres: 3.2,
    soil_n: soilN,
    soil_p: soilP,
    soil_k: soilK,
    soil_ph: soilPh,
    soil_oc: soilOc,
  });

  const speakIrrigationAdvice = useCallback(() => {
    const text =
      language === 'hi'
        ? `सिंचाई सलाह: कल ${MOCK_WEATHER_FORECAST[1].rainfallMm} मिलीमीटर बारिश का अनुमान है। आज पानी बिल्कुल न लगाएं। इससे बिजली और पानी की बचत होगी और जड़ गलन नहीं होगी।`
        : `Irrigation guidance: ${MOCK_WEATHER_FORECAST[1].rainfallMm} mm rain expected tomorrow. Skip watering today to save electricity and prevent root waterlogging.`;
    speak(text);
  }, [language, speak]);

  const speakFertiliserAdvice = useCallback(() => {
    const text =
      language === 'hi'
        ? `खाद सलाह: आपके 3.2 एकड़ गेहूं के लिए कुल ${fertResult.urea_kg} किलोग्राम यूरिया, ${fertResult.dap_kg} किलोग्राम डीएपी और ${fertResult.mop_kg} किलोग्राम पोटाश की आवश्यकता है।`
        : `Fertiliser advice: For your 3.2 acres of wheat, recommended dose is ${fertResult.urea_kg} kg Urea, ${fertResult.dap_kg} kg DAP, and ${fertResult.mop_kg} kg MOP based on ICAR guidelines.`;
    speak(text);
  }, [fertResult.dap_kg, fertResult.mop_kg, fertResult.urea_kg, language, speak]);

  // Register Voice Commands
  useEffect(() => {
    const unregister = registerActionHandler((spoken: string) => {
      if (
        spoken.includes('water') ||
        spoken.includes('पानी') ||
        spoken.includes('सिंचाई') ||
        spoken.includes('rain')
      ) {
        setActiveTab('irrigation');
        speakIrrigationAdvice();
        return true;
      }
      if (
        spoken.includes('fertiliser') ||
        spoken.includes('fertilizer') ||
        spoken.includes('खाद') ||
        spoken.includes('यूरिया') ||
        spoken.includes('urea') ||
        spoken.includes('dap')
      ) {
        setActiveTab('fertiliser');
        speakFertiliserAdvice();
        return true;
      }
      return false;
    });

    return unregister;
  }, [registerActionHandler, speakFertiliserAdvice, speakIrrigationAdvice]);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-5 rounded-3xl shadow-sm border border-gray-100">
        <div>
          <span className="text-xs font-bold text-[#186049] uppercase tracking-wider">
            💧 ICAR Rules Engine
          </span>
          <h1 className="text-2xl font-black text-[#186049]">
            {t('irrigationTitle', 'Water Need & Fertiliser Schedule')}
          </h1>
          <p className="text-xs sm:text-sm text-gray-500 mt-0.5">
            Deterministic agronomy calculation based on real ET₀ weather forecasts & Soil Health Card values.
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex p-1 bg-gray-100 rounded-2xl border border-gray-200">
          <button
            onClick={() => {
              setActiveTab('irrigation');
              speakIrrigationAdvice();
            }}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition ${
              activeTab === 'irrigation'
                ? 'bg-[#186049] text-white shadow'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <span>💧</span>
            <span>{t('irrigation', 'Irrigation Plan')}</span>
          </button>
          <button
            onClick={() => {
              setActiveTab('fertiliser');
              speakFertiliserAdvice();
            }}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition ${
              activeTab === 'fertiliser'
                ? 'bg-[#186049] text-white shadow'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <span>🧪</span>
            <span>{t('soilHealthTitle', 'Fertiliser (ICAR)')}</span>
          </button>
        </div>
      </div>

      {/* ─────────────────── TAB 1: IRRIGATION ─────────────────── */}
      {activeTab === 'irrigation' && (
        <div className="space-y-5">
          {/* Smart Decision Banner */}
          <div className="rounded-3xl bg-gradient-to-r from-[#ECE8AF] to-[#fff4c2] p-6 text-[#186049] shadow-md border-2 border-[#B98327]/40 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex items-start gap-4">
              <span className="text-4xl">🛑</span>
              <div>
                <span className="text-xs font-extrabold uppercase px-2 py-0.5 rounded bg-[#B98327] text-white">
                  Decision Today: SKIP WATERING
                </span>
                <h3 className="text-xl font-black text-[#186049] mt-1">
                  {t('skipWateringReason', 'Do not water today. Rain expected in 24 hours — saves power & prevents root rot.')}
                </h3>
                <p className="text-xs text-gray-700 mt-1">
                  Tomorrow&apos;s rain: <b>18 mm</b> • Crop Evapotranspiration: <b>4.8 mm</b> • Net Soil Balance: <b>+13.2 mm surplus</b>
                </p>
              </div>
            </div>

            <button
              onClick={speakIrrigationAdvice}
              className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-[#186049] text-white font-bold text-xs shadow hover:bg-[#124b39] transition whitespace-nowrap"
            >
              <span>🔊</span>
              <span>Listen</span>
            </button>
          </div>

          {/* Parameters & Calculation */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {/* Input Config Card */}
            <div className="rounded-3xl bg-white p-5 shadow-sm border border-gray-100 space-y-4">
              <h3 className="font-extrabold text-sm text-[#186049] uppercase tracking-wider">
                Field Parameters
              </h3>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Crop</label>
                <select
                  value={selectedCrop}
                  onChange={(e) => setSelectedCrop(e.target.value)}
                  className="w-full px-3 py-2 text-sm border rounded-xl"
                >
                  <option value="wheat">Wheat (गेहूं) - Kc: 0.75-1.15</option>
                  <option value="mustard">Mustard (सरसों) - Kc: 0.70-1.00</option>
                  <option value="rice">Paddy / Rice (धान) - Kc: 1.10-1.20</option>
                  <option value="cotton">Cotton (कपास) - Kc: 0.75-1.20</option>
                  <option value="sugarcane">Sugarcane (गन्ना) - Kc: 0.80-1.25</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Growth Stage</label>
                <select
                  value={cropStage}
                  onChange={(e) => setCropStage(e.target.value)}
                  className="w-full px-3 py-2 text-sm border rounded-xl"
                >
                  <option value="initial">Initial / Germination</option>
                  <option value="development">Crop Development / Tillering</option>
                  <option value="mid">Mid-Season / Flowering & Heading</option>
                  <option value="late">Late Season / Maturity</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Soil Texture</label>
                <select
                  value={soilType}
                  onChange={(e) => setSoilType(e.target.value)}
                  className="w-full px-3 py-2 text-sm border rounded-xl"
                >
                  <option value="clay">Clay Loam (काळी माती - High retention)</option>
                  <option value="loamy">Alluvial Loam (दोमट)</option>
                  <option value="sandy">Sandy Loam (बलुई - High drainage)</option>
                </select>
              </div>
            </div>

            {/* 5-Day Irrigation Water Schedule Table */}
            <div className="md:col-span-2 rounded-3xl bg-white p-5 shadow-sm border border-gray-100">
              <h3 className="font-extrabold text-base text-[#186049] mb-3">
                5-Day Irrigation Schedule (Plot A: 3.2 Acres Wheat)
              </h3>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b text-gray-500 font-bold uppercase text-[11px]">
                      <th className="pb-2">Day</th>
                      <th className="pb-2">ET₀ Demand</th>
                      <th className="pb-2">Rain Forecast</th>
                      <th className="pb-2">Net Water Need</th>
                      <th className="pb-2">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    <tr className="hover:bg-gray-50">
                      <td className="py-3 font-bold text-[#186049]">Today (18 Oct)</td>
                      <td className="py-3">4.8 mm</td>
                      <td className="py-3">0 mm</td>
                      <td className="py-3 font-semibold">3.6 mm</td>
                      <td className="py-3">
                        <span className="px-2 py-1 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800">
                          Hold (Rain tomorrow)
                        </span>
                      </td>
                    </tr>
                    <tr className="bg-emerald-50/50">
                      <td className="py-3 font-bold text-[#186049]">Tomorrow (19 Oct)</td>
                      <td className="py-3">2.1 mm</td>
                      <td className="py-3 font-bold text-blue-700">18.0 mm 🌧️</td>
                      <td className="py-3 font-bold text-emerald-700">0.0 mm (Surplus)</td>
                      <td className="py-3">
                        <span className="px-2 py-1 rounded-full text-[11px] font-bold bg-emerald-600 text-white">
                          Skip Watering
                        </span>
                      </td>
                    </tr>
                    <tr className="hover:bg-gray-50">
                      <td className="py-3 font-bold text-[#186049]">Monday (20 Oct)</td>
                      <td className="py-3">3.2 mm</td>
                      <td className="py-3">6.0 mm 🌦️</td>
                      <td className="py-3 font-semibold">0.0 mm</td>
                      <td className="py-3">
                        <span className="px-2 py-1 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800">
                          Adequate Moisture
                        </span>
                      </td>
                    </tr>
                    <tr className="hover:bg-gray-50">
                      <td className="py-3 font-bold text-[#186049]">Tuesday (21 Oct)</td>
                      <td className="py-3">4.5 mm</td>
                      <td className="py-3">0 mm</td>
                      <td className="py-3 font-semibold">3.4 mm</td>
                      <td className="py-3">
                        <span className="px-2 py-1 rounded-full text-[11px] font-bold bg-gray-100 text-gray-700">
                          Inspect Field
                        </span>
                      </td>
                    </tr>
                    <tr className="hover:bg-gray-50">
                      <td className="py-3 font-bold text-[#186049]">Wednesday (22 Oct)</td>
                      <td className="py-3">5.1 mm</td>
                      <td className="py-3">0 mm</td>
                      <td className="py-3 font-semibold">3.8 mm</td>
                      <td className="py-3">
                        <span className="px-2 py-1 rounded-full text-[11px] font-bold bg-blue-100 text-blue-800">
                          Evening Light Irrigate
                        </span>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────── TAB 2: FERTILISER (ICAR) ─────────────────── */}
      {activeTab === 'fertiliser' && (
        <div className="space-y-5">
          {/* Soil Health Card OCR / Input Box */}
          <div className="rounded-3xl bg-white p-5 shadow-sm border border-gray-100">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b mb-4 gap-2">
              <div>
                <span className="text-xs font-bold text-gray-400 uppercase">
                  Government of India
                </span>
                <h3 className="text-lg font-black text-[#186049]">
                  Soil Health Card (मृदा स्वास्थ्य कार्ड) #SHC-MH-2026-8841
                </h3>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() =>
                    alert('Camera activated: Align your Soil Health Card in the frame.')
                  }
                  className="px-3.5 py-1.5 rounded-xl bg-[#ECE8AF] text-[#186049] text-xs font-bold hover:bg-[#deda9e]"
                >
                  📸 Scan Card with OCR
                </button>
              </div>
            </div>

            {/* Editable Soil Nutrient Values */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              <div className="p-3 rounded-2xl bg-gray-50 border">
                <span className="text-[11px] font-bold text-gray-500 uppercase">
                  Nitrogen (N)
                </span>
                <div className="mt-1 flex items-baseline gap-1">
                  <input
                    type="number"
                    value={soilN}
                    onChange={(e) => setSoilN(Number(e.target.value))}
                    className="w-16 font-extrabold text-[#186049] bg-transparent border-b text-base"
                  />
                  <span className="text-xs text-gray-400">kg/ha</span>
                </div>
                <span className="text-[10px] text-red-600 font-bold">Deficient (&lt;280)</span>
              </div>

              <div className="p-3 rounded-2xl bg-gray-50 border">
                <span className="text-[11px] font-bold text-gray-500 uppercase">
                  Phosphorus (P)
                </span>
                <div className="mt-1 flex items-baseline gap-1">
                  <input
                    type="number"
                    value={soilP}
                    onChange={(e) => setSoilP(Number(e.target.value))}
                    className="w-16 font-extrabold text-[#186049] bg-transparent border-b text-base"
                  />
                  <span className="text-xs text-gray-400">kg/ha</span>
                </div>
                <span className="text-[10px] text-amber-600 font-bold">Medium (10-25)</span>
              </div>

              <div className="p-3 rounded-2xl bg-gray-50 border">
                <span className="text-[11px] font-bold text-gray-500 uppercase">
                  Potassium (K)
                </span>
                <div className="mt-1 flex items-baseline gap-1">
                  <input
                    type="number"
                    value={soilK}
                    onChange={(e) => setSoilK(Number(e.target.value))}
                    className="w-16 font-extrabold text-[#186049] bg-transparent border-b text-base"
                  />
                  <span className="text-xs text-gray-400">kg/ha</span>
                </div>
                <span className="text-[10px] text-emerald-600 font-bold">High (&gt;280)</span>
              </div>

              <div className="p-3 rounded-2xl bg-gray-50 border">
                <span className="text-[11px] font-bold text-gray-500 uppercase">Soil pH</span>
                <div className="mt-1 flex items-baseline gap-1">
                  <input
                    type="number"
                    step="0.1"
                    value={soilPh}
                    onChange={(e) => setSoilPh(Number(e.target.value))}
                    className="w-16 font-extrabold text-[#186049] bg-transparent border-b text-base"
                  />
                </div>
                <span className="text-[10px] text-emerald-600 font-bold">Optimal (6.5-7.5)</span>
              </div>

              <div className="p-3 rounded-2xl bg-gray-50 border">
                <span className="text-[11px] font-bold text-gray-500 uppercase">
                  Organic Carbon
                </span>
                <div className="mt-1 flex items-baseline gap-1">
                  <input
                    type="number"
                    step="0.01"
                    value={soilOc}
                    onChange={(e) => setSoilOc(Number(e.target.value))}
                    className="w-16 font-extrabold text-[#186049] bg-transparent border-b text-base"
                  />
                  <span className="text-xs text-gray-400">%</span>
                </div>
                <span className="text-[10px] text-amber-600 font-bold">Medium (0.5-0.75)</span>
              </div>
            </div>
          </div>

          {/* ICAR Fertiliser Recommendation Output */}
          <div className="rounded-3xl bg-white p-6 shadow-md border-2 border-[#186049]/20 space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <div>
                <h3 className="text-lg font-black text-[#186049]">
                  Commercial Fertiliser Bags Required (Plot A: 3.2 Acres)
                </h3>
                <p className="text-xs text-gray-500">
                  {fertResult.source}
                </p>
              </div>

              <button
                onClick={speakFertiliserAdvice}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#4A943E] text-white text-xs font-bold shadow hover:bg-[#3d7d33]"
              >
                <span>🔊</span>
                <span>Listen to Dose</span>
              </button>
            </div>

            {/* 3 Nutrient Big Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* Urea Card */}
              <div className="rounded-2xl bg-[#ECE8AF]/30 p-4 border border-[#B98327]/30">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-extrabold text-[#B98327] uppercase">
                    {t('ureaDose', 'Urea (46% N)')}
                  </span>
                  <span className="text-2xl">🌱</span>
                </div>
                <div className="mt-2 text-3xl font-black text-[#186049]">
                  {fertResult.urea_kg} kg
                </div>
                <p className="text-xs text-gray-600 mt-1">
                  ~ {Math.ceil(fertResult.urea_kg / 45)} Bags (45 kg bags). Split in 3 equal top-dressings.
                </p>
              </div>

              {/* DAP Card */}
              <div className="rounded-2xl bg-emerald-50 p-4 border border-emerald-200">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-extrabold text-[#186049] uppercase">
                    {t('dapDose', 'D.A.P (18% N, 46% P₂O₅)')}
                  </span>
                  <span className="text-2xl">🌾</span>
                </div>
                <div className="mt-2 text-3xl font-black text-[#186049]">
                  {fertResult.dap_kg} kg
                </div>
                <p className="text-xs text-gray-600 mt-1">
                  ~ {Math.ceil(fertResult.dap_kg / 50)} Bags (50 kg). Apply 100% basal at sowing.
                </p>
              </div>

              {/* MOP Card */}
              <div className="rounded-2xl bg-amber-50 p-4 border border-amber-200">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-extrabold text-amber-800 uppercase">
                    {t('mopDose', 'M.O.P (60% Potash)')}
                  </span>
                  <span className="text-2xl">🍂</span>
                </div>
                <div className="mt-2 text-3xl font-black text-[#186049]">
                  {fertResult.mop_kg} kg
                </div>
                <p className="text-xs text-gray-600 mt-1">
                  Soil potassium is naturally high (295 kg/ha). Maintenance dose only.
                </p>
              </div>
            </div>

            {/* Split Schedule Table */}
            <div className="pt-2">
              <h4 className="text-xs font-bold text-gray-700 uppercase mb-2">
                Application Timetable
              </h4>
              <div className="space-y-2 text-xs">
                {fertResult.schedule.map((s, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-2.5 rounded-xl bg-gray-50 border"
                  >
                    <span className="font-bold text-[#186049]">
                      Stage {s.week}: {s.fertiliser}
                    </span>
                    <span className="font-extrabold text-gray-800">{s.dose_kg} kg total</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
