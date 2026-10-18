import { NextResponse } from 'next/server';

// ICAR Standard Thresholds for Soil Testing (from NPK_Logic/soil_health/agronomy.py)
const THRESHOLDS = {
  Nitrogen: { low: 280, high: 560, unit: 'kg/ha' },
  Phosphorus: { low: 10, high: 25, unit: 'kg/ha' },
  Potassium: { low: 108, high: 280, unit: 'kg/ha' },
  Organic_Carbon: { low: 0.5, high: 0.75, unit: '%' },
  Sulphur: { critical: 10.0, unit: 'ppm' },
  Zinc: { critical: 0.6, unit: 'ppm' },
  Iron: { critical: 4.5, unit: 'ppm' },
  Copper: { critical: 0.2, unit: 'ppm' },
  Manganese: { critical: 2.0, unit: 'ppm' },
  Boron: { critical: 0.5, unit: 'ppm' },
};

// Unit conversions from NPK_Logic/soil_health/features.py
function convertToStandard(inputs: Record<string, any>) {
  const standard: Record<string, number> = {};

  // N
  if (inputs.nitrogen !== undefined) {
    let n = parseFloat(inputs.nitrogen);
    const unit = inputs.nitrogen_unit || 'kg/ha';
    if (unit === 'ppm' || unit === 'mg/kg') n *= 2.24; // 1 ppm ~ 2.24 kg/ha furrow slice
    standard.N = Math.round(n * 10) / 10;
  }

  // P
  if (inputs.phosphorus !== undefined) {
    let p = parseFloat(inputs.phosphorus);
    const unit = inputs.phosphorus_unit || 'kg/ha';
    if (unit === 'ppm' || unit === 'mg/kg') p *= 2.24;
    if (inputs.phosphorus_form === 'P2O5') p *= 0.4364; // Elemental P = P2O5 * 0.4364
    standard.P = Math.round(p * 10) / 10;
  }

  // K
  if (inputs.potassium !== undefined) {
    let k = parseFloat(inputs.potassium);
    const unit = inputs.potassium_unit || 'kg/ha';
    if (unit === 'ppm' || unit === 'mg/kg') k *= 2.24;
    if (inputs.potassium_form === 'K2O') k *= 0.8302; // Elemental K = K2O * 0.8302
    standard.K = Math.round(k * 10) / 10;
  }

  standard.pH = parseFloat(inputs.ph ?? 7.0);
  standard.OC = parseFloat(inputs.oc ?? 0.65);
  standard.EC = parseFloat(inputs.ec ?? 0.5);

  return standard;
}

