/**
 * Fertiliser Rules Engine — DharaDrishti
 *
 * ICAR-based recommended NPK doses, soil-test adjustments,
 * commercial fertiliser conversion, and application schedule.
 */

// ── types ────────────────────────────────────────────────────────

export interface FertiliserParams {
  /** Crop name (lowercase key) */
  crop: string;
  /** Field area in acres */
  area_acres: number;
  /** Soil-test available Nitrogen (kg/ha) */
  soil_n: number;
  /** Soil-test available Phosphorus (kg/ha) */
  soil_p: number;
  /** Soil-test available Potassium (kg/ha) */
  soil_k: number;
  /** Soil pH */
  soil_ph: number;
  /** Soil organic carbon % (optional) */
  soil_oc?: number;
}

export interface ScheduleEntry {
  /** Application week (0 = basal, i.e. at sowing) */
  week: number;
  /** Fertiliser product name */
  fertiliser: string;
  /** Dose in kg for the whole field */
  dose_kg: number;
}

export interface FertiliserResult {
  /** Pure nutrient requirement (kg for the field) */
  nitrogen_kg: number;
  phosphorus_kg: number;
  potassium_kg: number;
  /** Commercial fertiliser quantities */
  urea_kg: number;
  dap_kg: number;
  mop_kg: number;
  /** Week-wise application schedule */
  schedule: ScheduleEntry[];
  /** Source reference */
  source: string;
}

// ── ICAR recommended doses (kg / ha) ────────────────────────────

interface CropDose {
  /** Recommended N (kg / ha) */
  n: number;
  /** Recommended P₂O₅ (kg / ha) */
  p: number;
  /** Recommended K₂O (kg / ha) */
  k: number;
}

const RECOMMENDED_DOSE: Record<string, CropDose> = {
  wheat:      { n: 120, p: 60, k: 40 },
  rice:       { n: 120, p: 60, k: 60 },
  mustard:    { n: 80,  p: 40, k: 20 },
  cotton:     { n: 150, p: 60, k: 60 },
  sugarcane:  { n: 300, p: 100, k: 100 },
  maize:      { n: 120, p: 60, k: 40 },
  soybean:    { n: 30,  p: 60, k: 30 },
};

// ── Conversion factors ──────────────────────────────────────────

/**
 * Commercial fertiliser nutrient contents (fraction):
 * - Urea:  46 % N
 * - DAP:   18 % N + 46 % P₂O₅
 * - MOP:   60 % K₂O
 */
const UREA_N = 0.46;
const DAP_N = 0.18;
const DAP_P = 0.46;
const MOP_K = 0.60;

const HA_PER_ACRE = 0.404_686;

// ── Soil-test adjustment categories ─────────────────────────────

/** Nutrient availability categories (kg/ha boundaries). */
function nutrientCategory(available: number): 'low' | 'medium' | 'high' {
  if (available < 140) return 'low';
  if (available < 280) return 'medium';
  return 'high';
}

/**
 * Multiplier for the recommended dose based on soil-test category.
 * Low → full dose, Medium → 75 %, High → 50 %.
 */
function adjustmentFactor(category: 'low' | 'medium' | 'high'): number {
  switch (category) {
    case 'low':
      return 1.0;
    case 'medium':
      return 0.75;
    case 'high':
      return 0.50;
  }
}

// ── pH adjustment ───────────────────────────────────────────────

/**
 * Acidic soils (pH < 6) fix phosphorus → increase P dose by 25 %.
 * Alkaline soils (pH > 8) fix micronutrients → flag but no
 * macro-nutrient change here.
 */
function phAdjustmentP(ph: number): number {
  if (ph < 6.0) return 1.25;
  if (ph > 8.0) return 0.90;
  return 1.0;
}

// ── main function ────────────────────────────────────────────────

