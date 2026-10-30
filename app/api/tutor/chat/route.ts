import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const message = (body.message || body.query || "").trim();
    if (!message) {
      return NextResponse.json(
        { error: "A student question or message is required." },
        { status: 422 }
      );
    }

    if (message.length > 2000) {
      return NextResponse.json(
        { error: "Message exceeds maximum allowed length of 2000 characters." },
        { status: 422 }
      );
    }

    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "http://127.0.0.1:8000";

    // 1. Forward request to FastAPI backend
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 12000); // 12s timeout

      const backendRes = await fetch(`${backendUrl}/tutor/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      });
      clearTimeout(timeout);

      if (backendRes.ok) {
        const data = await backendRes.json();
        return NextResponse.json(data);
      } else {
        const errData = await backendRes.json().catch(() => ({}));
        if (backendRes.status === 422) {
          return NextResponse.json(errData, { status: 422 });
        }
      }
    } catch (fetchErr) {
      // Backend may be offline or unreachable; proceed to fallback
    }

    // 2. Local pedagogical Socratic fallback
    const language = (body.language || "en").toLowerCase();
    const challengeId = body.challenge_id || "";
    const title = body.challenge_title || "this problem";

    let responseText = "";
    let nextAction = "Try writing down the expected result for a single small input case.";

    if (language === "kn") {
      responseText = `ಖಂಡಿತ, ${title} ಬಗ್ಗೆ ಕಲಿಯೋಣ! ಮೊದಲು ಈ ಸಮಸ್ಯೆಯ ಮುಖ್ಯ ಗುರಿಯನ್ನು ಗಮನಿಸಿ. ನಿಮ್ಮ ಕೋಡ್‌ನಲ್ಲಿ ನೀವು ಯಾವ ಮೊದಲ ಹಂತವನ್ನು ಯೋಚಿಸಿದ್ದೀರಿ? ಒಮ್ಮೆ ಸರಳ ಉದಾಹರಣೆಯೊಂದಿಗೆ ಯೋಚಿಸಿ ನೋಡಿ.`;
      nextAction = "ಮೊದಲು ಇನ್ಪುಟ್ ಮತ್ತು ಔಟ್ಪುಟ್ ಅನ್ನು ಹೋಲಿಸಿ ನೋಡಿ";
    } else if (language === "hi") {
      responseText = `आइए ${title} को आसान भाषा में समझते हैं! समस्या के इनपुट और आउटपुट को ध्यान से देखिए। आपके अनुसार इस फ़ंक्शन को सबसे पहले क्या जांचना चाहिए?`;
      nextAction = "एक छोटे इनपुट उदाहरण के साथ शुरुआत करें";
    } else {
      responseText = `Let's break down ${title} together! Before writing code, what is the very first transformation that must happen between your input and the expected output? What have you tried so far?`;
      nextAction = "Trace the logic with the first sample example test case";
    }

    return NextResponse.json({
      response: responseText,
      language: language === "kn" ? "kn" : language === "hi" ? "hi" : "en",
      mode: "socratic",
      next_action: nextAction,
      suggested_followups: [
        language === "kn"
          ? "ಸರಳ ಉದಾಹರಣೆ ನೀಡಬಹುದೇ?"
          : language === "hi"
          ? "क्या आप एक छोटा उदाहरण दे सकते हैं?"
          : "Can you give me a small example?",
        language === "kn"
          ? "ನನ್ನ ಕೋಡ್ ಸರಿಯಾಗಿದೆಯೇ?"
          : language === "hi"
          ? "क्या मेरा कोड सही है?"
          : "Is my code on the right track?",
        language === "kn"
          ? "ಮುಂದಿನ ಹಂತವೇನು?"
          : language === "hi"
          ? "अगला कदम क्या होगा?"
          : "What should be my next step?",
      ],
      challenge_id: challengeId,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Failed to process tutor request." },
      { status: 500 }
    );
  }
}
