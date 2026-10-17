'use client';

import React, { useState, useEffect, useCallback } from 'react';
import dynamic from 'next/dynamic';
import confetti from 'canvas-confetti';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import { useVoice } from '@/lib/voice/VoiceContext';
import { PRIMARY_FIELD, SubPlot } from '@/lib/data/mockData';
import { calculateArea } from '@/lib/geo/geoUtils';

// Dynamically import MapComponent to prevent SSR window issues
const MapComponent = dynamic(() => import('@/components/map/MapComponent'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-[480px] rounded-2xl bg-[#ECE8AF]/30 animate-pulse flex items-center justify-center text-[#186049] font-bold">
      🗺️ Loading Satellite Geo-fencing Map...
    </div>
  ),
});

export default function FieldsPage() {
  const { t, language } = useLanguage();
  const { speak, registerActionHandler } = useVoice();

  const [boundary, setBoundary] = useState<[number, number][]>(PRIMARY_FIELD.boundary);
  const [areaAcres, setAreaAcres] = useState<number>(PRIMARY_FIELD.totalAreaAcres);
  const [subPlots, setSubPlots] = useState<SubPlot[]>(PRIMARY_FIELD.subPlots);
  const [isTracking, setIsTracking] = useState(false);
  const [isDrawing, setIsDrawing] = useState(false);
  const [showAddSubareaModal, setShowAddSubareaModal] = useState(false);
  const [newSubName, setNewSubName] = useState('');
  const [newSubCrop, setNewSubCrop] = useState('Wheat');
  const [newSubColor, setNewSubColor] = useState('#4A943E');
  const [statusMessage, setStatusMessage] = useState('');

  // Start Walking GPS
  const handleStartWalking = useCallback(() => {
    setIsDrawing(false);
    setIsTracking(true);
    setStatusMessage(t('walkingActive', 'Tracking live steps... Walk along the field boundary'));
    speak(
      language === 'hi'
        ? 'जीपीएस ट्रैकिंग शुरू हो गई है। खेत की मेड़ के साथ-साथ चलें।'
        : 'GPS tracking active. Walk along the edge of your field.'
    );
  }, [language, speak, t]);

  // Stop Walking GPS
  const handleStopWalking = useCallback(() => {
    setIsTracking(false);
    const calculated = calculateArea(boundary);
    setAreaAcres(calculated > 0 ? calculated : PRIMARY_FIELD.totalAreaAcres);
    confetti({ particleCount: 70, spread: 60, origin: { y: 0.6 } });

    const msg =
      language === 'hi'
        ? `सीमा पूरी हो गई! कुल क्षेत्रफल ${calculated.toFixed(2)} एकड़ दर्ज हुआ।`
        : `Boundary closed! Field area calculated as ${calculated.toFixed(2)} acres.`;
    setStatusMessage(msg);
    speak(msg);
  }, [boundary, language, speak]);

  // Toggle Draw Mode
  const handleToggleDraw = useCallback(() => {
    setIsTracking(false);
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

  // Save Field Action
  const handleSaveField = useCallback(() => {
    confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
    const successMsg =
      language === 'hi'
        ? `खेत की सीमा और ${subPlots.length} हिस्से सफलतापूर्वक सुरक्षित हो गए!`
        : `Field boundary and ${subPlots.length} crop sub-plots saved successfully!`;
    setStatusMessage(successMsg);
    speak(successMsg);
  }, [language, speak, subPlots.length]);

  // Add new sub-area
  const handleAddSubPlot = () => {
    if (!newSubName.trim()) return;

    // Generate a default polygon inside the boundary
    const sampleCoords: [number, number][] = [
      [18.8255, 74.3725],
      [18.8270, 74.3732],
      [18.8262, 74.3745],
    ];

    const newSub: SubPlot = {
      id: `sub-${Date.now()}`,
      name: newSubName,
      crop: newSubCrop,
      variety: 'Hybrid F1',
      areaAcres: 1.2,
      sownOn: new Date().toISOString().split('T')[0],
      color: newSubColor,
      polygon: sampleCoords,
    };

    setSubPlots((prev) => [...prev, newSub]);
    setShowAddSubareaModal(false);
    setNewSubName('');

    speak(
      language === 'hi'
        ? `नया हिस्सा ${newSubCrop} का खेत में जोड़ दिया गया है।`
        : `New ${newSubCrop} plot added to your farm.`
    );
  };

  // Register Voice Commands for this Page
  useEffect(() => {
    const unregister = registerActionHandler((spoken: string) => {
      if (
        spoken.includes('start walk') ||
        spoken.includes('walk') ||
        spoken.includes('चलना शुरू') ||
        spoken.includes('नापो') ||
        spoken.includes('ਤੁਰਨਾ ਸ਼ੁਰੂ')
      ) {
        handleStartWalking();
        return true;
      }
      if (
        spoken.includes('stop walk') ||
        spoken.includes('finish') ||
        spoken.includes('बंद करो') ||
        spoken.includes('रोको') ||
        spoken.includes('ਹੱਦ ਬੰਦ')
      ) {
        handleStopWalking();
        return true;
      }
      if (
        spoken.includes('draw') ||
        spoken.includes('नक्शे') ||
        spoken.includes('बिंदु') ||
        spoken.includes('मैप')
      ) {
        handleToggleDraw();
        return true;
      }
      if (
        spoken.includes('save') ||
        spoken.includes('सहेज') ||
        spoken.includes('ਸਾਂਭੋ')
      ) {
        handleSaveField();
        return true;
      }
      if (
        spoken.includes('add sub') ||
        spoken.includes('नया हिस्सा') ||
        spoken.includes('फसल जोड़ो')
      ) {
        setShowAddSubareaModal(true);
        speak(language === 'hi' ? 'फसल का नाम बताएं' : 'Please specify the crop name');
        return true;
      }
      return false;
    });

    return unregister;
  }, [handleSaveField, handleStartWalking, handleStopWalking, handleToggleDraw, language, registerActionHandler, speak]);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-5 rounded-3xl shadow-sm border border-gray-100">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-[#186049] uppercase tracking-wider">
            <span>🗺️ {PRIMARY_FIELD.village}</span>
            <span>•</span>
            <span>Khasra No: 142/A</span>
          </div>
          <h1 className="text-2xl font-black text-[#186049]">
            {t('geofenceTitle', 'Boundary & Crop Geo-fencing')}
          </h1>
          <p className="text-xs sm:text-sm text-gray-500 mt-0.5">
            Walk boundary with phone GPS or click satellite pins. Area computes automatically.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleSaveField}
            className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-[#4A943E] text-white font-extrabold text-sm shadow hover:bg-[#3d7d33] transition active:scale-95"
          >
            <span>💾</span>
            <span>{t('save', 'Save Field')}</span>
          </button>
        </div>
      </div>

      {/* Status banner */}
      {statusMessage && (
        <div className="rounded-2xl bg-[#ECE8AF] p-4 text-[#186049] text-sm font-bold border-l-4 border-[#B98327] flex items-center justify-between">
          <span>{statusMessage}</span>
          <button onClick={() => setStatusMessage('')} className="text-xs text-[#186049]/70">✕</button>
        </div>
      )}

      {/* Main Interactive Map Component */}
      <div className="space-y-3">
        <MapComponent
          boundary={boundary}
          subAreas={subPlots}
          isTracking={isTracking}
          isDrawing={isDrawing}
          onBoundaryUpdate={(coords, acres) => {
            setBoundary(coords);
            setAreaAcres(acres);
          }}
          height="520px"
        />

        {/* Big Touch-Friendly Geofencing Controls */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Start/Stop Walking GPS */}
          {!isTracking ? (
            <button
              onClick={handleStartWalking}
              className="flex items-center justify-center gap-2 py-4 px-4 rounded-2xl bg-[#186049] text-white font-bold text-sm shadow-md hover:bg-[#124b39] transition active:scale-98"
            >
              <span className="text-2xl">🚶</span>
              <div className="text-left">
                <div className="leading-tight">{t('startWalking', 'Start Walking GPS Boundary')}</div>
                <span className="text-[11px] text-[#ECE8AF]">Auto-logs border coordinates</span>
              </div>
            </button>
          ) : (
            <button
              onClick={handleStopWalking}
              className="flex items-center justify-center gap-2 py-4 px-4 rounded-2xl bg-[#B98327] text-white font-bold text-sm shadow-md hover:bg-[#9c6e20] transition active:scale-98 animate-pulse"
            >
              <span className="text-2xl">🛑</span>
              <div className="text-left">
                <div className="leading-tight">{t('stopWalking', 'Finish & Close Boundary')}</div>
                <span className="text-[11px] text-[#ECE8AF]">Lock polygon & calculate area</span>
              </div>
            </button>
          )}

          {/* Draw on Map Fallback */}
          <button
            onClick={handleToggleDraw}
            className={`flex items-center justify-center gap-2 py-4 px-4 rounded-2xl font-bold text-sm shadow-md transition active:scale-98 border ${
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
              <span className="text-[11px] text-gray-500">Manual point-and-click</span>
            </div>
          </button>

          {/* Add Subarea Button */}
          <button
            onClick={() => setShowAddSubareaModal(true)}
            className="flex items-center justify-center gap-2 py-4 px-4 rounded-2xl bg-white text-[#186049] border border-gray-200 font-bold text-sm shadow-md hover:bg-gray-50 transition active:scale-98"
          >
            <span className="text-2xl">🌾</span>
            <div className="text-left">
              <div className="leading-tight">{t('addSubarea', '+ Add Crop Sub-Plot')}</div>
              <span className="text-[11px] text-gray-500">Divide Wheat, Mustard, etc.</span>
            </div>
          </button>
        </div>
      </div>

      {/* Field Details & Sub-areas List */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Total Area & Soil Card */}
        <div className="rounded-3xl bg-white p-5 shadow-sm border border-gray-100 space-y-4">
          <div className="border-b border-gray-100 pb-3">
            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">
              {t('calculatedArea', 'Total Field Area')}
            </span>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="text-4xl font-extrabold text-[#186049]">
                {areaAcres.toFixed(2)}
              </span>
              <span className="text-base text-gray-600 font-semibold">{t('acres', 'Acres')}</span>
            </div>
            <p className="text-xs text-gray-400 mt-1">
              Shoelace geodesic math • Accuracy: GPS Level 1
            </p>
          </div>

          <div>
            <h4 className="text-xs font-bold text-gray-600 uppercase tracking-wider mb-2">
              Soil Health Snapshot
            </h4>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="p-2.5 rounded-xl bg-gray-50">
                <span className="text-gray-400">Nitrogen (N)</span>
                <div className="font-bold text-[#186049]">215 kg/ha (Low)</div>
              </div>
              <div className="p-2.5 rounded-xl bg-gray-50">
                <span className="text-gray-400">Phosphorus (P)</span>
                <div className="font-bold text-[#186049]">19 kg/ha (Med)</div>
              </div>
              <div className="p-2.5 rounded-xl bg-gray-50">
                <span className="text-gray-400">Potassium (K)</span>
                <div className="font-bold text-[#186049]">295 kg/ha (High)</div>
              </div>
              <div className="p-2.5 rounded-xl bg-gray-50">
                <span className="text-gray-400">Soil pH</span>
                <div className="font-bold text-[#186049]">7.3 (Neutral)</div>
              </div>
            </div>
          </div>
        </div>

        {/* Sub-areas List */}
        <div className="md:col-span-2 rounded-3xl bg-white p-5 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between border-b border-gray-100 pb-3 mb-4">
            <div>
              <h3 className="font-extrabold text-base text-[#186049]">
                {t('subAreasTitle', 'Labelled Crop Sub-Plots')}
              </h3>
              <p className="text-xs text-gray-500">Each sub-plot gets independent water and profit tracking</p>
            </div>
            <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-[#186049]/10 text-[#186049]">
              {subPlots.length} Plots Defined
            </span>
          </div>

          <div className="space-y-3">
            {subPlots.map((plot) => (
              <div
                key={plot.id}
                className="flex items-center justify-between p-3.5 rounded-2xl bg-gray-50 border border-gray-100 hover:border-[#186049]/30 transition"
              >
                <div className="flex items-center gap-3">
                  <div
                    className="w-4 h-12 rounded-lg"
                    style={{ backgroundColor: plot.color }}
                  />
                  <div>
                    <h4 className="font-bold text-sm text-gray-800">{plot.name}</h4>
                    <p className="text-xs text-gray-500">
                      Crop: <span className="font-semibold text-[#186049]">{plot.crop}</span> • Variety: {plot.variety}
                    </p>
                    <span className="text-[11px] text-gray-400">Sown on: {plot.sownOn}</span>
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-base font-extrabold text-[#186049]">
                    {plot.areaAcres} Acres
                  </div>
                  <span className="text-xs text-gray-400">
                    {((plot.areaAcres / areaAcres) * 100).toFixed(0)}% of farm
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Add Subarea Modal */}
      {showAddSubareaModal && (
        <div className="fixed inset-0 z-[600] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-white rounded-3xl p-6 shadow-2xl space-y-4 animate-slide-up border-2 border-[#186049]">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="text-lg font-bold text-[#186049]">
                {t('addSubarea', 'Add Crop Sub-Plot')}
              </h3>
              <button
                onClick={() => setShowAddSubareaModal(false)}
                className="text-gray-400 hover:text-gray-700 text-lg"
              >
                ✕
              </button>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                Plot Label / Name
              </label>
              <input
                type="text"
                placeholder="e.g. Plot C (East) - Mustard"
                value={newSubName}
                onChange={(e) => setNewSubName(e.target.value)}
                className="w-full px-3 py-2 text-sm border rounded-xl focus:outline-none focus:ring-2 focus:ring-[#186049]"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Crop Type
                </label>
                <select
                  value={newSubCrop}
                  onChange={(e) => setNewSubCrop(e.target.value)}
                  className="w-full px-3 py-2 text-sm border rounded-xl focus:outline-none focus:ring-2 focus:ring-[#186049]"
                >
                  <option value="Wheat">Wheat (गेहूं)</option>
                  <option value="Mustard">Mustard (सरसों)</option>
                  <option value="Paddy">Paddy / Rice (धान)</option>
                  <option value="Cotton">Cotton (कपास)</option>
                  <option value="Sugarcane">Sugarcane (गन्ना)</option>
                  <option value="Soybean">Soybean (सोयाबीन)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Plot Color Tag
                </label>
                <select
                  value={newSubColor}
                  onChange={(e) => setNewSubColor(e.target.value)}
                  className="w-full px-3 py-2 text-sm border rounded-xl focus:outline-none focus:ring-2 focus:ring-[#186049]"
                >
                  <option value="#4A943E">Leaf Green (#4A943E)</option>
                  <option value="#B98327">Harvest Amber (#B98327)</option>
                  <option value="#186049">Forest Dark (#186049)</option>
                  <option value="#3B82F6">Blue (#3B82F6)</option>
                </select>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3">
              <button
                onClick={() => setShowAddSubareaModal(false)}
                className="px-4 py-2 text-sm rounded-xl text-gray-600 hover:bg-gray-100 font-semibold"
              >
                {t('cancel', 'Cancel')}
              </button>
              <button
                onClick={handleAddSubPlot}
                className="px-5 py-2 text-sm rounded-xl bg-[#186049] text-white font-bold hover:bg-[#124b39]"
              >
                {t('save', 'Add to Farm')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
