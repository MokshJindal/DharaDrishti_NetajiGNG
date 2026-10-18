'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import type * as LType from 'leaflet';
import {
  calculateArea,
  distanceBetween,
  calculatePerimeter,
  convertLandUnits,
  isNearStartPoint,
  generateSimulatedWalkCoordinates,
} from '@/lib/geo/geoUtils';

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
  soil?: {
    texture?: string;
    moisturePercent?: number;
    nitrogenKgHa?: number;
    pH?: number;
  };
  vra?: {
    ureaKgPerAcre?: number;
    dapKgPerAcre?: number;
    irrigationRunTimeMinutes?: number;
  };
  cropPlanning?: {
    growthStage?: string;
    daysToHarvest?: number;
    harvestReadiness?: string;
  };
}

export interface MapPin {
  id: string;
  lat: number;
  lng: number;
  title: string;
  description: string;
  severity?: 'low' | 'medium' | 'high';
}

export type MapOverlayLayer = 'satellite' | 'street' | 'ndvi' | 'moisture' | 'vra';

interface MapComponentProps {
  initialCenter?: [number, number];
  initialZoom?: number;
  boundary?: [number, number][];
  subAreas?: MapSubArea[];
  pins?: MapPin[];
  isTracking?: boolean;
  isDrawing?: boolean;
  isSimulating?: boolean;
  activeLayer?: MapOverlayLayer;
  onLayerChange?: (layer: MapOverlayLayer) => void;
  onBoundaryUpdate?: (coords: [number, number][], areaAcres: number) => void;
  onFinishWalk?: () => void;
  onStatsUpdate?: (stats: {
    distanceMeters: number;
    elapsedSeconds: number;
    speedKmh: number;
    accuracyM: number;
    pointsCount: number;
    isNearStart: boolean;
  }) => void;
  selectedZoneId?: string;
  onSelectZone?: (id: string) => void;
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
  isSimulating = false,
  activeLayer = 'satellite',
  onLayerChange,
  onBoundaryUpdate,
  onFinishWalk,
  onStatsUpdate,
  selectedZoneId,
  onSelectZone,
  height = '540px',
}: MapComponentProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LType.Map | null>(null);
  const leafletRef = useRef<typeof LType | null>(null);

  // Layers refs
  const tileLayerRef = useRef<LType.TileLayer | null>(null);
  const boundaryLayerRef = useRef<LType.Polygon | null>(null);
  const drawingMarkersRef = useRef<LType.CircleMarker[]>([]);
  const subAreasLayersRef = useRef<LType.Polygon[]>([]);
  const overlayPolygonsRef = useRef<LType.Polygon[]>([]);
  const pinsLayersRef = useRef<LType.CircleMarker[]>([]);
  const userGpsMarkerRef = useRef<LType.CircleMarker | null>(null);
  const userGpsAccuracyCircleRef = useRef<LType.Circle | null>(null);
  const breadcrumbLineRef = useRef<LType.Polyline | null>(null);
  const startFlagMarkerRef = useRef<LType.Marker | null>(null);

  const [activePoints, setActivePoints] = useState<[number, number][]>(boundary);
  const [currentLayer, setCurrentLayer] = useState<MapOverlayLayer>(activeLayer);
  const [gpsAccuracy, setGpsAccuracy] = useState<number>(2.4);
  const [isNearStart, setIsNearStart] = useState<boolean>(false);

  // Strava HUD Telemetry
  const [distanceWalkedM, setDistanceWalkedM] = useState<number>(0);
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(0);
  const [speedKmh, setSpeedKmh] = useState<number>(0);
  const [simulationIndex, setSimulationIndex] = useState<number>(0);

  const trackingBreadcrumbs = useRef<[number, number][]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const simulationTimerRef = useRef<NodeJS.Timeout | null>(null);
  const simPointsRef = useRef<[number, number][]>([]);

  // Calculate current area in acres
  const currentArea = calculateArea(activePoints);
  const landUnits = convertLandUnits(currentArea > 0 ? currentArea : 4.8);
  const perimeterMeters = Math.round(calculatePerimeter(activePoints.length >= 3 ? activePoints : boundary));

  // Sync external activeLayer prop
  useEffect(() => {
    if (activeLayer && activeLayer !== currentLayer) {
      setCurrentLayer(activeLayer);
    }
  }, [activeLayer, currentLayer]);

  // Sync external boundary prop
  useEffect(() => {
    if (boundary && boundary.length > 0 && !isTracking && !isSimulating && !isDrawing) {
      setActivePoints(boundary);
    }
  }, [boundary, isTracking, isSimulating, isDrawing]);

  // Initialize Leaflet Map
  useEffect(() => {
    let isMounted = true;

    async function initMap() {
      if (typeof window === 'undefined' || !mapContainerRef.current || mapRef.current) return;

      const L = await import('leaflet');
      leafletRef.current = L;

      // Fix default icons
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

      // Base satellite layer
      const satLayer = L.tileLayer(
        'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
        {
          attribution: '&copy; Esri & Earthstar Geographics',
          maxZoom: 19,
        }
      );
      satLayer.addTo(map);
      tileLayerRef.current = satLayer;

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

  // Sync drawing flag with map
  useEffect(() => {
    if (mapRef.current) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (mapRef.current as any)._isDrawingActive = isDrawing;
    }
  }, [isDrawing]);

  // Handle Layer Switching (Satellite, Street, NDVI, Moisture, VRA)
  const switchLayer = useCallback(
    (layer: MapOverlayLayer) => {
      const map = mapRef.current;
      const L = leafletRef.current;
      if (!map || !L) return;

      setCurrentLayer(layer);
      onLayerChange?.(layer);

      // Remove current tile layer
      if (tileLayerRef.current) {
        map.removeLayer(tileLayerRef.current);
      }

      // Base tile logic
      if (layer === 'street') {
        const osm = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '&copy; OpenStreetMap',
          maxZoom: 19,
        }).addTo(map);
        tileLayerRef.current = osm;
      } else {
        // Satellite base for satellite, ndvi, moisture, and vra
        const sat = L.tileLayer(
          'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
          { attribution: '&copy; Esri', maxZoom: 19 }
        ).addTo(map);
        tileLayerRef.current = sat;
      }

      // Clear existing thematic overlay polygons
      overlayPolygonsRef.current.forEach((p) => map.removeLayer(p));
      overlayPolygonsRef.current = [];

      // Render thematic overlays if ndvi / moisture / vra
      if (layer === 'ndvi') {
        // Render NDVI Chlorophyll Heatmap for zones
        subAreas.forEach((sub, idx) => {
          if (sub.polygon.length >= 3) {
            // Zone 1: 0.82 (High green), Zone 2: 0.68 (Golden), Zone 3: 0.45 (Orange/Red)
            const ndviColors = ['#10B981', '#F59E0B', '#EF4444'];
            const ndviValues = [0.82, 0.68, 0.45];
            const color = ndviColors[idx % ndviColors.length];
            const ndviVal = ndviValues[idx % ndviValues.length];

            const poly = L.polygon(sub.polygon, {
              color: '#FFFFFF',
              fillColor: color,
              fillOpacity: 0.65,
              weight: 2,
            }).addTo(map);

            poly.bindTooltip(
              `<div style="font-size:12px; font-weight:700;">🌱 NDVI Index: ${ndviVal} (${ndviVal > 0.7 ? 'Healthy Vigor' : ndviVal > 0.5 ? 'Moderate Biomass' : 'Moisture Stressed'})<br/><span style="font-weight:400;">${sub.name}</span></div>`,
              { permanent: true, direction: 'center', className: 'map-tooltip-clean' }
            );

            overlayPolygonsRef.current.push(poly);
          }
        });
      } else if (layer === 'moisture') {
        // Render Soil Moisture Hydrology Map
        subAreas.forEach((sub, idx) => {
          if (sub.polygon.length >= 3) {
            const moistureColors = ['#0284C7', '#0D9488', '#D97706'];
            const moisturePct = [36, 28, 19];
            const color = moistureColors[idx % moistureColors.length];
            const pct = moisturePct[idx % moisturePct.length];

            const poly = L.polygon(sub.polygon, {
              color: '#38BDF8',
              fillColor: color,
              fillOpacity: 0.65,
              weight: 2,
            }).addTo(map);

            poly.bindTooltip(
              `<div style="font-size:12px; font-weight:700;">💧 Soil Moisture: ${pct}% VWC<br/><span style="font-weight:400;">${pct > 30 ? 'High Retention (Clay)' : pct > 25 ? 'Optimal Loam' : 'Porous Fast Drainage'}</span></div>`,
              { permanent: true, direction: 'center', className: 'map-tooltip-clean' }
            );

            overlayPolygonsRef.current.push(poly);
          }
        });
      } else if (layer === 'vra') {
        // Render Variable Rate Fertilizer Application Map
        subAreas.forEach((sub, idx) => {
          if (sub.polygon.length >= 3) {
            const vraColors = ['#3B82F6', '#10B981', '#8B5CF6'];
            const ureaDosages = [55, 28, 60];
            const color = vraColors[idx % vraColors.length];
            const urea = ureaDosages[idx % ureaDosages.length];

            const poly = L.polygon(sub.polygon, {
              color: '#ECE8AF',
              fillColor: color,
              fillOpacity: 0.6,
              weight: 2,
            }).addTo(map);

            poly.bindTooltip(
              `<div style="font-size:12px; font-weight:700;">🧪 VRA Dosage: ${urea} kg Urea/Acre<br/><span style="font-weight:400;">${sub.name} • DAP: 20-30 kg/ac</span></div>`,
              { permanent: true, direction: 'center', className: 'map-tooltip-clean' }
            );

            overlayPolygonsRef.current.push(poly);
          }
        });
      }
    },
    [onLayerChange, subAreas]
  );

  // Trigger layer switch when prop changes or mounts
  useEffect(() => {
    switchLayer(currentLayer);
  }, [currentLayer, switchLayer]);

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

    if (activePoints.length >= 3 && currentLayer !== 'ndvi' && currentLayer !== 'moisture' && currentLayer !== 'vra') {
      const polygon = L.polygon(activePoints, {
        color: '#ECE8AF',
        fillColor: '#4A943E',
        fillOpacity: 0.35,
        weight: 3,
        dashArray: isDrawing ? '6, 6' : undefined,
      }).addTo(map);

      polygon.bindTooltip(
        `<b>Farm Area: ${currentArea.toFixed(2)} Acres</b><br/>Perimeter: ${perimeterMeters} m`,
        { permanent: false, direction: 'center' }
      );

      boundaryLayerRef.current = polygon;
      map.fitBounds(polygon.getBounds(), { padding: [40, 40] });
    }
  }, [activePoints, currentArea, currentLayer, isDrawing, perimeterMeters]);

  // Render Sub-Area Polygons (Wheat / Mustard / Chickpea zones)
  useEffect(() => {
    const L = leafletRef.current;
    const map = mapRef.current;
    if (!L || !map) return;

    subAreasLayersRef.current.forEach((layer) => map.removeLayer(layer));
    subAreasLayersRef.current = [];

    // Only render default sub-areas if not showing special overlay layers (which have their own visual style)
    if (currentLayer === 'satellite' || currentLayer === 'street') {
      subAreas.forEach((sub) => {
        if (sub.polygon.length >= 3) {
          const isSelected = selectedZoneId === sub.id;
          const poly = L.polygon(sub.polygon, {
            color: isSelected ? '#F59E0B' : sub.color,
            fillColor: isSelected ? '#F59E0B' : sub.color,
            fillOpacity: isSelected ? 0.65 : 0.40,
            weight: isSelected ? 4 : 2,
          }).addTo(map);

          poly.on('click', () => {
            onSelectZone?.(sub.id);
          });

          const subAcres = calculateArea(sub.polygon);
          poly.bindTooltip(
            `<b>${sub.name}</b><br/>${sub.crop} (${subAcres.toFixed(1)} ac • ${sub.soil?.texture || 'Loam'})${isSelected ? ' <span style="color:#ECE8AF;">● Selected</span>' : ''}`,
            { permanent: true, direction: 'center', className: 'map-tooltip-clean' }
          );

          subAreasLayersRef.current.push(poly);
        }
      });
    }
  }, [currentLayer, onSelectZone, selectedZoneId, subAreas]);

  // Render Disease / Health Alert Pins
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

  // ─────────────────────────────────────────────────────────────
  // Strava GPS Walking Mode (Real Handheld GPS)
  // ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!isTracking) {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }

    // Start running stopwatch
    setElapsedSeconds(0);
    setDistanceWalkedM(0);
    setSpeedKmh(0);
    trackingBreadcrumbs.current = [];

    timerRef.current = setInterval(() => {
      setElapsedSeconds((prev) => prev + 1);
    }, 1000);

    if (typeof window === 'undefined' || !('geolocation' in navigator)) return;

    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        const accuracy = Math.round(pos.coords.accuracy);

        setGpsAccuracy(accuracy);

        const L = leafletRef.current;
        const map = mapRef.current;
        if (!L || !map) return;

        // Start point flag
        if (trackingBreadcrumbs.current.length === 0) {
          if (!startFlagMarkerRef.current) {
            const startIcon = L.divIcon({
              className: 'custom-start-flag',
              html: `<div style="background:#186049; color:#ECE8AF; border:2px solid #FFF; border-radius:50%; width:28px; height:28px; display:flex; align-items:center; justify-content:center; font-size:14px; box-shadow:0 2px 6px rgba(0,0,0,0.3);">🏁</div>`,
              iconSize: [28, 28],
              iconAnchor: [14, 14],
            });
            startFlagMarkerRef.current = L.marker([lat, lng], { icon: startIcon }).addTo(map);
          }
        }

        // Update GPS dot
        if (userGpsMarkerRef.current) {
          userGpsMarkerRef.current.setLatLng([lat, lng]);
        } else {
          userGpsMarkerRef.current = L.circleMarker([lat, lng], {
            radius: 8,
            color: '#FFFFFF',
            fillColor: '#3B82F6',
            fillOpacity: 1,
            weight: 3,
          }).addTo(map);
        }

        // Accuracy aura
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

        // Log point if acceptable accuracy
        if (accuracy <= 25) {
          const prevPoints = trackingBreadcrumbs.current;
          if (prevPoints.length > 0) {
            const last = prevPoints[prevPoints.length - 1];
            const dist = distanceBetween(last, [lat, lng]);
            if (dist > 1.5) {
              setDistanceWalkedM((prev) => {
                const updatedDist = prev + dist;
                setElapsedSeconds((sec) => {
                  if (sec > 0) {
                    const kmh = (updatedDist / 1000) / (sec / 3600);
                    setSpeedKmh(Number(kmh.toFixed(1)));
                  }
                  return sec;
                });
                return Math.round(updatedDist);
              });
              trackingBreadcrumbs.current.push([lat, lng]);
              setActivePoints([...trackingBreadcrumbs.current]);
            }
          } else {
            trackingBreadcrumbs.current.push([lat, lng]);
            setActivePoints([...trackingBreadcrumbs.current]);
          }

          // Check proximity to start point (> 3 points recorded)
          if (trackingBreadcrumbs.current.length >= 4) {
            const startPt = trackingBreadcrumbs.current[0];
            const near = isNearStartPoint([lat, lng], startPt, 15);
            setIsNearStart(near);
          }

          if (breadcrumbLineRef.current) {
            breadcrumbLineRef.current.setLatLngs(trackingBreadcrumbs.current);
          } else {
            breadcrumbLineRef.current = L.polyline(trackingBreadcrumbs.current, {
              color: '#38BDF8',
              weight: 5,
              opacity: 0.9,
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
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isTracking]);

  // ─────────────────────────────────────────────────────────────
  // Simulated Strava Walk Mode (For Demos & Evaluation)
  // ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!isSimulating) {
      if (simulationTimerRef.current) {
        clearInterval(simulationTimerRef.current);
        simulationTimerRef.current = null;
      }
      return;
    }

    const L = leafletRef.current;
    const map = mapRef.current;
    if (!L || !map) return;

    // Generate realistic boundary interpolation points
    const baseBoundary: [number, number][] =
      boundary.length >= 3
        ? boundary
        : [
            [18.8252, 74.3721],
            [18.8278, 74.3735],
            [18.8265, 74.3768],
            [18.8239, 74.3752],
          ];

    const simulatedCoords = generateSimulatedWalkCoordinates(baseBoundary, 9);
    simPointsRef.current = simulatedCoords;
    setSimulationIndex(0);
    setElapsedSeconds(0);
    setDistanceWalkedM(0);
    setSpeedKmh(4.2);
    setGpsAccuracy(1.8);
    setIsNearStart(false);
    trackingBreadcrumbs.current = [];
    setActivePoints([]);

    // Clear previous breadcrumbs
    if (breadcrumbLineRef.current) {
      map.removeLayer(breadcrumbLineRef.current);
      breadcrumbLineRef.current = null;
    }
    if (startFlagMarkerRef.current) {
      map.removeLayer(startFlagMarkerRef.current);
      startFlagMarkerRef.current = null;
    }

    // Set start flag at coordinate 0
    const startPt = simulatedCoords[0];
    const startIcon = L.divIcon({
      className: 'custom-start-flag',
      html: `<div style="background:#186049; color:#ECE8AF; border:2px solid #FFF; border-radius:50%; width:30px; height:30px; display:flex; align-items:center; justify-content:center; font-size:16px; font-weight:bold; box-shadow:0 3px 8px rgba(0,0,0,0.4);">🏁</div>`,
      iconSize: [30, 30],
      iconAnchor: [15, 15],
    });
    startFlagMarkerRef.current = L.marker(startPt, { icon: startIcon }).addTo(map);

    let idx = 0;
    let distAcc = 0;

    simulationTimerRef.current = setInterval(() => {
      idx++;
      if (idx >= simPointsRef.current.length) {
        if (simulationTimerRef.current) clearInterval(simulationTimerRef.current);
        setIsNearStart(true);
        // Auto-close and trigger completion
        onFinishWalk?.();
        return;
      }

      setSimulationIndex(idx);
      setElapsedSeconds((sec) => sec + 2);

      const pt = simPointsRef.current[idx];
      const prevPt = simPointsRef.current[idx - 1];
      const stepDist = distanceBetween(prevPt, pt);
      distAcc += stepDist;
      setDistanceWalkedM(Math.round(distAcc));
      setSpeedKmh(4.1 + (Math.random() * 0.4 - 0.2));

      trackingBreadcrumbs.current.push(pt);
      setActivePoints([...trackingBreadcrumbs.current]);

      // Update GPS dot
      if (userGpsMarkerRef.current) {
        userGpsMarkerRef.current.setLatLng(pt);
      } else {
        userGpsMarkerRef.current = L.circleMarker(pt, {
          radius: 9,
          color: '#FFFFFF',
          fillColor: '#38BDF8',
          fillOpacity: 1,
          weight: 3,
        }).addTo(map);
      }

      // Accuracy circle
      if (userGpsAccuracyCircleRef.current) {
        userGpsAccuracyCircleRef.current.setLatLng(pt);
        userGpsAccuracyCircleRef.current.setRadius(2);
      } else {
        userGpsAccuracyCircleRef.current = L.circle(pt, {
          radius: 2,
          color: '#38BDF8',
          fillColor: '#38BDF8',
          fillOpacity: 0.2,
          weight: 1,
        }).addTo(map);
      }

      // Draw active breadcrumb line
      if (breadcrumbLineRef.current) {
        breadcrumbLineRef.current.setLatLngs(trackingBreadcrumbs.current);
      } else {
        breadcrumbLineRef.current = L.polyline(trackingBreadcrumbs.current, {
          color: '#38BDF8',
          weight: 5,
          opacity: 0.95,
        }).addTo(map);
      }

      // Check proximity to start
      if (idx > 10) {
        const near = isNearStartPoint(pt, startPt, 16);
        setIsNearStart(near);
      }

      map.panTo(pt, { animate: true });
    }, 600);

    return () => {
      if (simulationTimerRef.current) {
        clearInterval(simulationTimerRef.current);
        simulationTimerRef.current = null;
      }
    };
  }, [boundary, isSimulating, onFinishWalk]);

  // Notify parent of telemetry updates
  useEffect(() => {
    if (isTracking || isSimulating) {
      onStatsUpdate?.({
        distanceMeters: distanceWalkedM,
        elapsedSeconds,
        speedKmh,
        accuracyM: gpsAccuracy,
        pointsCount: activePoints.length,
        isNearStart,
      });
    }
  }, [
    activePoints.length,
    distanceWalkedM,
    elapsedSeconds,
    gpsAccuracy,
    isNearStart,
    isSimulating,
    isTracking,
    onStatsUpdate,
    speedKmh,
  ]);

  // Center on user GPS
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
    if (breadcrumbLineRef.current && map) {
      map.removeLayer(breadcrumbLineRef.current);
      breadcrumbLineRef.current = null;
    }
    if (startFlagMarkerRef.current && map) {
      map.removeLayer(startFlagMarkerRef.current);
      startFlagMarkerRef.current = null;
    }
    setActivePoints([]);
    setDistanceWalkedM(0);
    setElapsedSeconds(0);
    setIsNearStart(false);
    onBoundaryUpdate?.([], 0);
  };

  // Format MM:SS
  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="relative w-full rounded-3xl overflow-hidden border-2 border-[#186049]/30 shadow-xl bg-gray-900">
      {/* Map Canvas */}
      <div ref={mapContainerRef} style={{ width: '100%', height }} className="z-0" />

      {/* ─────────────────────────────────────────────────────────────
          STRAVA-LIKE TELEMETRY HEADS-UP DISPLAY (HUD)
          Visible when tracking or simulating walk
      ───────────────────────────────────────────────────────────── */}
      {(isTracking || isSimulating) && (
        <div className="absolute top-4 left-4 right-4 sm:left-6 sm:right-auto z-[500] pointer-events-auto">
          <div className="bg-[#0f3d2e]/95 backdrop-blur-md text-white p-4 rounded-2xl shadow-2xl border border-[#ECE8AF]/40 w-full sm:w-[380px] animate-slide-up">
            {/* Strava Header with Live Pulse */}
            <div className="flex items-center justify-between border-b border-white/10 pb-2 mb-3">
              <div className="flex items-center gap-2">
                <span className="relative flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                </span>
                <span className="text-xs font-black uppercase tracking-wider text-[#ECE8AF]">
                  {isSimulating ? '🎮 Simulated Strava Walk' : '🏃 Live Strava Boundary Walk'}
                </span>
              </div>
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                ±{gpsAccuracy}m RTK Fix
              </span>
            </div>

            {/* Big Bold Telemetry Digits */}
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="p-2 rounded-xl bg-black/30 border border-white/5">
                <div className="text-[10px] uppercase font-bold text-gray-400">Distance</div>
                <div className="text-lg font-black text-white">
                  {distanceWalkedM >= 1000
                    ? `${(distanceWalkedM / 1000).toFixed(2)} km`
                    : `${distanceWalkedM} m`}
                </div>
              </div>

              <div className="p-2 rounded-xl bg-black/30 border border-white/5">
                <div className="text-[10px] uppercase font-bold text-gray-400">Duration</div>
                <div className="text-lg font-black text-[#ECE8AF]">
                  {formatTime(elapsedSeconds)}
                </div>
              </div>

              <div className="p-2 rounded-xl bg-black/30 border border-white/5">
                <div className="text-[10px] uppercase font-bold text-gray-400">Pace</div>
                <div className="text-lg font-black text-emerald-400">
                  {speedKmh.toFixed(1)} <span className="text-[10px] font-normal text-gray-300">km/h</span>
                </div>
              </div>
            </div>

            {/* Live Area and Land Unit Badges */}
            <div className="mt-3 pt-2 border-t border-white/10 flex items-center justify-between text-xs">
              <div className="text-gray-300">
                Live Area:{' '}
                <span className="font-extrabold text-[#ECE8AF]">
                  {currentArea > 0 ? `${currentArea.toFixed(2)} ac` : '0.00 ac'}
                </span>{' '}
                <span className="text-[10px] text-gray-400">({landUnits.bigha} Bigha)</span>
              </div>
              <div className="text-gray-400 text-[11px]">
                {activePoints.length} points logged
              </div>
            </div>

            {/* Proximity Auto-Snap Banner */}
            {isNearStart && (
              <div className="mt-3 p-2.5 rounded-xl bg-amber-500/20 border border-amber-400/50 flex items-center justify-between text-amber-300 text-xs font-bold animate-pulse">
                <span>🎯 Starting Ridge in Range (&lt;15m)!</span>
                <button
                  onClick={onFinishWalk}
                  className="px-2.5 py-1 bg-[#4A943E] hover:bg-[#3d7d33] text-white rounded-lg text-xs font-extrabold transition shadow"
                >
                  Snap &amp; Close
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          TOP RIGHT: SATELLITE & THEMATIC LAYER CONTROLLER
      ───────────────────────────────────────────────────────────── */}
      <div className="absolute top-4 right-4 z-[400] flex flex-col items-end gap-2">
        <div className="flex items-center gap-1 bg-[#186049]/90 backdrop-blur-md p-1.5 rounded-2xl shadow-xl border border-[#ECE8AF]/30">
          <button
            onClick={() => switchLayer('satellite')}
            className={`px-3 py-1.5 text-xs rounded-xl font-bold transition flex items-center gap-1 ${
              currentLayer === 'satellite'
                ? 'bg-[#ECE8AF] text-[#186049] shadow-md'
                : 'text-gray-200 hover:text-white hover:bg-white/10'
            }`}
          >
            <span>🛰️</span>
            <span>Satellite</span>
          </button>

          <button
            onClick={() => switchLayer('street')}
            className={`px-3 py-1.5 text-xs rounded-xl font-bold transition flex items-center gap-1 ${
              currentLayer === 'street'
                ? 'bg-[#ECE8AF] text-[#186049] shadow-md'
                : 'text-gray-200 hover:text-white hover:bg-white/10'
            }`}
          >
            <span>🗺️</span>
            <span>Cadastral</span>
          </button>

          <button
            onClick={() => switchLayer('ndvi')}
            title="Sentinel-2 Multispectral Vegetation Health Index"
            className={`px-3 py-1.5 text-xs rounded-xl font-bold transition flex items-center gap-1 ${
              currentLayer === 'ndvi'
                ? 'bg-emerald-500 text-white shadow-md'
                : 'text-gray-200 hover:text-white hover:bg-white/10'
            }`}
          >
            <span>🌱</span>
            <span>NDVI Vigor</span>
          </button>

          <button
            onClick={() => switchLayer('moisture')}
            title="Hydrology & Infiltration Heatmap"
            className={`px-3 py-1.5 text-xs rounded-xl font-bold transition flex items-center gap-1 ${
              currentLayer === 'moisture'
                ? 'bg-sky-500 text-white shadow-md'
                : 'text-gray-200 hover:text-white hover:bg-white/10'
            }`}
          >
            <span>💧</span>
            <span>Moisture</span>
          </button>

          <button
            onClick={() => switchLayer('vra')}
            title="Variable Rate Application Prescription Map"
            className={`px-3 py-1.5 text-xs rounded-xl font-bold transition flex items-center gap-1 ${
              currentLayer === 'vra'
                ? 'bg-purple-600 text-white shadow-md'
                : 'text-gray-200 hover:text-white hover:bg-white/10'
            }`}
          >
            <span>🧪</span>
            <span>VRA Map</span>
          </button>

          <button
            onClick={locateMe}
            title="My GPS Location"
            className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white transition ml-1"
          >
            📍
          </button>
        </div>

        {/* Legend for Active Thematic Layer */}
        {currentLayer === 'ndvi' && (
          <div className="bg-black/85 backdrop-blur-md text-white p-2.5 rounded-xl border border-emerald-500/30 text-[11px] shadow-lg flex items-center gap-3 animate-fade-in">
            <span className="font-bold text-emerald-400">NDVI Vigor:</span>
            <div className="flex items-center gap-1">
              <span className="w-3 h-3 rounded-full bg-[#10B981]" />
              <span>&gt;0.75 High</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="w-3 h-3 rounded-full bg-[#F59E0B]" />
              <span>0.50-0.70 Med</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="w-3 h-3 rounded-full bg-[#EF4444]" />
              <span>&lt;0.45 Stressed</span>
            </div>
          </div>
        )}

        {currentLayer === 'moisture' && (
          <div className="bg-black/85 backdrop-blur-md text-white p-2.5 rounded-xl border border-sky-500/30 text-[11px] shadow-lg flex items-center gap-3 animate-fade-in">
            <span className="font-bold text-sky-400">Hydrology:</span>
            <div className="flex items-center gap-1">
              <span className="w-3 h-3 rounded-full bg-[#0284C7]" />
              <span>36% Basin</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="w-3 h-3 rounded-full bg-[#0D9488]" />
              <span>28% Ridge</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="w-3 h-3 rounded-full bg-[#D97706]" />
              <span>19% Porous</span>
            </div>
          </div>
        )}

        {currentLayer === 'vra' && (
          <div className="bg-black/85 backdrop-blur-md text-white p-2.5 rounded-xl border border-purple-500/30 text-[11px] shadow-lg flex items-center gap-3 animate-fade-in">
            <span className="font-bold text-purple-300">VRA Dosage:</span>
            <div className="flex items-center gap-1">
              <span className="w-3 h-3 rounded-full bg-[#8B5CF6]" />
              <span>60 kg/ac (High N)</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="w-3 h-3 rounded-full bg-[#3B82F6]" />
              <span>55 kg/ac (Standard)</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="w-3 h-3 rounded-full bg-[#10B981]" />
              <span>28 kg/ac (Low N)</span>
            </div>
          </div>
        )}
      </div>

      {/* ─────────────────────────────────────────────────────────────
          BOTTOM STATUS & ACTION OVERLAY
      ───────────────────────────────────────────────────────────── */}
      {isDrawing && (
        <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between bg-[#186049] text-white p-3.5 rounded-2xl shadow-2xl z-[400] border border-[#ECE8AF]/30 animate-slide-up">
          <div className="flex items-center gap-3">
            <span className="text-2xl animate-bounce">✍️</span>
            <div>
              <div className="font-bold text-[#ECE8AF] text-sm">
                Manual Boundary Drawing Mode
              </div>
              <div className="text-xs text-gray-200">
                Tap on satellite to place ridge corners • {activePoints.length} points placed ({currentArea.toFixed(2)} acres)
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleClear}
              className="px-3.5 py-1.5 text-xs bg-red-600/90 hover:bg-red-600 text-white rounded-xl transition font-bold"
            >
              Clear
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
