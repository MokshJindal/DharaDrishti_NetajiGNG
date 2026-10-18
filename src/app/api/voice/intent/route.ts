import { NextRequest, NextResponse } from 'next/server';

const SYSTEM_PROMPT = `You are "DharaDrishti Voice Navigator", an intelligent voice assistant helping Indian farmers operate a web application using their voice in regional languages (Hindi, Punjabi, English, Marathi, Tamil, Telugu, Gujarati, Bengali, etc.).

Your job is to analyze what the farmer said and map it to a specific page route, action, and generate a brief, clear, warm voice reply in the user's language (max 1-2 sentences).

Available Routes and Actions:
1. "/fields" (Actions: "start_walk" - measure field boundary by walking, "draw_field" - draw on map, "view_fields" - view farm plots)
2. "/diagnose" (Actions: "open_camera" - scan leaf photo, "check_disease" - diagnose plant disease or yellow leaves/fungus)
3. "/irrigation" (Actions: "check_irrigation" - whether to irrigate or wait for rain, "check_rain" - rain forecast impact)
4. "/fertiliser" (Actions: "calc_fertiliser" - calculate Urea/DAP/NPK doses for wheat, mustard, etc.)
5. "/profit" (Actions: "check_mandi" - APMC mandi rates, "calc_profit" - calculate crop earnings and net revenue)
6. "/score" (Actions: "check_score" - Fasal health and credit score, "add_stock" - record harvested stock)
7. "/weather" (Actions: "check_weather" - 5-day forecast, temperature, wind, spray conditions)
8. "/chat" (Actions: "kisan_mitra" - general agronomist Q&A)
9. Language Switch (Action: "lang_switch", specify newLang: "hi"|"pa"|"en"|"ta"|"te"|"mr"|"gu"|"bn")

IMPORTANT RULES:
- If the user asks about crop illness, yellow leaves, pests, or spray, route to "/diagnose" with action "open_camera".
- If the user asks about water, watering timing, tubewell, or rain advisory, route to "/irrigation".
- If the user asks about urea, DAP, khad, or fertiliser doses, route to "/fertiliser".
- If the user asks about mandi rates, crop prices, or profit, route to "/profit".
- If the user asks about khet boundary, plot, or measuring, route to "/fields".
- Always output strictly valid JSON without markdown code blocks.

JSON Response Format:
{
  "route": "/fields" | "/diagnose" | "/irrigation" | "/fertiliser" | "/profit" | "/score" | "/weather" | "/chat",
  "action": string,
  "params": object,
  "voiceReply": string (friendly spoken reply in the farmer's language, 1-2 sentences),
  "languageChange": string | null
}`;

export async function POST(req: NextRequest) {
  try {
    const { transcript, language = 'hi', currentRoute = '/' } = await req.json();

    if (!transcript || typeof transcript !== 'string') {
      return NextResponse.json({ error: 'Transcript is required' }, { status: 400 });
    }

    const apiKey = process.env.SARVAM_API_KEY;

    if (!apiKey) {
      // Return a basic fallback response if key is missing
      return NextResponse.json({
        fallback: true,
        route: null,
        voiceReply:
          language === 'hi'
            ? 'क्षमा करें, आवाज़ सेवा इस समय उपलब्ध नहीं है।'
            : 'Voice service currently unavailable.',
      });
    }

    const response = await fetch('https://api.sarvam.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'api-subscription-key': apiKey,
      },
      body: JSON.stringify({
        model: 'sarvam-105b',
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          {
            role: 'user',
            content: `User Language: ${language}\nCurrent Page: ${currentRoute}\nFarmer said: "${transcript.trim()}"`,
          },
        ],
        temperature: 0.1,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.warn('Sarvam Chat API returned error:', response.status, errText);
      return NextResponse.json({ fallback: true, error: errText }, { status: 200 });
    }

    const data = await response.json();
    const content = data?.choices?.[0]?.message?.content || '{}';

    // Parse JSON safely
    let parsedResult;
    try {
      const cleaned = content.replace(/```json/gi, '').replace(/```/g, '').trim();
      parsedResult = JSON.parse(cleaned);
    } catch {
      parsedResult = {
        route: null,
        voiceReply:
          language === 'hi'
            ? `मैंने सुना: "${transcript}".`
            : `I heard: "${transcript}".`,
      };
    }

    return NextResponse.json(parsedResult);
  } catch (error) {
    console.error('Intent endpoint error:', error);
    return NextResponse.json({ fallback: true }, { status: 200 });
  }
}
