export interface IOExample {
  input: string;
  output: string;
  explanation?: string;
}

export interface TestCase {
  input: Record<string, any>;
  expected: any;
}

export interface Challenge {
  id: string;
  title: string;
  description: string;
  difficulty: "Beginner" | "Easy" | "Medium" | "Hard" | string;
  topic: string;
  category?: string;
  subject?: string;
  starter_code: string;
  constraints: string[];
  learning_objectives: string[];
  input_output_examples: IOExample[];
  test_cases?: TestCase[];
  hints?: string[];
}

export const FALLBACK_CHALLENGES: Challenge[] = [
  {
    id: "py-beg-01-reverse-string",
    title: "Reverse a String",
    description: "Write a function `reverse_string(s: str) -> str` that takes a string `s` and returns a new string with the characters in reverse order.",
    difficulty: "Beginner",
    topic: "Strings",
    category: "Strings",
    subject: "Python / DSA",
    learning_objectives: [
      "Understand string indexing and slicing syntax in Python",
      "Learn two-pointer string manipulation concepts",
      "Understand string immutability in Python and memory efficiency"
    ],
    constraints: [
      "0 <= len(s) <= 10^4",
      "s consists of printable ASCII characters and spaces."
    ],
    input_output_examples: [
      {
        input: 's = "hello"',
        output: '"olleh"',
        explanation: "The characters of 'hello' in reverse order produce 'olleh'."
      },
      {
        input: 's = "Python"',
        output: '"nohtyP"',
        explanation: "Character casing and position are preserved in reverse."
      },
      {
        input: 's = "a"',
        output: '"a"',
        explanation: "A single-character string reversed remains unchanged."
      }
    ],
    starter_code: `def reverse_string(s: str) -> str:\n    """\n    Reverse the input string and return the result.\n    """\n    # Write your solution here\n    pass\n`,
    test_cases: [
      { input: { s: "hello" }, expected: "olleh" },
      { input: { s: "world" }, expected: "dlrow" },
      { input: { s: "" }, expected: "" }
    ],
    hints: [
      "Consider using Python's string slicing step parameter: s[start:stop:step].",
      "A step of -1 steps backward through the entire string.",
      "Alternatively, you can convert the string into a list of characters and use two pointers (left, right) to swap in-place."
    ]
  },
  {
    id: "py-beg-02-find-largest",
    title: "Find Largest Number",
    description: "Write a function `find_largest(nums: list[int]) -> int` that takes a non-empty list of integers and returns the maximum value without using Python's built-in `max()` function.",
    difficulty: "Beginner",
    topic: "Arrays & Lists",
    category: "Arrays",
    subject: "Python / DSA",
    learning_objectives: [
      "Master linear iteration over lists with O(N) time complexity",
      "Understand proper initialization of accumulator variables (handling negative arrays)",
      "Practice conditional comparisons and state tracking"
    ],
    constraints: [
      "1 <= len(nums) <= 10^5",
      "-10^9 <= nums[i] <= 10^9",
      "Do not use Python's built-in max() function."
    ],
    input_output_examples: [
      {
        input: "nums = [3, 7, 2, 9, 5]",
        output: "9",
        explanation: "9 is the highest value among all elements."
      },
      {
        input: "nums = [-10, -3, -20, -1]",
        output: "-1",
        explanation: "Among negative integers, -1 is the highest value."
      },
      {
        input: "nums = [42]",
        output: "42",
        explanation: "In a single-element list, that element is the maximum."
      }
    ],
    starter_code: `def find_largest(nums: list[int]) -> int:\n    """\n    Find and return the maximum value in nums without using max().\n    """\n    # Write your solution here\n    pass\n`,
    test_cases: [
      { input: { nums: [3, 7, 2, 9, 5] }, expected: 9 },
      { input: { nums: [-5, -2, -9, -1] }, expected: -1 },
      { input: { nums: [100] }, expected: 100 }
    ],
    hints: [
      "Initialize your `max_val` variable to `nums[0]` rather than 0 so negative numbers are handled correctly.",
      "Iterate through the remaining elements starting from index 1.",
      "If the current number is greater than `max_val`, update `max_val = current_number`."
    ]
  },
  {
    id: "py-beg-03-palindrome-check",
    title: "Palindrome Check",
    description: "Write a function `is_palindrome(s: str) -> bool` that determines whether a string reads the same forwards and backwards, ignoring non-alphanumeric characters and letter casing.",
    difficulty: "Beginner",
    topic: "Two Pointers & Strings",
    category: "Strings",
    subject: "Python / DSA",
    learning_objectives: [
      "Learn string cleaning using `.isalnum()` and `.lower()`",
      "Apply the two-pointer technique (left and right converging inward)",
      "Understand edge case handling for whitespace and punctuation"
    ],
    constraints: [
      "0 <= len(s) <= 2 * 10^5",
      "s consists only of printable ASCII characters."
    ],
    input_output_examples: [
      {
        input: 's = "A man, a plan, a canal: Panama"',
        output: "true",
        explanation: "Normalized to 'amanaplanacanalpanama', which reads identical in reverse."
      },
      {
        input: 's = "race a car"',
        output: "false",
        explanation: "Normalized to 'raceacar', which is not a palindrome."
      },
      {
        input: 's = " "',
        output: "true",
        explanation: "An empty string or string containing no alphanumeric characters is considered a valid palindrome."
      }
    ],
    starter_code: `def is_palindrome(s: str) -> bool:\n    """\n    Determine if s is a palindrome, ignoring non-alphanumeric characters and case.\n    """\n    # Write your solution here\n    pass\n`,
    test_cases: [
      { input: { s: "A man, a plan, a canal: Panama" }, expected: true },
      { input: { s: "race a car" }, expected: false },
      { input: { s: "Was it a car or a cat I saw?" }, expected: true }
    ],
    hints: [
      "Filter the string to keep only alphanumeric characters: `char.isalnum()`.",
      "Convert all letters to lowercase so comparisons are case-insensitive.",
      "Compare the filtered sequence with its reverse, or use two pointers from the start and end."
    ]
  },
  {
    id: "py-beg-04-find-duplicates",
    title: "Find Duplicate Elements",
    description: "Write a function `find_duplicates(nums: list[int]) -> list[int]` that finds all elements appearing more than once in the list. Return the duplicates as a unique, sorted list in ascending order.",
    difficulty: "Beginner",
    topic: "Hash Sets & Dictionaries",
    category: "Hash Table",
    subject: "Python / DSA",
    learning_objectives: [
      "Use hash sets for O(1) average-time membership lookups",
      "Contrast O(N) hash-based tracking with O(N^2) brute-force nested loops",
      "Perform list deduplication and sorting"
    ],
    constraints: [
      "0 <= len(nums) <= 10^5",
      "-10^9 <= nums[i] <= 10^9",
      "Returned list must contain unique duplicate values sorted in ascending order."
    ],
    input_output_examples: [
      {
        input: "nums = [4, 3, 2, 7, 8, 2, 3, 1]",
        output: "[2, 3]",
        explanation: "2 and 3 both appear twice in the list."
      },
      {
        input: "nums = [1, 1, 2]",
        output: "[1]",
        explanation: "Only 1 is repeated."
      },
      {
        input: "nums = [1, 2, 3, 4]",
        output: "[]",
        explanation: "No elements are duplicated."
      }
    ],
    starter_code: `def find_duplicates(nums: list[int]) -> list[int]:\n    """\n    Find duplicate elements and return them sorted in ascending order.\n    """\n    # Write your solution here\n    pass\n`,
    test_cases: [
      { input: { nums: [4, 3, 2, 7, 8, 2, 3, 1] }, expected: [2, 3] },
      { input: { nums: [1, 1, 2] }, expected: [1] },
      { input: { nums: [1, 2, 3, 4] }, expected: [] }
    ],
    hints: [
      "Maintain a `seen` set to track elements encountered so far.",
      "If you see an element already present in `seen`, add it to a `duplicates` set.",
      "Convert the `duplicates` set to a sorted list before returning: `sorted(list(duplicates))`."
    ]
  },
  {
    id: "py-beg-05-two-sum",
    title: "Two Sum",
    description: "Given an array of integers `nums` and an integer `target`, return the indices of the two numbers such that they add up to `target`. You may assume each input has exactly one solution, and you may not use the same element twice. Return the indices sorted in ascending order `[index1, index2]`.",
    difficulty: "Beginner",
    topic: "Hash Maps & Arrays",
    category: "Hash Table",
    subject: "Python / DSA",
    learning_objectives: [
      "Master the complement lookup pattern: target - current_value",
      "Achieve optimal O(N) time and O(N) space using a dictionary",
      "Avoid self-pairing by storing indices as you iterate"
    ],
    constraints: [
      "2 <= len(nums) <= 10^4",
      "-10^9 <= nums[i] <= 10^9",
      "-10^9 <= target <= 10^9",
      "Exactly one valid solution exists."
    ],
    input_output_examples: [
      {
        input: "nums = [2, 7, 11, 15], target = 9",
        output: "[0, 1]",
        explanation: "nums[0] + nums[1] == 2 + 7 == 9, so return [0, 1]."
      },
      {
        input: "nums = [3, 2, 4], target = 6",
        output: "[1, 2]",
        explanation: "nums[1] + nums[2] == 2 + 4 == 6, so return [1, 2]."
      },
      {
        input: "nums = [3, 3], target = 6",
        output: "[0, 1]",
        explanation: "nums[0] + nums[1] == 3 + 3 == 6, so return [0, 1]."
      }
    ],
    starter_code: `def two_sum(nums: list[int], target: int) -> list[int]:\n    """\n    Find indices of two numbers that add up to target.\n    Return [index1, index2] where index1 < index2.\n    """\n    # Write your solution here\n    pass\n`,
    test_cases: [
      { input: { nums: [2, 7, 11, 15], target: 9 }, expected: [0, 1] },
      { input: { nums: [3, 2, 4], target: 6 }, expected: [1, 2] },
      { input: { nums: [3, 3], target: 6 }, expected: [0, 1] }
    ],
    hints: [
      "A brute force approach checks all pairs in O(N^2). We can do much better in O(N) using a hash map.",
      "For each number `x`, calculate its complement: `target - x`.",
      "If the complement is already in your dictionary, return `[dict[complement], current_index]`."
    ]
  }
];

