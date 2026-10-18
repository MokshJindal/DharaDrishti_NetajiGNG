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

// Best expressive conversational voices for each language in bulbul:v4-flash
const V4_CONVERSATIONAL_SPEAKERS: Record<string, string> = {
  hi: 'aditya_hi_conversational', // Warm, fluent, friendly conversational Hindi
  en: 'amelia_en_conversational', // Natural, clear Indian English
  pa: 'anand_pa_conversation',    // Warm Punjabi
  mr: 'ishita_mr_conversational', // Fluent Marathi
  gu: 'bhavik_gu_conversation',   // Fluent Gujarati
  bn: 'arnab_bn_conversation',    // Fluent Bengali
  ta: 'gokul_ta_narration',       // Clear Tamil
  te: 'kavitha_te_conversation',  // Fluent Telugu
  kn: 'chaitra_kn_conversation',  // Fluent Kannada
};

// Fallback speakers for bulbul:v3
const V3_SPEAKERS: Record<string, string> = {
  hi: 'shubh',
  en: 'aditya',
  pa: 'anand',
  mr: 'rohan',
  gu: 'amit',
  bn: 'dev',
  ta: 'ratan',
  te: 'varun',
  kn: 'rahul',
  ml: 'aditya',
};

// Clean text for text-to-speech to remove markdown, hashes, asterisks, brackets, and emojis
function cleanTextForSpeech(input: string, lang: string): string {
  if (!input) return '';
  let clean = input;

  // 1. Remove markdown code blocks and backticks
  clean = clean.replace(/```[\s\S]*?```/g, '');
  clean = clean.replace(/`([^`]+)`/g, '$1');

  // 2. Remove markdown images and links
  clean = clean.replace(/!\[([^\]]*)\]\([^)]*\)/g, '');
  clean = clean.replace(/\[([^\]]*)\]\([^)]*\)/g, '$1');

  // 3. Remove markdown headers, bold, italics, strikethrough
  clean = clean.replace(/^#{1,6}\s+/gm, '');
  clean = clean.replace(/\*\*([^*]+)\*\*/g, '$1');
  clean = clean.replace(/\*([^*]+)\*/g, '$1');
  clean = clean.replace(/__([^_]+)__/g, '$1');
  clean = clean.replace(/_([^_]+)_/g, '$1');
  clean = clean.replace(/~~([^~]+)~~/g, '$1');

  // 4. Remove list bullets, blockquotes, horizontal rules, table bars
  clean = clean.replace(/^[\s]*[-*+]\s+/gm, '');
  clean = clean.replace(/^[\s]*\d+\.\s+/gm, '');
  clean = clean.replace(/^>\s+/gm, '');
  clean = clean.replace(/---/g, '');
  clean = clean.replace(/\|/g, ' ');

  // 5. Expand symbols to natural spoken words
  if (lang === 'en') {
    clean = clean.replace(/%/g, ' percent');
    clean = clean.replace(/₹\s*(\d+)/g, '$1 rupees');
    clean = clean.replace(/°C/g, ' degrees Celsius');
    clean = clean.replace(/(\d+)\s*kg/gi, '$1 kilograms');
    clean = clean.replace(/(\d+)\s*mm/gi, '$1 millimeters');
    clean = clean.replace(/\bha\b/gi, 'hectare');
  } else {
    clean = clean.replace(/%/g, ' प्रतिशत');
    clean = clean.replace(/₹\s*(\d+)/g, '$1 रुपये');
    clean = clean.replace(/°C/g, ' डिग्री सेल्सियस');
    clean = clean.replace(/(\d+)\s*kg/gi, '$1 किलो');
    clean = clean.replace(/(\d+)\s*mm/gi, '$1 मिलीमीटर');
    clean = clean.replace(/\bha\b/gi, 'हेक्टेयर');
    clean = clean.replace(/\bMSP\b/gi, 'एमएसपी');
    clean = clean.replace(/\bKVK\b/gi, 'कृषि विज्ञान केंद्र');
  }

  // 6. Strip emojis and unwanted symbols
  clean = clean.replace(/[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, '');
  clean = clean.replace(/[#*~`]/g, '');
  clean = clean.replace(/\s+/g, ' ').trim();

  // 7. Limit length to first 2-3 sentences (max 400 chars) for fast, natural audio
  if (clean.length > 400) {
    const sentences = clean.split(/(?<=[।!?.\n])/);
    let truncated = '';
    for (const s of sentences) {
      if ((truncated + s).length <= 400) {
        truncated += s + ' ';
      } else {
        break;
      }
    }
    clean = truncated.trim() || clean.slice(0, 350) + (lang === 'en' ? '.' : '।');
  }

  return clean;
}

export async function POST(req: NextRequest) {
  try {
    const { text, language = 'hi', speakerOverride } = await req.json();

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
    const cleanedText = cleanTextForSpeech(text, language);

    if (!cleanedText) {
      return NextResponse.json({ error: 'No clean text to speak', fallback: true }, { status: 400 });
    }

    // Tier 1: Try bulbul:v4-flash with conversational voice
    const v4Speaker = speakerOverride || V4_CONVERSATIONAL_SPEAKERS[language];
    if (v4Speaker) {
      try {
        const v4Res = await fetch('https://api.sarvam.ai/text-to-speech', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'api-subscription-key': apiKey,
          },
          body: JSON.stringify({
            inputs: [cleanedText],
            target_language_code: targetLangCode,
            speaker: v4Speaker,
            model: 'bulbul:v4-flash',
            pace: 1.0,
          }),
        });

        if (v4Res.ok) {
          const data = await v4Res.json();
          const audioBase64 = data?.audios?.[0];
          if (audioBase64) {
            return NextResponse.json({
              audioBase64,
              format: 'audio/wav',
              language: targetLangCode,
              speaker: v4Speaker,
              model: 'bulbul:v4-flash',
            });
          }
        }
      } catch (err) {
        console.warn('bulbul:v4-flash attempt failed, falling back to bulbul:v3:', err);
      }
    }

    // Tier 2: Fallback to bulbul:v3 with classic speaker
    const v3Speaker = speakerOverride || V3_SPEAKERS[language] || 'shubh';
    const v3Res = await fetch('https://api.sarvam.ai/text-to-speech', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'api-subscription-key': apiKey,
      },
      body: JSON.stringify({
        inputs: [cleanedText],
        target_language_code: targetLangCode,
        speaker: v3Speaker,
        model: 'bulbul:v3',
        pace: 1.0,
      }),
    });

    if (!v3Res.ok) {
      const errData = await v3Res.text();
      console.warn('Sarvam v3 TTS failed:', v3Res.status, errData);
      return NextResponse.json(
        { error: 'Sarvam API call failed', details: errData, fallback: true },
        { status: 200 }
      );
    }

    const data = await v3Res.json();
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
      speaker: v3Speaker,
      model: 'bulbul:v3',
    });
  } catch (error) {
    console.error('TTS endpoint error:', error);
    return NextResponse.json(
      { error: 'Internal TTS error', fallback: true },
      { status: 200 }
    );
  }
}
