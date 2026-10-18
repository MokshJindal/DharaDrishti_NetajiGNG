import { NextResponse } from 'next/server';

// WMO Weather interpretation dictionary from Weather_Logic/weather_codes.py
const WMO_CODES: Record<number, { description: string; hindi: string; icon: string }> = {
  0: { description: 'Clear sky', hindi: 'साफ आसमान', icon: '☀️' },
  1: { description: 'Mainly clear', hindi: 'मुख्य रूप से साफ', icon: '🌤️' },
  2: { description: 'Partly cloudy', hindi: 'आंशिक बादल', icon: '⛅' },
  3: { description: 'Overcast', hindi: 'घने बादल', icon: '☁️' },
  45: { description: 'Fog', hindi: 'कोहरा', icon: '🌫️' },
  48: { description: 'Depositing rime fog', hindi: 'घना कोहरा', icon: '🌫️' },
  51: { description: 'Light drizzle', hindi: 'हल्की बूंदाबांदी', icon: '🌦️' },
  53: { description: 'Moderate drizzle', hindi: 'मध्यम बूंदाबांदी', icon: '🌦️' },
  55: { description: 'Dense drizzle', hindi: 'तेज बूंदाबांदी', icon: '🌧️' },
  61: { description: 'Slight rain', hindi: 'हल्की बारिश', icon: '🌧️' },
  63: { description: 'Moderate rain', hindi: 'मध्यम बारिश', icon: '🌧️' },
  65: { description: 'Heavy rain', hindi: 'भारी बारिश', icon: '⛈️' },
  71: { description: 'Slight snow fall', hindi: 'हल्की बर्फबारी', icon: '🌨️' },
  80: { description: 'Slight rain showers', hindi: 'हल्की बौछारें', icon: '🌦️' },
  81: { description: 'Moderate rain showers', hindi: 'मध्यम बौछारें', icon: '🌧️' },
  82: { description: 'Violent rain showers', hindi: 'तेज मूसलाधार बौछारें', icon: '⛈️' },
  95: { description: 'Thunderstorm', hindi: 'आंधी तूफान / बिजली चमकना', icon: '⛈️' },
  96: { description: 'Thunderstorm with slight hail', hindi: 'ओलावृष्टि के साथ तूफान', icon: '⛈️' },
  99: { description: 'Thunderstorm with heavy hail', hindi: 'भारी ओलावृष्टि व तूफान', icon: '⛈️' },
};

function calculateLVI(
  precipMm: number,
  rainProbPct: number,
  ureaApplied: boolean = false,
  soilNStatus: string = 'normal'
) {
  const precipScore = Math.min(60.0, (precipMm / 30.0) * 60.0);
  const probScore = (rainProbPct / 100.0) * 20.0;
  let multiplier = 1.0;

  const status = (soilNStatus || '').toLowerCase();
  if (ureaApplied) multiplier += 0.35;
  if (['low', 'deficient', 'critical'].includes(status)) multiplier += 0.25;

  const lviScore = Math.round(Math.min(100.0, (precipScore + probScore) * multiplier) * 10) / 10;

  let level: 'CRITICAL' | 'HIGH' | 'MODERATE' | 'LOW' = 'LOW';
  let details = 'LOW RISK: Moisture and leaching threat is minimal under current weather projections.';
  let detailsHi = 'कम जोखिम: वर्तमान मौसम में नाइट्रोजन बहने का खतरा न्यूनतम है।';

  if (lviScore >= 70.0) {
    level = 'CRITICAL';
    details = 'CRITICAL HAZARD: Deep flood irrigation must be strictly avoided! High rainfall will flush mobile nitrate (NO3-) past root depth. Applying water now guarantees severe fertilizer loss.';
    detailsHi = 'गंभीर खतरा: भारी सिंचाई या बाढ़ विधि से पानी बिल्कुल न दें! बारिश यूरिया/नाइट्रोजन को जड़ों से नीचे बहा ले जाएगी।';
  } else if (lviScore >= 45.0) {
    level = 'HIGH';
    details = 'HIGH RISK: Postpone all fertigation and heavy irrigation. Soil moisture from incoming rain is sufficient. Flood irrigation will trigger rapid downward percolation and nitrogen leaching.';
    detailsHi = 'उच्च जोखिम: यूरिया छिड़काव और भारी सिंचाई टालें। बारिश की नमी पर्याप्त है।';
  } else if (lviScore >= 25.0) {
    level = 'MODERATE';
    details = 'MODERATE RISK: Monitor rain accumulation. Limit irrigation to shallow micro-drips if required.';
    detailsHi = 'मध्यम जोखिम: बारिश पर नजर रखें। केवल हल्की ड्रिप सिंचाई करें।';
  }

  return { lvi: lviScore, level, details, detailsHi };
}

