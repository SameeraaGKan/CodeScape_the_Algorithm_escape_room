import type { Puzzle } from "@/types";

export const PUZZLES: Record<string, Puzzle> = {
  caesar_cipher_01: {
    id: "caesar_cipher_01",
    type: "cipher",
    category: "cipher",
    title: "The Encrypted Handshake",
    difficulty: "easy",
    stage: 1,
    description:
      "You've intercepted a transmission from the mainframe. It's encrypted with a Caesar cipher. The shift key is the number of nodes in a complete binary tree of height 2. Decode the message to proceed.",
    setup: {
      ciphertext: "KHOOR ZRUOG",
      shiftHint:
        "The shift equals the number of nodes in a complete binary tree of height 2 (3 levels total).",
    },
    hints: [
      "A Caesar cipher shifts each letter by a fixed number. Try shifting backwards.",
      "A complete binary tree of height 2 has 3 levels: 1 root + 2 children + 4 leaves = 7 nodes. But height 2 means 2 edges, so 3 levels... actually count: root (level 0), 2 nodes (level 1), 4 nodes (level 2) = 7. Hmm, but if height is defined as number of edges, height 2 = 3 levels = 7. That's your shift... wait, re-read the hint.",
      "The shift is 3. Shift each letter back by 3 positions in the alphabet.",
    ],
    maxAttempts: 5,
    timeLimitSeconds: 300,
    points: 100,
    agentContext:
      "The puzzle is a Caesar cipher with shift 3. KHOOR ZRUOG decodes to HELLO WORLD. The player needs to shift each letter back by 3.",
  },

  bubble_sort_01: {
    id: "bubble_sort_01",
    type: "code_fill",
    category: "sorting",
    title: "Corrupted Sort Loop",
    difficulty: "easy",
    stage: 2,
    description:
      "The system's sorting algorithm has been corrupted. The inner comparison is missing. Fill in the blank to restore the bubble sort and unlock the next sector.",
    setup: {
      language: "python",
      starterCode: `def bubble_sort(arr):
    n = len(arr)
    for i in range(n):
        for j in range(0, n - i - 1):
            if ___BLANK___:
                arr[j], arr[j + 1] = arr[j + 1], arr[j]
    return arr`,
      blankPlaceholder: "___BLANK___",
      testCases: [
        { input: [64, 34, 25, 12], expected: [12, 25, 34, 64] },
        { input: [5, 1, 4, 2, 8], expected: [1, 2, 4, 5, 8] },
      ],
    },
    hints: [
      "Think about what condition causes a swap in bubble sort.",
      "You want to swap when the left element is larger than the right element.",
      "The condition is: arr[j] > arr[j + 1]",
    ],
    maxAttempts: 5,
    timeLimitSeconds: 360,
    points: 150,
    agentContext:
      "The player needs to fill in the comparison condition inside the inner loop of bubble sort. The correct answer is `arr[j] > arr[j + 1]`. The outer index is i, inner is j.",
  },

  binary_search_01: {
    id: "binary_search_01",
    type: "code_fill",
    category: "sorting",
    title: "The Missing Mid",
    difficulty: "medium",
    stage: 2,
    description:
      "Binary search is broken — the mid-point calculation causes integer overflow on large inputs. Fix it with the safe overflow-proof version.",
    setup: {
      language: "python",
      starterCode: `def binary_search(arr, target):
    left, right = 0, len(arr) - 1
    while left <= right:
        mid = ___BLANK___
        if arr[mid] == target:
            return mid
        elif arr[mid] < target:
            left = mid + 1
        else:
            right = mid - 1
    return -1`,
      blankPlaceholder: "___BLANK___",
      testCases: [
        { input: { arr: [1, 3, 5, 7, 9], target: 5 }, expected: 2 },
        { input: { arr: [1, 3, 5, 7, 9], target: 6 }, expected: -1 },
      ],
    },
    hints: [
      "The naive mid = (left + right) // 2 can overflow for large integers in some languages.",
      "The safe version avoids overflow by computing the offset from left.",
      "The answer is: left + (right - left) // 2",
    ],
    maxAttempts: 5,
    timeLimitSeconds: 360,
    points: 175,
    agentContext:
      "The player needs the overflow-safe binary search mid calculation. Answer: `left + (right - left) // 2`. The naive `(left + right) // 2` is also accepted in Python but the overflow-safe form is preferred.",
  },

  factorial_trace_01: {
    id: "factorial_trace_01",
    type: "recursion_trace",
    category: "recursion",
    title: "The Recursive Descent",
    difficulty: "medium",
    stage: 2,
    description:
      "Trace the recursion. The call stack has been scrambled — fill in the missing return values to restore the sequence and escape the recursion trap.",
    setup: {
      language: "python",
      code: `def factorial(n):
    if n == 0:
        return 1
    return n * factorial(n - 1)`,
      callToTrace: "factorial(4)",
      blanksInStack: [
        { frameId: 0, field: "returnValue" }, // factorial(0) returns ?
        { frameId: 2, field: "returnValue" }, // factorial(2) returns ?
        { frameId: 4, field: "returnValue" }, // factorial(4) returns ?
      ],
    },
    hints: [
      "Start from the base case: factorial(0) = 1.",
      "Work upward: factorial(1) = 1 * factorial(0) = 1, factorial(2) = 2 * 1 = 2.",
      "factorial(0)=1, factorial(2)=2, factorial(4)=24",
    ],
    maxAttempts: 5,
    timeLimitSeconds: 420,
    points: 200,
    agentContext:
      "The player traces factorial(4). Call stack (bottom to top): factorial(0)→1, factorial(1)→1, factorial(2)→2, factorial(3)→6, factorial(4)→24. The blanks are frame 0=1, frame 2=2, frame 4=24.",
  },

  bfs_maze_01: {
    id: "bfs_maze_01",
    type: "maze",
    category: "maze",
    title: "Algorithm Maze: BFS Escape",
    difficulty: "hard",
    stage: 3,
    description:
      "You're trapped in the Algorithm Maze. Navigate from START to END using Breadth-First Search logic — always explore the nearest unvisited node first. Click cells to build your path.",
    setup: {
      grid: [
        [0, 1, 0, 0, 0],
        [0, 1, 0, 1, 0],
        [0, 0, 0, 1, 0],
        [1, 1, 0, 0, 0],
        [0, 0, 0, 1, 0],
      ],
      start: [0, 0],
      end: [4, 4],
      algorithm: "bfs",
    },
    hints: [
      "BFS explores all neighbors at distance 1, then distance 2, etc. Start by listing all cells reachable from [0,0].",
      "0 = open path, 1 = wall. You can't pass through walls.",
      "One valid BFS path: [0,0]→[1,0]→[2,0]→[2,1]→[2,2]→[3,2]→[3,3]→[3,4]→[4,4]",
    ],
    maxAttempts: 3,
    timeLimitSeconds: 600,
    points: 300,
    agentContext:
      "This is a 5x5 grid maze. 0=passable, 1=wall. Start=[0,0], End=[4,4]. A valid BFS shortest path is: [0,0],[1,0],[2,0],[2,1],[2,2],[3,2],[3,3],[3,4],[4,4]. Player clicks cells to define their path.",
  },

  stack_brackets_01: {
    id: "stack_brackets_01",
    type: "code_fill",
    category: "data_structures",
    title: "The Stack Guardian",
    difficulty: "medium",
    stage: 2,
    description:
      "The firewall uses a stack to validate bracket sequences. The check function is incomplete. Fill in the missing logic to validate balanced brackets and disable the lock.",
    setup: {
      language: "python",
      starterCode: `def is_balanced(s):
    stack = []
    pairs = {')': '(', '}': '{', ']': '['}
    for char in s:
        if char in '([{':
            stack.append(char)
        elif char in ')]}':
            if ___BLANK___:
                return False
            stack.pop()
    return len(stack) == 0`,
      blankPlaceholder: "___BLANK___",
      testCases: [
        { input: "([]{})", expected: true },
        { input: "([)]", expected: false },
        { input: "{[]}", expected: true },
        { input: "(", expected: false },
      ],
    },
    hints: [
      "When you see a closing bracket, you need to check the top of the stack.",
      "Two things could go wrong: the stack is empty, OR the top doesn't match the expected opener.",
      "The condition is: `not stack or stack[-1] != pairs[char]`",
    ],
    maxAttempts: 5,
    timeLimitSeconds: 420,
    points: 200,
    agentContext:
      "The player fills in the condition for when a mismatch is detected. The correct answer is: `not stack or stack[-1] != pairs[char]`. This handles both an empty stack and a mismatched bracket.",
  },
};

export const PUZZLE_SETS: Record<string, { stages: { stageNumber: number; title: string; puzzleIds: string[] }[] }> = {
  default_set: {
    stages: [
      {
        stageNumber: 1,
        title: "Initialization Protocol",
        puzzleIds: ["caesar_cipher_01"],
      },
      {
        stageNumber: 2,
        title: "Code Breakers Challenge",
        puzzleIds: ["bubble_sort_01", "binary_search_01", "stack_brackets_01", "factorial_trace_01"],
      },
      {
        stageNumber: 3,
        title: "Algorithm Maze — Final Escape",
        puzzleIds: ["bfs_maze_01"],
      },
    ],
  },
};

export function getPuzzleOrder(setId = "default_set"): string[] {
  const set = PUZZLE_SETS[setId];
  if (!set) return [];
  return set.stages.flatMap((stage) => stage.puzzleIds);
}
