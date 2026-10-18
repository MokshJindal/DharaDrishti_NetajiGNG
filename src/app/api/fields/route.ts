import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { calculateArea, calculatePerimeter, convertLandUnits } from '@/lib/geo/geoUtils';

const DATA_FILE = path.join(process.cwd(), 'src', 'lib', 'data', 'savedFields.json');

// Interface definitions
export interface SoilProfile {
  texture: string;
  nitrogenKgHa: number;
  phosphorusKgHa: number;
  potassiumKgHa: number;
  pH: number;
  organicCarbonPercent: number;
  moisturePercent: number;
  infiltrationRateMmHr: number;
}

export interface VRAPrescription {
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
}

export interface CropPlanning {
  primaryCrop: string;
  suitabilityScore: number;
  alternativeCrops: string[];
  sownOn: string;
  growthStage: string;
  daysToHarvest: number;
  harvestReadiness: string;
  estimatedYieldQuintals: number;
}

export interface ManagementZone {
  id: string;
  name: string;
  crop: string;
  variety: string;
  areaAcres: number;
  color: string;
  polygon: [number, number][];
  soil: SoilProfile;
  vra: VRAPrescription;
  cropPlanning: CropPlanning;
}

export interface PrecisionField {
  id: string;
  name: string;
  farmerName: string;
  village: string;
  district: string;
  state: string;
  khasraNo: string;
  totalAreaAcres: number;
  boundary: [number, number][];
  zones: ManagementZone[];
}

function readData(): { fields: PrecisionField[] } {
  try {
    if (fs.existsSync(DATA_FILE)) {
      const raw = fs.readFileSync(DATA_FILE, 'utf-8');
      return JSON.parse(raw);
    }
  } catch (err) {
    console.error('Error reading savedFields.json:', err);
  }
  return { fields: [] };
}

function writeData(data: { fields: PrecisionField[] }) {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error writing savedFields.json:', err);
  }
}

// Compute aggregate VRA and agronomic metrics
function computeFieldAnalytics(field: PrecisionField) {
  const areaUnits = convertLandUnits(field.totalAreaAcres);
  const perimeterMeters = Math.round(calculatePerimeter(field.boundary));

  // Blanket application baseline (50 kg Urea, 30 kg DAP per acre uniformly)
  const uniformUreaKg = Math.round(field.totalAreaAcres * 50);
  const uniformDapKg = Math.round(field.totalAreaAcres * 30);

  // VRA calculated sums
  let vraUreaKg = 0;
  let vraDapKg = 0;
  let totalCostSavedRs = 0;
  let totalUreaSavedKg = 0;
  let avgWaterSavedPercent = 0;

  field.zones.forEach((zone) => {
    vraUreaKg += zone.vra.ureaKgPerAcre * zone.areaAcres;
    vraDapKg += zone.vra.dapKgPerAcre * zone.areaAcres;
    totalCostSavedRs += zone.vra.savingsVsUniform.costSavedRs;
    totalUreaSavedKg += zone.vra.savingsVsUniform.ureaSavedKg;
    avgWaterSavedPercent += zone.vra.savingsVsUniform.waterSavedPercent;
  });

  const zoneCount = field.zones.length;
  if (zoneCount > 0) {
    avgWaterSavedPercent = Math.round(avgWaterSavedPercent / zoneCount);
  }

  return {
    units: areaUnits,
    perimeterMeters,
    vraSummary: {
      uniformUreaKg,
      uniformDapKg,
      vraUreaKg: Math.round(vraUreaKg),
      vraDapKg: Math.round(vraDapKg),
      totalUreaSavedKg: Math.round(totalUreaSavedKg),
      totalCostSavedRs: Math.round(totalCostSavedRs),
      waterSavedPercent: avgWaterSavedPercent,
      nitrogenRunoffPreventedKg: Math.round(totalUreaSavedKg * 0.46), // Urea has 46% N
    },
  };
}