function calculateFungalRisk(
  forecastHours: Array<{ humidity: number; cloudCover: number; weatherCode: number }>
) {
  const window72 = forecastHours.slice(0, 72);
  if (window72.length === 0) {
    return {
      riskLevel: 'SAFE',
      avgHumidity3d: 50,
      hoursAbove80: 0,
      overcastHours: 0,
      recommendation: 'Conditions are dry and unfavorable for fungal spores.',
      recommendationHi: 'मौसम सूखा है, फफूंद लगने का खतरा नहीं है।',
    };
  }

  const avgHumidity =
    window72.reduce((acc, h) => acc + h.humidity, 0) / window72.length;
  const hoursAbove80 = window72.filter((h) => h.humidity >= 80).length;
  const overcastHours = window72.filter(
    (h) => h.cloudCover >= 75 || h.weatherCode === 3 || (h.weatherCode >= 51 && h.weatherCode <= 65)
  ).length;

  let riskLevel = 'SAFE';
  let recommendation = 'Environmental conditions are unfavorable for fungal spore proliferation.';
  let recommendationHi = 'वातावरण फफूंद जनित रोगों के अनुकूल नहीं है। फसल सुरक्षित है।';

  if (hoursAbove80 >= 36 && overcastHours >= 24) {
    riskLevel = 'CRITICAL';
    recommendation =
      'CRITICAL: Extended damp and overcast microclimate detected! Prohibit all overhead sprinkler irrigation. Inspect for Blight/Downy Mildew and consider preventative bio-fungicide.';
    recommendationHi =
      'अत्यंत गंभीर: 36 घंटे से अधिक समय तक उच्च आर्द्रता! फव्वारा सिंचाई न करें। ब्लाइट और पाउडरी मिल्ड्यू की रोकथाम हेतु फफूंदनाशक का प्रबंध करें।';
  } else if (hoursAbove80 >= 24 || (avgHumidity >= 78 && overcastHours >= 18)) {
    riskLevel = 'HIGH';
    recommendation =
      'HIGH FUNGAL RISK: Prolonged leaf wetness likely. Switch from overhead sprinkling to ground drip irrigation. Ensure adequate crop aeration.';
    recommendationHi =
      'उच्च जोखिम: पत्तियों पर नमी बनी रहेगी। फव्वारा सिंचाई की जगह ड्रिप का उपयोग करें।';
  } else if (hoursAbove80 >= 12 || avgHumidity >= 70) {
    riskLevel = 'MODERATE';
    recommendation =
      'MODERATE RISK: Moderate humidity levels. Delay evening irrigation to prevent extended overnight leaf wetness.';
    recommendationHi =
      'मध्यम जोखिम: शाम के समय सिंचाई करने से बचें ताकि रात भर पत्तियों पर नमी न ठहरे।';
  }

  return {
    riskLevel,
    avgHumidity3d: Math.round(avgHumidity * 10) / 10,
    hoursAbove80,
    overcastHours,
    recommendation,
    recommendationHi,
  };
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const lat = parseFloat(searchParams.get('lat') || '18.8262'); // Shirur, Pune, MH default
    const lon = parseFloat(searchParams.get('lon') || '74.3731');
    const ureaApplied = searchParams.get('urea_applied') === 'true';
    const soilN = searchParams.get('soil_n') || 'normal';

    const apiUrl = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&hourly=temperature_2m,relative_humidity_2m,precipitation,precipitation_probability,cloud_cover,weather_code,wind_speed_10m&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum,precipitation_probability_max,wind_speed_10m_max&timezone=Asia%2FKolkata&forecast_days=7&past_days=3`;

    const res = await fetch(apiUrl, { next: { revalidate: 1800 } });
    if (!res.ok) {
      throw new Error(`Open-Meteo returned status ${res.status}`);
    }

    const data = await res.json();
    const hourly = data.hourly || {};
    const daily = data.daily || {};

    // Find index for current hour
    const nowIso = new Date().toISOString().slice(0, 13);
    let currentIdx = hourly.time?.findIndex((t: string) => t.startsWith(nowIso)) ?? 0;
    if (currentIdx === -1) currentIdx = 72; // default after 3 past days

    const currentTemp = hourly.temperature_2m?.[currentIdx] ?? 28;
    const currentHumidity = hourly.relative_humidity_2m?.[currentIdx] ?? 65;
    const currentWeatherCode = hourly.weather_code?.[currentIdx] ?? 0;
    const currentWindSpeed = hourly.wind_speed_10m?.[currentIdx] ?? 10;
    const weatherMeta = WMO_CODES[currentWeatherCode] || {
      description: 'Partly cloudy',
      hindi: 'आंशिक बादल',
      icon: '⛅',
    };

    // Next 48 hours for rain leaching
    const next48Precip = hourly.precipitation?.slice(currentIdx, currentIdx + 48) || [];
    const next48Prob = hourly.precipitation_probability?.slice(currentIdx, currentIdx + 48) || [];
    const totalPrecip48 = Math.round(next48Precip.reduce((a: number, b: number) => a + b, 0) * 10) / 10;
    const maxRainProb48 = Math.max(...(next48Prob.length ? next48Prob : [0]));

    // 72 hour window for fungal disease evaluation
    const next72Hours = [];
    for (let i = currentIdx; i < Math.min(hourly.time?.length || 0, currentIdx + 72); i++) {
      next72Hours.push({
        humidity: hourly.relative_humidity_2m?.[i] ?? 60,
        cloudCover: hourly.cloud_cover?.[i] ?? 20,
        weatherCode: hourly.weather_code?.[i] ?? 0,
      });
    }

    // Run Weather_Logic calculations
    const rainTriggered = totalPrecip48 > 10.0 || maxRainProb48 > 65;
    const lvi = calculateLVI(totalPrecip48, maxRainProb48, ureaApplied, soilN);
    const fungal = calculateFungalRisk(next72Hours);

    // Irrigation status decision
    let overallIrrigationStatus: 'HOLD' | 'DELAY_24H' | 'SWITCH_METHOD' | 'SAFE_TO_IRRIGATE' =
      'SAFE_TO_IRRIGATE';
    let summaryBanner = 'Safe to irrigate according to standard crop schedule.';
    let summaryBannerHi = 'सामान्य समय सारणी के अनुसार सिंचाई करना सुरक्षित है।';

    if (rainTriggered || lvi.level === 'CRITICAL' || lvi.level === 'HIGH') {
      overallIrrigationStatus = 'HOLD';
      summaryBanner = `HOLD IRRIGATION: ${totalPrecip48}mm rain forecast with ${maxRainProb48}% probability. Save water and prevent nitrogen leaching!`;
      summaryBannerHi = `सिंचाई रोकें: ${totalPrecip48} मिमी बारिश और ${maxRainProb48}% संभावना का अनुमान है। पानी और खाद की बर्बादी रोकें!`;
    } else if (fungal.riskLevel === 'CRITICAL' || fungal.riskLevel === 'HIGH') {
      overallIrrigationStatus = 'SWITCH_METHOD';
      summaryBanner = 'SWITCH IRRIGATION: High humidity fosters fungal spore growth. Switch from overhead sprinklers to drip lines.';
      summaryBannerHi = 'सिंचाई विधि बदलें: उच्च आर्द्रता से फफूंद का खतरा है। फव्वारा सिंचाई की जगह केवल ड्रिप से पानी दें।';
    } else if (maxRainProb48 > 40) {
      overallIrrigationStatus = 'DELAY_24H';
      summaryBanner = 'DELAY IRRIGATION: Moderate rain chances. Postpone for 24 hours and re-check.';
      summaryBannerHi = '24 घंटे प्रतीक्षा करें: हल्की बारिश की संभावना है।';
    }

    // 7-day daily summary cards
    const dailyForecast = (daily.time || []).map((dateStr: string, idx: number) => {
      const code = daily.weather_code?.[idx] ?? 0;
      const meta = WMO_CODES[code] || { description: 'Clear', hindi: 'साफ', icon: '☀️' };
      return {
        date: dateStr,
        tempMax: daily.temperature_2m_max?.[idx],
        tempMin: daily.temperature_2m_min?.[idx],
        rainMm: daily.precipitation_sum?.[idx],
        rainProb: daily.precipitation_probability_max?.[idx],
        windSpeed: daily.wind_speed_10m_max?.[idx],
        weatherCode: code,
        description: meta.description,
        descriptionHi: meta.hindi,
        icon: meta.icon,
      };
    });

    return NextResponse.json({
      success: true,
      location: {
        latitude: lat,
        longitude: lon,
        name: lat === 18.8262 ? 'Shirur, Pune, Maharashtra' : `${lat.toFixed(3)}, ${lon.toFixed(3)}`,
      },
      current: {
        temperature: currentTemp,
        humidity: currentHumidity,
        windSpeed: currentWindSpeed,
        weatherCode: currentWeatherCode,
        description: weatherMeta.description,
        descriptionHi: weatherMeta.hindi,
        icon: weatherMeta.icon,
      },
      advisory: {
        status: overallIrrigationStatus,
        summaryBanner,
        summaryBannerHi,
        rainTriggered,
        precip48h: totalPrecip48,
        maxProb48h: maxRainProb48,
        leachingVulnerabilityIndex: lvi,
        fungalDiseaseRisk: fungal,
      },
      daily: dailyForecast,
    });
  } catch (error: any) {
    console.error('Weather intelligence API error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch weather intelligence' },
      { status: 500 }
    );
  }
}
