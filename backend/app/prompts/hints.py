"""
Progressive hint prompt templates for coding challenges.
Tier 1: Subtle conceptual nudge.
Tier 2: Algorithmic strategy & data structure suggestion.
Tier 3: Step-by-step pseudo-code or structural blueprint.
"""

HINT_SYSTEM_PROMPT = """You are LocalLearn AI's Hint Generator.
Your job is to provide progressive, pedagogical hints for coding challenges without giving away full solutions.
"""

def format_hint_prompt(problem_description: str, student_code: str, hint_level: int = 1) -> str:
    level_descriptions = {
        1: "Tier 1 (Gentle Nudge): Remind the student of the core concept or constraint to look out for.",
        2: "Tier 2 (Strategic Hint): Suggest suitable data structures or algorithmic patterns (e.g. two-pointers, hash map, sliding window).",
        3: "Tier 3 (Blueprint): Provide structured pseudo-code or edge case checks without writing full working code.",
    }
    level_desc = level_descriptions.get(hint_level, level_descriptions[1])

    return f"""{HINT_SYSTEM_PROMPT}

Target Hint Level: {level_desc}

Problem:
{problem_description}

Student's current code:
{student_code}

Generate a concise, constructive hint:"""
