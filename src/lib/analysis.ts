export const CREDIBILITY_LEVELS = [
  "Credible",
  "Mostly credible",
  "Mixed / use caution",
  "Weakly supported",
  "High-risk / likely misleading",
] as const;

export type CredibilityLevel = (typeof CREDIBILITY_LEVELS)[number];

export type ResultStatus = "idle" | "loading" | "success" | "error";

export interface AnalysisFlag {
  type: string;
  quote: string;
  explanation: string;
}

export type CitationSourceType =
  | "official"
  | "major-news"
  | "institutional"
  | "reference"
  | "other";

export type CitationRecency =
  | "fresh"
  | "recent"
  | "aging"
  | "stale"
  | "unknown";

export interface AnalysisCitation {
  title: string;
  url: string;
  domain: string;
  publishedAt: string | null;
  snippet: string;
  sourceType: CitationSourceType;
  recency: CitationRecency;
}

export interface AnalysisGrounding {
  attempted: boolean;
  succeeded: boolean;
  searchQueries: string[];
  usedExtract: boolean;
  warning: string | null;
  retrievedAt: string;
  isTimeSensitive: boolean;
}

export interface AnalysisResult {
  credibilityScore: CredibilityLevel | string;
  summary: string;
  mainClaims: string[];
  flags: AnalysisFlag[];
  sourceNotes: string;
  contextNotes: string;
  nextSteps: string[];
  citations: AnalysisCitation[];
  grounding: AnalysisGrounding;
  warnings: string[];
}

export interface CredibilityConfig {
  label: string;
  score: number;
  guidance: string;
  tone: "strong" | "positive" | "mixed" | "caution" | "risk" | "neutral";
}

export const DEFAULT_ANALYSIS_RESULT: AnalysisResult = {
  credibilityScore: "Mixed / use caution",
  summary: "Analysis is temporarily unavailable.",
  mainClaims: [],
  flags: [
    {
      type: "System",
      quote: "",
      explanation:
        "The analysis service encountered an issue while processing this request.",
    },
  ],
  sourceNotes: "No source verification could be completed.",
  contextNotes: "Try again shortly.",
  nextSteps: ["Retry this request in a few moments."],
  citations: [],
  grounding: {
    attempted: false,
    succeeded: false,
    searchQueries: [],
    usedExtract: false,
    warning: null,
    retrievedAt: "",
    isTimeSensitive: false,
  },
  warnings: [],
};

export const CREDIBILITY_CONFIG: Record<string, CredibilityConfig> = {
  Credible: {
    label: "Credible",
    score: 88,
    guidance:
      "Evidence quality appears strong with consistent sourcing and limited manipulation signals.",
    tone: "strong",
  },
  "Mostly credible": {
    label: "Mostly credible",
    score: 73,
    guidance:
      "Most signals look reliable, but a few details still deserve direct verification.",
    tone: "positive",
  },
  "Mixed / use caution": {
    label: "Mixed / use caution",
    score: 55,
    guidance:
      "Some claims may be plausible, but sourcing and context are uneven.",
    tone: "mixed",
  },
  "Weakly supported": {
    label: "Weakly supported",
    score: 33,
    guidance:
      "Evidence appears thin or indirect. Treat this content as tentative.",
    tone: "caution",
  },
  "High-risk / likely misleading": {
    label: "High-risk / likely misleading",
    score: 16,
    guidance:
      "Several risk signals suggest the claim may be manipulative or unreliable.",
    tone: "risk",
  },
};

const NEUTRAL_CONFIG: CredibilityConfig = {
  label: "Mixed / use caution",
  score: 50,
  guidance:
    "The model could not confidently classify this result. Review the evidence directly.",
  tone: "neutral",
};

const CITATION_SOURCE_TYPES: CitationSourceType[] = [
  "official",
  "major-news",
  "institutional",
  "reference",
  "other",
];

const CITATION_RECENCY_VALUES: CitationRecency[] = [
  "fresh",
  "recent",
  "aging",
  "stale",
  "unknown",
];

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => (typeof item === "string" ? item.trim() : ""))
    .filter((item) => item.length > 0);
}

function asFlags(value: unknown): AnalysisFlag[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => {
      if (typeof item !== "object" || item === null) {
        return null;
      }

      const type =
        typeof (item as Record<string, unknown>).type === "string"
          ? (item as Record<string, unknown>).type
          : "Signal";
      const quote =
        typeof (item as Record<string, unknown>).quote === "string"
          ? (item as Record<string, unknown>).quote
          : "";
      const explanation =
        typeof (item as Record<string, unknown>).explanation === "string"
          ? (item as Record<string, unknown>).explanation
          : "No additional explanation was provided.";

      return {
        type,
        quote,
        explanation,
      };
    })
    .filter((item): item is AnalysisFlag => item !== null);
}

