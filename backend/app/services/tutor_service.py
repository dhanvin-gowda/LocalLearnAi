import logging
from typing import List, Optional
from app.database import db
from app.prompts.tutor import format_tutor_prompt, TUTOR_SYSTEM_PROMPT
from app.schemas.tutor import Message, TutorQueryRequest, TutorQueryResponse
from app.services.gemma_service import gemma_service

logger = logging.getLogger(__name__)


class TutorService:
    """
    Socratic AI Programming Tutor Service.
    Guides students through conceptual understanding of Python & DSA problems
    using progressive questioning, simple analogies, and multilingual support.
    """

    async def get_tutor_response(self, request: TutorQueryRequest) -> TutorQueryResponse:
        message = (request.message or request.query or "").strip()
        challenge_id = request.challenge_id
        challenge_title = request.challenge_title
        problem_statement = request.problem_statement
        code = request.code or ""
        history = request.history or []
        language = (request.language or "en").strip().lower()
        if language not in ("en", "kn", "hi"):
            language = "en"

        # Hydrate challenge details from database if not supplied in request
        if challenge_id and (not challenge_title or not problem_statement):
            try:
                challenge_data = db.get_challenge_by_id(challenge_id)
                if challenge_data:
                    challenge_title = challenge_title or challenge_data.get("title")
                    problem_statement = problem_statement or challenge_data.get("description")
            except Exception as e:
                logger.warning(f"Could not load challenge details for {challenge_id}: {e}")

        # Construct Socratic prompt
        prompt = format_tutor_prompt(
            message=message,
            challenge_id=challenge_id,
            challenge_title=challenge_title,
            problem_statement=problem_statement,
            code=code,
            history=history,
            language=language,
        )

        # 1. Attempt Gemma / Google Gen AI generation with local Ollama fallback
        llm_response = None
        llm_meta = {}
        try:
            llm_meta = await gemma_service.generate_with_meta(
                prompt=prompt,
                system_prompt=TUTOR_SYSTEM_PROMPT,
            )
            llm_response = llm_meta.get("text")
        except Exception as err:
            logger.error(f"LLM inference error in tutor service: {err}")

        # 2. Determine final response text
        if llm_response and llm_response.strip():
            response_text = llm_response.strip()
            model_used = llm_meta.get("model", "Gemini / Gemma")
            is_offline = llm_meta.get("is_offline", False)
        else:
            # Pedagogical Socratic fallback engine
            response_text = self._generate_socratic_fallback(
                message=message,
                challenge_id=challenge_id,
                challenge_title=challenge_title,
                code=code,
                language=language,
            )
            model_used = "LocalLearn AI Engine (Offline)"
            is_offline = True

        # 3. Formulate next action and follow-up prompts
        next_action = self._determine_next_action(message, challenge_id, code, language)
        followups = self._generate_suggested_followups(message, challenge_id, language)

        return TutorQueryResponse(
            response=response_text,
            language=language,
            mode="socratic",
            next_action=next_action,
            suggested_followups=followups,
            challenge_id=challenge_id,
            subject=request.subject or "Python / DSA",
            model=model_used,
            is_offline=is_offline,
        )

    def _generate_socratic_fallback(
        self,
        message: str,
        challenge_id: Optional[str],
        challenge_title: Optional[str],
        code: str,
        language: str,
    ) -> str:
        """
        Provides intelligent Socratic guidance when external LLM credentials are not yet configured.
        Never spoils solutions; guides with conceptual breakdown and reflective questions.
        """
        msg_lower = message.lower()
        title = challenge_title or (challenge_id or "this challenge")

        # Specific challenge conceptual guiding logic
        if challenge_id == "py-beg-01-reverse-string" or "reverse" in msg_lower:
            if language == "kn":
                return (
                    "ಸ್ಟ್ರಿಂಗ್ ರಿವರ್ಸ್ ಮಾಡುವುದು ಒಂದು ಉತ್ತಮ ಅಭ್ಯಾಸ! "
                    "Python ನಲ್ಲಿ ಸ್ಟ್ರಿಂಗ್‌ಗಳು ಬದಲಾಯಿಸಲಾಗದವು (immutable). "
                    "ನೀವು 'hello' ಪದವನ್ನು ಹಿಂದಿನಿಂದ ಓದಿದರೆ ಕೊನೆಯ ಅಕ್ಷರ ಯಾವುದು? "
                    "Python slicing `s[start:stop:step]` ನಲ್ಲಿ step ಅನ್ನು -1 ಎಂದು ನೀಡಿದರೆ ಏನಾಗುತ್ತದೆ?"
                )
            elif language == "hi":
                return (
                    "स्ट्रिंग को उलटना (reverse) समझना बहुत आसान है! "
                    "Python में स्ट्रिंग्स immutable होती हैं। "
                    "अगर हमारे पास 'hello' है, तो उल्टा पढ़ने पर पहला अक्षर क्या होगा? "
                    "क्या आप Python slicing `s[start:stop:step]` के बारे में जानते हैं जहां step को -1 किया जा सकता है?"
                )
            else:
                return (
                    f"Let's break down reversing a string step-by-step! "
                    "Strings in Python are indexed from 0 to len(s) - 1. "
                    "If you inspect the string 'hello', what index does the last character sit at? "
                    "How could Python's slicing notation `s[start:stop:step]` help you step backwards?"
                )

        elif challenge_id == "py-beg-02-find-largest" or "largest" in msg_lower or "max" in msg_lower:
            if language == "kn":
                return (
                    "ದೊಡ್ಡ ಸಂಖ್ಯೆಯನ್ನು ಕಂಡುಹಿಡಿಯಲು: ನೀವು ಸಂಖ್ಯೆಗಳ ಪಟ್ಟಿಯನ್ನು ಒಂದೊಂದಾಗಿ ಪರಿಶೀಲಿಸಬೇಕು. "
                    "ಆದರೆ ನೆನಪಿಡಿ, `max()` ಬಳಸಬಾರದು. "
                    "ಆರಂಭದಲ್ಲಿ ನಿಮ್ಮ ಗರಿಷ್ಠ ಮೌಲ್ಯವನ್ನು (max_val) ಪಟ್ಟಿಯ ಮೊದಲ ಅಂಶಕ್ಕೆ `nums[0]` ಹೊಂದಿಸಿದರೆ ಋಣಾತ್ಮಕ ಸಂಖ್ಯೆಗಳಿಗೆ ಏನು ಸಹಾಯವಾಗುತ್ತದೆ?"
                )
            elif language == "hi":
                return (
                    "अधिकतम मान (largest number) ढूंढने के लिए एक चर (variable) में सबसे बड़ी संख्या को ट्रैक करना होता है। "
                    "ध्यान रखें कि हमें `max()` फ़ंक्शन का उपयोग नहीं करना है। "
                    "यदि सभी संख्याएँ ऋणात्मक (negative) हों, तो `max_val` को 0 के बजाय `nums[0]` से शुरू करना क्यों बेहतर है?"
                )
            else:
                return (
                    f"To find the largest number without `max()`, we track the current champion as we scan the list. "
                    "Why is initializing your tracker to `nums[0]` safer than initializing it to 0 when negative numbers are involved? "
                    "What condition would you write inside a for loop to update the champion?"
                )

        elif challenge_id == "py-beg-03-palindrome-check" or "palindrome" in msg_lower:
            if language == "kn":
                return (
                    "ಪ್ಯಾಲಿಂಡ್ರೋಮ್ ಎಂದರೆ ಮುಂದಿನಿಂದ ಮತ್ತು ಹಿಂದಿನಿಂದ ಓದಿದರೂ ಒಂದೇ ಆಗಿರುವ ಪದ. "
                    "ಮೊದಲಿಗೆ, ಅಕ್ಷರ ಮತ್ತು ಅಂಕೆಗಳನ್ನು ಮಾತ್ರ ಉಳಿಸಿಕೊಳ್ಳಲು `char.isalnum()` ಮತ್ತು `lower()` ಬಳಸುವುದು ಹೇಗೆ? "
                    "ಎರಡು ಪಾಯಿಂಟರ್‌ಗಳು (ಎಡ ಮತ್ತು ಬಲ) ಪರಸ್ಪರ ಹತ್ತಿರ ಬರುವಂತೆ ಹೋಲಿಸಬಹುದೇ?"
                )
            elif language == "hi":
                return (
                    "पैलिंड्रोम (palindrome) वह स्ट्रिंग है जो आगे और पीछे से एक जैसी पढ़ी जाती है। "
                    "सबसे पहले, क्या आपने स्पेस और विराम चिह्नों को हटाने के लिए `char.isalnum()` का उपयोग किया है? "
                    "अगर हम बाएं (left) और दाएं (right) दोनों सिरों से एक-एक अक्षर की तुलना करें, तो लूप कब रुकना चाहिए?"
                )
            else:
                return (
                    f"A palindrome reads identically forwards and backwards after normalization. "
                    "First step: how can we filter out spaces and punctuation using `char.isalnum()` and normalize casing with `.lower()`? "
                    "Once cleaned, can we compare characters inward from both ends using two pointers?"
                )

        elif challenge_id == "py-beg-04-find-duplicates" or "duplicate" in msg_lower:
            if language == "kn":
                return (
                    "ನಕಲಿ ಅಂಶಗಳನ್ನು ಹುಡುಕಲು hash set ಅತ್ಯಂತ ವೇಗವಾದ ಮಾರ್ಗ. "
                    "ನಾವು ಸಂಖ್ಯೆಗಳನ್ನು ನೋಡುತ್ತಾ ಹೋದಂತೆ, ಈಗಾಗಲೇ ನೋಡಿದ ಸಂಖ್ಯೆಗಳನ್ನು `seen` ಎಂಬ ಸೆಟ್‌ನಲ್ಲಿ ಇಡಬಹುದೇ? "
                    "ಒಂದು ವೇಳೆ ಸಂಖ್ಯೆ ಈಗಾಗಲೇ `seen` ನಲ್ಲಿದ್ದರೆ, ನಾವು ಅದನ್ನು ಎಲ್ಲಿ ಸೇರಿಸಬೇಕು?"
                )
            elif language == "hi":
                return (
                    "डुप्लिकेट (duplicate) तत्वों को खोजने के लिए `set` का उपयोग सबसे कुशल है। "
                    "यदि हम एक `seen` सेट रखें, तो जब कोई संख्या पहले से `seen` में मौजूद हो, तो इसका क्या अर्थ है? "
                    "अंतिम परिणाम को सॉर्ट करने के लिए Python में कौन सा फ़ंक्शन इस्तेमाल करेंगे?"
                )
            else:
                return (
                    f"Finding duplicates efficiently means avoiding nested O(N^2) loops. "
                    "If we maintain a `seen` set with O(1) lookups, what check should we perform for each number? "
                    "When an item is already in `seen`, where should we store it to ensure it is collected?"
                )

        elif challenge_id == "py-beg-05-two-sum" or "two sum" in msg_lower:
            if language == "kn":
                return (
                    "Two Sum ಸಮಸ್ಯೆಯಲ್ಲಿ ಪೂರಕ ಮೌಲ್ಯವನ್ನು (complement = target - current_num) ಕಂಡುಹಿಡಿಯುವುದು ಮುಖ್ಯ. "
                    "ಪ್ರತಿ ಸಂಖ್ಯೆಯನ್ನು ಪರಿಶೀಲಿಸುವಾಗ ಡಿಕ್ಷನರಿಯಲ್ಲಿ ಅದರ ಸೂಚ್ಯಂಕವನ್ನು (index) ಉಳಿಸಿದರೆ, "
                    "ಮುಂದಿನ ಬಾರಿ ಆ ಪೂರಕ ಮೌಲ್ಯ ಸಿಕ್ಕಾಗ ತಕ್ಷಣ index ಹಿಂದಿರುಗಿಸಬಹುದಲ್ಲವೇ?"
                )
            elif language == "hi":
                return (
                    "Two Sum में सबसे महत्वपूर्ण विचार 'पूरक' (complement = target - current_value) की तलाश करना है। "
                    "ब्रूट-फ़ोर्स O(N^2) के बजाय, हम एक dictionary में संख्याओं के index को O(1) लुकअप के लिए कैसे संग्रहीत कर सकते हैं? "
                    "अगर वर्तमान संख्या `x` है, तो हमें dictionary में किस मान की जांच करनी चाहिए?"
                )
            else:
                return (
                    f"Two Sum can be solved in O(N) single-pass using the complement lookup trick: `complement = target - current_num`. "
                    "If you store `{number: index}` in a dictionary as you iterate, how can you immediately check if `target - current_num` was already seen? "
                    "What two indices should then be returned?"
                )

        # Generic Socratic fallback when student asks general help
        if language == "kn":
            return (
                f"ಖಂಡಿತ, {title} ಬಗ್ಗೆ ಅರ್ಥಮಾಡಿಕೊಳ್ಳೋಣ! "
                "ಮೊದಲು ಈ ಸಮಸ್ಯೆಯ ಇನ್ಪುಟ್ ಮತ್ತು ಔಟ್ಪುಟ್ ಅನ್ನು ಸರಳವಾಗಿ ಯೋಚಿಸಿ. "
                "ನಿಮ್ಮ ಕೋಡ್‌ನಲ್ಲಿ ನೀವು ಈಗಾಗಲೇ ಯಾವ ತಂತ್ರವನ್ನು ಪ್ರಯತ್ನಿಸಿದ್ದೀರಿ? "
                "ನಿಮಗೆ ಯಾವ ನಿರ್ದಿಷ್ಟ ಸಾಲು ಅಥವಾ ಲಾಜಿಕ್ ಅರ್ಥವಾಗುತ್ತಿಲ್ಲ ಎಂದು ತಿಳಿಸಿ."
            )
        elif language == "hi":
            return (
                f"बिल्कुल, आइए {title} को आसान भाषा में समझते हैं! "
                "सबसे पहले समस्या के इनपुट और अपेक्षित आउटपुट पर ध्यान दें। "
                "आपने अब तक अपने कोड में क्या लिखने का प्रयास किया है? "
                "कौन सा विशेष कदम आपको सबसे कठिन लग रहा है?"
            )
        else:
            return (
                f"Let's tackle {title} together! "
                "First, what is the core transformation: given the sample input, what exact output do we expect? "
                "Looking at your current code, what is the very first step your function should take before processing?"
            )

    def _determine_next_action(
        self, message: str, challenge_id: Optional[str], code: str, language: str
    ) -> str:
        if challenge_id == "py-beg-01-reverse-string":
            return "Test slicing with s[::-1] or write a loop starting from index len(s) - 1"
        if challenge_id == "py-beg-02-find-largest":
            return "Initialize max_val = nums[0] and iterate with a for loop"
        if challenge_id == "py-beg-03-palindrome-check":
            return "Clean the string with .isalnum() and compare inwards with two pointers"
        if challenge_id == "py-beg-04-find-duplicates":
            return "Use a 'seen' set to track visited numbers in O(1) time"
        if challenge_id == "py-beg-05-two-sum":
            return "Calculate complement = target - num and check your lookup dictionary"
        return "Write down the expected output for the smallest possible input test case"

    def _generate_suggested_followups(
        self, query: str, challenge_id: Optional[str], language: str
    ) -> List[str]:
        if language == "kn":
            return [
                "ಸರಳ ಉದಾಹರಣೆ ನೀಡಬಹುದೇ?",
                "ನನ್ನ ಕೋಡ್‌ನಲ್ಲಿ ಏನಾದರೂ ದೋಷವಿದೆಯೇ?",
                "ಇದರ Time Complexity ಏನು?",
            ]
        elif language == "hi":
            return [
                "क्या आप एक छोटा उदाहरण दे सकते हैं?",
                "मेरे कोड में क्या गलती है?",
                "इसकी Time Complexity क्या होगी?",
            ]
        else:
            return [
                "Can you give me a small example?",
                "Is there an issue with my current code?",
                "What is the time complexity of this approach?",
            ]


tutor_service = TutorService()
