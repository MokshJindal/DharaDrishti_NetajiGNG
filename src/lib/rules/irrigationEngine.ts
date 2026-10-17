/**
 * Irrigation Rules Engine — DharaDrishti
 *
 * Calculates daily & weekly water requirements using the
 * FAO Penman-Monteith ET₀ approach with crop coefficients (Kc).
 */

// ── types ────────────────────────────────────────────────────────

export interface WaterNeedParams {
  /** Crop name (lowercase key, e.g. "wheat") */
  crop: string;
  /** Growth stage: initial | development | mid | late */
  stage: string;
  /** Field area in acres */
  area_acres: number;
  /** Reference evapotranspiration, mm/day */
  et0: number;
  /** Expected rainfall in the next 24 h, mm */
  rainfall_mm: number;
  /** Soil type: sandy | loamy | clay | silt */
  soil_type: string;
}

export interface WaterNeedResult {
  /** Crop water demand today (mm) */
  daily_mm: number;
  /** Weekly demand (mm) */
  weekly_mm: number;
  /** Whether irrigation can be skipped today */
  skip_today: boolean;
  /** Human-readable reason / recommendation */
  reason: string;
}

// ── Kc table (FAO-56 / ICAR indicative values) ──────────────────

type CropStage = 'initial' | 'development' | 'mid' | 'late';

const KC_TABLE: Record<string, Record<CropStage, number>> = {
  wheat:      { initial: 0.30, development: 0.75, mid: 1.15, late: 0.40 },
  rice:       { initial: 1.05, development: 1.10, mid: 1.20, late: 0.90 },
  mustard:    { initial: 0.35, development: 0.70, mid: 1.00, late: 0.35 },
  cotton:     { initial: 0.35, development: 0.75, mid: 1.20, late: 0.50 },
  sugarcane:  { initial: 0.40, development: 0.80, mid: 1.25, late: 0.75 },
  maize:      { initial: 0.30, development: 0.75, mid: 1.20, late: 0.60 },
  soybean:    { initial: 0.40, development: 0.80, mid: 1.15, late: 0.50 },
};

/**
 * Soil-type multiplier: sandy soils drain faster (need more
 * frequent irrigation), clay retains moisture.
 */
const SOIL_FACTOR: Record<string, number> = {
  sandy: 1.20,
  loamy: 1.00,
  clay:  0.85,
  silt:  0.95,
};

/**
 * Effective-rainfall fraction.  Not all rain is usable by the
 * crop; ~70 % is considered effective on average.
 */
const EFFECTIVE_RAIN_FRACTION = 0.70;

/** If forecast rainfall exceeds this threshold (mm), skip today. */
const RAIN_SKIP_THRESHOLD_MM = 5;

// ── main function ────────────────────────────────────────────────

export function calculateWaterNeed(params: WaterNeedParams): WaterNeedResult {
  const { crop, stage, et0, rainfall_mm, soil_type } = params;

  // Look up Kc (fall back to mid-stage 1.0 if crop/stage unknown)
  const cropEntry = KC_TABLE[crop.toLowerCase()];
  const kc = cropEntry?.[stage as CropStage] ?? 1.0;

  // Soil adjustment
  const soilMul = SOIL_FACTOR[soil_type.toLowerCase()] ?? 1.0;

  // Crop evapotranspiration (mm/day)
  const etc = et0 * kc * soilMul;

  // Effective rainfall to subtract
  const effectiveRain = rainfall_mm * EFFECTIVE_RAIN_FRACTION;

  // Net daily irrigation requirement (cannot go below 0)
  const daily_mm = Math.max(0, etc - effectiveRain);
  const weekly_mm = Math.round(daily_mm * 7 * 100) / 100;

  // Skip logic
  const skip_today = rainfall_mm >= RAIN_SKIP_THRESHOLD_MM;

  // Build reason string
  let reason: string;
  if (skip_today) {
    reason =
      `Sufficient rainfall expected (${rainfall_mm} mm). ` +
      `Skip irrigation today and re-evaluate tomorrow.`;
  } else if (daily_mm === 0) {
    reason =
      `Effective rainfall covers the crop water demand. ` +
      `No irrigation needed today.`;
  } else {
    reason =
      `Crop ET = ${etc.toFixed(1)} mm/day (Kc ${kc}, ` +
      `soil factor ${soilMul}). ` +
      `After accounting for ${effectiveRain.toFixed(1)} mm ` +
      `effective rainfall, irrigate ${daily_mm.toFixed(1)} mm today.`;
  }

  return {
    daily_mm: Math.round(daily_mm * 100) / 100,
    weekly_mm,
    skip_today,
    reason,
  };
}
