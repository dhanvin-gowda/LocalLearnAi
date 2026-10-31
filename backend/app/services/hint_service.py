"""
Progressive AI Hint Service.
Generates tiered pedagogical hints using Gemma 4 with rich multilingual fallbacks for all challenges.
"""

import json
import logging
import re
from typing import Any, Dict, List, Optional

from app.database import db
from app.prompts.hints import format_progressive_hint_prompt
from app.services.gemma_service import gemma_service

logger = logging.getLogger(__name__)

# Comprehensive pedagogical progressive hints repository for offline fallback and reliability
OFFLINE_PROGRESSIVE_HINTS: Dict[str, Dict[int, Dict[str, Dict[str, str]]]] = {
    "py-beg-01-reverse-string": {
        1: {
            "en": {
                "hint": "Think about sequence indexing in Python. When you read a string backwards, the character that was at the very end must now appear at the start.",
                "next_action": "Identify the index of the last character of a string of length N.",
            },
            "kn": {
                "hint": "Python ನಲ್ಲಿ ಸ್ಟ್ರಿಂಗ್ ಇಂಡೆಕ್ಸಿಂಗ್ ಬಗ್ಗೆ ಯೋಚಿಸಿ. ನೀವು ಸ್ಟ್ರಿಂಗ್ ಅನ್ನು ಹಿಮ್ಮುಖವಾಗಿ ಓದಿದಾಗ, ಕೊನೆಯಲ್ಲಿರುವ ಅಕ್ಷರವು ಮೊದಲಿಗೆ ಬರಬೇಕು.",
                "next_action": "N ಉದ್ದದ ಸ್ಟ್ರಿಂಗ್‌ನ ಕೊನೆಯ ಅಕ್ಷರದ ಇಂಡೆಕ್ಸ್ ಯಾವುದೆಂದು ಗುರುತಿಸಿ.",
            },
            "hi": {
                "hint": "Python में स्ट्रिंग इंडेक्सिंग के बारे में सोचें। जब आप स्ट्रिंग को उल्टा पढ़ते हैं, तो जो अक्षर सबसे अंत में था, वह सबसे पहले आना चाहिए।",
                "next_action": "N लंबाई की स्ट्रिंग के अंतिम अक्षर का इंडेक्स पहचानें।",
            },
        },
        2: {
            "en": {
                "hint": "Python strings support extended slice syntax `s[start:stop:step]`. If the step is negative (like -1), Python walks through the sequence in reverse order. Alternatively, two pointers can swap characters in a list.",
                "next_action": "Try testing how `s[::-1]` behaves on a sample string in your editor.",
            },
            "kn": {
                "hint": "Python ಸ್ಟ್ರಿಂಗ್‌ಗಳು `s[start:stop:step]` ಸ್ಲೈಸಿಂಗ್ ಅನ್ನು ಬೆಂಬಲಿಸುತ್ತವೆ. `step` -1 ಆಗಿದ್ದರೆ, Python ಹಿಮ್ಮುಖ ಕ್ರಮದಲ್ಲಿ ಸಾಗುತ್ತದೆ. ಅಥವಾ ಲಿಸ್ಟ್‌ನಲ್ಲಿ two-pointer ವಿಧಾನ ಬಳಸಬಹುದು.",
                "next_action": "ನಿಮ್ಮ ಎಡಿಟರ್‌ನಲ್ಲಿ `s[::-1]` ಹೇಗೆ ಕೆಲಸ ಮಾಡುತ್ತದೆ ಎಂಬುದನ್ನು ಪರೀಕ್ಷಿಸಿ.",
            },
            "hi": {
                "hint": "Python स्ट्रिंग्स स्लाइसिंग `s[start:stop:step]` का समर्थन करती हैं। यदि step -1 है, तो Python उल्टे क्रम में चलता है। या आप two-pointer तकनीक का उपयोग कर सकते हैं।",
                "next_action": "अपने एडिटर में जांचें कि `s[::-1]` कैसे काम करता है।",
            },
        },
        3: {
            "en": {
                "hint": "Step-by-step blueprint:\n1. Check if the string is empty or has length 1 (return it directly as an edge case).\n2. Either use the slice pattern `return s[::-1]`, or initialize an empty list, loop backwards from `len(s) - 1` down to 0, append each character, and `\"\".join(chars)`.\n3. Verify your function handles strings with spaces and symbols correctly.",
                "next_action": "Implement the slicing or reverse loop and click 'Run Tests'.",
            },
            "kn": {
                "hint": "ಹಂತ-ಹಂತದ ಮಾರ್ಗದರ್ಶಿ:\n1. ಸ್ಟ್ರಿಂಗ್ ಖಾಲಿಯಾಗಿದೆಯೇ ಅಥವಾ 1 ಉದ್ದ ಹೊಂದಿದೆಯೇ ಎಂದು ಪರಿಶೀಲಿಸಿ (ನೇರವಾಗಿ ರಿಟರ್ನ್ ಮಾಡಿ).\n2. `return s[::-1]` ಸ್ಲೈಸಿಂಗ್ ಬಳಸಿ, ಅಥವಾ `len(s) - 1` ನಿಂದ 0 ವರೆಗೆ ಹಿಮ್ಮುಖ ಲೂಪ್ ಮಾಡಿ ಕ್ಯಾರೆಕ್ಟರ್‌ಗಳನ್ನು ಸೇರಿಸಿ.\n3. ಖಾಲಿ ಸ್ಟ್ರಿಂಗ್ ಮತ್ತು ಸ್ಪೇಸ್‌ಗಳನ್ನು ಸರಿಯಾಗಿ ನಿರ್ವಹಿಸುತ್ತದೆಯೇ ಎಂದು ಖಚಿತಪಡಿಸಿಕೊಳ್ಳಿ.",
                "next_action": "ಸ್ಲೈಸಿಂಗ್ ಅಥವಾ ಲೂಪ್ ಕೋಡ್ ಬರೆದು 'Run Tests' ಕ್ಲಿಕ್ ಮಾಡಿ.",
            },
            "hi": {
                "hint": "कदम-दर-कदम मार्गदर्शन:\n1. जांचें कि क्या स्ट्रिंग खाली है या लंबाई 1 है (इसे सीधे return करें)।\n2. या तो `return s[::-1]` स्लाइसिंग का उपयोग करें, या `len(s) - 1` से 0 तक उल्टा लूप चलाकर कैरेक्टर जोड़ें।\n3. ध्यान रखें कि खाली स्ट्रिंग और रिक्त स्थान सही ढंग से हैंडल हों।",
                "next_action": "स्लाइसिंग या रिवर्स लूप लागू करें और 'Run Tests' पर क्लिक करें।",
            },
        },
    },
    "py-beg-02-find-largest": {
        1: {
            "en": {
                "hint": "To find the maximum element without `max()`, imagine scanning cards one at a time. You only need to remember the highest number you have seen so far.",
                "next_action": "Think about what initial value you should assign to your tracker variable.",
            },
            "kn": {
                "hint": "`max()` ಬಳಸದೆ ಗರಿಷ್ಠ ಸಂಖ್ಯೆಯನ್ನು ಕಂಡುಹಿಡಿಯಲು, ಒಂದೊಂದಾಗಿ ಸಂಖ್ಯೆಗಳನ್ನು ಪರಿಶೀಲಿಸಿ. ಇಲ್ಲಿಯವರೆಗೆ ನೀವು ಕಂಡ ಅತ್ಯಂತ ದೊಡ್ಡ ಸಂಖ್ಯೆಯನ್ನು ನೆನಪಿನಲ್ಲಿಡಿ.",
                "next_action": "ನಿಮ್ಮ ಟ್ರ್ಯಾಕರ್ ವೇರಿಯೇಬಲ್‌ಗೆ ಆರಂಭಿಕ ಮೌಲ್ಯವಾಗಿ ಏನನ್ನು ನೀಡಬೇಕೆಂದು ಯೋಚಿಸಿ.",
            },
            "hi": {
                "hint": "`max()` फ़ंक्शन का उपयोग किए बिना सबसे बड़ी संख्या खोजने के लिए, एक-एक करके संख्याओं की तुलना करें। अब तक देखे गए सबसे बड़े नंबर को याद रखें।",
                "next_action": "सोचें कि आपके ट्रैकर वेरिएबल को क्या प्रारंभिक मान दिया जाना चाहिए।",
            },
        },
        2: {
            "en": {
                "hint": "Initialize a variable `largest = nums[0]` (never 0, because the array might contain all negative numbers!). Then loop through each number in `nums[1:]`. If a number is greater than `largest`, update it.",
                "next_action": "Write a `for num in nums:` loop and compare each number to your current max.",
            },
            "kn": {
                "hint": "`largest = nums[0]` ನೊಂದಿಗೆ ಆರಂಭಿಸಿ (0 ಬಳಸಬೇಡಿ, ಏಕೆಂದರೆ ಲಿಸ್ಟ್‌ನಲ್ಲಿ ನಕಾರಾತ್ಮಕ ಸಂಖ್ಯೆಗಳಿರಬಹುದು!). ನಂತರ `for num in nums:` ಲೂಪ್ ಬಳಸಿ ಹೋಲಿಕೆ ಮಾಡಿ.",
                "next_action": "`for num in nums:` ಲೂಪ್ ಬರೆದು ಪ್ರತಿ ಸಂಖ್ಯೆಯನ್ನು ಹೋಲಿಕೆ ಮಾಡಿ.",
            },
            "hi": {
                "hint": "`largest = nums[0]` से शुरू करें (0 से नहीं, क्योंकि सूची में ऋणात्मक संख्याएं भी हो सकती हैं!)। फिर `for num in nums:` लूप चलाकर तुलना करें।",
                "next_action": "`for num in nums:` लूप लिखें और प्रत्येक संख्या की तुलना करें।",
            },
        },
        3: {
            "en": {
                "hint": "Step-by-step blueprint:\n1. Edge case: if `not nums`, raise ValueError or return None.\n2. Set `max_val = nums[0]`.\n3. Loop through `nums[1:]`: `if n > max_val: max_val = n`.\n4. Return `max_val`.\nThis achieves optimal O(N) time complexity and O(1) auxiliary space.",
                "next_action": "Implement the loop in your code editor and handle negative numbers.",
            },
            "kn": {
                "hint": "ಹಂತ-ಹಂತದ ಮಾರ್ಗದರ್ಶಿ:\n1. `max_val = nums[0]` ಸೆಟ್ ಮಾಡಿ.\n2. `for n in nums[1:]` ಲೂಪ್ ಮಾಡಿ: `if n > max_val: max_val = n`.\n3. ಲೂಪ್ ಮುಗಿದ ನಂತರ `return max_val` ಮಾಡಿ.\nಇದು O(N) ಸಮಯ ಮತ್ತು O(1) ಮೆಮೊರಿ ತೆಗೆದುಕೊಳ್ಳುತ್ತದೆ.",
                "next_action": "ಎಡಿಟರ್‌ನಲ್ಲಿ ಲೂಪ್ ಬರೆದು ಪರೀಕ್ಷಿಸಿ.",
            },
            "hi": {
                "hint": "कदम-दर-कदम मार्गदर्शन:\n1. `max_val = nums[0]` सेट करें।\n2. `for n in nums[1:]` लूप चलाएं: `if n > max_val: max_val = n`।\n3. अंत में `return max_val` करें।\nयह O(N) समय और O(1) स्पेस में पूरा होता है।",
                "next_action": "एडिटर में कोड लिखें और टेस्ट रन करें।",
            },
        },
    },
    "py-beg-03-palindrome-check": {
        1: {
            "en": {
                "hint": "A palindrome reads identical forwards and backwards. But notice this challenge requires ignoring non-alphanumeric characters (like punctuation and spaces) and letter casing.",
                "next_action": "Think about how to clean or normalize characters before comparing them.",
            },
            "kn": {
                "hint": "ಪಾಲಿಂಡ್ರೋಮ್ ಎಂದರೆ ಮುಂದಿನಿಂದ ಮತ್ತು ಹಿಂದಿನಿಂದ ಓದಿದಾಗ ಒಂದೇ ಆಗಿರುತ್ತದೆ. ಆದರೆ ಈ ಸಮಸ್ಯೆಯಲ್ಲಿ ವಿರಾಮಚಿಹ್ನೆಗಳು, ಸ್ಪೇಸ್‌ಗಳು ಮತ್ತು casing (ದೊಡ್ಡಕ್ಷರ/ಸಣ್ಣಕ್ಷರ) ಅನ್ನು ನಿರ್ಲಕ್ಷಿಸಬೇಕು.",
                "next_action": "ಹೋಲಿಕೆ ಮಾಡುವ ಮೊದಲು ಅಕ್ಷರಗಳನ್ನು ಹೇಗೆ ನಾರ್ಮಲೈಸ್ ಮಾಡಬೇಕೆಂದು ಯೋಚಿಸಿ.",
            },
            "hi": {
                "hint": "पैलिंड्रोम आगे और पीछे से समान पढ़ा जाता है। लेकिन ध्यान दें कि आपको स्पेस, विराम चिह्न और case (बड़े/छोटे अक्षर) को नज़रअंदाज़ करना है।",
                "next_action": "तुलना करने से पहले अक्षरों को साफ़ (normalize) करने का विचार करें।",
            },
        },
        2: {
            "en": {
                "hint": "Filter the string first: iterate through characters, keep only those where `char.isalnum()` is True, and convert with `.lower()`. Alternatively, use two pointers from both ends, skipping non-alphanumeric characters on the fly.",
                "next_action": "Try building a cleaned list or test two pointers converging to the center.",
            },
            "kn": {
                "hint": "ಮೊದಲು ಸ್ಟ್ರಿಂಗ್ ಕ್ಲೀನ್ ಮಾಡಿ: `char.isalnum()` ಮೂಲಕ ಕೇವಲ ಅಕ್ಷರ/ಸಂಖ್ಯೆಗಳನ್ನು ಇರಿಸಿ ಮತ್ತು `.lower()` ಬಳಸಿ. ಅಥವಾ start ಮತ್ತು end ನಿಂದ two-pointer ಬಳಸಿ.",
                "next_action": "ಕ್ಲೀನ್ ಮಾಡಿದ ಲಿಸ್ಟ್ ರಚಿಸಿ ಅಥವಾ two-pointer ವಿಧಾನ ಪರೀಕ್ಷಿಸಿ.",
            },
            "hi": {
                "hint": "पहले स्ट्रिंग को साफ़ करें: केवल `char.isalnum()` वर्णों को रखें और `.lower()` का उपयोग करें। या दोनों सिरों से two pointers का उपयोग करें।",
                "next_action": "साफ़ की गई सूची बनाएं या two-pointer दृष्टिकोण आज़माएं।",
            },
        },
        3: {
            "en": {
                "hint": "Step-by-step blueprint:\nMethod A (Filtering):\n1. Build `cleaned = [c.lower() for c in s if c.isalnum()]`.\n2. Return `cleaned == cleaned[::-1]`.\nMethod B (Two Pointers):\n1. `left = 0, right = len(s) - 1`.\n2. Move `left` while not alnum; move `right` while not alnum.\n3. If `s[left].lower() != s[right].lower()` return False; else advance both.\n4. Return True.",
                "next_action": "Implement the cleaned comparison or two-pointer loop in your editor.",
            },
            "kn": {
                "hint": "ಹಂತ-ಹಂತದ ಮಾರ್ಗದರ್ಶಿ:\n1. `cleaned = [c.lower() for c in s if c.isalnum()]` ರಚಿಸಿ.\n2. `return cleaned == cleaned[::-1]` ಮಾಡಿ.\nTwo-pointer ವಿಧಾನ:\n1. `left = 0, right = len(s) - 1`.\n2. `s[left].lower() != s[right].lower()` ಆಗಿದ್ದರೆ False; ಮುಗಿದರೆ True.",
                "next_action": "ಕೋಡ್ ಬರೆದು ಪರೀಕ್ಷಿಸಿ.",
            },
            "hi": {
                "hint": "कदम-दर-कदम मार्गदर्शन:\n1. `cleaned = [c.lower() for c in s if c.isalnum()]` बनाएं।\n2. `return cleaned == cleaned[::-1]` करें।\nTwo-pointer विधि:\n1. `left = 0, right = len(s) - 1` सेट करें।\n2. यदि मेल न खाए तो False, लूप पूरा होने पर True।",
                "next_action": "एडिटर में कोड लागू करें और टेस्ट रन करें।",
            },
        },
    },
    "py-beg-04-find-duplicates": {
        1: {
            "en": {
                "hint": "To find duplicate elements, we need a way to track whether we have already encountered a number before as we scan through the list.",
                "next_action": "Think about what data structure allows rapid O(1) checks for previously seen items.",
            },
            "kn": {
                "hint": "ನಕಲಿ ಸಂಖ್ಯೆಗಳನ್ನು (duplicates) ಹುಡುಕಲು, ಲಿಸ್ಟ್‌ನಲ್ಲಿ ಸಾಗುವಾಗ ಸಂಖ್ಯೆಯನ್ನು ಈಗಾಗಲೇ ನೋಡಿದ್ದೇವೆಯೇ ಎಂದು ಟ್ರ್ಯಾಕ್ ಮಾಡಬೇಕು.",
                "next_action": "ಹಿಂದೆ ನೋಡಿದ ಅಂಶಗಳನ್ನು O(1) ವೇಗದಲ್ಲಿ ಪರಿಶೀಲಿಸಲು ಯಾವ ಡೇಟಾ ಸ್ಟ್ರಕ್ಚರ್ ಸೂಕ್ತ ಎಂದು ಯೋಚಿಸಿ.",
            },
            "hi": {
                "hint": "डुप्लिकेट तत्वों को खोजने के लिए, सूची में आगे बढ़ते समय यह ट्रैक करना होगा कि क्या हमने किसी संख्या को पहले देखा है।",
                "next_action": "सोचें कि कौन सी डेटा संरचना पहले देखे गए तत्वों की O(1) समय में जांच करने की अनुमति देती है।",
            },
        },
        2: {
            "en": {
                "hint": "A hash set (`seen = set()`) allows O(1) average membership lookups with `if num in seen:`. When an item is already in `seen`, add it to a `duplicates = set()` so that multiple repeats don't create duplicate entries in your result.",
                "next_action": "Initialize two sets: `seen = set()` and `duplicates = set()`.",
            },
            "kn": {
                "hint": "`seen = set()` ಹ್ಯಾಶ್ ಸೆಟ್ ಬಳಸಿ. ಸಂಖ್ಯೆ ಈಗಾಗಲೇ `seen` ನಲ್ಲಿದ್ದರೆ, ಅದನ್ನು `duplicates = set()` ಗೆ ಸೇರಿಸಿ. ಇದರಿಂದ ಒಂದಕ್ಕಿಂತ ಹೆಚ್ಚು ಬಾರಿ ಪುನರಾವರ್ತನೆಯಾದರೂ ನಕಲು ಬರುವುದಿಲ್ಲ.",
                "next_action": "`seen = set()` ಮತ್ತು `duplicates = set()` ಸೆಟ್ ರಚಿಸಿ.",
            },
            "hi": {
                "hint": "`seen = set()` हैश सेट का उपयोग करें। यदि कोई संख्या पहले से `seen` में है, तो उसे `duplicates = set()` में जोड़ें ताकि बार-बार आने पर भी एक ही बार शामिल हो।",
                "next_action": "`seen = set()` और `duplicates = set()` दो सेट बनाएं।",
            },
        },
        3: {
            "en": {
                "hint": "Step-by-step blueprint:\n1. Initialize `seen = set()` and `duplicates = set()`.\n2. Loop through `for num in nums:`.\n3. If `num in seen: duplicates.add(num)` else `seen.add(num)`.\n4. Return `sorted(list(duplicates))` in ascending order.\nEdge cases: Empty list or list with all unique numbers returns `[]`.",
                "next_action": "Write the set logic and return the sorted list of duplicates.",
            },
            "kn": {
                "hint": "ಹಂತ-ಹಂತದ ಮಾರ್ಗದರ್ಶಿ:\n1. `seen = set()` ಮತ್ತು `duplicates = set()` ಆರಂಭಿಸಿ.\n2. `for num in nums:` ಲೂಪ್ ಮಾಡಿ.\n3. `if num in seen: duplicates.add(num)` ಇಲ್ಲದಿದ್ದರೆ `seen.add(num)`.\n4. `return sorted(list(duplicates))` ಮಾಡಿ.\nಯಾವುದೇ ನಕಲಿ ಇಲ್ಲದಿದ್ದರೆ `[]` ಬರುತ್ತದೆ.",
                "next_action": "ಸೆಟ್ ಲಾಜಿಕ್ ಬರೆದು 'Run Tests' ಕ್ಲಿಕ್ ಮಾಡಿ.",
            },
            "hi": {
                "hint": "कदम-दर-कदम मार्गदर्शन:\n1. `seen = set()` और `duplicates = set()` शुरू करें।\n2. `for num in nums:` लूप चलाएं।\n3. यदि `num in seen`: `duplicates.add(num)` अन्यथा `seen.add(num)`।\n4. अंत में `return sorted(list(duplicates))` करें।\nखाली या अद्वितीय सूची के लिए `[]` लौटाएं।",
                "next_action": "सेट लॉजिक लिखें और क्रमबद्ध सूची लौटाएं।",
            },
        },
    },

    "py-beg-05-two-sum": {
        1: {
            "en": {
                "hint": "For each number `x`, you need to find another number `y` such that `x + y == target`. What does `y` equal in terms of `target` and `x`?",
                "next_action": "Calculate the complement: `complement = target - x`.",
            },
            "kn": {
                "hint": "ಪ್ರತಿ ಸಂಖ್ಯೆ `x` ಗಾಗಿ, `x + y == target` ಆಗುವಂತೆ ಇನ್ನೊಂದು ಸಂಖ್ಯೆ `y` ಹುಡುಕಬೇಕು. ಅಂದರೆ `complement = target - x` ಆಗಿರುತ್ತದೆ.",
                "next_action": "ಪೂರಕ ಸಂಖ್ಯೆ (`complement = target - x`) ಲೆಕ್ಕ ಹಾಕಿ.",
            },
            "hi": {
                "hint": "प्रत्येक संख्या `x` के लिए, आपको ऐसी संख्या `y` ढूंढनी है ताकि `x + y == target` हो। यानी पूरक संख्या `complement = target - x` होगी।",
                "next_action": "पूरक संख्या (`complement = target - x`) की गणना करें।",
            },
        },
        2: {
            "en": {
                "hint": "A brute force approach tests every pair in O(N^2) time. Can we do it in O(N) time? Use a Python dictionary (`seen = {}`) to store numbers and their indices as you iterate. Lookups in a hash map take O(1) time.",
                "next_action": "Think about what key and value to store in the hash map: number as key, index as value.",
            },
            "kn": {
                "hint": "ಎರಡು ನೆಸ್ಟೆಡ್ ಲೂಪ್‌ಗಳು O(N^2) ಸಮಯ ತೆಗೆದುಕೊಳ್ಳುತ್ತವೆ. O(N) ನಲ್ಲಿ ಮಾಡಲು Python dictionary (`seen = {}`) ಬಳಸಿ. ಸಂಖ್ಯೆಯನ್ನು ಕೀ ಆಗಿ ಮತ್ತು ಅದರ ಇಂಡೆಕ್ಸ್ ಅನ್ನು ವ್ಯಾಲ್ಯೂ ಆಗಿ ಸಂಗ್ರಹಿಸಿ.",
                "next_action": "ಹ್ಯಾಶ್ ಮ್ಯಾಪ್‌ನಲ್ಲಿ ಸಂಖ್ಯೆ ಮತ್ತು ಇಂಡೆಕ್ಸ್ ಸಂಗ್ರಹಿಸಲು ಯೋಚಿಸಿ.",
            },
            "hi": {
                "hint": "दो नेस्टेड लूप O(N^2) समय लेते हैं। O(N) समय में हल करने के लिए Python dictionary (`seen = {}`) का उपयोग करें। संख्या को key और इंडेक्स को value के रूप में स्टोर करें।",
                "next_action": "डिक्शनरी में संख्या और उसका इंडेक्स स्टोर करने का विचार करें।",
            },
        },
        3: {
            "en": {
                "hint": "Step-by-step blueprint:\n1. Initialize `seen = {}` (maps number -> index).\n2. Iterate through `nums` with indices: `for i, num in enumerate(nums):`\n3. Calculate `diff = target - num`.\n4. If `diff in seen`: return `[seen[diff], i]`.\n5. Else: record `seen[num] = i`.\n6. Return `[]` if no pair exists.\nThis runs in single-pass O(N) time and O(N) space.",
                "next_action": "Implement the single-pass dictionary lookup and run tests.",
            },
            "kn": {
                "hint": "ಹಂತ-ಹಂತದ ಮಾರ್ಗದರ್ಶಿ:\n1. `seen = {}` ಆರಂಭಿಸಿ.\n2. `for i, num in enumerate(nums):` ಲೂಪ್ ಮಾಡಿ.\n3. `diff = target - num` ಲೆಕ್ಕ ಹಾಕಿ.\n4. `if diff in seen: return [seen[diff], i]` ಮಾಡಿ.\n5. ಇಲ್ಲದಿದ್ದರೆ: `seen[num] = i` ದಾಖಲಿಸಿ.\nಇದು O(N) ಸಮಯದಲ್ಲಿ ಪೂರ್ಣಗೊಳ್ಳುತ್ತದೆ.",
                "next_action": "ಸಿಂಗಲ್-ಪಾಸ್ ಡಿಕ್ಷನರಿ ಕೋಡ್ ಬರೆದು ಪರೀಕ್ಷಿಸಿ.",
            },
            "hi": {
                "hint": "कदम-दर-कदम मार्गदर्शन:\n1. `seen = {}` शुरू करें।\n2. `for i, num in enumerate(nums):` लूप चलाएं।\n3. `diff = target - num` निकालें।\n4. `if diff in seen: return [seen[diff], i]` करें।\n5. अन्यथा: `seen[num] = i` स्टोर करें।\nयह O(N) समय में काम करता है।",
                "next_action": "डिक्शनरी लुकअप कोड लागू करें और टेस्ट रन करें।",
            },
        },
    },
}


