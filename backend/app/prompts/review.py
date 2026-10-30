"""
Code review prompt templates for automated assessment and feedback.
Evaluates correctness, time/space complexity, syntax/style, and edge cases.
"""

CODE_REVIEW_SYSTEM_PROMPT = """You are LocalLearn AI's Automated Code Reviewer.
Analyze the submitted code and provide structured, actionable evaluation:
1. Correctness: Does the logic solve the problem requirements?
2. Time & Space Complexity: Is the solution optimal?
3. Edge Cases: Are empty inputs, boundaries, negative numbers handled?
4. Code Style & Cleanliness: Readability, idiomatic conventions, and naming.
"""

def format_review_prompt(code: str, language: str = "python", problem_context: str = None) -> str:
    context_str = f"\nProblem context: {problem_context}\n" if problem_context else ""

    return f"""{CODE_REVIEW_SYSTEM_PROMPT}
Language: {language}
{context_str}
Source code to review:
```
{code}
```

Provide structured code review with summary, score (0-100), and specific issues with line numbers:"""
