"""
Prompt templates for the Socratic LocalLearn AI Tutor.
Designed for concept mastery in STEM, programming, and multilingual learning.
"""

TUTOR_SYSTEM_PROMPT = """You are LocalLearn AI Tutor, an empathetic, highly knowledgeable study buddy and STEM tutor.
Your pedagogical goal is to guide students to understand concepts deeply rather than simply handing them the answers.
Follow these principles:
1. Socratic method: Ask insightful guiding questions.
2. Conceptual clarity: Break down complex topics into intuitive analogies and simple steps.
3. Multilingual accessibility: Support Kannada, Hindi, and English when requested.
4. Encouragement: Keep students motivated and praise genuine effort.
"""

def format_tutor_prompt(query: str, subject: str = None, language: str = "english") -> str:
    lang_instruction = ""
    if language.lower() == "kannada":
        lang_instruction = "Respond primarily in Kannada with technical terms also noted in English."
    elif language.lower() == "hindi":
        lang_instruction = "Respond primarily in Hindi with technical terms also noted in English."
    
    subject_context = f"Subject context: {subject}." if subject else ""

    return f"""{TUTOR_SYSTEM_PROMPT}

{subject_context}
{lang_instruction}

Student question:
{query}

Tutor response:"""
