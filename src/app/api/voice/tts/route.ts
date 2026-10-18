import { NextRequest, NextResponse } from 'next/server';

// Map 2-letter language code to Sarvam BCP-47 codes
const SARVAM_LANG_MAP: Record<string, string> = {
  hi: 'hi-IN',
  en: 'en-IN',
  pa: 'pa-IN',
  ta: 'ta-IN',
  te: 'te-IN',
  mr: 'mr-IN',
  gu: 'gu-IN',
  bn: 'bn-IN',
  kn: 'kn-IN',
  ml: 'ml-IN',
};

// Available speakers for bulbul:v3
// aditya, ritu, priya, neha, rahul, pooja, rohan, simran, kavya, amit, dev, ishita, shreya, ratan, varun, manan, sumit, roopa, kabir, aayan, shubh, advait, anand, tanya, tarun
const DEFAULT_SPEAKER = 'aditya';

export async function POST(req: NextRequest) {
  try {
    const { text, language = 'hi', speaker = DEFAULT_SPEAKER } = await req.json();

    if (!text || typeof text !== 'string') {
      return NextResponse.json({ error: 'Text is required', fallback: true }, { status: 400 });
    }

    const apiKey = process.env.SARVAM_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'SARVAM_API_KEY is not configured', fallback: true },
        { status: 200 }
      );
    }

    const targetLangCode = SARVAM_LANG_MAP[language] || 'hi-IN';

    // Call Sarvam bulbul:v3 API
    const response = await fetch('https://api.sarvam.ai/text-to-speech', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'api-subscription-key': apiKey,
      },
      body: JSON.stringify({
        inputs: [text.trim()],
        target_language_code: targetLangCode,
        speaker: speaker,
        model: 'bulbul:v3',
        pace: 1.0,
      }),
    });

    if (!response.ok) {
      const errData = await response.text();
      console.warn('Sarvam TTS API returned non-200:', response.status, errData);
      return NextResponse.json(
        { error: 'Sarvam API call failed', details: errData, fallback: true },
        { status: 200 }
      );
    }

    const data = await response.json();
    const audioBase64 = data?.audios?.[0];

    if (!audioBase64) {
      return NextResponse.json(
        { error: 'No audio returned from Sarvam', fallback: true },
        { status: 200 }
      );
    }

    return NextResponse.json({
      audioBase64,
      format: 'audio/wav',
      language: targetLangCode,
      speaker,
    });
  } catch (error) {
    console.error('TTS endpoint error:', error);
    return NextResponse.json(
      { error: 'Internal TTS error', fallback: true },
      { status: 200 }
    );
  }
}
