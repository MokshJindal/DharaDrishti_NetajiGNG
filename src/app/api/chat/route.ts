import { NextRequest, NextResponse } from 'next/server';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

const KRISHI_MITRA_SYSTEM_PROMPT = `You are "Krishi Mitra" (कृषि मित्र) — an expert agricultural scientist and friendly AI advisor for DharaDrishti (धरादृष्टि).
You work in collaboration with the Indian Council of Agricultural Research (ICAR) and Krishi Vigyan Kendra (KVK).

YOUR FARMER & FIELD CONTEXT:
- Farmer Name: Ramesh Patil (रमेश पाटिल)
- Location: Shirur, Pune District, Maharashtra (शिरूर, पुणे, महाराष्ट्र)
- Field Area: 4.8 Acres total
  * Sub-Plot A: 3.2 Acres Wheat (HD-2967, currently at tillering to booting stage)
  * Sub-Plot B: 1.6 Acres Mustard (Pusa Bold, flowering stage)
- Soil Health Card (#SHC-MH-2026-8841):
  * Nitrogen (N): Low (215 kg/ha) — requires split Urea top-dressing
  * Phosphorus (P): Medium (18 kg/ha)
  * Potassium (K): High (310 kg/ha)
  * Organic Carbon: 0.48% (Low)
  * pH: 7.4 (Neutral to slightly alkaline)
- Live Weather:
  * Today: Clear, 32°C max / 19°C min, 45% humidity, calm winds
  * Tomorrow: 18 mm rain forecasted with gusty winds (25 km/h) in afternoon
  * Irrigation Advisory: SKIP WATERING TODAY to prevent waterlogging & save electricity
- Market (APMC Shirur):
  * Wheat: ₹2,480 / quintal (MSP is ₹2,425, gaining +₹55)
  * Mustard: ₹5,650 / quintal

YOUR GOAL & GUIDELINES:
1. Ground your answers in the farmer's specific field data (crop stage, soil test, tomorrow's rain forecast, and APMC rates).
2. Format your written response with clean markdown: clear headings, bullet points, bold key terms, and actionable steps.
3. Keep chemical measurements practical for Indian farmers (e.g., "per 15-liter spray pump", "per acre", "kg per bigha").
4. ALWAYS provide organic/biological remedies alongside chemical remedies where relevant.
5. In addition to the detailed written response, produce a "spokenSummary":
   - Exactly 2 to 3 concise, warm, natural spoken sentences.
   - Written in the requested language (pure English if requested in English; natural Hindi/mother-tongue if requested in regional language).
   - MUST NOT contain any markdown formatting (#, *, **), bullets, or complex jargon.
   - Designed to sound warm, human, and encouraging when read aloud by text-to-speech.

ALWAYS output your response formatted exactly in this structure:
---SPOKEN_SUMMARY---
(Write 2 to 3 concise, warm, natural spoken sentences in the requested language for audio playback. No markdown symbols or bullets.)
---CITATION---
(Source such as ICAR-IIWBR Karnal / KVK Baramati Advisory / Soil Health Card SHC-MH-2026)
---DETAILED_REPLY---
(Your full, nicely formatted markdown response with headings, bold text, bullet points, and practical advice)
`;

