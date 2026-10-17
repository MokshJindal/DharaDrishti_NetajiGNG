/**
 * Profit Estimation Engine — DharaDrishti
 *
 * Estimates revenue range, cost breakdown, and net profit for a
 * given crop, area, yield, and mandi price.
 */

// ── types ────────────────────────────────────────────────────────

export interface ProfitParams {
  /** Crop name (lowercase key) */
  crop: string;
  /** Field area in acres */
  area_acres: number;
  /** Expected yield per acre (quintals) */
  yield_per_acre: number;
  /** Quality grade: A | B | C */
  quality_grade: string;
  /** Current mandi price per quintal (₹) */
  mandi_price: number;
}

export interface ProfitResult {
  /** Revenue at 80 % of expected yield (₹) */
  revenue_low: number;
  /** Revenue at expected yield (₹) */
  revenue_expected: number;
  /** Revenue at 120 % of expected yield (₹) */
  revenue_high: number;
  /** Itemised cost of cultivation (₹) */
  cost_breakdown: Record<string, number>;
  /** Total cost for the field (₹) */
  total_cost: number;
  /** Net profit at expected revenue (₹) */
  net_profit: number;
}

// ── Default cost of cultivation (₹ / acre) ──────────────────────

interface CropCost {
  seed: number;
  fertiliser: number;
  labour: number;
  water: number;
  pesticide: number;
  misc: number;
}

const COST_PER_ACRE: Record<string, CropCost> = {
  wheat: {
    seed: 1_500,
    fertiliser: 3_000,
    labour: 4_000,
    water: 1_500,
    pesticide: 1_000,
    misc: 1_000,
  },
  rice: {
    seed: 1_200,
    fertiliser: 3_500,
    labour: 6_000,
    water: 3_000,
    pesticide: 1_500,
    misc: 1_500,
  },
  mustard: {
    seed: 800,
    fertiliser: 2_000,
    labour: 3_000,
    water: 1_000,
    pesticide: 800,
    misc: 800,
  },
  cotton: {
    seed: 2_500,
    fertiliser: 4_000,
    labour: 6_000,
    water: 2_000,
    pesticide: 3_000,
    misc: 1_500,
  },
  sugarcane: {
    seed: 4_000,
    fertiliser: 5_000,
    labour: 8_000,
    water: 4_000,
    pesticide: 2_000,
    misc: 2_000,
  },
  maize: {
    seed: 1_800,
    fertiliser: 2_800,
    labour: 3_500,
    water: 1_200,
    pesticide: 1_000,
    misc: 700,
  },
  soybean: {
    seed: 2_000,
    fertiliser: 2_500,
    labour: 3_500,
    water: 1_000,
    pesticide: 1_200,
    misc: 800,
  },
};

/** Fallback cost if crop is not in the table */
const DEFAULT_COST: CropCost = {
  seed: 1_500,
  fertiliser: 3_000,
  labour: 4_000,
  water: 1_500,
  pesticide: 1_200,
  misc: 1_000,
};

// ── Quality grade price multipliers ─────────────────────────────

const QUALITY_MULTIPLIER: Record<string, number> = {
  A: 1.10,
  B: 1.00,
  C: 0.85,
};

// ── main function ────────────────────────────────────────────────

export function calculateProfit(params: ProfitParams): ProfitResult {
  const {
    crop,
    area_acres,
    yield_per_acre,
    quality_grade,
    mandi_price,
  } = params;

  // --- Cost breakdown -------------------------------------------
  const perAcre = COST_PER_ACRE[crop.toLowerCase()] ?? DEFAULT_COST;
  const cost_breakdown: Record<string, number> = {};
  let total_cost = 0;

  for (const [key, value] of Object.entries(perAcre)) {
    const fieldCost = round(value * area_acres);
    cost_breakdown[key] = fieldCost;
    total_cost += fieldCost;
  }

  // --- Revenue --------------------------------------------------
  const qualityMul = QUALITY_MULTIPLIER[quality_grade.toUpperCase()] ?? 1.0;
  const totalYield = yield_per_acre * area_acres; // quintals
  const effectivePrice = mandi_price * qualityMul;

  const revenue_expected = round(totalYield * effectivePrice);
  const revenue_low = round(totalYield * 0.80 * effectivePrice);
  const revenue_high = round(totalYield * 1.20 * effectivePrice);

  // --- Net profit (at expected) ---------------------------------
  const net_profit = round(revenue_expected - total_cost);

  return {
    revenue_low,
    revenue_expected,
    revenue_high,
    cost_breakdown,
    total_cost: round(total_cost),
    net_profit,
  };
}

// ── util ─────────────────────────────────────────────────────────

function round(v: number): number {
  return Math.round(v);
}