function evaluateNutrients(std: Record<string, number>) {
  const assessments: Record<string, any> = {};
  const deficiencies: string[] = [];
  const deficienciesHi: string[] = [];

  // Nitrogen
  const nVal = std.N;
  let nStatus = 'Medium / Adequate';
  let nStatusHi = 'मध्यम / पर्याप्त';
  if (nVal < THRESHOLDS.Nitrogen.low) {
    nStatus = 'Low';
    nStatusHi = 'कम (कमी)';
    deficiencies.push(`Nitrogen is Low (${nVal} kg/ha < ${THRESHOLDS.Nitrogen.low} kg/ha)`);
    deficienciesHi.push(`नाइट्रोजन की भारी कमी है (${nVal} kg/ha)`);
  } else if (nVal > THRESHOLDS.Nitrogen.high) {
    nStatus = 'High';
    nStatusHi = 'अधिक';
  }
  assessments.Nitrogen = { value: nVal, unit: 'kg/ha', status: nStatus, statusHi: nStatusHi };

  // Phosphorus
  const pVal = std.P;
  let pStatus = 'Medium / Adequate';
  let pStatusHi = 'मध्यम / पर्याप्त';
  if (pVal < THRESHOLDS.Phosphorus.low) {
    pStatus = 'Low';
    pStatusHi = 'कम (कमी)';
    deficiencies.push(`Phosphorus is Low (${pVal} kg/ha < ${THRESHOLDS.Phosphorus.low} kg/ha)`);
    deficienciesHi.push(`फॉस्फोरस की कमी है (${pVal} kg/ha)`);
  } else if (pVal > THRESHOLDS.Phosphorus.high) {
    pStatus = 'High';
    pStatusHi = 'अधिक';
  }
  assessments.Phosphorus = { value: pVal, unit: 'kg/ha', status: pStatus, statusHi: pStatusHi };

  // Potassium
  const kVal = std.K;
  let kStatus = 'Medium / Adequate';
  let kStatusHi = 'मध्यम / पर्याप्त';
  if (kVal < THRESHOLDS.Potassium.low) {
    kStatus = 'Low';
    kStatusHi = 'कम (कमी)';
    deficiencies.push(`Potassium is Low (${kVal} kg/ha < ${THRESHOLDS.Potassium.low} kg/ha)`);
    deficienciesHi.push(`पोटैशियम की कमी है (${kVal} kg/ha)`);
  } else if (kVal > THRESHOLDS.Potassium.high) {
    kStatus = 'High';
    kStatusHi = 'अधिक';
  }
  assessments.Potassium = { value: kVal, unit: 'kg/ha', status: kStatus, statusHi: kStatusHi };

  // pH
  const phVal = std.pH;
  let phRating = 'Neutral / Optimal';
  let phRatingHi = 'उदासीन / सर्वोत्तम';
  if (phVal < 5.5) {
    phRating = 'Strongly Acidic';
    phRatingHi = 'अत्यधिक अम्लीय (एसिडिक)';
    deficiencies.push(`Soil is Strongly Acidic (pH ${phVal}). Agricultural lime application required.`);
    deficienciesHi.push(`मिट्टी अत्यधिक अम्लीय है (pH ${phVal})। चूना (Lime) का प्रयोग आवश्यक है।`);
  } else if (phVal < 6.5) {
    phRating = 'Moderately Acidic';
    phRatingHi = 'हल्की अम्लीय';
  } else if (phVal <= 7.5) {
    phRating = 'Neutral / Optimal';
    phRatingHi = 'सर्वोत्तम (उदासीन)';
  } else if (phVal <= 8.5) {
    phRating = 'Moderately Alkaline';
    phRatingHi = 'हल्की क्षारीय';
  } else {
    phRating = 'Strongly Alkaline';
    phRatingHi = 'अत्यधिक क्षारीय';
    deficiencies.push(`Soil is Strongly Alkaline (pH ${phVal}). Gypsum application required.`);
    deficienciesHi.push(`मिट्टी अत्यधिक क्षारीय है (pH ${phVal})। जिप्सम डालना आवश्यक है।`);
  }
  assessments.pH = { value: phVal, status: phRating, statusHi: phRatingHi };

  // Organic Carbon
  const ocVal = std.OC;
  let ocStatus = 'Medium';
  let ocStatusHi = 'मध्यम';
  if (ocVal < THRESHOLDS.Organic_Carbon.low) {
    ocStatus = 'Low';
    ocStatusHi = 'कम';
    deficiencies.push(`Organic carbon is low (${ocVal}%). Add FYM or vermicompost.`);
    deficienciesHi.push(`जैविक कार्बन कम है (${ocVal}%)। गोबर की खाद या केंचुआ खाद डालें।`);
  } else if (ocVal > THRESHOLDS.Organic_Carbon.high) {
    ocStatus = 'High';
    ocStatusHi = 'उत्कृष्ट';
  }
  assessments.OrganicCarbon = { value: ocVal, unit: '%', status: ocStatus, statusHi: ocStatusHi };

  // Risk Level
  let riskLevel = 'Low Risk';
  let riskLevelHi = 'उत्कृष्ट स्वास्थ्य (कम जोखिम)';
  if (phVal < 5.5 || phVal > 8.5 || deficiencies.length >= 2) {
    riskLevel = 'Critical Risk';
    riskLevelHi = 'गंभीर जोखिम';
  } else if (deficiencies.length === 1 || phVal < 6.5 || phVal > 7.8) {
    riskLevel = 'Moderate Risk';
    riskLevelHi = 'मध्यम जोखिम';
  }

  return { assessments, deficiencies, deficienciesHi, riskLevel, riskLevelHi };
}