export async function POST(req: NextRequest) {
  try {
    const { messages = [], message = '', language = 'en' } = await req.json();

    const apiKey = process.env.ANTHROPIC_API_KEY;

    if (!message && messages.length === 0) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 });
    }

    // Prepare message history for Claude
    const userQuery = message || messages[messages.length - 1]?.content || '';
    
    // Conversation history formatting
    const formattedMessages: { role: 'user' | 'assistant'; content: string }[] = [];

    // Include last few messages for conversational context
    const recentHistory = messages.slice(-6);
    for (const msg of recentHistory) {
      if (msg.content && msg.content !== userQuery) {
        formattedMessages.push({
          role: msg.role === 'user' ? 'user' : 'assistant',
          content: msg.content,
        });
      }
    }

    // Add current user query with language instruction
    const languageInstruction =
      language === 'en'
        ? 'Please reply in pure, friendly English.'
        : language === 'pa'
        ? 'Please reply in Punjabi (ਗੁਰਮੁਖੀ) with simple language for a Punjab farmer.'
        : language === 'mr'
        ? 'Please reply in Marathi (मराठी) for a Maharashtra farmer.'
        : `Please reply in Hindi (हिन्दी) for an Indian farmer.`;

    formattedMessages.push({
      role: 'user',
      content: `${userQuery}\n\n[Instruction: ${languageInstruction}. Output JSON with "reply", "spokenSummary", and "citation"]`,
    });

    if (!apiKey) {
      // Local fallback if API key is missing
      return NextResponse.json({
        reply:
          language === 'hi'
            ? `**शिरूर खेत सलाह (4.8 एकड़):**\n- **मौसम व सिंचाई:** कल शाम 18 मिमी बारिश का अनुमान है। आज पानी बिल्कुल न लगाएं।\n- **पीला रतुआ रोकथाम:** 5% नीम तेल या 15L टंकी में 25ml प्रोपिकोनाज़ोल छिड़कें।\n- **खाद:** मिट्टी में नाइट्रोजन कम होने के कारण कल बारिश के बाद प्रति एकड़ 40 किलो यूरिया दें।`
            : `**Shirur Farm Advisory (4.8 Acres):**\n- **Weather & Water:** 18 mm rain forecasted tomorrow. Skip irrigation today to save water.\n- **Pest Watch:** If you spot yellow rust stripes on wheat, mix 25 ml Propiconazole per 15L tank.\n- **Fertiliser:** Soil nitrogen is low (215 kg/ha). Apply 40 kg Urea per acre after tomorrow's rain.`,
        spokenSummary:
          language === 'hi'
            ? 'नमस्ते किसान भाई! कल 18 मिलीमीटर बारिश होने की संभावना है, इसलिए आज खेत में पानी न दें। गेहूं में पीले रतुए से बचाव के लिए पत्तियों पर नजर रखें।'
            : 'Hello farmer! 18 mm rain is expected tomorrow, so please skip watering your wheat today to save electricity and water.',
        citation: 'ICAR-IIWBR Karnal & KVK Baramati Advisory',
      });
    }

    // Call Anthropic Claude Haiku
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 1500,
        system: KRISHI_MITRA_SYSTEM_PROMPT,
        messages: formattedMessages,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.warn('Claude API non-200 in chat route:', response.status, errText);
      throw new Error(`Claude API failed with status ${response.status}`);
    }

    const data = await response.json();
    const rawContent = data?.content?.[0]?.text || '';

    // Robust parsing: check for section delimiters or JSON
    let spokenSummary = '';
    let citation = 'ICAR & KVK Advisory';
    let reply = rawContent;

    if (rawContent.includes('---SPOKEN_SUMMARY---') && rawContent.includes('---DETAILED_REPLY---')) {
      const parts = rawContent.split('---DETAILED_REPLY---');
      reply = parts[1]?.trim() || rawContent;
      const headerPart = parts[0];

      const spokenMatch = headerPart.match(/---SPOKEN_SUMMARY---([\s\S]*?)(?=---CITATION---|$)/);
      if (spokenMatch) {
        spokenSummary = spokenMatch[1].trim();
      }

      const citeMatch = headerPart.match(/---CITATION---([\s\S]*?)$/);
      if (citeMatch) {
        citation = citeMatch[1].trim();
      }
    } else if (rawContent.includes('"reply"') && rawContent.includes('"spokenSummary"')) {
      try {
        const jsonMatch = rawContent.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          reply = parsed.reply || reply;
          spokenSummary = parsed.spokenSummary || spokenSummary;
          citation = parsed.citation || citation;
        }
      } catch {
        // Safe fallback
      }
    }

    if (!spokenSummary) {
      // Pick first clean sentence from reply without markdown
      spokenSummary = reply
        .replace(/[#*~`>]/g, '')
        .split('\n')
        .find((l: string) => l.trim().length > 15) || reply.slice(0, 160);
    }

    return NextResponse.json({
      reply: reply.trim(),
      spokenSummary: spokenSummary.trim(),
      citation: citation || 'ICAR & KVK Pune Advisory',
    });
  } catch (error) {
    console.error('Chat API route error:', error);
    return NextResponse.json(
      {
        reply:
          'DharaDrishti Kisan AI is currently processing with local advisory. For immediate crop alerts, check the live Weather and Leaf Doctor sections.',
        spokenSummary: 'Your question has been noted. Please check your field advisory on the dashboard.',
        citation: 'KVK Baramati Advisory',
      },
      { status: 200 }
    );
  }
}
