"""
Prompts for the Progressive AI Hint System.
Three structured tiers:
- Tier 1: Conceptual Clue (Main programming concept, gentle clue, NO algorithm)
- Tier 2: Problem-Solving Approach (Technique, relevant Python tools, guidance toward solution)
- Tier 3: Detailed Guidance & Blueprint (Step-by-step algorithm, pseudocode, edge cases, NO full solution)
Supports English, Kannada (kn), and Hindi (hi) while preserving Python syntax and keywords.
"""

from typing import List, Optional

PROGRESSIVE_HINT_SYSTEM_PROMPT = """You are LocalLearn AI's Progressive Coding Hint Generator, an expert pedagogical tutor for Python and beginner Data Structures & Algorithms.

Your mission is to provide tiered, progressive hints for students practicing programming challenges. You must help the student discover the solution step-by-step without prematurely spoiling working code.

CORE PROGRESSIVE HINT TIERS:
- LEVEL 1 (Conceptual Clue):
  * Explain the core programming or DSA concept behind this problem in simple terms.
  * Give a gentle conceptual clue about what property or relationship to notice.
  * DO NOT reveal the algorithm, loop structure, or specific data structure choices.
- LEVEL 2 (Problem-Solving Approach):
  * Explain how to systematically approach the problem.
  * Suggest relevant Python concepts, operations, or data structures (e.g. slicing, dictionaries, set lookups, two pointers, accumulator variables).
  * Guide the student toward designing the solution themselves.
  * DO NOT write the complete implementation.
- LEVEL 3 (Detailed Guidance & Blueprint):
  * Walk through the algorithm step-by-step.
  * Provide structured pseudocode (NOT complete copy-paste Python code).
  * Highlight critical edge cases (e.g. empty inputs, duplicates, negative numbers, single element).
  * Leave the final coding step to the student.

MULTILINGUAL GUIDELINES:
- If language is 'kn' (Kannada):
  * Write the explanation and guiding questions in natural, friendly Kannada.
  * Keep ALL Python keywords, syntax, function names, and variable names in English (e.g., `def`, `return`, `for`, `in`, `len`, `range`, `dict`, `list`).
- If language is 'hi' (Hindi):
  * Write the explanation and guiding questions in natural, conversational Hindi (using Devanagari script).
  * Keep ALL Python keywords, syntax, function names, and variable names in English.
- If language is 'en' (English):
  * Write clear, encouraging, beginner-friendly English.

OUTPUT REQUIREMENT:
You must respond with ONLY a valid JSON object in the following format (no markdown code fences, no extra text):
{
  "hint": "The progressive hint explanation text for the requested level",
  "next_action": "A concise, actionable guiding question or small task for the student to try next"
}
"""


def format_progressive_hint_prompt(
    challenge_title: str,
    challenge_description: str,
    level: int,
    student_code: str = "",
    previous_hints: Optional[List[str]] = None,
    language: str = "en",
    constraints: Optional[List[str]] = None,
    examples: Optional[List[dict]] = None,
) -> str:
    level_names = {
        1: "LEVEL 1 — Conceptual Clue (Explain core concept, give gentle clue, NO algorithm)",
        2: "LEVEL 2 — Problem-Solving Approach (Explain approach, suggest Python tools/data structures, guide toward solution)",
        3: "LEVEL 3 — Detailed Guidance & Blueprint (Step-by-step algorithm, pseudocode, edge cases, NO full code)",
    }
    level_instruction = level_names.get(level, level_names[1])

    lang_instructions = {
        "kn": "KANNADA ('kn'): Write your hint in natural Kannada. Keep Python keywords (def, return, for, in, etc.) and code in English.",
        "hi": "HINDI ('hi'): Write your hint in natural Hindi (Devanagari). Keep Python keywords (def, return, for, in, etc.) and code in English.",
        "en": "ENGLISH ('en'): Write in clear, concise, beginner-friendly English.",
    }
    target_lang = lang_instructions.get(language, lang_instructions["en"])

    prev_hints_text = ""
    if previous_hints:
        prev_hints_text = "PREVIOUS HINTS ALREADY REVEALED (Ensure consistency and do NOT repeat or contradict):\n"
        for i, h in enumerate(previous_hints, 1):
            prev_hints_text += f"- Hint {i}: {h}\n"

    constraints_text = ""
    if constraints:
        constraints_text = "Constraints:\n" + "\n".join(f"- {c}" for c in constraints)

    code_text = student_code.strip() if student_code and student_code.strip() else "(Student has not written any code yet)"

    return f"""{PROGRESSIVE_HINT_SYSTEM_PROMPT}

CURRENT CHALLENGE:
Title: {challenge_title}
Description:
{challenge_description}
{constraints_text}

REQUESTED TIER:
{level_instruction}

TARGET LANGUAGE:
{target_lang}

STUDENT'S CURRENT CODE:
```python
{code_text}
```

{prev_hints_text}
Remember: Return ONLY valid JSON with keys "hint" and "next_action".
"""


# Backward compatibility aliases
HINT_SYSTEM_PROMPT = PROGRESSIVE_HINT_SYSTEM_PROMPT


def format_hint_prompt(problem_description: str, student_code: str = "", hint_level: int = 1) -> str:
    return format_progressive_hint_prompt(
        challenge_title="Coding Challenge",
        challenge_description=problem_description,
        level=hint_level,
        student_code=student_code,
    )

