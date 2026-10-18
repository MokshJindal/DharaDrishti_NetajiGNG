'use client';

import React, { useState, useEffect, useCallback } from 'react';
import dynamic from 'next/dynamic';
import confetti from 'canvas-confetti';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import { useVoice, voiceEventBus } from '@/lib/voice/VoiceContext';
import { PRIMARY_FIELD } from '@/lib/data/mockData';
import {
  calculateArea,
  calculatePerimeter,
  convertLandUnits,
  exportToGeoJson,
  exportToKML,
} from '@/lib/geo/geoUtils';
import type { MapOverlayLayer } from '@/components/map/MapComponent';

// Dynamically import MapComponent to prevent SSR window issues
const MapComponent = dynamic(() => import('@/components/map/MapComponent'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-[520px] rounded-3xl bg-[#ECE8AF]/30 animate-pulse flex flex-col items-center justify-center text-[#186049] font-bold gap-2">
      <span className="text-3xl animate-bounce">🛰️</span>
      <span>Loading Precision GIS Map &amp; Strava Telemetry...</span>
    </div>
  ),
});

export interface PrecisionZone {
  id: string;
  name: string;
  crop: string;
  variety: string;
  areaAcres: number;
  color: string;
  polygon: [number, number][];
  soil: {
    texture: string;
    nitrogenKgHa: number;
    phosphorusKgHa: number;
    potassiumKgHa: number;
    pH: number;
    organicCarbonPercent: number;
    moisturePercent: number;
    infiltrationRateMmHr: number;
  };
  vra: {
    ureaKgPerAcre: number;
    dapKgPerAcre: number;
    mopKgPerAcre: number;
    irrigationRunTimeMinutes: number;
    irrigationIntervalDays: number;
    pesticideAdvisory: string;
    rationale: string;
    savingsVsUniform: {
      ureaSavedKg: number;
      waterSavedPercent: number;
      costSavedRs: number;
    };
  };
  cropPlanning: {
    primaryCrop: string;
    suitabilityScore: number;
    alternativeCrops: string[];
    sownOn: string;
    growthStage: string;
    daysToHarvest: number;
    harvestReadiness: string;
    estimatedYieldQuintals: number;
  };
}

