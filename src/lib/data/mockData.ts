export interface SubPlot {
  id: string;
  name: string;
  crop: string;
  variety: string;
  areaAcres: number;
  sownOn: string;
  color: string;
  polygon: [number, number][];
}

export interface FarmField {
  id: string;
  name: string;
  farmerName: string;
  village: string;
  district: string;
  state: string;
  totalAreaAcres: number;
  boundary: [number, number][];
  subPlots: SubPlot[];
  soilHealth: {
    testedOn: string;
    sampleId: string;
    nitrogenKgHa: number; // Low < 280, Med 280-560, High > 560
    phosphorusKgHa: number; // Low < 10, Med 10-25, High > 25
    potassiumKgHa: number; // Low < 110, Med 110-280, High > 280
    pH: number; // 6.5 - 7.5 ideal
    organicCarbonPercent: number; // < 0.5 low, 0.5-0.75 med, > 0.75 high
    texture: string;
  };
}

export interface DiseaseRecord {
  id: string;
  crop: string;
  diseaseName: string;
  regionalName: string;
  confidence: number;
  severity: 'low' | 'medium' | 'high';
  detectedAt: string;
  location: [number, number];
  subPlotName: string;
  cause: string;
  symptoms: string[];
  organicTreatment: string;
  chemicalTreatment: string;
  imageUrl: string;
  healthScore?: number;
  healthStatus?: 'healthy' | 'moderate' | 'damaged';
  immediateAction?: string;
  precautions?: string;
}

export interface MandiPrice {
  mandi: string;
  state: string;
  crop: string;
  variety: string;
  modalPrice: number; // ₹ per quintal
  minPrice: number;
  maxPrice: number;
  date: string;
  trend: 'up' | 'down' | 'stable';
}

export interface StockLedgerEntry {
  id: string;
  crop: string;
  variety: string;
  quantityQuintals: number;
  qualityGrade: 'A+' | 'A' | 'B';
  harvestDate: string;
  estimatedValueRs: number;
  storageLocation: string;
}

export interface WeatherDay {
  day: string;
  date: string;
  tempMax: number;
  tempMin: number;
  humidity: number;
  rainfallMm: number;
  windSpeedKmh: number;
  condition: string;
  icon: string;
  et0Mm: number; // Reference Evapotranspiration
  advisory: string;
}

// ─────────────────────────────────────────────────────────────
// Primary Mock Field: 4.8 Acre Farm in Shirur, Pune (Maharashtra)
// ─────────────────────────────────────────────────────────────
export const PRIMARY_FIELD: FarmField = {
  id: 'field-01',
  name: 'Shri Ram Khet (North Farm)',
  farmerName: 'Ramesh Patel',
  village: 'Kardelwadi, Shirur',
  district: 'Pune',
  state: 'Maharashtra',
  totalAreaAcres: 4.8,
  boundary: [
    [18.8252, 74.3721],
    [18.8278, 74.3735],
    [18.8265, 74.3768],
    [18.8239, 74.3752],
  ],
  subPlots: [
    {
      id: 'sub-01',
      name: 'Plot A (North): Sharbati Wheat',
      crop: 'Wheat',
      variety: 'Sharbati (GW-322)',
      areaAcres: 3.2,
      sownOn: '2026-11-10',
      color: '#4A943E', // Leaf Green
      polygon: [
        [18.8252, 74.3721],
        [18.8278, 74.3735],
        [18.8271, 74.3751],
        [18.8245, 74.3737],
      ],
    },
    {
      id: 'sub-02',
      name: 'Plot B (South): Pusa Mustard',
      crop: 'Mustard',
      variety: 'Pusa Bold',
      areaAcres: 1.6,
      sownOn: '2026-10-25',
      color: '#B98327', // Harvest Amber
      polygon: [
        [18.8245, 74.3737],
        [18.8271, 74.3751],
        [18.8265, 74.3768],
        [18.8239, 74.3752],
      ],
    },
  ],
  soilHealth: {
    testedOn: '2026-08-15',
    sampleId: 'SHC-MH-2026-8841',
    nitrogenKgHa: 215, // Low (deficient)
    phosphorusKgHa: 19, // Medium
    potassiumKgHa: 295, // High
    pH: 7.3, // Neutral-slightly alkaline
    organicCarbonPercent: 0.54, // Medium
    texture: 'Clay Loam (काळी माती)',
  },
};