// Target nutrient requirements (kg/ha) for major Indian crops
const CROP_REQUIREMENTS: Record<string, { N: number; P: number; K: number; nameHi: string }> = {
  wheat: { N: 120, P: 60, K: 40, nameHi: 'गेहूं (Wheat)' },
  rice: { N: 100, P: 50, K: 50, nameHi: 'धान (Paddy/Rice)' },
  cotton: { N: 120, P: 60, K: 60, nameHi: 'कपास (Cotton)' },
  sugarcane: { N: 250, P: 100, K: 120, nameHi: 'गन्ना (Sugarcane)' },
  maize: { N: 120, P: 60, K: 40, nameHi: 'मक्का (Maize)' },
  soybean: { N: 30, P: 60, K: 40, nameHi: 'सोयाबीन (Soybean)' },
  onion: { N: 100, P: 50, K: 100, nameHi: 'प्याज (Onion)' },
  tomato: { N: 150, P: 80, K: 100, nameHi: 'टमाटर (Tomato)' },
  gram: { N: 20, P: 50, K: 20, nameHi: 'चना (Chickpea/Gram)' },
};

function calculateFertilizerBags(
  crop: string,
  areaAcres: number,
  std: Record<string, number>
) {
  const req = CROP_REQUIREMENTS[crop] || CROP_REQUIREMENTS.wheat;
  const haToAcre = 0.4047;
  const areaHa = areaAcres * haToAcre;

  // Soil test based adjustment factors (ICAR soil test crop response)
  const nFactor = std.N < 280 ? 1.25 : std.N > 560 ? 0.75 : 1.0;
  const pFactor = std.P < 10 ? 1.3 : std.P > 25 ? 0.7 : 1.0;
  const kFactor = std.K < 108 ? 1.25 : std.K > 280 ? 0.75 : 1.0;

  const targetN = req.N * nFactor * areaHa;
  const targetP2O5 = (req.P / 0.4364) * pFactor * areaHa; // Convert elemental P to P2O5 fertilizer basis
  const targetK2O = (req.K / 0.8302) * kFactor * areaHa;  // Convert elemental K to K2O

  // 1. DAP (18% N, 46% P2O5) meets P first
  const dapKg = Math.max(0, targetP2O5 / 0.46);
  const nFromDap = dapKg * 0.18;

  // 2. Urea (46% N) satisfies remaining N
  const remainingN = Math.max(0, targetN - nFromDap);
  const ureaKg = remainingN / 0.46;

  // 3. MOP (60% K2O) meets K
  const mopKg = Math.max(0, targetK2O / 0.60);

  const ureaBags50kg = Math.round((ureaKg / 50) * 10) / 10;
  const dapBags50kg = Math.round((dapKg / 50) * 10) / 10;
  const mopBags50kg = Math.round((mopKg / 50) * 10) / 10;

  return {
    urea: {
      kg: Math.round(ureaKg),
      bags50kg: ureaBags50kg,
      applicationSchedule: '50% basal at sowing, 25% at 1st irrigation/tillering, 25% at flowering.',
      applicationScheduleHi: '50% बुवाई के समय, 25% पहले पानी (कल्ले फूटते समय), 25% फूल/बाली आते समय।',
    },
    dap: {
      kg: Math.round(dapKg),
      bags50kg: dapBags50kg,
      applicationSchedule: '100% basal placement 4-5 cm below seed depth during sowing.',
      applicationScheduleHi: '100% मात्रा बुवाई के समय बीज से 4-5 सेमी नीचे कतारों में डालें।',
    },
    mop: {
      kg: Math.round(mopKg),
      bags50kg: mopBags50kg,
      applicationSchedule: 'Full dose as basal, or split with first top-dress in light sandy soils.',
      applicationScheduleHi: 'पूरी मात्रा बुवाई के समय बेसल डोज के रूप में डालें।',
    },
  };
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const standardSoil = convertToStandard(body);
    const evaluation = evaluateNutrients(standardSoil);

    const crop = (body.crop || 'wheat').toLowerCase();
    const areaAcres = parseFloat(body.area_acres || '3.2');
    const fertilizerBags = calculateFertilizerBags(crop, areaAcres, standardSoil);

    return NextResponse.json({
      success: true,
      soilParameters: standardSoil,
      evaluation,
      cropRecommendations: {
        crop,
        areaAcres,
        fertilizerBags,
      },
    });
  } catch (error: any) {
    console.error('NPK evaluation API error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to evaluate soil nutrients' },
      { status: 500 }
    );
  }
}
