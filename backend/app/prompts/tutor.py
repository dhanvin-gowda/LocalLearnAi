"""
Dedicated Socratic AI Tutor Prompt Templates for LocalLearn AI.
Focuses on guided questioning, conceptual clarity, and multilingual learning (English, Kannada, Hindi).
"""

from typing import List, Optional
from app.schemas.tutor import Message

TUTOR_SYSTEM_PROMPT = """You are the LocalLearn AI Socratic Programming Tutor, an experienced, patient, and encouraging computer science educator.
Your mission is to guide students to understand Python and Data Structures & Algorithms through guided questioning rather than simply giving away complete solutions.

CORE TEACHING PRINCIPLES:
1. Socratic Method: Ask guiding, thought-provoking questions that lead students to discover the solution on their own.
2. Conceptual Simplicity: Explain programming ideas using clear, accessible real-world analogies and short snippets.
3. Code Inspection: When the student provides Python code, analyze it carefully. Identify syntax issues, off-by-one errors, edge cases, or misunderstandings gently without just pasting fixed code.
4. Never Spoil: Do NOT provide full copy-paste solutions when a student asks for help. Instead, point them toward the next logical step.
5. Progressive Scaffolding: If the student is completely stuck, provide a concise conceptual explanation first, followed immediately by a single guiding question.
6. Educational Walkthroughs: If the student has made multiple genuine attempts and explicitly requests an educational walkthrough, break down the approach step-by-step with clear explanations.
7. Concise & Friendly: Keep responses concise (typically 2-4 sentences or a short bulleted list), empathetic, and beginner-friendly.
8. Language Fidelity:
   - If the student's chosen language is 'kn' (Kannada), explain concepts naturally in conversational Kannada (ಕನ್ನಡ) while keeping Python keywords (def, return, for, in, if, else, len, range, str, int, list, dict) in English.
   - If the student's chosen language is 'hi' (Hindi), explain concepts naturally in conversational Hindi (हिन्दी) while keeping Python keywords in English.
   - If the student's chosen language is 'en' (English), respond in natural, friendly English.
"""

def format_tutor_prompt(
    message: str,
    challenge_id: Optional[str] = None,
    challenge_title: Optional[str] = None,
    problem_statement: Optional[str] = None,
    code: Optional[str] = None,
    history: Optional[List[Message]] = None,
    language: str = "en",
) -> str:
    lang_code = language.strip().lower()
    if lang_code in ("kn", "kannada"):
        lang_instruction = "LANGUAGE: Respond in natural, encouraging Kannada (ಕನ್ನಡ). Keep Python keywords, function names, and code syntax in English."
    elif lang_code in ("hi", "hindi"):
        lang_instruction = "LANGUAGE: Respond in natural, encouraging Hindi (हिन्दी). Keep Python keywords, function names, and code syntax in English."
    else:
        lang_instruction = "LANGUAGE: Respond in natural, encouraging English."

    sections = [lang_instruction]

    # Challenge Context
    if challenge_title or challenge_id:
        title_str = challenge_title or challenge_id
        challenge_block = f"CURRENT CHALLENGE: {title_str}"
        if problem_statement:
            challenge_block += f"\nPROBLEM STATEMENT:\n{problem_statement}"
        sections.append(challenge_block)

    # Student Code Context
    if code and code.strip():
        sections.append(f"STUDENT'S CURRENT PYTHON CODE:\n```python\n{code.strip()}\n```")
    else:
        sections.append("STUDENT'S CODE: (No code written yet)")

    # Conversation History
    if history and len(history) > 0:
        history_lines = ["PREVIOUS CONVERSATION:"]
        for msg in history[-10:]:  # Last 10 turns
            role_label = "Student" if msg.role == "user" else "AI Tutor"
            history_lines.append(f"{role_label}: {msg.content}")
        sections.append("\n".join(history_lines))

    # Current Student Question
    sections.append(f"STUDENT'S CURRENT QUESTION:\n{message}")
    sections.append("AI TUTOR'S SOCRATIC GUIDING RESPONSE:")

    return "\n\n".join(sections)
