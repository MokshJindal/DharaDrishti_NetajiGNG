'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import { useVoice } from '@/lib/voice/VoiceContext';
import { MOCK_DISEASES, DiseaseRecord, PRIMARY_FIELD } from '@/lib/data/mockData';

const MapComponent = dynamic(() => import('@/components/map/MapComponent'), {
  ssr: false,
  loading: () => <div className="h-64 bg-gray-100 rounded-2xl animate-pulse" />,
});

export default function DiagnosePage() {
  const { t, language } = useLanguage();
  const { speak, registerActionHandler } = useVoice();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [activeDiagnosis, setActiveDiagnosis] = useState<DiseaseRecord | null>(MOCK_DISEASES[0]);
  const [diseaseHistory, setDiseaseHistory] = useState<DiseaseRecord[]>(MOCK_DISEASES);

  const startAnalysis = useCallback(
    (imageSrc: string) => {
      setSelectedImage(imageSrc);
      setIsAnalyzing(true);
      speak(
        language === 'hi'
          ? 'पत्ती की तस्वीर का विश्लेषण किया जा रहा है...'
          : 'Analyzing crop leaf image for pests and disease symptoms...'
      );

      setTimeout(() => {
        setIsAnalyzing(false);
        const result: DiseaseRecord = {
          id: `dis-${Date.now()}`,
          crop: 'Wheat',
          diseaseName: 'Yellow Rust (Stripe Rust)',
          regionalName: 'पीला रतुआ (हळद्या)',
          confidence: 94,
          severity: 'medium',
          detectedAt: new Date().toLocaleString(),
          location: [18.8262, 74.3731],
          subPlotName: 'Plot A (Wheat)',
          cause: 'Fungal spores (Puccinia striiformis) thriving in 10-15°C dew moisture.',
          symptoms: [
            'Yellow powdery stripes parallel along wheat flag leaves',
            'Reduced grain filling and premature drying',
          ],
          organicTreatment:
            'Spray 5% Neem Seed Kernel Extract (NSKE) or Trichoderma harzianum (5g/L water) in early morning.',
          chemicalTreatment:
            'If yellow pustules cover > 5% of leaf area: Spray Propiconazole 25% EC (1 ml/L water) immediately.',
          imageUrl: imageSrc,
        };

        setActiveDiagnosis(result);
        setDiseaseHistory((prev) => [result, ...prev]);

        // Voice Readout
        const spokenDiagnosis =
          language === 'hi'
            ? `जांच परिणाम: गेहूं में पीला रतुआ देखा गया है। सटीकता 94 प्रतिशत है। तुरंत 5 प्रतिशत नीम का तेल या प्रोपिकोनाज़ोल का छिड़काव करें।`
            : `Diagnosis complete: Yellow rust detected on wheat with 94% confidence. Apply 5% Neem extract or Propiconazole spray.`;
        speak(spokenDiagnosis);
      }, 2000);
    },
    [language, speak]
  );

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          startAnalysis(event.target.result as string);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  // Trigger camera / file input
  const triggerCapture = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  // Voice command listener
  useEffect(() => {
    const unregister = registerActionHandler((spoken: string) => {
      if (
        spoken.includes('photo') ||
        spoken.includes('camera') ||
        spoken.includes('तस्वीर') ||
        spoken.includes('फोटो') ||
        spoken.includes('तਸਵੀਰ')
      ) {
        triggerCapture();
        return true;
      }
      if (
        spoken.includes('diagnose') ||
        spoken.includes('जांच') ||
        spoken.includes('बीमारी') ||
        spoken.includes('रोग')
      ) {
        if (activeDiagnosis) {
          speak(
            language === 'hi'
              ? `रोग का नाम: ${activeDiagnosis.diseaseName} (${activeDiagnosis.regionalName})। जैविक उपचार: ${activeDiagnosis.organicTreatment}`
              : `Condition: ${activeDiagnosis.diseaseName}. Organic remedy: ${activeDiagnosis.organicTreatment}`
          );
        } else {
          triggerCapture();
        }
        return true;
      }
      if (
        spoken.includes('remedy') ||
        spoken.includes('उपचार') ||
        spoken.includes('दवा') ||
        spoken.includes('इलाज')
      ) {
        if (activeDiagnosis) {
          speak(activeDiagnosis.organicTreatment);
        }
        return true;
      }
      return false;
    });

    return unregister;
  }, [activeDiagnosis, language, registerActionHandler, speak, triggerCapture]);

  const mapPins = diseaseHistory.map((d) => ({
    id: d.id,
    lat: d.location[0],
    lng: d.location[1],
    title: `${d.crop}: ${d.diseaseName}`,
    description: `${d.severity.toUpperCase()} severity • Detected ${d.detectedAt}`,
    severity: d.severity,
  }));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-5 rounded-3xl shadow-sm border border-gray-100">
        <div>
          <span className="text-xs font-bold text-[#4A943E] uppercase tracking-wider">
            🔬 AI Crop Health Doctor
          </span>
          <h1 className="text-2xl font-black text-[#186049]">
            {t('diseaseTitle', 'AI Leaf & Crop Disease Doctor')}
          </h1>
          <p className="text-xs sm:text-sm text-gray-500 mt-0.5">
            Take photo of leaves. Claude Vision identifies disease, severity, organic & chemical remedies, and pins to map.
          </p>
        </div>

        <button
          onClick={triggerCapture}
          className="flex items-center gap-2 px-5 py-3 rounded-2xl bg-[#186049] text-white font-bold text-sm shadow hover:bg-[#124b39] transition active:scale-95"
        >
          <span className="text-xl">📷</span>
          <span>{t('uploadOrCapture', 'Take Photo / Upload Leaf')}</span>
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handleFileUpload}
          className="hidden"
        />
      </div>

      {/* Upload & Scanner Box */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Photo Box */}
        <div
          onClick={triggerCapture}
          className="cursor-pointer group relative flex flex-col items-center justify-center min-h-[300px] rounded-3xl border-3 border-dashed border-[#186049]/30 bg-white p-6 text-center hover:border-[#4A943E] hover:bg-[#ECE8AF]/10 transition"
        >
          {selectedImage || activeDiagnosis?.imageUrl ? (
            <div className="relative w-full h-72 rounded-2xl overflow-hidden shadow-inner">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={selectedImage || activeDiagnosis?.imageUrl}
                alt="Crop leaf sample"
                className="w-full h-full object-cover"
              />
              <div className="absolute top-3 right-3 bg-black/60 backdrop-blur-md px-3 py-1 rounded-full text-xs font-bold text-white">
                Leaf Sample Geotagged 📍
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="w-20 h-20 mx-auto rounded-full bg-[#186049]/10 text-4xl flex items-center justify-center text-[#186049] group-hover:scale-110 transition">
                📸
              </div>
              <div className="font-extrabold text-base text-[#186049]">
                {t('uploadOrCapture', 'Take Photo or Choose Leaf Picture')}
              </div>
              <p className="text-xs text-gray-500 max-w-xs mx-auto">
                Capture the underside or affected yellow/brown spots clearly.
              </p>
            </div>
          )}

          {isAnalyzing && (
            <div className="absolute inset-0 bg-[#186049]/80 backdrop-blur-md rounded-3xl flex flex-col items-center justify-center text-white space-y-3 z-10">
              <span className="text-4xl animate-bounce">🔬</span>
              <div className="text-sm font-bold animate-pulse text-[#ECE8AF]">
                {t('diagnosing', 'Analyzing leaf symptoms with AI...')}
              </div>
            </div>
          )}
        </div>

        {/* Diagnosis Results Card */}
        {activeDiagnosis && (
          <div className="rounded-3xl bg-white p-6 shadow-md border-2 border-[#186049]/10 space-y-4">
            <div className="flex items-start justify-between border-b pb-3">
              <div>
                <span className="text-xs font-bold text-gray-400 uppercase">
                  {t('detectedDisease', 'Identified Condition')}
                </span>
                <h3 className="text-xl font-black text-[#186049]">
                  {activeDiagnosis.diseaseName}
                </h3>
                <span className="text-xs font-bold text-[#B98327]">
                  {activeDiagnosis.regionalName}
                </span>
              </div>

              <div className="text-right">
                <span className="inline-block px-3 py-1 rounded-full text-xs font-extrabold bg-[#4A943E]/10 text-[#4A943E]">
                  {activeDiagnosis.confidence}% Confidence
                </span>
                <div className="text-[11px] font-bold text-amber-700 mt-1 uppercase">
                  {activeDiagnosis.severity} Severity
                </div>
              </div>
            </div>

            {/* Cause */}
            <div>
              <h4 className="text-xs font-bold text-gray-500 uppercase">Pathogen / Cause</h4>
              <p className="text-xs sm:text-sm text-gray-700 mt-0.5 font-medium leading-relaxed">
                {activeDiagnosis.cause}
              </p>
            </div>

            {/* Organic Treatment */}
            <div className="rounded-2xl bg-emerald-50 p-3.5 border border-emerald-200">
              <div className="flex items-center gap-2 text-xs font-bold text-emerald-900 uppercase">
                <span>🌱</span>
                <span>{t('organicRemedy', 'Organic / Biological Remedy')}</span>
              </div>
              <p className="text-xs sm:text-sm text-emerald-800 mt-1 font-semibold leading-relaxed">
                {activeDiagnosis.organicTreatment}
              </p>
            </div>

            {/* Chemical Treatment */}
            <div className="rounded-2xl bg-amber-50 p-3.5 border border-amber-200">
              <div className="flex items-center gap-2 text-xs font-bold text-amber-900 uppercase">
                <span>🧪</span>
                <span>{t('chemicalRemedy', 'Chemical Spray (If Severe)')}</span>
              </div>
              <p className="text-xs sm:text-sm text-amber-800 mt-1 font-semibold leading-relaxed">
                {activeDiagnosis.chemicalTreatment}
              </p>
            </div>

            {/* KVK Disclaimer */}
            <div className="text-[11px] text-gray-500 italic bg-gray-50 p-2.5 rounded-xl border">
              ℹ️ {t('kvkWarning', 'Caution: For high severity or doubts, contact your local KVK / Agriculture Officer.')}
            </div>
          </div>
        )}
      </div>

      {/* Geotagged Map Location of Disease Outbreaks */}
      <div className="rounded-3xl bg-white p-5 shadow-sm border border-gray-100 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xl">📍</span>
            <div>
              <h3 className="font-extrabold text-base text-[#186049]">
                {t('pinnedOnMap', 'Pinned on Your Field Map')}
              </h3>
              <p className="text-xs text-gray-500">
                Outbreak location tracked on Plot A (Wheat) — allows monitoring spread over time
              </p>
            </div>
          </div>
          <span className="text-xs font-bold text-[#186049] bg-[#186049]/10 px-3 py-1 rounded-full">
            GPS: 18.8262° N, 74.3731° E
          </span>
        </div>

        <MapComponent
          boundary={PRIMARY_FIELD.boundary}
          subAreas={PRIMARY_FIELD.subPlots}
          pins={mapPins}
          height="320px"
        />
      </div>
    </div>
  );
}
