import { NextRequest, NextResponse } from "next/server";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

interface GeminiChatRequestBody {
  message: string;
  history?: ChatMessage[];
  language?: "en" | "kn" | "hi";
  command?: string;
}

export async function POST(req: NextRequest) {
  try {
    const body: GeminiChatRequestBody = await req.json();

    const rawMessage = (body.message || "").trim();
    if (!rawMessage) {
      return NextResponse.json(
        { error: "A message is required to chat with Gemini." },
        { status: 422 }
      );
    }

    if (rawMessage.length > 3000) {
      return NextResponse.json(
        { error: "Message exceeds maximum allowed length of 3000 characters." },
        { status: 422 }
      );
    }

    const language = body.language || "en";
    const history = body.history || [];
    const command = body.command || "";

    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "http://127.0.0.1:8000";
    const geminiApiKey = process.env.GEMINI_API_KEY || "";

    // 1. Try FastAPI backend tutor/chat route (runs Google Gen AI Python SDK with Gemma 4 / Gemini)
    try {
      const backendController = new AbortController();
      const timeout = setTimeout(() => backendController.abort(), 8000);

      const backendRes = await fetch(`${backendUrl}/tutor/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          challenge_id: "general-learning",
          challenge_title: "General Python & DSA Inquiry",
          message: command ? `${command}: ${rawMessage}` : rawMessage,
          language,
          history: history.slice(-10),
        }),
        signal: backendController.signal,
        cache: "no-store",
      });
      clearTimeout(timeout);

      if (backendRes.ok) {
        const data = await backendRes.json();
        return NextResponse.json({
          response: data.response,
          next_action: data.next_action || null,
          suggested_followups: data.suggested_followups || [
            "Can you explain with a code example?",
            "What is the time complexity of this approach?",
            "Are there common edge cases to watch out for?",
          ],
          model: "Gemma 4 / Gemini GenAI",
          timestamp: new Date().toISOString(),
        });
      }
    } catch (backendErr) {
      console.warn("FastAPI backend tutor unavailable, attempting direct Gemini API endpoint:", backendErr);
    }

    // 2. Direct Gemini API call if GEMINI_API_KEY is available
    if (geminiApiKey) {
      try {
        const geminiModels = [
          "gemini-2.5-flash-lite",
          "gemini-flash-latest",
          "gemini-1.5-flash",
        ];

        let systemInstruction =
          "You are LocalLearn AI, an expert, patient, and encouraging AI programming tutor. " +
          "Help students learn Python, Data Structures & Algorithms, and modern web development through clear, " +
          "step-by-step guidance. Use markdown for code formatting. " +
          "Keep explanations beginner-friendly, concise, and focused.";

        if (language === "kn") {
          systemInstruction +=
            " Explain in friendly, natural Kannada, but keep all Python keywords, syntax, and variable names in English.";
        } else if (language === "hi") {
          systemInstruction +=
            " Explain in friendly, conversational Hindi (Devanagari), but keep all Python keywords, syntax, and variable names in English.";
        }

        const contents = [
          ...history.slice(-8).map((msg) => ({
            role: msg.role === "assistant" ? "model" : "user",
            parts: [{ text: msg.content }],
          })),
          {
            role: "user",
            parts: [{ text: command ? `${command}: ${rawMessage}` : rawMessage }],
          },
        ];

        for (const model of geminiModels) {
          try {
            const directRes = await fetch(
              `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${geminiApiKey}`,
              {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  contents,
                  systemInstruction: {
                    parts: [{ text: systemInstruction }],
                  },
                  generationConfig: {
                    temperature: 0.7,
                    maxOutputTokens: 1024,
                  },
                }),
                cache: "no-store",
              }
            );

            if (directRes.ok) {
              const geminiData = await directRes.json();
              const text =
                geminiData?.candidates?.[0]?.content?.parts?.[0]?.text;

              if (text && text.trim()) {
                return NextResponse.json({
                  response: text.trim(),
                  suggested_followups: [
                    "Can you give me a small code example?",
                    "What are the best practices here?",
                    "How does this scale in production?",
                  ],
                  model: `Gemini (${model})`,
                  timestamp: new Date().toISOString(),
                });
              }
            }
          } catch (modelErr) {
            console.warn(`Gemini model ${model} request error:`, modelErr);
          }
        }
      } catch (geminiErr) {
        console.warn("Direct Gemini API attempt failed:", geminiErr);
      }
    }

    // 3. Fallback educational response generator for robust offline / unconfigured operation
    let fallbackText = "";
    if (language === "kn") {
      fallbackText = `LocalLearn AI ಗೆ ಸ್ವಾಗತ! ನಿಮ್ಮ ಪ್ರಶ್ನೆ "${rawMessage}" ಅನ್ನು ಪರಿಶೀಲಿಸಲಾಗುತ್ತಿದೆ. Python ನಲ್ಲಿ ಪ್ರೋಗ್ರಾಮಿಂಗ್ ಕಲಿಯುವಾಗ ಮೂಲಭೂತ ಪರಿಕಲ್ಪನೆಗಳು ಮತ್ತು ಡೇಟಾ ರಚನೆಗಳನ್ನು ಹಂತ-ಹಂತವಾಗಿ ಅರ್ಥಮಾಡಿಕೊಳ್ಳುವುದು ಮುಖ್ಯ. ನೀವು ನಿರ್ದಿಷ್ಟವಾಗಿ ಯಾವ ಕೋಡ್ ಅನ್ನು ಪರೀಕ್ಷಿಸಲು ಬಯಸುತ್ತೀರಿ?`;
    } else if (language === "hi") {
      fallbackText = `LocalLearn AI में आपका स्वागत है! आपके प्रश्न "${rawMessage}" को प्रोसेस किया गया। Python और डेटा स्ट्रक्चर्स को समझने के लिए सबसे पहले समस्या को छोटे-छोटे चरणों में विभाजित करें। क्या आप किसी विशिष्ट कोड को रन या डिबग करना चाहते हैं?`;
    } else {
      fallbackText = `Welcome to LocalLearn AI! Regarding your question "${rawMessage}": when working in Python, breaking the problem into modular steps and verifying input constraints is always the best starting point. Would you like me to walk through a conceptual explanation, review a code snippet, or generate progressive hints?`;
    }

    return NextResponse.json({
      response: fallbackText,
      suggested_followups: [
        "Explain this concept with an example",
        "How do I debug a Python error?",
        "Show me the recommended algorithm pattern",
      ],
      model: "LocalLearn AI Engine",
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    console.error("Gemini chat route exception:", err);
    return NextResponse.json(
      { error: "Internal Server Error in Gemini chat API" },
      { status: 500 }
    );
  }
}