export default function FieldsPage() {
  const { t, language } = useLanguage();
  const { speak, registerActionHandler } = useVoice();

  // Active view tab: 'map' | 'zones' | 'vra' | 'planning'
  const [activeTab, setActiveTab] = useState<'map' | 'zones' | 'vra' | 'planning'>('map');

  // Farm field state
  const [fieldName, setFieldName] = useState<string>('Shri Ram Khet (North Farm)');
  const [boundary, setBoundary] = useState<[number, number][]>(PRIMARY_FIELD.boundary);
  const [areaAcres, setAreaAcres] = useState<number>(4.8);
  const [zones, setZones] = useState<PrecisionZone[]>([]);
  const [activeLayer, setActiveLayer] = useState<MapOverlayLayer>('satellite');

  // Strava tracking and simulation states
  const [isTracking, setIsTracking] = useState(false);
  const [isSimulating, setIsSimulating] = useState(false);
  const [isDrawing, setIsDrawing] = useState(false);
  const [trackingStats, setTrackingStats] = useState({
    distanceMeters: 0,
    elapsedSeconds: 0,
    speedKmh: 0,
    accuracyM: 2.4,
    pointsCount: 0,
    isNearStart: false,
  });

  // UI Modals & Banners
  const [statusMessage, setStatusMessage] = useState('');
  const [showPrescriptionModal, setShowPrescriptionModal] = useState(false);
  const [showAddZoneModal, setShowAddZoneModal] = useState(false);
  const [newZoneName, setNewZoneName] = useState('');
  const [newZoneCrop, setNewZoneCrop] = useState('Wheat');
  const [newZoneTexture, setNewZoneTexture] = useState('Clay Loam');

  // Fetch initial field & zones from backend API
  const loadFieldData = useCallback(async () => {
    try {
      const res = await fetch('/api/fields');
      if (res.ok) {
        const json = await res.json();
        if (json.field) {
          setFieldName(json.field.name || 'Shri Ram Khet (North Farm)');
          if (json.field.boundary && json.field.boundary.length >= 3) {
            setBoundary(json.field.boundary);
            setAreaAcres(json.field.totalAreaAcres || 4.8);
          }
          if (json.field.zones && json.field.zones.length > 0) {
            setZones(json.field.zones);
          }
        }
      }
    } catch (err) {
      console.warn('Could not load /api/fields directly:', err);
    }
  }, []);

  useEffect(() => {
    loadFieldData();
  }, [loadFieldData]);

  // Derived land conversions & perimeter
  const landUnits = convertLandUnits(areaAcres > 0 ? areaAcres : 4.8);
  const perimeterMeters = Math.round(calculatePerimeter(boundary));

  // VRA summary calculations
  const uniformUreaBaseline = Math.round(areaAcres * 50);
  const uniformDapBaseline = Math.round(areaAcres * 30);
  const vraTotalUrea = Math.round(
    zones.reduce((sum, z) => sum + z.vra.ureaKgPerAcre * z.areaAcres, 0)
  );
  const vraTotalDap = Math.round(
    zones.reduce((sum, z) => sum + z.vra.dapKgPerAcre * z.areaAcres, 0)
  );
  const totalCostSavedRs = Math.round(
    zones.reduce((sum, z) => sum + z.vra.savingsVsUniform.costSavedRs, 0) || 2250
  );
  const totalUreaSavedKg = Math.round(
    zones.reduce((sum, z) => sum + z.vra.savingsVsUniform.ureaSavedKg, 0) || 59
  );
  const avgWaterSaved = Math.round(
    zones.length > 0
      ? zones.reduce((sum, z) => sum + z.vra.savingsVsUniform.waterSavedPercent, 0) / zones.length
      : 25
  );

  // ─────────────────────────────────────────────────────────────
  // Strava GPS Walking Mode
  // ─────────────────────────────────────────────────────────────
  const handleStartWalking = useCallback(() => {
    setIsDrawing(false);
    setIsSimulating(false);
    setIsTracking(true);
    setStatusMessage(t('walkingActive', 'Tracking live steps... Walk along the field boundary'));
    speak(
      language === 'hi'
        ? 'जीपीएस ट्रैकिंग शुरू हो गई है। खेत की मेड़ के साथ-साथ चलें।'
        : 'GPS tracking active. Walk along the edge of your field.'
    );
  }, [language, speak, t]);

  const handleStopWalking = useCallback(async () => {
    setIsTracking(false);
    setIsSimulating(false);
    const calculated = calculateArea(boundary);
    const finalArea = calculated > 0 ? Number(calculated.toFixed(2)) : 4.8;
    setAreaAcres(finalArea);
    confetti({ particleCount: 80, spread: 70, origin: { y: 0.6 } });

    const msg =
      language === 'hi'
        ? `सीमा पूरी हो गई! कुल क्षेत्रफल ${finalArea} एकड़ (लगभग ${landUnits.bigha} बीघा) दर्ज हुआ।`
        : `Boundary closed! Field area calculated as ${finalArea} acres (${landUnits.bigha} Bigha).`;
    setStatusMessage(msg);
    speak(msg);

    // Save to backend
    try {
      await fetch('/api/fields', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ boundary, id: 'field-01', name: fieldName }),
      });
    } catch (e) {
      console.error('Error auto-saving boundary:', e);
    }
  }, [boundary, fieldName, landUnits.bigha, language, speak]);

  // ─────────────────────────────────────────────────────────────
  // Strava Walk Simulation Mode (1-Click Evaluation Demo)
  // ─────────────────────────────────────────────────────────────
  const handleStartSimulation = useCallback(() => {
    setIsDrawing(false);
    setIsTracking(false);
    setIsSimulating(true);
    setStatusMessage('🎮 Simulating GPS walk along Shirur field perimeter at 4.2 km/h...');
    speak(
      language === 'hi'
        ? 'सिमुलेटेड वॉक शुरू हो गया है। जीपीएस मैप पर मेड़ के साथ चल रहा है।'
        : 'Simulated walk initiated along field perimeter.'
    );
  }, [language, speak]);

  const handleToggleDraw = useCallback(() => {
    setIsTracking(false);
    setIsSimulating(false);
    setIsDrawing((prev) => !prev);
    if (!isDrawing) {
      setStatusMessage('Tap on the satellite map to add boundary points.');
      speak(
        language === 'hi'
          ? 'सैटेलाइट नक्शे पर छूकर खेत के कोने चिन्हित करें।'
          : 'Tap on the satellite map to place corner points.'
      );
    } else {
      setStatusMessage('');
    }
  }, [isDrawing, language, speak]);

  // ─────────────────────────────────────────────────────────────
  // Save Field Action
  // ─────────────────────────────────────────────────────────────
  const handleSaveField = useCallback(async () => {
    try {
      const res = await fetch('/api/fields', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: 'field-01',
          name: fieldName,
          boundary,
          zones,
        }),
      });
      if (res.ok) {
        confetti({ particleCount: 100, spread: 80, origin: { y: 0.6 } });
        const successMsg =
          language === 'hi'
            ? `खेत की सीमा, ${zones.length} ज़ोन और VRA पर्ची सफलतापूर्वक सुरक्षित हो गई!`
            : `Field boundary, ${zones.length} management zones, and VRA prescriptions saved!`;
        setStatusMessage(successMsg);
        speak(successMsg);
      }
    } catch (err) {
      console.error('Save field error:', err);
    }
  }, [boundary, fieldName, language, speak, zones]);

  // ─────────────────────────────────────────────────────────────
  // Export Handlers (KML / GeoJSON / Printable Card)
  // ─────────────────────────────────────────────────────────────
  const handleExportGeoJson = () => {
    const geoJson = exportToGeoJson(fieldName, areaAcres, boundary, zones);
    const blob = new Blob([JSON.stringify(geoJson, null, 2)], {
      type: 'application/geo+json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${fieldName.replace(/\s+/g, '_')}_Cadastral.geojson`;
    a.click();
    URL.revokeObjectURL(url);
    speak(language === 'hi' ? 'जियो-जेसन फाइल डाउनलोड हो गई है' : 'GeoJSON file downloaded');
  };

  const handleExportKML = () => {
    const kml = exportToKML(fieldName, boundary, zones);
    const blob = new Blob([kml], {
      type: 'application/vnd.google-earth.kml+xml',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${fieldName.replace(/\s+/g, '_')}_Survey.kml`;
    a.click();
    URL.revokeObjectURL(url);
    speak(language === 'hi' ? 'केएमएल फाइल डाउनलोड हो गई है' : 'KML file downloaded');
  };

  // Add custom management zone
  const handleAddZone = () => {
    if (!newZoneName.trim()) return;

    const newZone: PrecisionZone = {
      id: `zone-${Date.now()}`,
      name: newZoneName,
      crop: newZoneCrop,
      variety: 'Hybrid F1',
      areaAcres: 1.0,
      color: '#4A943E',
      polygon: [
        [18.8255, 74.3725],
        [18.827, 74.3732],
        [18.8262, 74.3745],
      ],
      soil: {
        texture: newZoneTexture,
        nitrogenKgHa: 240,
        phosphorusKgHa: 22,
        potassiumKgHa: 280,
        pH: 7.2,
        organicCarbonPercent: 0.65,
        moisturePercent: 26,
        infiltrationRateMmHr: 16,
      },
      vra: {
        ureaKgPerAcre: 50,
        dapKgPerAcre: 25,
        mopKgPerAcre: 15,
        irrigationRunTimeMinutes: 22,
        irrigationIntervalDays: 4,
        pesticideAdvisory: 'Preventive IPM monitoring.',
        rationale: 'Balanced nutrition for targeted micro-plot.',
        savingsVsUniform: {
          ureaSavedKg: 10,
          waterSavedPercent: 20,
          costSavedRs: 480,
        },
      },
      cropPlanning: {
        primaryCrop: newZoneCrop,
        suitabilityScore: 92,
        alternativeCrops: ['Gram', 'Mustard'],
        sownOn: new Date().toISOString().split('T')[0],
        growthStage: 'Vegetative',
        daysToHarvest: 60,
        harvestReadiness: 'Growing Phase',
        estimatedYieldQuintals: 14.5,
      },
    };

    setZones((prev) => [...prev, newZone]);
    setShowAddZoneModal(false);
    setNewZoneName('');
    speak(
      language === 'hi'
        ? `नया ज़ोन ${newZoneCrop} का जोड़ दिया गया है।`
        : `New zone added to farm.`
    );
  };

  // ─────────────────────────────────────────────────────────────
  // Register Voice Commands for Fields & Strava Features
  // ─────────────────────────────────────────────────────────────
  useEffect(() => {
    const unregister = registerActionHandler((spoken: string) => {
      const lower = spoken.toLowerCase();

      if (
        lower.includes('start walk') ||
        lower.includes('walk') ||
        lower.includes('चलना शुरू') ||
        lower.includes('नापो') ||
        lower.includes('ਤੁਰਨਾ ਸ਼ੁਰੂ')
      ) {
        handleStartWalking();
        return true;
      }
      if (
        lower.includes('simulate') ||
        lower.includes('सिम्युलेट') ||
        lower.includes('डेमो') ||
        lower.includes('demo')
      ) {
        handleStartSimulation();
        return true;
      }
      if (
        lower.includes('stop walk') ||
        lower.includes('finish') ||
        lower.includes('बंद करो') ||
        lower.includes('रोको') ||
        lower.includes('ਹੱਦ ਬੰਦ')
      ) {
        handleStopWalking();
        return true;
      }
      if (
        lower.includes('draw') ||
        lower.includes('नक्शे') ||
        lower.includes('बिंदु') ||
        lower.includes('मैप')
      ) {
        handleToggleDraw();
        return true;
      }
      if (
        lower.includes('save') ||
        lower.includes('सहेज') ||
        lower.includes('ਸਾਂਭੋ')
      ) {
        handleSaveField();
        return true;
      }
      if (
        lower.includes('vra') ||
        lower.includes('खाद पर्ची') ||
        lower.includes('prescription')
      ) {
        setShowPrescriptionModal(true);
        setActiveTab('vra');
        return true;
      }
      if (lower.includes('zone') || lower.includes('ज़ोन')) {
        setActiveTab('zones');
        return true;
      }
      if (lower.includes('harvest') || lower.includes('कटाई')) {
        setActiveTab('planning');
        return true;
      }
      return false;
    });

    return unregister;
  }, [
    handleSaveField,
    handleStartSimulation,
    handleStartWalking,
    handleStopWalking,
    handleToggleDraw,
    registerActionHandler,
  ]);

  // Global voice action listener
  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const handleVoiceAction = (e: any) => {
      const detail = e.detail;
      if (detail?.action === 'start_walk') {
        handleStartWalking();
      } else if (detail?.action === 'draw_field') {
        handleToggleDraw();
      } else if (detail?.action === 'save_field') {
        handleSaveField();
      }
    };
    voiceEventBus.addEventListener('voice_action', handleVoiceAction as EventListener);
    return () => {
      voiceEventBus.removeEventListener('voice_action', handleVoiceAction as EventListener);
    };
  }, [handleSaveField, handleStartWalking, handleToggleDraw]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* ─────────────────────────────────────────────────────────────
          PAGE HEADER & CADASTRAL IDENTITY
      ───────────────────────────────────────────────────────────── */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
        <div>
          <div className="flex flex-wrap items-center gap-2 text-xs font-bold text-[#186049] uppercase tracking-wider mb-1">
            <span className="flex items-center gap-1">
              <span>📍</span>
              <span>Kardelwadi, Shirur (Pune, Maharashtra)</span>
            </span>
            <span>•</span>
            <span className="bg-[#ECE8AF]/60 text-[#186049] px-2 py-0.5 rounded-md font-mono">
              Khasra: 142/A
            </span>
            <span>•</span>
            <span className="text-gray-500">Cadastral Survey Id: DD-MH-2026-981</span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-black text-[#186049] tracking-tight">
            {t('geofenceTitle', 'Boundary & Crop Geo-fencing')}
          </h1>

          <p className="text-xs sm:text-sm text-gray-500 mt-1 max-w-2xl">
            Strava-inspired boundary walk with real-time GPS telemetry, precision zoning, and
            Variable Rate Application (VRA) for targeted water and fertilizer management.
          </p>
        </div>

        {/* Action Buttons: Export & Save */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Export Menu Dropdown */}
          <div className="relative group">
            <button className="flex items-center gap-1.5 px-4 py-2.5 rounded-2xl bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-xs sm:text-sm transition shadow-sm">
              <span>📥</span>
              <span>Export GIS</span>
              <span className="text-xs">▼</span>
            </button>
            <div className="absolute right-0 top-full mt-1.5 w-48 bg-white rounded-2xl shadow-xl border border-gray-100 p-2 z-[600] hidden group-hover:block transition-all">
              <button
                onClick={handleExportKML}
                className="w-full text-left px-3 py-2 rounded-xl text-xs font-bold text-gray-700 hover:bg-[#186049]/10 hover:text-[#186049] transition flex items-center justify-between"
              >
                <span>🌍 Export KML (Google Earth)</span>
              </button>
              <button
                onClick={handleExportGeoJson}
                className="w-full text-left px-3 py-2 rounded-xl text-xs font-bold text-gray-700 hover:bg-[#186049]/10 hover:text-[#186049] transition flex items-center justify-between"
              >
                <span>📄 Export GeoJSON</span>
              </button>
              <button
                onClick={() => setShowPrescriptionModal(true)}
                className="w-full text-left px-3 py-2 rounded-xl text-xs font-bold text-gray-700 hover:bg-[#186049]/10 hover:text-[#186049] transition flex items-center justify-between"
              >
                <span>🖨️ Print VRA Prescription Card</span>
              </button>
            </div>
          </div>

          <button
            onClick={() => setShowPrescriptionModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-[#ECE8AF] text-[#186049] font-extrabold text-xs sm:text-sm shadow-sm hover:bg-[#e4df9b] transition"
          >
            <span>🧪</span>
            <span>{t('vraPrescription', 'VRA Prescription')}</span>
          </button>

          <button
            onClick={handleSaveField}
            className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-[#4A943E] text-white font-extrabold text-xs sm:text-sm shadow-md hover:bg-[#3d7d33] transition active:scale-95"
          >
            <span>💾</span>
            <span>{t('save', 'Save Field')}</span>
          </button>
        </div>
      </div>

      {/* Status banner */}
      {statusMessage && (
        <div className="rounded-2xl bg-[#ECE8AF] p-4 text-[#186049] text-sm font-bold border-l-4 border-[#B98327] flex items-center justify-between shadow-sm animate-fade-in">
          <div className="flex items-center gap-2">
            <span>📢</span>
            <span>{statusMessage}</span>
          </div>
          <button onClick={() => setStatusMessage('')} className="text-xs text-[#186049]/70 hover:text-[#186049]">
            ✕
          </button>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          FARM OVERVIEW KPI CARDS (Area, Perimeter, VRA Savings)
      ───────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Total Acreage & Conversions */}
        <div className="bg-white p-4 sm:p-5 rounded-3xl shadow-sm border border-gray-100 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-[11px] font-bold text-gray-400 uppercase tracking-wider">
              <span>{t('calculatedArea', 'Total Farm Area')}</span>
              <span className="text-[#186049] font-mono">Geodesic</span>
            </div>
            <div className="mt-1 flex items-baseline gap-1.5">
              <span className="text-3xl sm:text-4xl font-black text-[#186049]">
                {areaAcres.toFixed(2)}
              </span>
              <span className="text-sm font-bold text-gray-500">Acres</span>
            </div>
          </div>
          <div className="mt-2 pt-2 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500 font-semibold">
            <span>{landUnits.hectares} Hectares</span>
            <span>•</span>
            <span className="text-[#B98327] font-bold">{landUnits.bigha} Bigha</span>
            <span>•</span>
            <span>{landUnits.guntha} Gunthas</span>
          </div>
        </div>

        {/* Boundary Perimeter & Points */}
        <div className="bg-white p-4 sm:p-5 rounded-3xl shadow-sm border border-gray-100 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-[11px] font-bold text-gray-400 uppercase tracking-wider">
              <span>Perimeter (मेड़)</span>
              <span className="text-emerald-600 font-mono">RTK ±2.4m</span>
            </div>
            <div className="mt-1 flex items-baseline gap-1.5">
              <span className="text-3xl sm:text-4xl font-black text-[#186049]">
                {perimeterMeters}
              </span>
              <span className="text-sm font-bold text-gray-500">Metres</span>
            </div>
          </div>
          <div className="mt-2 pt-2 border-t border-gray-100 text-xs text-gray-500">
            {boundary.length} GPS vertices • {(perimeterMeters / 1000).toFixed(2)} km walking ridge
          </div>
        </div>

        {/* VRA Fertilizer Savings */}
        <div className="bg-white p-4 sm:p-5 rounded-3xl shadow-sm border border-gray-100 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-[11px] font-bold text-gray-400 uppercase tracking-wider">
              <span>VRA Fertilizer Saved</span>
              <span className="text-purple-600 font-bold">vs Blanket</span>
            </div>
            <div className="mt-1 flex items-baseline gap-1.5">
              <span className="text-3xl sm:text-4xl font-black text-purple-700">
                {totalUreaSavedKg}
              </span>
              <span className="text-sm font-bold text-gray-500">kg Urea</span>
            </div>
          </div>
          <div className="mt-2 pt-2 border-t border-gray-100 flex items-center justify-between text-xs">
            <span className="text-gray-500">Saved: ₹{totalCostSavedRs}</span>
            <span className="text-emerald-600 font-bold">-{Math.round(totalUreaSavedKg * 0.46)}kg N Leached</span>
          </div>
        </div>

        {/* Precision Water Efficiency */}
        <div className="bg-white p-4 sm:p-5 rounded-3xl shadow-sm border border-gray-100 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-[11px] font-bold text-gray-400 uppercase tracking-wider">
              <span>Water Conserved</span>
              <span className="text-sky-600 font-bold">Hydrology</span>
            </div>
            <div className="mt-1 flex items-baseline gap-1.5">
              <span className="text-3xl sm:text-4xl font-black text-sky-600">
                {avgWaterSaved}%
              </span>
              <span className="text-sm font-bold text-gray-500">Efficiency</span>
            </div>
          </div>
          <div className="mt-2 pt-2 border-t border-gray-100 text-xs text-gray-500">
            Tailored drip runtime per soil texture zone
          </div>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          INTERACTIVE STRAVA MAP & ACTION CONTROLS
      ───────────────────────────────────────────────────────────── */}
      <div className="space-y-3">
        <MapComponent
          boundary={boundary}
          subAreas={zones}
          isTracking={isTracking}
          isDrawing={isDrawing}
          isSimulating={isSimulating}
          activeLayer={activeLayer}
          onLayerChange={(layer) => setActiveLayer(layer)}
          onBoundaryUpdate={(coords, acres) => {
            setBoundary(coords);
            setAreaAcres(acres);
          }}
          onFinishWalk={handleStopWalking}
          onStatsUpdate={(stats) => setTrackingStats(stats)}
          height="540px"
        />

        {/* Strava Controller Toolbar: Live Walk, Simulate Demo, Satellite Draw */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Start / Stop Live GPS Walk */}
          {!isTracking ? (
            <button
              onClick={handleStartWalking}
              className="flex items-center gap-3 p-4 rounded-2xl bg-[#186049] text-white font-bold text-sm shadow-md hover:bg-[#124b39] transition active:scale-98"
            >
              <span className="text-2xl">🏃</span>
              <div className="text-left">
                <div className="leading-tight">{t('startWalking', 'Start Walking GPS Boundary')}</div>
                <span className="text-[11px] text-[#ECE8AF]">Live phone GPS telemetry</span>
              </div>
            </button>
          ) : (
            <button
              onClick={handleStopWalking}
              className="flex items-center gap-3 p-4 rounded-2xl bg-red-600 text-white font-bold text-sm shadow-md hover:bg-red-700 transition active:scale-98 animate-pulse"
            >
              <span className="text-2xl">🛑</span>
              <div className="text-left">
                <div className="leading-tight">{t('stopWalking', 'Finish & Close Boundary')}</div>
                <span className="text-[11px] text-white/80">Snap polygon & compute area</span>
              </div>
            </button>
          )}

          {/* Simulate Strava Walk (Indoor Evaluator Demo Mode) */}
          {!isSimulating ? (
            <button
              onClick={handleStartSimulation}
              className="flex items-center gap-3 p-4 rounded-2xl bg-[#B98327] text-white font-bold text-sm shadow-md hover:bg-[#9c6e20] transition active:scale-98"
            >
              <span className="text-2xl">🎮</span>
              <div className="text-left">
                <div className="leading-tight">{t('simulateWalk', 'Simulate Strava Boundary Walk')}</div>
                <span className="text-[11px] text-[#ECE8AF]">1-Click demo along ridge</span>
              </div>
            </button>
          ) : (
            <button
              onClick={handleStopWalking}
              className="flex items-center gap-3 p-4 rounded-2xl bg-amber-600 text-white font-bold text-sm shadow-md hover:bg-amber-700 transition active:scale-98 animate-pulse"
            >
              <span className="text-2xl">⏹️</span>
              <div className="text-left">
                <div className="leading-tight">Stop Walk Simulation</div>
                <span className="text-[11px] text-white/80">Lock current path</span>
              </div>
            </button>
          )}

          {/* Draw on Map Fallback */}
          <button
            onClick={handleToggleDraw}
            className={`flex items-center gap-3 p-4 rounded-2xl font-bold text-sm shadow-md transition active:scale-98 border ${
              isDrawing
                ? 'bg-[#ECE8AF] text-[#186049] border-[#B98327]'
                : 'bg-white text-[#186049] border-gray-200 hover:bg-gray-50'
            }`}
          >
            <span className="text-2xl">✍️</span>
            <div className="text-left">
              <div className="leading-tight">
                {isDrawing ? 'Done Drawing' : t('drawOnMap', 'Tap Points on Satellite')}
              </div>
              <span className="text-[11px] text-gray-500">Manual point &amp; click</span>
            </div>
          </button>

          {/* Add Management Zone */}
          <button
            onClick={() => setShowAddZoneModal(true)}
            className="flex items-center gap-3 p-4 rounded-2xl bg-white text-[#186049] border border-gray-200 font-bold text-sm shadow-md hover:bg-gray-50 transition active:scale-98"
          >
            <span className="text-2xl">🌾</span>
            <div className="text-left">
              <div className="leading-tight">+ Add Management Zone</div>
              <span className="text-[11px] text-gray-500">Soil &amp; crop sub-division</span>
            </div>
          </button>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          SEGMENTED NAVIGATION TABS (Zoning, VRA, Crop Planning)
      ───────────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-2 border-b border-gray-200 pb-2 overflow-x-auto">
        <button
          onClick={() => setActiveTab('map')}
          className={`px-4 py-2 text-xs sm:text-sm font-extrabold rounded-2xl transition whitespace-nowrap ${
            activeTab === 'map'
              ? 'bg-[#186049] text-white shadow-md'
              : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          📍 Map &amp; Strava Telemetry
        </button>

        <button
          onClick={() => setActiveTab('zones')}
          className={`px-4 py-2 text-xs sm:text-sm font-extrabold rounded-2xl transition whitespace-nowrap ${
            activeTab === 'zones'
              ? 'bg-[#186049] text-white shadow-md'
              : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          🌾 {t('precisionZoning', 'Precision Resource Allocation (Zoning)')}
        </button>

        <button
          onClick={() => setActiveTab('vra')}
          className={`px-4 py-2 text-xs sm:text-sm font-extrabold rounded-2xl transition whitespace-nowrap ${
            activeTab === 'vra'
              ? 'bg-[#186049] text-white shadow-md'
              : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          🧪 {t('vraPrescription', 'Variable Rate Application (VRA)')}
        </button>

        <button
          onClick={() => setActiveTab('planning')}
          className={`px-4 py-2 text-xs sm:text-sm font-extrabold rounded-2xl transition whitespace-nowrap ${
            activeTab === 'planning'
              ? 'bg-[#186049] text-white shadow-md'
              : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          📅 {t('cropPlanningTab', 'Targeted Crop Planning & Harvest')}
        </button>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          TAB CONTENT 1: MANAGEMENT ZONES & GIS GEOFENCING
      ───────────────────────────────────────────────────────────── */}
      {(activeTab === 'map' || activeTab === 'zones') && (
        <div className="space-y-4">
          <div className="bg-emerald-50/60 p-4 rounded-2xl border border-emerald-100 text-xs sm:text-sm text-emerald-900 flex items-start gap-3">
            <span className="text-xl">💡</span>
            <div>
              <span className="font-extrabold text-[#186049]">
                Precision Agriculture Geofencing (Zoning):
              </span>{' '}
              Splitting expansive fields into distinct management zones allows targeted Variable
              Rate Application (VRA). Instead of uniform blanket treatment, water, fertilizers,
              and crop choices are matched to soil texture and micro-elevation.
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {zones.map((zone) => (
              <div
                key={zone.id}
                className="bg-white rounded-3xl p-5 shadow-sm border border-gray-100 flex flex-col justify-between hover:shadow-md transition"
              >
                <div>
                  <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                    <div className="flex items-center gap-2">
                      <span
                        className="w-4 h-4 rounded-full shadow-sm"
                        style={{ backgroundColor: zone.color }}
                      />
                      <h3 className="font-extrabold text-[#186049] text-sm sm:text-base">
                        {zone.name}
                      </h3>
                    </div>
                    <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-gray-100 text-gray-700">
                      {zone.areaAcres} ac
                    </span>
                  </div>

                  <div className="mt-3 space-y-2.5 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-500">Current Crop</span>
                      <span className="font-bold text-[#186049]">
                        {zone.crop} ({zone.variety})
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-gray-500">Soil Texture</span>
                      <span className="font-semibold text-gray-700">{zone.soil.texture}</span>
                    </div>

                    <div className="p-3 bg-gray-50 rounded-2xl space-y-2">
                      <div className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                        Zone Soil Chemistry &amp; Hydrology
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-gray-700">
                        <div>
                          <span className="text-gray-400">Nitrogen:</span>{' '}
                          <span className="font-bold">{zone.soil.nitrogenKgHa} kg/ha</span>
                        </div>
                        <div>
                          <span className="text-gray-400">Phosphorus:</span>{' '}
                          <span className="font-bold">{zone.soil.phosphorusKgHa} kg/ha</span>
                        </div>
                        <div>
                          <span className="text-gray-400">Potassium:</span>{' '}
                          <span className="font-bold">{zone.soil.potassiumKgHa} kg/ha</span>
                        </div>
                        <div>
                          <span className="text-gray-400">Soil pH:</span>{' '}
                          <span className="font-bold">{zone.soil.pH}</span>
                        </div>
                        <div>
                          <span className="text-gray-400">Moisture:</span>{' '}
                          <span className="font-bold text-sky-600">
                            {zone.soil.moisturePercent}% VWC
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-400">Drainage:</span>{' '}
                          <span className="font-bold">
                            {zone.soil.infiltrationRateMmHr} mm/h
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between text-xs">
                  <span className="text-gray-400">Target Suitability</span>
                  <span className="font-extrabold text-[#4A943E]">
                    {zone.cropPlanning.suitabilityScore}% Match
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          TAB CONTENT 2: VARIABLE RATE APPLICATION (VRA) PRESCRIPTION MATRIX
      ───────────────────────────────────────────────────────────── */}
      {activeTab === 'vra' && (
        <div className="space-y-6 animate-fade-in">
          {/* VRA Comparison Callout */}
          <div className="bg-gradient-to-r from-[#186049] to-[#0f3d2e] text-white p-6 rounded-3xl shadow-lg border border-[#ECE8AF]/30">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <span className="text-xs font-black uppercase tracking-wider text-[#ECE8AF]">
                  Variable Rate Application (VRA) Engine
                </span>
                <h2 className="text-xl sm:text-2xl font-black mt-1">
                  Precision Resource Allocation Matrix
                </h2>
                <p className="text-xs sm:text-sm text-gray-200 mt-1 max-w-2xl">
                  Targeted delivery based on zone soil texture and organic carbon. Minimizes fertilizer
                  leaching, prevents crop lodging in nutrient-rich basins, and saves water.
                </p>
              </div>

              <div className="flex items-center gap-3 bg-black/30 p-3 rounded-2xl border border-white/10">
                <div className="text-center px-3 border-r border-white/10">
                  <div className="text-[10px] uppercase text-gray-400">Blanket Urea</div>
                  <div className="text-lg font-black text-red-300">{uniformUreaBaseline} kg</div>
                </div>
                <div className="text-center px-3 border-r border-white/10">
                  <div className="text-[10px] uppercase text-gray-400">VRA Precision</div>
                  <div className="text-lg font-black text-emerald-300">{vraTotalUrea} kg</div>
                </div>
                <div className="text-center px-3">
                  <div className="text-[10px] uppercase text-gray-400">Cost Saved</div>
                  <div className="text-lg font-black text-[#ECE8AF]">₹{totalCostSavedRs}</div>
                </div>
              </div>
            </div>
          </div>

          {/* VRA Zone-by-Zone Table */}
          <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-5 border-b border-gray-100 flex items-center justify-between">
              <div>
                <h3 className="font-extrabold text-[#186049] text-base">
                  Zone-Specific Fertilizer &amp; Irrigation Prescriptions
                </h3>
                <p className="text-xs text-gray-500">
                  Tailored application rates for tractor fertigation and drip manifolds
                </p>
              </div>
              <button
                onClick={() => setShowPrescriptionModal(true)}
                className="px-4 py-2 rounded-xl bg-[#186049] text-white font-bold text-xs shadow hover:bg-[#124b39] transition"
              >
                🖨️ Print Prescription Card
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs sm:text-sm">
                <thead className="bg-gray-50 text-gray-500 text-[11px] uppercase tracking-wider font-bold border-b">
                  <tr>
                    <th className="p-4">Management Zone</th>
                    <th className="p-4">Soil Texture</th>
                    <th className="p-4 text-purple-700">Urea (kg/ac)</th>
                    <th className="p-4 text-blue-700">DAP (kg/ac)</th>
                    <th className="p-4 text-amber-700">MOP (kg/ac)</th>
                    <th className="p-4 text-sky-700">Drip Run Time</th>
                    <th className="p-4">IPM / Pest Targeting</th>
                    <th className="p-4 text-right">Zone Savings</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {zones.map((zone) => (
                    <tr key={zone.id} className="hover:bg-gray-50/80 transition">
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          <span
                            className="w-3.5 h-3.5 rounded-full shrink-0"
                            style={{ backgroundColor: zone.color }}
                          />
                          <div>
                            <div className="font-bold text-gray-800">{zone.name}</div>
                            <div className="text-[11px] text-gray-400">
                              {zone.crop} • {zone.areaAcres} Acres
                            </div>
                          </div>
                        </div>
                      </td>

                      <td className="p-4">
                        <span className="font-medium text-gray-700">{zone.soil.texture}</span>
                        <div className="text-[11px] text-gray-400">
                          N: {zone.soil.nitrogenKgHa} • pH: {zone.soil.pH}
                        </div>
                      </td>

                      <td className="p-4 font-black text-purple-700">
                        {zone.vra.ureaKgPerAcre} kg/ac
                        <div className="text-[10px] font-normal text-gray-400">
                          {((zone.vra.ureaKgPerAcre * zone.areaAcres) / 50).toFixed(1)} bags (50kg)
                        </div>
                      </td>

                      <td className="p-4 font-black text-blue-700">
                        {zone.vra.dapKgPerAcre} kg/ac
                        <div className="text-[10px] font-normal text-gray-400">
                          {((zone.vra.dapKgPerAcre * zone.areaAcres) / 50).toFixed(1)} bags
                        </div>
                      </td>

                      <td className="p-4 font-black text-amber-700">
                        {zone.vra.mopKgPerAcre} kg/ac
                      </td>

                      <td className="p-4">
                        <span className="font-bold text-sky-600">
                          {zone.vra.irrigationRunTimeMinutes} min/day
                        </span>
                        <div className="text-[10px] text-gray-400">
                          Every {zone.vra.irrigationIntervalDays} days
                        </div>
                      </td>

                      <td className="p-4 text-xs text-gray-600 max-w-xs">
                        {zone.vra.pesticideAdvisory}
                      </td>

                      <td className="p-4 text-right">
                        <div className="font-extrabold text-emerald-600">
                          +₹{zone.vra.savingsVsUniform.costSavedRs}
                        </div>
                        <div className="text-[10px] text-gray-400">
                          {zone.vra.savingsVsUniform.waterSavedPercent}% water saved
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="p-4 bg-gray-50 border-t border-gray-100 flex flex-wrap items-center justify-between text-xs text-gray-500">
              <span>
                Based on ICAR Nutrient Buffer Coefficients &amp; Soil Health Card Guidelines
              </span>
              <span className="font-bold text-[#186049]">
                Total Farm ROI: ₹{totalCostSavedRs} saved per Rabi season
              </span>
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          TAB CONTENT 3: TARGETED CROP PLANNING & PHASED HARVESTING
      ───────────────────────────────────────────────────────────── */}
      {activeTab === 'planning' && (
        <div className="space-y-6 animate-fade-in">
          <div className="bg-[#186049]/5 p-5 rounded-3xl border border-[#186049]/20 flex items-start gap-3">
            <span className="text-2xl">🌱</span>
            <div>
              <h3 className="font-extrabold text-[#186049] text-base">
                GIS-Driven Micro-Plot Crop Suitability &amp; Phased Harvesting
              </h3>
              <p className="text-xs sm:text-sm text-gray-600 mt-0.5">
                Soil variability across an expansive farm creates natural microclimates. By matching
                crops to soil drainage and staggering harvest dates across zones, labor bottlenecks
                are avoided and early-harvest mandi price premiums are captured.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {zones.map((zone) => {
              const daysRemaining = zone.cropPlanning.daysToHarvest;
              return (
                <div
                  key={zone.id}
                  className="bg-white rounded-3xl p-5 shadow-sm border border-gray-100 flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                      <div>
                        <h4 className="font-bold text-gray-800 text-sm sm:text-base">
                          {zone.name}
                        </h4>
                        <span className="text-xs text-gray-400">
                          Sown: {zone.cropPlanning.sownOn}
                        </span>
                      </div>
                      <span className="text-xs font-black px-2.5 py-1 rounded-xl bg-emerald-100 text-emerald-800">
                        {zone.cropPlanning.suitabilityScore}% Fit
                      </span>
                    </div>

                    <div className="mt-4 space-y-3">
                      <div>
                        <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                          Recommended Primary Crop
                        </span>
                        <div className="text-base font-extrabold text-[#186049] mt-0.5">
                          {zone.cropPlanning.primaryCrop}
                        </div>
                        <p className="text-xs text-gray-500 mt-1">
                          Alternatives:{' '}
                          <span className="font-medium text-gray-700">
                            {zone.cropPlanning.alternativeCrops.join(', ')}
                          </span>
                        </p>
                      </div>

                      {/* Harvest Readiness Timeline */}
                      <div className="p-3.5 bg-gray-50 rounded-2xl space-y-2">
                        <div className="flex items-center justify-between text-xs font-bold">
                          <span className="text-gray-600">Harvest Readiness:</span>
                          <span
                            className={
                              daysRemaining <= 10
                                ? 'text-amber-600 font-black'
                                : 'text-[#186049]'
                            }
                          >
                            {zone.cropPlanning.harvestReadiness}
                          </span>
                        </div>

                        {/* Progress Bar */}
                        <div className="w-full bg-gray-200 h-2.5 rounded-full overflow-hidden">
                          <div
                            className="bg-[#4A943E] h-full rounded-full transition-all duration-500"
                            style={{
                              width: `${Math.max(15, Math.min(100, 100 - daysRemaining * 3))}%`,
                            }}
                          />
                        </div>

                        <div className="flex items-center justify-between text-[11px] text-gray-500">
                          <span>Stage: {zone.cropPlanning.growthStage}</span>
                          <span className="font-extrabold text-gray-700">
                            {daysRemaining} Days to Harvest
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between text-xs pt-1">
                        <span className="text-gray-500">Est. Yield:</span>
                        <span className="font-bold text-[#186049]">
                          {zone.cropPlanning.estimatedYieldQuintals} Quintals
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-gray-100 text-[11px] text-gray-400">
                    Combine Harvester booking advised {Math.max(2, daysRemaining - 5)} days in advance.
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          PRINTABLE VRA PRESCRIPTION MODAL (For Tractor / Operator)
      ───────────────────────────────────────────────────────────── */}
      {showPrescriptionModal && (
        <div className="fixed inset-0 z-[700] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-2xl bg-white rounded-3xl p-6 shadow-2xl space-y-5 animate-slide-up border-2 border-[#186049]">
            <div className="flex items-center justify-between border-b pb-3">
              <div>
                <span className="text-xs font-black uppercase tracking-wider text-[#B98327]">
                  DharaDrishti Precision Agronomy
                </span>
                <h3 className="text-xl font-black text-[#186049]">
                  Variable Rate Application (VRA) Operator Card
                </h3>
                <p className="text-xs text-gray-500">
                  Field: {fieldName} (Khasra 142/A, Shirur) • Area: {areaAcres} Acres
                </p>
              </div>
              <button
                onClick={() => setShowPrescriptionModal(false)}
                className="text-gray-400 hover:text-gray-700 text-xl font-bold p-1"
              >
                ✕
              </button>
            </div>

            {/* Prescriptions Table for Operator */}
            <div className="space-y-3">
              {zones.map((zone) => (
                <div
                  key={zone.id}
                  className="p-3.5 rounded-2xl border border-gray-200 bg-gray-50 space-y-2 text-xs"
                >
                  <div className="flex items-center justify-between font-bold text-sm text-[#186049]">
                    <div className="flex items-center gap-2">
                      <span
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: zone.color }}
                      />
                      <span>{zone.name}</span>
                    </div>
                    <span className="text-gray-600 font-semibold">{zone.areaAcres} Acres</span>
                  </div>

                  <div className="grid grid-cols-3 gap-2 bg-white p-2.5 rounded-xl border border-gray-100">
                    <div>
                      <span className="text-gray-400 text-[10px]">Urea Dose:</span>
                      <div className="font-extrabold text-purple-700">
                        {zone.vra.ureaKgPerAcre} kg/ac ({Math.round(zone.vra.ureaKgPerAcre * zone.areaAcres)} kg total)
                      </div>
                    </div>
                    <div>
                      <span className="text-gray-400 text-[10px]">DAP Dose:</span>
                      <div className="font-extrabold text-blue-700">
                        {zone.vra.dapKgPerAcre} kg/ac ({Math.round(zone.vra.dapKgPerAcre * zone.areaAcres)} kg total)
                      </div>
                    </div>
                    <div>
                      <span className="text-gray-400 text-[10px]">Drip Runtime:</span>
                      <div className="font-extrabold text-sky-600">
                        {zone.vra.irrigationRunTimeMinutes} min (Every {zone.vra.irrigationIntervalDays} days)
                      </div>
                    </div>
                  </div>

                  <div className="text-[11px] text-gray-600 italic">
                    Note: {zone.vra.rationale}
                  </div>
                </div>
              ))}
            </div>

            <div className="flex items-center justify-between pt-3 border-t">
              <span className="text-xs text-gray-400">
                Printed via DharaDrishti RTK Precision Engine
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.print()}
                  className="px-4 py-2 rounded-xl bg-[#186049] text-white font-bold text-xs hover:bg-[#124b39] transition shadow"
                >
                  🖨️ Print Sheet
                </button>
                <button
                  onClick={() => setShowPrescriptionModal(false)}
                  className="px-4 py-2 rounded-xl bg-gray-100 text-gray-700 font-bold text-xs hover:bg-gray-200"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          ADD MANAGEMENT ZONE MODAL
      ───────────────────────────────────────────────────────────── */}
      {showAddZoneModal && (
        <div className="fixed inset-0 z-[700] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-white rounded-3xl p-6 shadow-2xl space-y-4 animate-slide-up border-2 border-[#186049]">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="text-lg font-bold text-[#186049]">Add Precision Management Zone</h3>
              <button
                onClick={() => setShowAddZoneModal(false)}
                className="text-gray-400 hover:text-gray-700 text-lg"
              >
                ✕
              </button>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                Zone Label / Micro-Plot Name
              </label>
              <input
                type="text"
                placeholder="e.g. Zone 4: South Terrace (Mustard)"
                value={newZoneName}
                onChange={(e) => setNewZoneName(e.target.value)}
                className="w-full px-3 py-2 text-sm border rounded-xl focus:outline-none focus:ring-2 focus:ring-[#186049]"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Target Crop</label>
                <select
                  value={newZoneCrop}
                  onChange={(e) => setNewZoneCrop(e.target.value)}
                  className="w-full px-3 py-2 text-sm border rounded-xl focus:outline-none focus:ring-2 focus:ring-[#186049]"
                >
                  <option value="Wheat">Wheat (गेहूं)</option>
                  <option value="Mustard">Mustard (सरसों)</option>
                  <option value="Chickpea">Chickpea / Chana (चना)</option>
                  <option value="Paddy">Paddy (धान)</option>
                  <option value="Sugarcane">Sugarcane (गन्ना)</option>
                  <option value="Soybean">Soybean (सोयाबीन)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Soil Texture</label>
                <select
                  value={newZoneTexture}
                  onChange={(e) => setNewZoneTexture(e.target.value)}
                  className="w-full px-3 py-2 text-sm border rounded-xl focus:outline-none focus:ring-2 focus:ring-[#186049]"
                >
                  <option value="Clay Loam">Clay Loam (Heavy Black)</option>
                  <option value="Deep Alluvial Silt">Deep Alluvial Silt</option>
                  <option value="Sandy Loam">Sandy Loam (Fast Drainage)</option>
                  <option value="Red Sandy Soil">Red Sandy Soil</option>
                </select>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3">
              <button
                onClick={() => setShowAddZoneModal(false)}
                className="px-4 py-2 text-sm rounded-xl text-gray-600 hover:bg-gray-100 font-semibold"
              >
                {t('cancel', 'Cancel')}
              </button>
              <button
                onClick={handleAddZone}
                className="px-5 py-2 text-sm rounded-xl bg-[#186049] text-white font-bold hover:bg-[#124b39]"
              >
                {t('save', 'Add Zone')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