export interface FetchChallengeResult {
  challenge: Challenge | null;
  isNotFound: boolean;
  error: string | null;
}

export async function fetchChallenge(challengeId: string): Promise<FetchChallengeResult> {
  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";

  // 1. Try FastAPI backend directly (GET /challenges/{challenge_id})
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 2000);
    const res = await fetch(`${backendUrl}/challenges/${encodeURIComponent(challengeId)}`, {
      signal: controller.signal,
      headers: { Accept: "application/json" },
    });
    clearTimeout(timeout);

    if (res.status === 404) {
      return {
        challenge: null,
        isNotFound: true,
        error: `Challenge '${challengeId}' was not found.`,
      };
    }

    if (res.ok) {
      const data = await res.json();
      return {
        challenge: data,
        isNotFound: false,
        error: null,
      };
    }
  } catch (err) {
    // Backend may not be running on localhost:8000; fallback to local API route
  }

  // 2. Try Next.js internal API route fallback (/api/challenges/{challenge_id})
  try {
    const res = await fetch(`/api/challenges/${encodeURIComponent(challengeId)}`);
    if (res.status === 404) {
      return {
        challenge: null,
        isNotFound: true,
        error: `Challenge '${challengeId}' was not found.`,
      };
    }
    if (res.ok) {
      const data = await res.json();
      return {
        challenge: data,
        isNotFound: false,
        error: null,
      };
    }
  } catch (err) {
    // Network / offline error
  }

  // 3. Match against known fallback dataset
  const localMatch = FALLBACK_CHALLENGES.find((c) => c.id === challengeId);
  if (localMatch) {
    return {
      challenge: localMatch,
      isNotFound: false,
      error: null,
    };
  }

  // If ID doesn't match any known challenge
  return {
    challenge: null,
    isNotFound: true,
    error: `Challenge '${challengeId}' not found.`,
  };
}

export async function fetchAllChallenges(): Promise<Challenge[]> {
  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 2000);
    const res = await fetch(`${backendUrl}/challenges`, {
      signal: controller.signal,
      headers: { Accept: "application/json" },
    });
    clearTimeout(timeout);
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) return data;
    }
  } catch (err) {}

  try {
    const res = await fetch("/api/challenges");
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) return data;
    }
  } catch (err) {}

  return FALLBACK_CHALLENGES;
}