// ─────────────────────────────────────────────────────────────
// Real Disease Detection Records (with Geotags)
// ─────────────────────────────────────────────────────────────
export const MOCK_DISEASES: DiseaseRecord[] = [
  {
    id: 'dis-01',
    crop: 'Wheat',
    diseaseName: 'Yellow Rust (Stripe Rust)',
    regionalName: 'पीला रतुआ (हळद्या)',
    confidence: 94,
    severity: 'medium',
    detectedAt: '2026-10-16 09:30 AM',
    location: [18.8262, 74.3731],
    subPlotName: 'Plot A (Wheat)',
    cause: 'Fungal pathogen Puccinia striiformis favored by cool moist nights (10-15°C) and dew.',
    symptoms: [
      'Bright yellow powdery pustules forming linear stripes along leaf veins',
      'Premature drying of flag leaves reducing grain weight',
    ],
    organicTreatment:
      'Spray 5% Neem seed kernel extract (NSKE) or Trichoderma harzianum (5g/L water) in early morning.',
    chemicalTreatment:
      'Mix 25 ml Propiconazole 25% EC per 15-litre spray pump and spray immediately.',
    imageUrl: 'https://images.unsplash.com/photo-1574943320219-553eb213f72d?auto=format&fit=crop&w=600&q=80',
    healthScore: 48,
    healthStatus: 'damaged',
    immediateAction: 'खेत में रोगग्रस्त पौधों के पत्तों को अलग करें और मेड़ों पर जलभराव न होने दें।',
    precautions: 'तेज धूप में छिड़काव न करें। बारिश से पहले दवा न डालें।',
  },
  {
    id: 'dis-02',
    crop: 'Mustard',
    diseaseName: 'Alternaria Leaf Blight',
    regionalName: 'अल्टरनेरिया झुलसा',
    confidence: 88,
    severity: 'low',
    detectedAt: '2026-10-14 04:15 PM',
    location: [18.8251, 74.3755],
    subPlotName: 'Plot B (Mustard)',
    cause: 'Alternaria brassicae fungus, triggered by humid morning conditions.',
    symptoms: [
      'Circular brown spots with concentric target-board rings on lower leaves',
      'Dark sunken lesions on pods',
    ],
    organicTreatment:
      'Spray Cow urine (Gomutra) 10% solution mixed with hing (asafetida 1g/L) as a natural antifungal.',
    chemicalTreatment:
      'Mancozeb 75% WP @ 30g in 15-litre water spray pump on affected patches.',
    imageUrl: 'https://images.unsplash.com/photo-1592982537447-7440770cbfc9?auto=format&fit=crop&w=600&q=80',
    healthScore: 72,
    healthStatus: 'moderate',
    immediateAction: 'निचले सूखे और धब्बेदार पत्तों को काटकर नष्ट करें।',
    precautions: 'सुबह ओस सूखने के बाद ही छिड़काव करें।',
  },
];

// ─────────────────────────────────────────────────────────────
// Live Mandi Prices (APMC Feeds)
// ─────────────────────────────────────────────────────────────
export const MOCK_MANDI_PRICES: MandiPrice[] = [
  {
    mandi: 'Shirur APMC',
    state: 'Maharashtra',
    crop: 'Wheat',
    variety: 'Sharbati',
    modalPrice: 2480,
    minPrice: 2320,
    maxPrice: 2650,
    date: 'Today',
    trend: 'up',
  },
  {
    mandi: 'Pune APMC (Gultekdi)',
    state: 'Maharashtra',
    crop: 'Wheat',
    variety: 'Sharbati Grade A',
    modalPrice: 2560,
    minPrice: 2400,
    maxPrice: 2780,
    date: 'Today',
    trend: 'up',
  },
  {
    mandi: 'Shirur APMC',
    state: 'Maharashtra',
    crop: 'Mustard',
    variety: 'Black Mustard',
    modalPrice: 5650,
    minPrice: 5200,
    maxPrice: 5900,
    date: 'Today',
    trend: 'stable',
  },
  {
    mandi: 'Ahmednagar APMC',
    state: 'Maharashtra',
    crop: 'Mustard',
    variety: 'Pusa Bold',
    modalPrice: 5820,
    minPrice: 5400,
    maxPrice: 6050,
    date: 'Today',
    trend: 'up',
  },
  {
    mandi: 'Khanna Mandi (Asia Largest)',
    state: 'Punjab',
    crop: 'Wheat',
    variety: 'HD-2967 (MSP)',
    modalPrice: 2425,
    minPrice: 2400,
    maxPrice: 2450,
    date: 'Today',
    trend: 'stable',
  },
];

