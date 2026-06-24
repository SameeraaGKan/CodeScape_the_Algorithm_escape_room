import type { PathId } from "@/types";

export type PathMeta = {
  id: PathId;
  label: string;
  description: string;
  icon: string;
  questionCount: number;
  category: "cs_foundations" | "cs_systems" | "cs_ai_data" | "cs_applied" | "gmat" | "random";
  difficulty: "Beginner" | "Intermediate" | "Advanced" | "Mixed";
};

export const PATH_CATEGORIES = [
  {
    id: "cs_foundations",
    label: "🧠 CS Core Foundations & Theory",
    color: "#05b9b6",
  },
  {
    id: "cs_systems",
    label: "💻 Computer Systems & Architecture",
    color: "#0066ff",
  },
  {
    id: "cs_ai_data",
    label: "🤖 Artificial Intelligence & Data",
    color: "#ff00cc",
  },
  {
    id: "cs_applied",
    label: "🛠️ Applied & Software Engineering",
    color: "#00ff88",
  },
  {
    id: "gmat",
    label: "📊 GMAT Prep",
    color: "#f59e0b",
  },
  {
    id: "random",
    label: "🎲 Random Mix",
    color: "#a855f7",
  },
] as const;

export const PATHS: PathMeta[] = [
  // ── CS Core Foundations ───────────────────────────────────
  {
    id: "cs_algorithms",
    label: "Algorithms & Data Structures",
    description: "Sorting, graphs, trees, heaps, dynamic programming, and asymptotic analysis.",
    icon: "⚡",
    questionCount: 10,
    category: "cs_foundations",
    difficulty: "Intermediate",
  },
  {
    id: "cs_theory",
    label: "Computational Theory",
    description: "Turing machines, P vs NP, complexity classes, decidability, and formal languages.",
    icon: "∞",
    questionCount: 10,
    category: "cs_foundations",
    difficulty: "Advanced",
  },
  {
    id: "cs_discrete_math",
    label: "Discrete Mathematics",
    description: "Logic, set theory, combinatorics, graph theory, and modular arithmetic.",
    icon: "∑",
    questionCount: 10,
    category: "cs_foundations",
    difficulty: "Intermediate",
  },
  // ── CS Systems ───────────────────────────────────────────
  {
    id: "cs_os_compilers",
    label: "Operating Systems & Compilers",
    description: "Processes, memory, scheduling, virtual memory, lexers, and parsers.",
    icon: "🖥",
    questionCount: 10,
    category: "cs_systems",
    difficulty: "Advanced",
  },
  {
    id: "cs_networks",
    label: "Computer Networks",
    description: "TCP/IP, OSI model, DNS, routing protocols, HTTP, and network security.",
    icon: "🌐",
    questionCount: 10,
    category: "cs_systems",
    difficulty: "Intermediate",
  },
  {
    id: "cs_cybersecurity",
    label: "Cybersecurity",
    description: "Cryptography, common vulnerabilities, attack vectors, and defense strategies.",
    icon: "🔐",
    questionCount: 10,
    category: "cs_systems",
    difficulty: "Intermediate",
  },
  // ── CS AI & Data ─────────────────────────────────────────
  {
    id: "cs_ml_ai",
    label: "Machine Learning & AI",
    description: "Neural networks, gradient descent, NLP, transformers, and ML fundamentals.",
    icon: "🧬",
    questionCount: 10,
    category: "cs_ai_data",
    difficulty: "Advanced",
  },
  {
    id: "cs_databases",
    label: "Databases",
    description: "SQL, ACID, indexing, normalization, transactions, and NoSQL systems.",
    icon: "🗄",
    questionCount: 10,
    category: "cs_ai_data",
    difficulty: "Intermediate",
  },
  {
    id: "cs_data_science",
    label: "Data Science",
    description: "Statistics, hypothesis testing, PCA, visualization, and data pipelines.",
    icon: "📈",
    questionCount: 10,
    category: "cs_ai_data",
    difficulty: "Intermediate",
  },
  // ── CS Applied ──────────────────────────────────────────
  {
    id: "cs_software_engineering",
    label: "Software Engineering",
    description: "Design patterns, SOLID, CI/CD, agile, REST APIs, and system design.",
    icon: "🏗",
    questionCount: 10,
    category: "cs_applied",
    difficulty: "Intermediate",
  },
  {
    id: "cs_graphics",
    label: "Computer Graphics",
    description: "Rasterization, shaders, ray tracing, Bezier curves, and 3D transformations.",
    icon: "🎨",
    questionCount: 10,
    category: "cs_applied",
    difficulty: "Advanced",
  },
  {
    id: "cs_hci",
    label: "Human-Computer Interaction",
    description: "Usability heuristics, accessibility, Fitts's Law, wireframing, and UX research.",
    icon: "👆",
    questionCount: 10,
    category: "cs_applied",
    difficulty: "Beginner",
  },
  // ── GMAT ────────────────────────────────────────────────
  {
    id: "gmat_quant",
    label: "GMAT Quantitative",
    description: "Problem Solving and Data Sufficiency: arithmetic, algebra, and geometry.",
    icon: "➗",
    questionCount: 40,
    category: "gmat",
    difficulty: "Mixed",
  },
  {
    id: "gmat_verbal",
    label: "GMAT Verbal",
    description: "Sentence Correction, Critical Reasoning, and Reading Comprehension.",
    icon: "📝",
    questionCount: 40,
    category: "gmat",
    difficulty: "Mixed",
  },
  {
    id: "gmat_data_insights",
    label: "GMAT Data Insights",
    description: "Data Sufficiency, Multi-Source Reasoning, Table Analysis, and Graphics Interpretation.",
    icon: "📊",
    questionCount: 40,
    category: "gmat",
    difficulty: "Mixed",
  },
  // ── Random ──────────────────────────────────────────────
  {
    id: "cs_random",
    label: "Random CS Mix",
    description: "Shuffled questions from all 12 CS topics. A true test of breadth.",
    icon: "🎲",
    questionCount: 20,
    category: "random",
    difficulty: "Mixed",
  },
  // ── GMAT Full Test ───────────────────────────────────────
  {
    id: "gmat_full_test",
    label: "GMAT Focus Edition",
    description: "Full adaptive exam: Quantitative (21Q) → Verbal (23Q) → Data Insights (20Q). 45 min per section. Single-player only.",
    icon: "🏆",
    questionCount: 64,
    category: "gmat",
    difficulty: "Mixed",
  },
  // ── GMAT Practice Tests 1–10 ────────────────────────────
  // ── GMAT Quant Topic Drills ──────────────────────────────
  { id: "gmat_quant_arithmetic" as PathId, label: "Arithmetic", description: "Fractions, decimals, percents, ratios, and averages. 15 adaptive questions.", icon: "🔢", questionCount: 15, category: "gmat" as const, difficulty: "Mixed" as const },
  { id: "gmat_quant_algebra" as PathId, label: "Algebra", description: "Equations, inequalities, exponents, and factoring. 15 adaptive questions.", icon: "📐", questionCount: 15, category: "gmat" as const, difficulty: "Mixed" as const },
  { id: "gmat_quant_geometry" as PathId, label: "Geometry", description: "Triangles, circles, area, volume, and angles. 15 adaptive questions.", icon: "📐", questionCount: 15, category: "gmat" as const, difficulty: "Mixed" as const },
  { id: "gmat_quant_word_problems" as PathId, label: "Word Problems", description: "Rate, work, mixture, and distance problems. 15 adaptive questions.", icon: "📝", questionCount: 15, category: "gmat" as const, difficulty: "Mixed" as const },
  { id: "gmat_quant_number_theory" as PathId, label: "Number Theory", description: "Divisibility, primes, GCD, LCM, remainders, and modular arithmetic. 15 questions.", icon: "🔢", questionCount: 15, category: "gmat" as const, difficulty: "Mixed" as const },
  { id: "gmat_quant_statistics" as PathId, label: "Statistics", description: "Mean, median, mode, range, standard deviation, and variance. 15 questions.", icon: "📊", questionCount: 15, category: "gmat" as const, difficulty: "Mixed" as const },
  { id: "gmat_quant_combinatorics" as PathId, label: "Combinatorics", description: "Permutations, combinations, and counting principles. 15 adaptive questions.", icon: "🔀", questionCount: 15, category: "gmat" as const, difficulty: "Mixed" as const },
  { id: "gmat_quant_coordinate_geo" as PathId, label: "Coordinate Geometry", description: "Slope, distance, midpoint, lines, and circles in the coordinate plane. 15 questions.", icon: "📍", questionCount: 15, category: "gmat" as const, difficulty: "Mixed" as const },
  { id: "gmat_quant_functions" as PathId, label: "Functions", description: "Function notation, composition, inverse functions, and graphs. 15 questions.", icon: "ƒ", questionCount: 15, category: "gmat" as const, difficulty: "Mixed" as const },
  { id: "gmat_quant_probability" as PathId, label: "Probability", description: "Basic probability, conditional probability, and counting outcomes. 15 questions.", icon: "🎲", questionCount: 15, category: "gmat" as const, difficulty: "Mixed" as const },
  // ── GMAT Practice Tests 1–10 ────────────────────────────
  ...[1,2,3,4,5,6,7,8,9,10].map(n => ({
    id: `gmat_test_${n}` as PathId,
    label: `Practice Test ${n}`,
    description: "Full adaptive GMAT Focus Edition: 21Q Quant · 23Q Verbal · 20Q Data Insights. Unique question set.",
    icon: "📝",
    questionCount: 64,
    category: "gmat" as const,
    difficulty: "Mixed" as const,
  })),
];