class HintService:
    """
    Progressive AI-powered hint service for LocalLearn AI coding challenges.
    Provides 3 progressive pedagogical tiers:
    - Tier 1: Conceptual Clue
    - Tier 2: Problem-Solving Approach
    - Tier 3: Detailed Guidance & Blueprint
    """

    async def get_hint(
        self,
        challenge_id: str,
        student_code: str = "",
        hint_level: int = 1,
        language: str = "en",
        previous_hints: Optional[List[str]] = None,
    ) -> Dict[str, Any]:
        """
        Generate or retrieve a tier-based hint without spoiling the full solution.
        """
        # Strictly validate hint tier
        if hint_level not in (1, 2, 3):
            return {
                "success": False,
                "error": f"Invalid hint level '{hint_level}'. Must be 1, 2, or 3.",
                "challenge_id": challenge_id,
                "level": hint_level,
                "hint_level": hint_level,
                "max_hints": 3,
                "hint": None,
            }

        # Normalize language
        lang = (language or "en").lower().strip()
        if lang not in ("en", "kn", "hi"):
            lang = "en"

        # Validate challenge exists
        challenge = db.get_challenge_by_id(challenge_id)
        if not challenge:
            return {
                "success": False,
                "error": f"Challenge '{challenge_id}' not found.",
                "challenge_id": challenge_id,
                "level": hint_level,
                "hint_level": hint_level,
                "max_hints": 3,
                "hint": None,
            }

        # Try Gemma 4 via Google Gen AI SDK / Ollama
        gemma_hint_text: Optional[str] = None
        next_action_text: Optional[str] = None

        prompt = format_progressive_hint_prompt(
            challenge_title=challenge.get("title", challenge_id),
            challenge_description=challenge.get("description", ""),
            level=hint_level,
            student_code=student_code,
            previous_hints=previous_hints,
            language=lang,
            constraints=challenge.get("constraints", []),
            examples=challenge.get("examples", []),
        )

        try:
            raw_response = await gemma_service.generate(prompt)
            if raw_response and raw_response.strip():
                # Attempt to extract JSON from raw response
                cleaned = raw_response.strip()
                # Remove markdown ```json code blocks if present
                if cleaned.startswith("```"):
                    cleaned = re.sub(r"^```(?:json)?\s*", "", cleaned)
                    cleaned = re.sub(r"\s*```$", "", cleaned)
                
                try:
                    parsed = json.loads(cleaned)
                    if isinstance(parsed, dict) and "hint" in parsed:
                        gemma_hint_text = str(parsed["hint"]).strip()
                        next_action_text = str(parsed.get("next_action") or "").strip()
                except Exception:
                    # Fallback regex extraction if model returned mixed text
                    match = re.search(r'\{.*"hint"\s*:\s*"(.*?)".*\}', cleaned, re.DOTALL)
                    if match:
                        gemma_hint_text = match.group(1).replace("\\n", "\n").replace('\\"', '"')
                    else:
                        gemma_hint_text = cleaned
        except Exception as e:
            logger.warning(f"Gemma progressive hint generation exception: {e}")

        # If Gemma gave a valid hint, use it
        if gemma_hint_text:
            if not next_action_text:
                default_actions = {
                    1: "Think about the conceptual property and inspect your variables.",
                    2: "Try drafting the suggested approach in your editor.",
                    3: "Follow the pseudocode steps to complete your solution.",
                }
                next_action_text = default_actions.get(hint_level, "Apply this hint in your code.")

            return {
                "success": True,
                "challenge_id": challenge_id,
                "level": hint_level,
                "hint_level": hint_level,
                "max_hints": 3,
                "hint": gemma_hint_text,
                "next_action": next_action_text,
                "language": lang,
            }

        # High-quality structured fallback for offline / unconfigured mode
        fallback_data = OFFLINE_PROGRESSIVE_HINTS.get(challenge_id, {}).get(hint_level, {}).get(lang)
        if not fallback_data:
            # Fallback to English for this challenge
            fallback_data = OFFLINE_PROGRESSIVE_HINTS.get(challenge_id, {}).get(hint_level, {}).get("en")

        if fallback_data:
            return {
                "success": True,
                "challenge_id": challenge_id,
                "level": hint_level,
                "hint_level": hint_level,
                "max_hints": 3,
                "hint": fallback_data["hint"],
                "next_action": fallback_data["next_action"],
                "language": lang,
            }

        # Generic progressive fallback if challenge is custom/unknown
        generic_hints = {
            1: {
                "hint": f"Examine the core requirements for '{challenge.get('title', challenge_id)}'. Break down what input format is received and what expected output type is required.",
                "next_action": "Check the example test cases to understand the transformation.",
            },
            2: {
                "hint": f"Consider which standard Python data structure best represents state for '{challenge.get('title', challenge_id)}' (e.g., list, dictionary, set, or counter).",
                "next_action": "Draft an outline of your loop or condition in the editor.",
            },
            3: {
                "hint": f"Step-by-step guidance for '{challenge.get('title', challenge_id)}':\n1. Validate edge cases (empty or single item).\n2. Initialize your accumulator or tracking structure.\n3. Iterate and apply transformations.\n4. Return the calculated result.",
                "next_action": "Implement the steps and click 'Run Tests' to evaluate.",
            },
        }
        gen = generic_hints.get(hint_level, generic_hints[1])
        return {
            "success": True,
            "challenge_id": challenge_id,
            "level": hint_level,
            "hint_level": hint_level,
            "max_hints": 3,
            "hint": gen["hint"],
            "next_action": gen["next_action"],
            "language": lang,
        }


hint_service = HintService()