// ─────────────────────────────────────────────────────────────
// 7-Day Farm Weather Forecast with Evapotranspiration
// ─────────────────────────────────────────────────────────────
export const MOCK_WEATHER_FORECAST: WeatherDay[] = [
  {
    day: 'Today',
    date: '18 Oct',
    tempMax: 32,
    tempMin: 21,
    humidity: 58,
    rainfallMm: 0,
    windSpeedKmh: 11,
    condition: 'Sunny & Clear',
    icon: '☀️',
    et0Mm: 4.8,
    advisory: 'Good weather for weeding and manual inspection. Avoid heavy water in morning.',
  },
  {
    day: 'Tomorrow',
    date: '19 Oct',
    tempMax: 29,
    tempMin: 22,
    humidity: 82,
    rainfallMm: 18,
    windSpeedKmh: 24,
    condition: 'Thunderstorms & Rain',
    icon: '⛈️',
    et0Mm: 2.1,
    advisory: '⚠️ SKIP IRRIGATION! 18 mm rain forecasted. Do not spray pesticide.',
  },
  {
    day: 'Monday',
    date: '20 Oct',
    tempMax: 28,
    tempMin: 20,
    humidity: 75,
    rainfallMm: 6,
    windSpeedKmh: 14,
    condition: 'Scattered Showers',
    icon: '🌦️',
    et0Mm: 3.2,
    advisory: 'Soil will be moist. Check drainage channels in Plot B.',
  },
  {
    day: 'Tuesday',
    date: '21 Oct',
    tempMax: 31,
    tempMin: 19,
    humidity: 52,
    rainfallMm: 0,
    windSpeedKmh: 9,
    condition: 'Clear Sky',
    icon: '🌤️',
    et0Mm: 4.5,
    advisory: 'Favorable condition for top-dressing Urea in Wheat plot.',
  },
  {
    day: 'Wednesday',
    date: '22 Oct',
    tempMax: 33,
    tempMin: 18,
    humidity: 48,
    rainfallMm: 0,
    windSpeedKmh: 8,
    condition: 'Sunny',
    icon: '☀️',
    et0Mm: 5.1,
    advisory: 'Mild dry spell starting. Prepare for light irrigation on Thursday.',
  },
  {
    day: 'Thursday',
    date: '23 Oct',
    tempMax: 33,
    tempMin: 19,
    humidity: 45,
    rainfallMm: 0,
    windSpeedKmh: 10,
    condition: 'Sunny',
    icon: '☀️',
    et0Mm: 5.2,
    advisory: 'Irrigate Plot A (Wheat) in late evening to minimize evaporation loss.',
  },
  {
    day: 'Friday',
    date: '24 Oct',
    tempMax: 32,
    tempMin: 19,
    humidity: 50,
    rainfallMm: 0,
    windSpeedKmh: 9,
    condition: 'Partly Cloudy',
    icon: '⛅',
    et0Mm: 4.6,
    advisory: 'Normal conditions. Check for aphid incidence on mustard flowers.',
  },
];

// ─────────────────────────────────────────────────────────────
// Stock Ledger Entries
// ─────────────────────────────────────────────────────────────
export const MOCK_STOCK_LEDGER: StockLedgerEntry[] = [
  {
    id: 'stk-01',
    crop: 'Wheat',
    variety: 'Sharbati GW-322',
    quantityQuintals: 35,
    qualityGrade: 'A+',
    harvestDate: '2026-03-28',
    estimatedValueRs: 87500,
    storageLocation: 'Village Pucca Godown, Bay 3',
  },
  {
    id: 'stk-02',
    crop: 'Mustard',
    variety: 'Pusa Bold',
    quantityQuintals: 14,
    qualityGrade: 'A',
    harvestDate: '2026-04-05',
    estimatedValueRs: 79800,
    storageLocation: 'Farm Storage Room',
  },
];

// ─────────────────────────────────────────────────────────────
// Fasal Score Data Breakdown (78/100)
// ─────────────────────────────────────────────────────────────
export const MOCK_FASAL_SCORE_DETAILS = {
  overallScore: 78,
  grade: 'Very Good (उत्तम)',
  pillars: [
    {
      name: 'Crop Health (रोग मुक्त स्थिति)',
      score: 84,
      weight: '25%',
      color: '#4A943E',
      status: 'Clean leaf canopy, 1 minor rust treated on time',
    },
    {
      name: 'Stock Value & Ledger (उपज मूल्य)',
      score: 72,
      weight: '15%',
      color: '#B98327',
      status: '49 quintals held in safe moisture storage',
    },
    {
      name: 'Irrigation Discipline (सिंचाई नियम)',
      score: 88,
      weight: '20%',
      color: '#186049',
      status: 'Adhering to weather forecasts, no over-watering',
    },
    {
      name: 'Weather Risk Buffer (मौसम सुरक्षा)',
      score: 65,
      weight: '20%',
      color: '#E0A93B',
      status: 'Rain tomorrow safely handled by drainage trenches',
    },
    {
      name: 'Yield Outlook (अनुमानित पैदावार)',
      score: 81,
      weight: '20%',
      color: '#4A943E',
      status: 'Wheat heading stage healthy, expected 22 qtl/acre',
    },
  ],
  tipsToImprove: [
    'Apply 25 kg/acre vermicompost in Plot A to boost Organic Carbon from 0.54% to 0.75%',
    'Spray Zinc sulphate (0.5%) + Urea (1%) during tillering stage',
    'Set up yellow sticky traps (10 per acre) in Plot B mustard to monitor whitefly & aphids',
  ],
};
