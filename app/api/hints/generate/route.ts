import { NextRequest, NextResponse } from "next/server";

interface HintRequestBody {
  challenge_id: string;
  code?: string;
  student_code?: string;
  level?: number;
  hint_level?: number;
  language?: string;
  previous_hints?: string[];
}

export async function POST(req: NextRequest) {
  try {
    const body: HintRequestBody = await req.json();

    const challenge_id = body.challenge_id;
    if (!challenge_id || typeof challenge_id !== "string" || !challenge_id.trim()) {
      return NextResponse.json(
        { error: "Validation Error: 'challenge_id' is required" },
        { status: 422 }
      );
    }

    const level = body.level ?? body.hint_level ?? 1;
    if (typeof level !== "number" || level < 1 || level > 3) {
      return NextResponse.json(
        { error: "Validation Error: 'level' must be an integer between 1 and 3" },
        { status: 422 }
      );
    }

    const code = body.code ?? body.student_code ?? "";
    const language = (body.language || "en").toLowerCase().trim();
    const previous_hints = body.previous_hints || [];

    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "http://127.0.0.1:8000";

    const payload = {
      challenge_id,
      code,
      student_code: code,
      level,
      hint_level: level,
      language,
      previous_hints,
    };

    try {
      const response = await fetch(`${backendUrl}/hints/generate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
        cache: "no-store",
      });

      if (response.ok) {
        const data = await response.json();
        return NextResponse.json(data);
      }

      // If direct route failed, try versioned route as fallback
      const versionedResponse = await fetch(`${backendUrl}/api/v1/hints/generate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
        cache: "no-store",
      });

      if (versionedResponse.ok) {
        const data = await versionedResponse.json();
        return NextResponse.json(data);
      }

      const errText = await response.text();
      return NextResponse.json(
        { error: errText || "Failed to generate progressive hint from backend" },
        { status: response.status }
      );
    } catch (fetchError) {
      console.warn("Backend /hints/generate unreachable, generating local pedagogical hint:", fetchError);

      // Local fallback for offline/disconnected operation
      const fallbackHints: Record<number, Record<string, { hint: string; next_action: string }>> = {
        1: {
          en: {
            hint: "Focus on sequence indexing and traversal. Examine how elements in Python lists and strings are positioned from index 0 to len - 1.",
            next_action: "Identify the start and end indices of your input sequence.",
          },
          kn: {
            hint: "ಅಂಶಗಳ ಇಂಡೆಕ್ಸ್ ಮತ್ತು ಪರಿಶೀಲನೆಯ ಬಗ್ಗೆ ಗಮನಹರಿಸಿ. Python ನಲ್ಲಿ 0 ಇಂದ len - 1 ವರೆಗೆ ಅಂಶಗಳನ್ನು ಹೇಗೆ ಪ್ರವೇಶಿಸಬೇಕೆಂದು ಯೋಚಿಸಿ.",
            next_action: "ಆರಂಭಿಕ ಮತ್ತು ಅಂತಿಮ ಇಂಡೆಕ್ಸ್ ಗುರುತಿಸಿ.",
          },
          hi: {
            hint: "तत्वों के इंडेक्स और ट्रैवर्सल पर ध्यान दें। सोचें कि Python में 0 से len - 1 तक तत्वों तक कैसे पहुंचा जाता है।",
            next_action: "प्रारंभिक और अंतिम इंडेक्स पहचानें।",
          },
        },
        2: {
          en: {
            hint: "Consider the most suitable Python data structure (set, dict, list) and algorithmic pattern (two pointers, accumulator variable, sliding window) for O(N) execution.",
            next_action: "Outline the state variable and loop condition in your editor.",
          },
          kn: {
            hint: "O(N) ವೇಗದಲ್ಲಿ ಪರಿಹರಿಸಲು ಸೂಕ್ತವಾದ ಡೇಟಾ ರಚನೆ (set, dict, list) ಮತ್ತು ಅಲ್ಗಾರಿದಮ್ ವಿಧಾನವನ್ನು (two pointers, accumulator) ಆರಿಸಿ.",
            next_action: "ಎಡಿಟರ್‌ನಲ್ಲಿ ಲೂಪ್ ಮತ್ತು ಕಂಡಿಷನ್ ಬರೆಯಿರಿ.",
          },
          hi: {
            hint: "O(N) समय में हल करने के लिए उपयुक्त डेटा संरचना (set, dict, list) और तकनीक (two pointers, accumulator) का चयन करें।",
            next_action: "एडिटर में लूप और कंडीशन का ढांचा तैयार करें।",
          },
        },
        3: {
          en: {
            hint: "Step-by-step blueprint:\n1. Check base edge cases (empty or single element).\n2. Initialize your tracking structure or pointer variables.\n3. Iterate linearly through the elements and update state.\n4. Return the calculated result without extraneous computations.",
            next_action: "Implement the step-by-step logic and run your test suite.",
          },
          kn: {
            hint: "ಹಂತ-ಹಂತದ ಮಾರ್ಗದರ್ಶಿ:\n1. ಖಾಲಿ ಅಥವಾ 1-ಅಂಶದ edge case ಪರಿಶೀಲಿಸಿ.\n2. ಟ್ರ್ಯಾಕರ್ ಅಥವಾ ಪಾಯಿಂಟರ್‌ಗಳನ್ನು ಆರಂಭಿಸಿ.\n3. ಲೂಪ್ ಮಾಡಿ ಸ್ಥಿತಿಯನ್ನು ನವೀಕರಿಸಿ.\n4. ಫಲಿತಾಂಶವನ್ನು ರಿಟರ್ನ್ ಮಾಡಿ.",
            next_action: "ಕೋಡ್ ಬರೆದು 'Run Tests' ಕ್ಲಿಕ್ ಮಾಡಿ.",
          },
          hi: {
            hint: "कदम-दर-कदम मार्गदर्शन:\n1. बेस केस (खाली या 1-तत्व) की जांच करें।\n2. ट्रैकर या पॉइंटर्स को इनिशियलाइज़ करें।\n3. लूप चलाकर स्थिति अपडेट करें।\n4. अंतिम परिणाम लौटाएं।",
            next_action: "कोड लागू करें और 'Run Tests' पर क्लिक करें।",
          },
        },
      };

      const langKey = language === "kn" ? "kn" : language === "hi" ? "hi" : "en";
      const hintData = fallbackHints[level]?.[langKey] || fallbackHints[level]?.["en"];

      return NextResponse.json({
        success: true,
        challenge_id,
        level,
        hint_level: level,
        max_hints: 3,
        hint: hintData.hint,
        next_action: hintData.next_action,
        language: langKey,
      });
    }
  } catch (error) {
    console.error("Hints proxy error:", error);
    return NextResponse.json(
      { error: "Internal Server Error processing hint request" },
      { status: 500 }
    );
  }
}