export async function GET() {
  const data = readData();
  const primaryField = data.fields[0];

  if (!primaryField) {
    return NextResponse.json({ error: 'No fields found' }, { status: 404 });
  }

  const analytics = computeFieldAnalytics(primaryField);

  return NextResponse.json({
    success: true,
    field: primaryField,
    analytics,
  });
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { id, name, boundary, zones } = body;

    const data = readData();
    let field = data.fields.find((f) => f.id === (id || 'field-01'));

    if (!field) {
      field = {
        id: id || `field-${Date.now()}`,
        name: name || 'Custom Farm Boundary',
        farmerName: 'Ramesh Patel',
        village: 'Kardelwadi, Shirur',
        district: 'Pune',
        state: 'Maharashtra',
        khasraNo: '142/A',
        totalAreaAcres: 0,
        boundary: [],
        zones: [],
      };
      data.fields.unshift(field);
    }

    if (boundary && Array.isArray(boundary) && boundary.length >= 3) {
      field.boundary = boundary;
      field.totalAreaAcres = Number(calculateArea(boundary).toFixed(2));
    }

    if (name) {
      field.name = name;
    }

    if (zones && Array.isArray(zones)) {
      field.zones = zones;
    } else if (boundary && boundary.length >= 3 && (!field.zones || field.zones.length === 0)) {
      // Auto-partition into 2 zones if none provided
      const totalAcres = field.totalAreaAcres;
      field.zones = [
        {
          id: `zone-01-${Date.now()}`,
          name: 'Zone 1: Upper Ridge (Clay Loam)',
          crop: 'Wheat',
          variety: 'GW-322',
          areaAcres: Number((totalAcres * 0.6).toFixed(2)),
          color: '#4A943E',
          polygon: boundary.slice(0, Math.ceil(boundary.length / 2) + 1),
          soil: {
            texture: 'Clay Loam',
            nitrogenKgHa: 220,
            phosphorusKgHa: 20,
            potassiumKgHa: 300,
            pH: 7.2,
            organicCarbonPercent: 0.65,
            moisturePercent: 26,
            infiltrationRateMmHr: 15,
          },
          vra: {
            ureaKgPerAcre: 52,
            dapKgPerAcre: 28,
            mopKgPerAcre: 10,
            irrigationRunTimeMinutes: 24,
            irrigationIntervalDays: 4,
            pesticideAdvisory: 'Preventive bio-pesticide spray for foliar rust.',
            rationale: 'Balanced clay loam needs standard top-dressing and moderate drip timing.',
            savingsVsUniform: {
              ureaSavedKg: 12,
              waterSavedPercent: 20,
              costSavedRs: 580,
            },
          },
          cropPlanning: {
            primaryCrop: 'Wheat (गेहूं)',
            suitabilityScore: 92,
            alternativeCrops: ['Barley', 'Mustard'],
            sownOn: new Date().toISOString().split('T')[0],
            growthStage: 'Vegetative',
            daysToHarvest: 65,
            harvestReadiness: 'Growing Phase',
            estimatedYieldQuintals: 16.0,
          },
        },
        {
          id: `zone-02-${Date.now()}`,
          name: 'Zone 2: Lower Depressional Basin',
          crop: 'Mustard',
          variety: 'Pusa Bold',
          areaAcres: Number((totalAcres * 0.4).toFixed(2)),
          color: '#B98327',
          polygon: boundary.slice(Math.floor(boundary.length / 2)),
          soil: {
            texture: 'Alluvial Loam',
            nitrogenKgHa: 310,
            phosphorusKgHa: 24,
            potassiumKgHa: 260,
            pH: 7.0,
            organicCarbonPercent: 0.78,
            moisturePercent: 34,
            infiltrationRateMmHr: 20,
          },
          vra: {
            ureaKgPerAcre: 32,
            dapKgPerAcre: 20,
            mopKgPerAcre: 15,
            irrigationRunTimeMinutes: 18,
            irrigationIntervalDays: 5,
            pesticideAdvisory: 'Monitor for aphid infestation in low-lying microclimate.',
            rationale: 'High natural organic silt run-off. Reduced nitrogen to prevent vegetative overgrowth.',
            savingsVsUniform: {
              ureaSavedKg: 28,
              waterSavedPercent: 30,
              costSavedRs: 940,
            },
          },
          cropPlanning: {
            primaryCrop: 'Mustard (सरसों)',
            suitabilityScore: 90,
            alternativeCrops: ['Gram', 'Paddy'],
            sownOn: new Date().toISOString().split('T')[0],
            growthStage: 'Vegetative',
            daysToHarvest: 55,
            harvestReadiness: 'Growing Phase',
            estimatedYieldQuintals: 8.5,
          },
        },
      ];
    }

    writeData(data);
    const analytics = computeFieldAnalytics(field);

    return NextResponse.json({
      success: true,
      message: 'Field boundary and zones successfully updated.',
      field,
      analytics,
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error('Error in POST /api/fields:', errorMsg);
    return NextResponse.json({ error: errorMsg }, { status: 500 });
  }
}