export function calculateFertiliserDose(
  params: FertiliserParams,
): FertiliserResult {
  const {
    crop,
    area_acres,
    soil_n,
    soil_p,
    soil_k,
    soil_ph,
  } = params;

  const dose = RECOMMENDED_DOSE[crop.toLowerCase()] ?? { n: 100, p: 50, k: 40 };
  const fieldHa = area_acres * HA_PER_ACRE;

  // --- Soil-test adjusted requirements (kg / ha) ----------------
  const adjN = dose.n * adjustmentFactor(nutrientCategory(soil_n));
  const adjP = dose.p * adjustmentFactor(nutrientCategory(soil_p)) * phAdjustmentP(soil_ph);
  const adjK = dose.k * adjustmentFactor(nutrientCategory(soil_k));

  // --- Field-level requirements (kg) ----------------------------
  const nitrogen_kg = round2(adjN * fieldHa);
  const phosphorus_kg = round2(adjP * fieldHa);
  const potassium_kg = round2(adjK * fieldHa);

  // --- Commercial fertiliser conversion -------------------------
  // Strategy: fulfil P first with DAP, remaining N with Urea, K with MOP
  const dap_kg = round2(phosphorus_kg / DAP_P);
  const nFromDAP = dap_kg * DAP_N;
  const remainingN = Math.max(0, nitrogen_kg - nFromDAP);
  const urea_kg = round2(remainingN / UREA_N);
  const mop_kg = round2(potassium_kg / MOP_K);

  // --- Application schedule -------------------------------------
  const schedule = buildSchedule(crop.toLowerCase(), urea_kg, dap_kg, mop_kg);

  return {
    nitrogen_kg,
    phosphorus_kg,
    potassium_kg,
    urea_kg,
    dap_kg,
    mop_kg,
    schedule,
    source:
      'ICAR Crop-specific Recommendations & Soil-Test Based Fertiliser Application (STCR)',
  };
}

// ── schedule builder ─────────────────────────────────────────────

function buildSchedule(
  crop: string,
  urea: number,
  dap: number,
  mop: number,
): ScheduleEntry[] {
  const schedule: ScheduleEntry[] = [];

  // DAP & MOP are always basal (week 0)
  if (dap > 0) {
    schedule.push({ week: 0, fertiliser: 'DAP (18-46-0)', dose_kg: round2(dap) });
  }
  if (mop > 0) {
    schedule.push({ week: 0, fertiliser: 'MOP (0-0-60)', dose_kg: round2(mop) });
  }

  // Urea split depends on crop
  const splits = UREA_SPLIT[crop] ?? [
    { week: 0, fraction: 0.33 },
    { week: 3, fraction: 0.33 },
    { week: 6, fraction: 0.34 },
  ];

  for (const s of splits) {
    const dose = round2(urea * s.fraction);
    if (dose > 0) {
      schedule.push({
        week: s.week,
        fertiliser: 'Urea (46-0-0)',
        dose_kg: dose,
      });
    }
  }

  // Sort by week
  schedule.sort((a, b) => a.week - b.week);
  return schedule;
}

/** Urea top-dressing split patterns per crop. */
const UREA_SPLIT: Record<
  string,
  { week: number; fraction: number }[]
> = {
  wheat: [
    { week: 0, fraction: 0.50 },  // basal – half at sowing
    { week: 3, fraction: 0.25 },  // 1st top dressing (CRI stage)
    { week: 7, fraction: 0.25 },  // 2nd top dressing (tillering)
  ],
  rice: [
    { week: 0, fraction: 0.33 },
    { week: 3, fraction: 0.33 },
    { week: 6, fraction: 0.34 },
  ],
  mustard: [
    { week: 0, fraction: 0.50 },
    { week: 4, fraction: 0.50 },
  ],
  cotton: [
    { week: 0, fraction: 0.25 },
    { week: 4, fraction: 0.25 },
    { week: 8, fraction: 0.25 },
    { week: 12, fraction: 0.25 },
  ],
  sugarcane: [
    { week: 0, fraction: 0.20 },
    { week: 4, fraction: 0.20 },
    { week: 8, fraction: 0.20 },
    { week: 12, fraction: 0.20 },
    { week: 16, fraction: 0.20 },
  ],
  maize: [
    { week: 0, fraction: 0.33 },
    { week: 3, fraction: 0.33 },
    { week: 6, fraction: 0.34 },
  ],
  soybean: [
    { week: 0, fraction: 1.0 }, // minimal N, all basal
  ],
};

// ── util ─────────────────────────────────────────────────────────

function round2(v: number): number {
  return Math.round(v * 100) / 100;
}
