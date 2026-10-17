'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import type * as LType from 'leaflet';
import { calculateArea } from '@/lib/geo/geoUtils';

export interface MapPoint {
  lat: number;
  lng: number;
}

export interface MapSubArea {
  id: string;
  name: string;
  crop: string;
  color: string;
  polygon: [number, number][];
}

export interface MapPin {
  id: string;
  lat: number;
  lng: number;
  title: string;
  description: string;
  severity?: 'low' | 'medium' | 'high';
}

interface MapComponentProps {
  initialCenter?: [number, number];
  initialZoom?: number;
  boundary?: [number, number][];
  subAreas?: MapSubArea[];
  pins?: MapPin[];
  isTracking?: boolean;
  isDrawing?: boolean;
  onBoundaryUpdate?: (coords: [number, number][], areaAcres: number) => void;
  height?: string;
}

export default function MapComponent({
  initialCenter = [18.8252, 74.3721],
  initialZoom = 16,
  boundary = [],
  subAreas = [],
  pins = [],
  isTracking = false,
  isDrawing = false,
  onBoundaryUpdate,
  height = '500px',
}: MapComponentProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LType.Map | null>(null);
  const leafletRef = useRef<typeof LType | null>(null);

  // Layers refs
  const boundaryLayerRef = useRef<LType.Polygon | null>(null);
  const drawingMarkersRef = useRef<LType.CircleMarker[]>([]);
  const subAreasLayersRef = useRef<LType.Polygon[]>([]);
  const pinsLayersRef = useRef<LType.CircleMarker[]>([]);
  const userGpsMarkerRef = useRef<LType.CircleMarker | null>(null);
  const userGpsAccuracyCircleRef = useRef<LType.Circle | null>(null);
  const breadcrumbLineRef = useRef<LType.Polyline | null>(null);

  const [activePoints, setActivePoints] = useState<[number, number][]>(boundary);
  const [mapType, setMapType] = useState<'satellite' | 'street'>('satellite');
  const [gpsAccuracy, setGpsAccuracy] = useState<number | null>(null);
  const [liveLocation, setLiveLocation] = useState<[number, number] | null>(null);
  const trackingBreadcrumbs = useRef<[number, number][]>([]);

  // Calculate current area in acres
  const currentArea = calculateArea(activePoints);

  // Initialize Leaflet Map
  useEffect(() => {
    let isMounted = true;

    async function initMap() {
      if (typeof window === 'undefined' || !mapContainerRef.current || mapRef.current) return;

      const L = await import('leaflet');
      leafletRef.current = L;

      // Ensure CSS is present
      // Leaflet marker icons fix
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
        iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      });

      if (!isMounted || !mapContainerRef.current) return;

      const map = L.map(mapContainerRef.current, {
        center: initialCenter,
        zoom: initialZoom,
        zoomControl: false,
      });

      L.control.zoom({ position: 'topright' }).addTo(map);

      // Base tile layers
      const satelliteLayer = L.tileLayer(
        'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
        {
          attribution: '&copy; Esri & Earthstar Geographics',
          maxZoom: 19,
        }
      );

      const streetLayer = L.tileLayer(
        'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
        {
          attribution: '&copy; OpenStreetMap contributors',
          maxZoom: 19,
        }
      );

      // Set initial layer
      satelliteLayer.addTo(map);

      mapRef.current = map;

      // Handle map click for manual drawing mode
      map.on('click', (e: LType.LeafletMouseEvent) => {
        const { lat, lng } = e.latlng;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const target = (map as any)._isDrawingActive;
        if (target) {
          addDrawingPoint(lat, lng);
        }
      });
    }

    initMap();

    return () => {
      isMounted = false;
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Update map drawing flag
  useEffect(() => {
    if (mapRef.current) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (mapRef.current as any)._isDrawingActive = isDrawing;
    }
  }, [isDrawing]);

  // Toggle Satellite / Street
  const switchMapType = (type: 'satellite' | 'street') => {
    const map = mapRef.current;
    const L = leafletRef.current;
    if (!map || !L) return;

    map.eachLayer((layer) => {
      if (layer instanceof L.TileLayer) {
        map.removeLayer(layer);
      }
    });

    if (type === 'satellite') {
      L.tileLayer(
        'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
        { attribution: '&copy; Esri', maxZoom: 19 }
      ).addTo(map);
    } else {
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap',
        maxZoom: 19,
      }).addTo(map);
    }
    setMapType(type);
  };

  // Add drawing point callback
  const addDrawingPoint = useCallback(
    (lat: number, lng: number) => {
      const L = leafletRef.current;
      const map = mapRef.current;
      if (!L || !map) return;

      const newPoint: [number, number] = [lat, lng];
      setActivePoints((prev) => {
        const updated = [...prev, newPoint];
        const acres = calculateArea(updated);
        onBoundaryUpdate?.(updated, acres);
        return updated;
      });

      // Add pin at point
      const marker = L.circleMarker([lat, lng], {
        radius: 6,
        color: '#ECE8AF',
        fillColor: '#B98327',
        fillOpacity: 1,
        weight: 2,
      }).addTo(map);

      drawingMarkersRef.current.push(marker);
    },
    [onBoundaryUpdate]
  );

  // Render Boundary Polygon
  useEffect(() => {
    const L = leafletRef.current;
    const map = mapRef.current;
    if (!L || !map) return;

    if (boundaryLayerRef.current) {
      map.removeLayer(boundaryLayerRef.current);
      boundaryLayerRef.current = null;
    }

    if (activePoints.length >= 3) {
      const polygon = L.polygon(activePoints, {
        color: '#ECE8AF',
        fillColor: '#4A943E',
        fillOpacity: 0.35,
        weight: 3,
        dashArray: isDrawing ? '6, 6' : undefined,
      }).addTo(map);

      polygon.bindTooltip(
        `<b>Farm Area: ${currentArea.toFixed(2)} Acres</b><br/>Tap to inspect`,
        { permanent: false, direction: 'center' }
      );

      boundaryLayerRef.current = polygon;
      map.fitBounds(polygon.getBounds(), { padding: [30, 30] });
    }
  }, [activePoints, currentArea, isDrawing]);

  // Render Sub-Area Polygons (Wheat / Mustard plots)
  useEffect(() => {
    const L = leafletRef.current;
    const map = mapRef.current;
    if (!L || !map) return;

    // Clear old subarea layers
    subAreasLayersRef.current.forEach((layer) => map.removeLayer(layer));
    subAreasLayersRef.current = [];

    subAreas.forEach((sub) => {
      if (sub.polygon.length >= 3) {
        const poly = L.polygon(sub.polygon, {
          color: sub.color,
          fillColor: sub.color,
          fillOpacity: 0.45,
          weight: 2,
        }).addTo(map);

        const subAcres = calculateArea(sub.polygon);
        poly.bindTooltip(
          `<b>${sub.name}</b><br/>${sub.crop} (${subAcres.toFixed(1)} Acres)`,
          { permanent: true, direction: 'center', className: 'map-tooltip-clean' }
        );

        subAreasLayersRef.current.push(poly);
      }
    });
  }, [subAreas]);

  // Render Disease Pins
  useEffect(() => {
    const L = leafletRef.current;
    const map = mapRef.current;
    if (!L || !map) return;

    pinsLayersRef.current.forEach((m) => map.removeLayer(m));
    pinsLayersRef.current = [];

    pins.forEach((pin) => {
      const pinColor = pin.severity === 'high' ? '#DC2626' : pin.severity === 'medium' ? '#D97706' : '#16A34A';
      const marker = L.circleMarker([pin.lat, pin.lng], {
        radius: 8,
        color: '#FFFFFF',
        fillColor: pinColor,
        fillOpacity: 0.95,
        weight: 2,
      }).addTo(map);

      marker.bindPopup(
        `<div style="font-family: inherit; padding: 4px;">
          <h4 style="font-weight: 700; color: #186049; margin: 0 0 4px 0;">🔬 ${pin.title}</h4>
          <p style="margin: 0; font-size: 13px; color: #333;">${pin.description}</p>
        </div>`
      );

      pinsLayersRef.current.push(marker);
    });
  }, [pins]);

  // Handle GPS Walking Mode
  useEffect(() => {
    if (!isTracking) {
      if (breadcrumbLineRef.current && mapRef.current) {
        mapRef.current.removeLayer(breadcrumbLineRef.current);
        breadcrumbLineRef.current = null;
      }
      return;
    }

    if (typeof window === 'undefined' || !('geolocation' in navigator)) return;

    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        const accuracy = Math.round(pos.coords.accuracy);

        setGpsAccuracy(accuracy);
        setLiveLocation([lat, lng]);

        const L = leafletRef.current;
        const map = mapRef.current;
        if (!L || !map) return;

        // Update GPS dot
        if (userGpsMarkerRef.current) {
          userGpsMarkerRef.current.setLatLng([lat, lng]);
        } else {
          userGpsMarkerRef.current = L.circleMarker([lat, lng], {
            radius: 8,
            color: '#FFFFFF',
            fillColor: '#3B82F6', // Blue GPS dot
            fillOpacity: 1,
            weight: 3,
          }).addTo(map);
        }

        // Accuracy circle
        if (userGpsAccuracyCircleRef.current) {
          userGpsAccuracyCircleRef.current.setLatLng([lat, lng]);
          userGpsAccuracyCircleRef.current.setRadius(accuracy);
        } else {
          userGpsAccuracyCircleRef.current = L.circle([lat, lng], {
            radius: accuracy,
            color: '#3B82F6',
            fillColor: '#3B82F6',
            fillOpacity: 0.15,
            weight: 1,
          }).addTo(map);
        }

        // Only record points if accuracy is acceptable (< 15 meters)
        if (accuracy <= 25) {
          trackingBreadcrumbs.current.push([lat, lng]);
          setActivePoints([...trackingBreadcrumbs.current]);

          if (breadcrumbLineRef.current) {
            breadcrumbLineRef.current.setLatLngs(trackingBreadcrumbs.current);
          } else {
            breadcrumbLineRef.current = L.polyline(trackingBreadcrumbs.current, {
              color: '#ECE8AF',
              weight: 4,
            }).addTo(map);
          }
        }

        map.panTo([lat, lng]);
      },
      (err) => {
        console.warn('GPS Error:', err.message);
      },
      { enableHighAccuracy: true, maximumAge: 1000, timeout: 5000 }
    );

    return () => {
      navigator.geolocation.clearWatch(watchId);
    };
  }, [isTracking]);

  // Center on user
  const locateMe = () => {
    if (!navigator.geolocation || !mapRef.current) return;
    navigator.geolocation.getCurrentPosition((pos) => {
      const lat = pos.coords.latitude;
      const lng = pos.coords.longitude;
      mapRef.current?.flyTo([lat, lng], 18);
    });
  };

  // Clear boundary
  const handleClear = () => {
    const map = mapRef.current;
    drawingMarkersRef.current.forEach((m) => map?.removeLayer(m));
    drawingMarkersRef.current = [];
    trackingBreadcrumbs.current = [];
    setActivePoints([]);
    onBoundaryUpdate?.([], 0);
  };

  return (
    <div className="relative w-full rounded-2xl overflow-hidden border-2 border-[#186049]/20 shadow-lg bg-[#ECE8AF]/10">
      {/* Map Canvas */}
      <div ref={mapContainerRef} style={{ width: '100%', height }} className="z-0" />

      {/* Top Floating Control Bar */}
      <div className="absolute top-3 left-3 right-3 flex items-center justify-between pointer-events-none z-[400]">
        <div className="pointer-events-auto flex items-center gap-2 bg-[#186049]/90 backdrop-blur-md text-white px-3 py-1.5 rounded-xl shadow-md text-xs sm:text-sm font-semibold border border-[#ECE8AF]/30">
          <span className="w-2.5 h-2.5 rounded-full bg-[#4A943E] animate-pulse" />
          <span>Area: {currentArea > 0 ? `${currentArea.toFixed(2)} Acres` : '0.00 Acres'}</span>
          {gpsAccuracy !== null && (
            <span className="text-[#ECE8AF] text-xs">| GPS ±{gpsAccuracy}m</span>
          )}
        </div>

        {/* Layer Switcher & Locate Buttons */}
        <div className="pointer-events-auto flex items-center gap-1.5 bg-white/95 backdrop-blur-md p-1 rounded-xl shadow-md border border-[#186049]/20">
          <button
            onClick={() => switchMapType('satellite')}
            className={`px-2.5 py-1 text-xs rounded-lg font-medium transition ${
              mapType === 'satellite'
                ? 'bg-[#186049] text-white'
                : 'text-gray-700 hover:bg-gray-100'
            }`}
          >
            🛰️ Satellite
          </button>
          <button
            onClick={() => switchMapType('street')}
            className={`px-2.5 py-1 text-xs rounded-lg font-medium transition ${
              mapType === 'street'
                ? 'bg-[#186049] text-white'
                : 'text-gray-700 hover:bg-gray-100'
            }`}
          >
            🗺️ Map
          </button>
          <button
            onClick={locateMe}
            title="My GPS Location"
            className="p-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700"
          >
            📍
          </button>
        </div>
      </div>

      {/* Drawing / Walking Action Overlay */}
      {(isDrawing || isTracking) && (
        <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between bg-[#186049] text-white p-3 rounded-2xl shadow-xl z-[400] border border-[#ECE8AF]/30 animate-slide-up">
          <div className="flex items-center gap-2">
            <span className="text-xl animate-bounce">
              {isTracking ? '🚶' : '✍️'}
            </span>
            <div className="text-xs sm:text-sm">
              <div className="font-bold text-[#ECE8AF]">
                {isTracking ? 'GPS Boundary Walk Active' : 'Tap Satellite Map to Place Boundary Points'}
              </div>
              <div className="text-gray-200 text-xs">
                {activePoints.length} points placed ({currentArea.toFixed(2)} acres)
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleClear}
              className="px-3 py-1.5 text-xs bg-red-600/80 hover:bg-red-600 text-white rounded-xl transition font-semibold"
            >
              Clear
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
