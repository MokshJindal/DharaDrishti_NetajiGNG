import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file');
    const language = (formData.get('language') as string) || 'hi';

    if (!file || !(file instanceof Blob)) {
      return NextResponse.json(
        { error: 'Audio file is required' },
        { status: 400 }
      );
    }

    const apiKey =
      process.env.SARVAM_API_KEY || 'sk_gops1gpv_0TsSugHiLB2ngNV5dduefdX8';

    const bcpMap: Record<string, string> = {
      en: 'en-IN',
      hi: 'hi-IN',
      pa: 'pa-IN',
      mr: 'mr-IN',
      ta: 'ta-IN',
      te: 'te-IN',
      gu: 'gu-IN',
      bn: 'bn-IN',
      kn: 'kn-IN',
      ml: 'ml-IN',
    };

    const targetLangCode = bcpMap[language] || 'hi-IN';

    // Prepare form data for Sarvam AI Speech-to-Text
    const sarvamFormData = new FormData();
    sarvamFormData.append('file', file, 'audio.wav');
    sarvamFormData.append('model', 'saarika:v2.5');
    sarvamFormData.append('language_code', targetLangCode);

    const response = await fetch('https://api.sarvam.ai/speech-to-text', {
      method: 'POST',
      headers: {
        'api-subscription-key': apiKey,
      },
      body: sarvamFormData,
    });

    if (!response.ok) {
      const errText = await response.text();
      console.warn('Sarvam STT returned error:', response.status, errText);
      return NextResponse.json(
        { error: 'Sarvam STT failed', details: errText },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json({
      success: true,
      transcript: data.transcript || '',
      language_code: data.language_code,
    });
  } catch (error: any) {
    console.error('STT API route error:', error);
    return NextResponse.json(
      { error: error.message || 'Speech-to-text processing failed' },
      { status: 500 }
    );
  }
}
