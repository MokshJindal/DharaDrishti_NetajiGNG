/**
 * Fasal Score Calculator — DharaDrishti
 *
 * A composite "farm health" index (0–100) computed as a weighted
 * average of five sub-scores.
 */

// ── types ────────────────────────────────────────────────────────

export interface FasalScoreParams {
  /** Crop health score (0–100) */
  cropHealth: number;
  /** Stock / inventory value score (0–100) */
  stockValue: number;
  /** Irrigation discipline score (0–100) */
  irrigationDiscipline: number;
  /** Weather risk score (0–100, higher = less risky) */
  weatherRisk: number;
  /** Yield outlook score (0–100) */
  yieldOutlook: number;
}

export interface FasalScoreResult {
  /** Composite score (0–100) */
  total: number;
  /** Individual weighted contributions */
  subScores: Record<string, number>;
  /** Human-readable label */
  label: string;
  /** Short explanation */
  explanation: string;
}

// ── weights ──────────────────────────────────────────────────────

const WEIGHTS: Record<keyof FasalScoreParams, number> = {
  cropHealth: 0.25,
  stockValue: 0.15,
  irrigationDiscipline: 0.20,
  weatherRisk: 0.20,
  yieldOutlook: 0.20,
};

// ── label thresholds ─────────────────────────────────────────────

function getLabel(score: number): string {
  if (score >= 90) return 'Outstanding';
  if (score >= 70) return 'Excellent';
  if (score >= 50) return 'Good';
  if (score >= 30) return 'Fair';
  return 'Poor';
}

// ── explanation builder ──────────────────────────────────────────

function buildExplanation(
  total: number,
  params: FasalScoreParams,
): string {
  const parts: string[] = [];

  if (params.cropHealth < 40) {
    parts.push('crop health needs attention');
  }
  if (params.irrigationDiscipline < 40) {
    parts.push('irrigation schedule is irregular');
  }
  if (params.weatherRisk < 40) {
    parts.push('high weather risk detected');
  }
  if (params.yieldOutlook < 40) {
    parts.push('yield outlook is below average');
  }
  if (params.stockValue < 40) {
    parts.push('stock value is low');
  }

  if (parts.length === 0) {
    if (total >= 70) {
      return 'All parameters are in good shape. Keep up the excellent work!';
    }
    return 'Most parameters are moderate. Focus on improving weaker areas for a better score.';
  }

  return (
    `Areas to improve: ${parts.join(', ')}. ` +
    `Addressing these can significantly boost your Fasal Score.`
  );
}

// ── main function ────────────────────────────────────────────────

export function calculateFasalScore(
  params: FasalScoreParams,
): FasalScoreResult {
  // Clamp all inputs to [0, 100]
  const clamped: FasalScoreParams = {
    cropHealth: clamp(params.cropHealth),
    stockValue: clamp(params.stockValue),
    irrigationDiscipline: clamp(params.irrigationDiscipline),
    weatherRisk: clamp(params.weatherRisk),
    yieldOutlook: clamp(params.yieldOutlook),
  };

  // Weighted sub-scores
  const subScores: Record<string, number> = {};
  let total = 0;

  for (const [key, weight] of Object.entries(WEIGHTS)) {
    const raw = clamped[key as keyof FasalScoreParams];
    const weighted = round1(raw * weight);
    subScores[key] = weighted;
    total += weighted;
  }

  total = round1(total);

  return {
    total,
    subScores,
    label: getLabel(total),
    explanation: buildExplanation(total, clamped),
  };
}

// ── helpers ──────────────────────────────────────────────────────

function clamp(v: number, min = 0, max = 100): number {
  return Math.min(max, Math.max(min, v));
}

function round1(v: number): number {
  return Math.round(v * 10) / 10;
}
