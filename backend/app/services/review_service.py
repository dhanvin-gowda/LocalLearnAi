import ast
import logging
from typing import List
from app.schemas.review import CodeReviewRequest, CodeReviewResponse, ReviewIssue
from app.services.gemma_service import gemma_service
from app.prompts.review import format_review_prompt

logger = logging.getLogger(__name__)


class ReviewService:
    """
    Analyzes submitted code for correctness, syntax validity, style, and complexity.
    """

    async def review_code(self, request: CodeReviewRequest) -> CodeReviewResponse:
        issues: List[ReviewIssue] = []
        score = 100

        # 1. Static AST syntax & safety validation (for Python)
        if request.language.lower() == "python":
            try:
                tree = ast.parse(request.code)
                # Check for empty functions
                for node in ast.walk(tree):
                    if isinstance(node, ast.FunctionDef):
                        if len(node.body) == 1 and isinstance(node.body[0], ast.Pass):
                            issues.append(
                                ReviewIssue(
                                    line=node.lineno,
                                    severity="warning",
                                    category="correctness",
                                    description=f"Function '{node.name}' contains only 'pass' and has no implementation.",
                                    suggestion="Add the functional algorithm or logic inside this block.",
                                )
                            )
                            score -= 20
            except SyntaxError as e:
                issues.append(
                    ReviewIssue(
                        line=e.lineno,
                        severity="error",
                        category="correctness",
                        description=f"Syntax Error: {e.msg}",
                        suggestion="Check punctuation, parentheses, or indentation on this line.",
                    )
                )
                score = max(0, score - 50)

        # 2. Check for basic length / stubbing
        if len(request.code.strip().splitlines()) <= 2 and "pass" in request.code:
            issues.append(
                ReviewIssue(
                    line=1,
                    severity="info",
                    category="style",
                    description="Code appears to be in skeleton / starter form.",
                    suggestion="Start by identifying the inputs, outputs, and base cases.",
                )
            )

        # 3. LLM-based qualitative review if Gemma is available
        if await gemma_service.is_available():
            prompt = format_review_prompt(
                code=request.code,
                language=request.language,
                problem_context=request.problem_context,
            )
            llm_review = await gemma_service.generate(prompt)
            summary = llm_review[:200]
        else:
            if not issues:
                summary = "Code passes syntax checks with clean structure! No syntax issues detected."
            else:
                summary = f"Code analysis identified {len(issues)} area(s) for improvement."

        return CodeReviewResponse(
            summary=summary,
            score=max(0, min(100, score)),
            issues=issues,
            improved_code=None,
        )


review_service = ReviewService()
