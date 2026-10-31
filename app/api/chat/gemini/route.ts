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

const GEMINI_TIMEOUT_MS = 2500; // 2.5s network timeout to detect offline or slow network fast
const OLLAMA_TIMEOUT_MS = 60000; // 60s timeout for local CPU/GPU inference

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
    const ollamaBaseUrl = process.env.OLLAMA_BASE_URL || "http://127.0.0.1:11434";
    const ollamaModel = process.env.OLLAMA_MODEL || "llama3.2:latest";

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

    // =========================================================================
    // 1. ONLINE ATTEMPT: Try Gemini (FastAPI or Direct API with 2.5s network timeout)
    // =========================================================================
    let onlineResponse: string | null = null;
    let onlineModelName = "Gemini AI";

    // 1A. Direct Gemini API call if GEMINI_API_KEY is available
    if (geminiApiKey) {
      const geminiModels = [
        "gemini-2.5-flash-lite",
        "gemini-flash-latest",
        "gemini-1.5-flash",
      ];

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
          const controller = new AbortController();
          const timer = setTimeout(() => controller.abort(), GEMINI_TIMEOUT_MS);

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
              signal: controller.signal,
              cache: "no-store",
            }
          );
          clearTimeout(timer);

          if (directRes.ok) {
            const geminiData = await directRes.json();
            const text = geminiData?.candidates?.[0]?.content?.parts?.[0]?.text;
            if (text && text.trim()) {
              onlineResponse = text.trim();
              onlineModelName = `Gemini (${model})`;
              break;
            }
          }
        } catch (geminiErr: any) {
          console.warn(`[Network check] Gemini ${model} unavailable or timed out (>2.5s):`, geminiErr?.message || geminiErr);
        }
      }
    }

    // 1B. If direct Gemini API wasn't configured or didn't respond, try FastAPI backend
    if (!onlineResponse) {
      try {
        const backendController = new AbortController();
        const timer = setTimeout(() => backendController.abort(), GEMINI_TIMEOUT_MS);

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
        clearTimeout(timer);

        if (backendRes.ok) {
          const data = await backendRes.json();
          if (data.response && data.response.trim()) {
            return NextResponse.json({
              response: data.response,
              next_action: data.next_action || null,
              suggested_followups: data.suggested_followups || [
                "Can you explain with a code example?",
                "What is the time complexity of this approach?",
                "Are there common edge cases to watch out for?",
              ],
              model: data.model || "Gemini / Backend AI",
              source: data.is_offline ? "ollama" : "gemini",
              is_offline: data.is_offline || false,
              timestamp: new Date().toISOString(),
            });
          }
        }
      } catch (backendErr: any) {
        console.warn(`[Network check] FastAPI backend offline or timed out (>2.5s):`, backendErr?.message || backendErr);
      }
    }

    if (onlineResponse) {
      return NextResponse.json({
        response: onlineResponse,
        suggested_followups: [
          "Can you give me a small code example?",
          "What are the best practices here?",
          "How does this scale in production?",
        ],
        model: `${onlineModelName} (Online)`,
        source: "gemini",
        is_offline: false,
        timestamp: new Date().toISOString(),
      });
    }

    // =========================================================================
    // 2. OFFLINE / LOW NETWORK FALLBACK: Query Local Ollama (llama3.2)
    // =========================================================================
    console.info(`[Offline Fallback] Network offline or Gemini unavailable. Querying local Ollama model '${ollamaModel}'...`);

    const candidateOllamaUrls = [
      ollamaBaseUrl,
      "http://127.0.0.1:11434",
      "http://localhost:11434",
    ];

    const uniqueOllamaUrls = Array.from(new Set(candidateOllamaUrls));

    // Fast health ping (800ms) to detect active Ollama host
    let activeOllamaUrl: string | null = null;
    for (const url of uniqueOllamaUrls) {
      try {
        const pingController = new AbortController();
        const pTimer = setTimeout(() => pingController.abort(), 800);
        const ping = await fetch(`${url}/api/tags`, { signal: pingController.signal, cache: "no-store" });
        clearTimeout(pTimer);
        if (ping.ok) {
          activeOllamaUrl = url;
          break;
        }
      } catch {}
    }

    if (activeOllamaUrl) {
      try {
        const ollamaController = new AbortController();
        const ollamaTimer = setTimeout(() => ollamaController.abort(), OLLAMA_TIMEOUT_MS);

        const ollamaMessages = [
          { role: "system", content: systemInstruction },
          ...history.slice(-6).map((msg) => ({
            role: msg.role === "assistant" ? "assistant" : "user",
            content: msg.content,
          })),
          {
            role: "user",
            content: command ? `${command}: ${rawMessage}` : rawMessage,
          },
        ];

        const ollamaRes = await fetch(`${activeOllamaUrl}/api/chat`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            model: ollamaModel,
            messages: ollamaMessages,
            stream: false,
            options: {
              temperature: 0.7,
              num_predict: 500,
            },
          }),
          signal: ollamaController.signal,
          cache: "no-store",
        });
        clearTimeout(ollamaTimer);

        if (ollamaRes.ok) {
          const ollamaData = await ollamaRes.json();
          const content = ollamaData?.message?.content;
          if (content && content.trim()) {
            return NextResponse.json({
              response: content.trim(),
              suggested_followups: [
                "Can you explain with a code example?",
                "What is the time complexity of this approach?",
                "How do I test this function?",
              ],
              model: `Ollama (${ollamaModel}) [Offline / Local]`,
              source: "ollama",
              is_offline: true,
              timestamp: new Date().toISOString(),
            });
          }
        }
      } catch (ollamaErr: any) {
        console.warn(`Local Ollama generation at ${activeOllamaUrl} error:`, ollamaErr?.message || ollamaErr);
      }
    }

    // =========================================================================
    // 3. COMPLETE OFFLINE FALLBACK: Socratic local engine
    // =========================================================================
    let fallbackText = "";
    if (language === "kn") {
      fallbackText = `LocalLearn AI ಗೆ ಸ್ವಾಗತ! ನಿಮ್ಮ ಪ್ರಶ್ನೆ "${rawMessage}" ಅನ್ನು ಪರಿಶೀಲಿಸಲಾಗುತ್ತಿದೆ. Python ನಲ್ಲಿ ಪ್ರೋಗ್ರಾಮಿಂಗ್ ಕಲಿಯುವಾಗ ಮೂಲಭೂತ ಪರಿಕಲ್ಪನೆಗಳು ಮತ್ತು ಡೇಟಾ ರಚನೆಗಳನ್ನು ಹಂತ-ಹಂತವಾಗಿ ಅರ್ಥಮಾಡಿಕೊಳ್ಳುವುದು ಮುಖ್ಯ. ನೀವು ನಿರ್ದಿಷ್ಟವಾಗಿ ಯಾವ ಕೋಡ್ ಅನ್ನು ಪರೀಕ್ಷಿಸಲು ಬಯಸುತ್ತೀರಿ? (ಆಫ್‌ಲೈನ್ ಮೋಡ್)`;
    } else if (language === "hi") {
      fallbackText = `LocalLearn AI में आपका स्वागत है! आपके प्रश्न "${rawMessage}" को प्रोसेस किया गया। Python और डेटा स्ट्रक्चर्स को समझने के लिए सबसे पहले समस्या को छोटे-छोटे चरणों में विभाजित करें। क्या आप किसी विशिष्ट कोड को रन या डिबग करना चाहते हैं? (ऑफ़लाइन मोड)`;
    } else {
      fallbackText = `Welcome to LocalLearn AI (Offline Mode)! Regarding your question "${rawMessage}": when working in Python, breaking the problem into modular steps and verifying input constraints is always the best starting point. Would you like me to walk through a conceptual explanation, review a code snippet, or generate progressive hints?`;
    }

    return NextResponse.json({
      response: fallbackText,
      suggested_followups: [
        "Explain this concept with an example",
        "How do I debug a Python error?",
        "Show me the recommended algorithm pattern",
      ],
      model: "LocalLearn AI Engine (Offline)",
      source: "local-fallback",
      is_offline: true,
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    console.error("Gemini/Ollama chat route exception:", err);
    return NextResponse.json(
      { error: "Internal Server Error in chat API" },
      { status: 500 }
    );
  }
}