function asCitations(value: unknown): AnalysisCitation[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => {
      if (typeof item !== "object" || item === null) {
        return null;
      }

      const payload = item as Record<string, unknown>;

      const title =
        typeof payload.title === "string" && payload.title.trim().length > 0
          ? payload.title.trim()
          : "Untitled source";
      const url = typeof payload.url === "string" ? payload.url.trim() : "";
      const domain =
        typeof payload.domain === "string" && payload.domain.trim().length > 0
          ? payload.domain.trim().toLowerCase()
          : "";
      const publishedAt =
        typeof payload.publishedAt === "string" && payload.publishedAt.trim().length > 0
          ? payload.publishedAt.trim()
          : null;
      const snippet =
        typeof payload.snippet === "string" && payload.snippet.trim().length > 0
          ? payload.snippet.trim()
          : "No source snippet available.";
      const sourceType =
        typeof payload.sourceType === "string" && payload.sourceType.trim().length > 0
          ? CITATION_SOURCE_TYPES.includes(payload.sourceType.trim() as CitationSourceType)
            ? (payload.sourceType.trim() as CitationSourceType)
            : "other"
          : "other";
      const recency =
        typeof payload.recency === "string" && payload.recency.trim().length > 0
          ? CITATION_RECENCY_VALUES.includes(payload.recency.trim() as CitationRecency)
            ? (payload.recency.trim() as CitationRecency)
            : "unknown"
          : "unknown";

      if (!url) {
        return null;
      }

      return {
        title,
        url,
        domain,
        publishedAt,
        snippet,
        sourceType,
        recency,
      };
    })
    .filter((item): item is AnalysisCitation => item !== null);
}

function asGrounding(value: unknown): AnalysisGrounding {
  if (typeof value !== "object" || value === null) {
    return {
      ...DEFAULT_ANALYSIS_RESULT.grounding,
      searchQueries: [...DEFAULT_ANALYSIS_RESULT.grounding.searchQueries],
    };
  }

  const payload = value as Record<string, unknown>;

  return {
    attempted:
      typeof payload.attempted === "boolean"
        ? payload.attempted
        : DEFAULT_ANALYSIS_RESULT.grounding.attempted,
    succeeded:
      typeof payload.succeeded === "boolean"
        ? payload.succeeded
        : DEFAULT_ANALYSIS_RESULT.grounding.succeeded,
    searchQueries: asStringArray(payload.searchQueries),
    usedExtract:
      typeof payload.usedExtract === "boolean"
        ? payload.usedExtract
        : DEFAULT_ANALYSIS_RESULT.grounding.usedExtract,
    warning:
      typeof payload.warning === "string"
        ? payload.warning
        : DEFAULT_ANALYSIS_RESULT.grounding.warning,
    retrievedAt:
      typeof payload.retrievedAt === "string"
        ? payload.retrievedAt
        : DEFAULT_ANALYSIS_RESULT.grounding.retrievedAt,
    isTimeSensitive:
      typeof payload.isTimeSensitive === "boolean"
        ? payload.isTimeSensitive
        : DEFAULT_ANALYSIS_RESULT.grounding.isTimeSensitive,
  };
}

export function getCredibilityConfig(level: string): CredibilityConfig {
  return CREDIBILITY_CONFIG[level] ?? {
    ...NEUTRAL_CONFIG,
    label: level || NEUTRAL_CONFIG.label,
  };
}

export function normalizeAnalysisResult(input: unknown): AnalysisResult {
  if (typeof input !== "object" || input === null) {
    return DEFAULT_ANALYSIS_RESULT;
  }

  const payload = input as Record<string, unknown>;

  return {
    credibilityScore:
      typeof payload.credibilityScore === "string"
        ? payload.credibilityScore
        : DEFAULT_ANALYSIS_RESULT.credibilityScore,
    summary:
      typeof payload.summary === "string"
        ? payload.summary
        : DEFAULT_ANALYSIS_RESULT.summary,
    mainClaims: asStringArray(payload.mainClaims),
    flags: asFlags(payload.flags),
    sourceNotes:
      typeof payload.sourceNotes === "string"
        ? payload.sourceNotes
        : DEFAULT_ANALYSIS_RESULT.sourceNotes,
    contextNotes:
      typeof payload.contextNotes === "string"
        ? payload.contextNotes
        : DEFAULT_ANALYSIS_RESULT.contextNotes,
    nextSteps: asStringArray(payload.nextSteps),
    citations: asCitations(payload.citations),
    grounding: asGrounding(payload.grounding),
    warnings: asStringArray(payload.warnings),
  };
}
