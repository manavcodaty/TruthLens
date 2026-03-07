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

export interface AnalysisResult {
  credibilityScore: CredibilityLevel | string;
  summary: string;
  mainClaims: string[];
  flags: AnalysisFlag[];
  sourceNotes: string;
  contextNotes: string;
  nextSteps: string[];
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
  };
}
