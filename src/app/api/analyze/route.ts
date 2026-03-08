import { GoogleGenerativeAI, SchemaType } from "@google/generative-ai";
import type { ResponseSchema } from "@google/generative-ai";
import ModelClient, { isUnexpected } from "@azure-rest/ai-inference";
import { AzureKeyCredential } from "@azure/core-auth";
import { NextResponse } from "next/server";

import {
  DEFAULT_ANALYSIS_RESULT,
  normalizeAnalysisResult,
  type AnalysisResult,
} from "@/lib/analysis";
import {
  buildTavilyGrounding,
  type TavilyGroundingResult,
} from "@/lib/tavily";

const MODEL_CANDIDATES = [
  process.env.GEMINI_MODEL,
  "gemini-2.5-flash",
  "gemini-2.0-flash",
  "gemini-2.5-flash-lite",
].filter((model): model is string => Boolean(model));

const FOUNDRY_MODEL = "meta/Meta-Llama-3.1-8B-Instruct";

const RESPONSE_SCHEMA = {
  type: SchemaType.OBJECT,
  properties: {
    credibilityScore: {
      type: SchemaType.STRING,
      format: "enum",
      description: "Overall credibility rating for the content.",
      enum: [
        "Credible",
        "Mostly credible",
        "Mixed / use caution",
        "Weakly supported",
        "High-risk / likely misleading",
      ],
    },
    summary: {
      type: SchemaType.STRING,
      description: "A concise overall explanation of the credibility assessment.",
    },
    mainClaims: {
      type: SchemaType.ARRAY,
      items: { type: SchemaType.STRING },
    },
    flags: {
      type: SchemaType.ARRAY,
      items: {
        type: SchemaType.OBJECT,
        properties: {
          type: {
            type: SchemaType.STRING,
            description: "Signal category, e.g. Emotional Language, Missing Context",
          },
          quote: { type: SchemaType.STRING },
          explanation: { type: SchemaType.STRING },
        },
        required: ["type", "quote", "explanation"],
      },
    },
    sourceNotes: { type: SchemaType.STRING },
    contextNotes: { type: SchemaType.STRING },
    nextSteps: {
      type: SchemaType.ARRAY,
      items: { type: SchemaType.STRING },
    },
  },
  required: [
    "credibilityScore",
    "summary",
    "mainClaims",
    "flags",
    "sourceNotes",
    "contextNotes",
    "nextSteps",
  ],
};

const SYSTEM_INSTRUCTION = `
You are TruthLens, an explainable credibility analysis assistant.

Rules:
1) Use the LIVE_WEB_GROUNDING_PACK in the prompt as your primary evidence for time-sensitive or fast-moving claims.
2) Compare the submitted text against grounded evidence and separate supported, unsupported, mixed, and uncertain parts.
3) In sourceNotes/contextNotes, explicitly mention recency, source quality, official-source presence, and verification gaps.
4) If evidence is sparse, stale, conflicting, or grounding failed, lower confidence and state uncertainty clearly.
5) Do not mark claims false solely because details are still emerging.
6) Return only valid JSON matching the requested schema.
`.trim();

class FoundryPolicyBlockedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "FoundryPolicyBlockedError";
  }
}

function isFoundryPolicyBlockedMessage(message: string): boolean {
  const text = message.toLowerCase();
  return (
    text.includes("content management policy") ||
    (text.includes("filtered") && text.includes("policy")) ||
    text.includes("responsible ai policy")
  );
}

function getFoundryConfig() {
  const endpoint =
    process.env.AZURE_AI_FOUNDRY_ENDPOINT ??
    process.env.AZURE_FOUNDRY_ENDPOINT ??
    process.env.FOUNDRY_ENDPOINT;
  const apiKey =
    process.env.AZURE_AI_FOUNDRY_API_KEY ??
    process.env.AZURE_FOUNDRY_API_KEY ??
    process.env.FOUNDRY_API_KEY;

  return {
    endpoint,
    apiKey,
  };
}

function extractJsonCandidate(text: string): unknown {
  const trimmed = text.trim();

  try {
    return JSON.parse(trimmed);
  } catch {
    // Continue to fallback parsers.
  }

  const fencedJsonMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  if (fencedJsonMatch?.[1]) {
    try {
      return JSON.parse(fencedJsonMatch[1]);
    } catch {
      // Continue to fallback parsers.
    }
  }

  const firstBrace = trimmed.indexOf("{");
  if (firstBrace === -1) {
    throw new Error("No JSON object found in model response.");
  }

  let depth = 0;
  for (let index = firstBrace; index < trimmed.length; index += 1) {
    const char = trimmed[index];
    if (char === "{") {
      depth += 1;
    } else if (char === "}") {
      depth -= 1;
      if (depth === 0) {
        const candidate = trimmed.slice(firstBrace, index + 1);
        return JSON.parse(candidate);
      }
    }
  }

  throw new Error("Unable to parse a balanced JSON object from model response.");
}

function buildPolicyFallbackAnalysis(text: string, reason: string) {
  const sentences = text
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => sentence.trim())
    .filter((sentence) => sentence.length > 0);

  const mainClaims = sentences.slice(0, 4);
  const lower = text.toLowerCase();
  const flags: Array<{ type: string; quote: string; explanation: string }> = [];

  const urgencyTerms = [
    "breaking",
    "urgent",
    "immediately",
    "right now",
    "before",
    "move your money",
    "prepare now",
  ];
  if (urgencyTerms.some((term) => lower.includes(term))) {
    flags.push({
      type: "Emotional Language",
      quote: mainClaims[0] ?? "",
      explanation:
        "Urgency or fear framing can pressure readers into quick conclusions before verification.",
    });
  }

  const sourcingTerms = [
    "insiders",
    "sources say",
    "they say",
    "officials are hiding",
    "unnamed",
    "experts shocked",
  ];
  if (sourcingTerms.some((term) => lower.includes(term))) {
    flags.push({
      type: "Weak Sourcing",
      quote: mainClaims[0] ?? "",
      explanation:
        "The claim appears to rely on vague or unnamed sources, which lowers verifiability.",
    });
  }

  const certaintyTerms = [
    "proves",
    "guaranteed",
    "always",
    "never",
    "shocked",
    "admit",
    "refuse to cover",
  ];
  if (certaintyTerms.some((term) => lower.includes(term))) {
    flags.push({
      type: "Overconfident Framing",
      quote: mainClaims[0] ?? "",
      explanation:
        "Strong certainty language can overstate conclusions relative to available evidence.",
    });
  }

  flags.push({
    type: "Missing Context",
    quote: "",
    explanation:
      "Independent context, timeline detail, and primary-source support are required before trusting this claim.",
  });

  const credibilityScore =
    flags.length >= 3 ? "High-risk / likely misleading" : "Mixed / use caution";

  return normalizeAnalysisResult({
    credibilityScore,
    summary:
      "Automated provider analysis was safety-filtered, so this is a conservative heuristic assessment. Verify with primary sources.",
    mainClaims,
    flags,
    sourceNotes:
      "Primary AI provider output was blocked by content policy for this input. Source quality could not be fully model-evaluated.",
    contextNotes:
      "The claim should be checked against recent, independent reporting and official primary documents.",
    nextSteps: [
      "Look for at least two independent primary or high-credibility secondary sources.",
      "Verify names, dates, and quoted evidence directly from original publications.",
      "Treat urgency/fear language as a signal to slow down verification, not accelerate sharing.",
      `Provider note: ${reason}`,
    ],
  });
}

function mergeWarnings(baseWarnings: string[], extraWarnings: string[]): string[] {
  const merged = [...baseWarnings, ...extraWarnings]
    .map((warning) => warning.trim())
    .filter((warning) => warning.length > 0);

  return Array.from(new Set(merged));
}

function appendOnce(base: string, addition: string, marker: string): string {
  if (!addition.trim()) {
    return base;
  }

  if (base.includes(marker)) {
    return base;
  }

  return `${base}\n\n${addition}`.trim();
}

function mergeGroundingIntoResult(
  result: AnalysisResult,
  groundingResult: TavilyGroundingResult
): AnalysisResult {
  const normalized = normalizeAnalysisResult(result);

  const retrievalStamp = groundingResult.grounding.retrievedAt || "unknown";
  const sourceSummary = groundingResult.grounding.succeeded
    ? `Live Tavily grounding checked ${groundingResult.citations.length} source(s) at ${retrievalStamp}.`
    : `Live Tavily grounding failed before model analysis. ${groundingResult.grounding.warning ?? "Model-only analysis was used."}`;

  const timeSensitivityNote = groundingResult.grounding.isTimeSensitive
    ? "Claim classified as time-sensitive: recency weighting was applied during retrieval."
    : "Claim classified as less time-sensitive: broader corroboration was used.";

  const warnings = mergeWarnings(normalized.warnings, groundingResult.warnings);

  return normalizeAnalysisResult({
    ...normalized,
    citations: groundingResult.citations,
    grounding: groundingResult.grounding,
    warnings,
    sourceNotes: appendOnce(
      normalized.sourceNotes,
      sourceSummary,
      "Live Tavily grounding"
    ),
    contextNotes: appendOnce(
      normalized.contextNotes,
      timeSensitivityNote,
      "Claim classified as"
    ),
  });
}

function buildGroundedPrompt(
  text: string,
  today: string,
  groundingPromptContext: string
): string {
  return `Current date (UTC): ${today}.

Task:
Analyze the user-submitted content for credibility using the live evidence pack.
Return ONLY a valid JSON object matching this exact schema:
{
  credibilityScore: '...',
  summary: '...',
  mainClaims: ['...'],
  flags: [{ type: '...', quote: '...', explanation: '...' }],
  sourceNotes: '...',
  contextNotes: '...',
  nextSteps: ['...']
}

Calibration requirements:
- Prioritize LIVE_WEB_GROUNDING_PACK over model memory for time-sensitive claims.
- Distinguish unsupported rumor, mixed evidence, and confirmed reporting.
- Explicitly mention if evidence is recent, stale, sparse, conflicting, or official.
- If grounding failed or evidence is weak, reduce confidence and recommend verification actions.
- Avoid overclaiming certainty while details are still emerging.

${groundingPromptContext}

Text to analyze:
${text}`;
}

async function runGeminiAnalysis(prompt: string) {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not set.");
  }

  const client = new GoogleGenerativeAI(apiKey);
  let lastError: unknown = null;

  for (const model of MODEL_CANDIDATES) {
    try {
      const generativeModel = client.getGenerativeModel({
        model,
        systemInstruction: SYSTEM_INSTRUCTION,
        generationConfig: {
          responseMimeType: "application/json",
          responseSchema: RESPONSE_SCHEMA as unknown as ResponseSchema,
        },
      });

      const responseText = (await generativeModel.generateContent(prompt)).response.text();

      if (!responseText) {
        throw new Error("Gemini returned an empty response.");
      }

      const parsed = extractJsonCandidate(responseText);
      return normalizeAnalysisResult(parsed);
    } catch (error) {
      lastError = error;

      const message = error instanceof Error ? error.message : String(error);
      const is404 = message.includes("404");

      if (is404) {
        continue;
      }

      throw error;
    }
  }

  throw lastError ?? new Error("No Gemini model could be used.");
}

async function runFoundryAnalysis(prompt: string) {
  const { endpoint, apiKey } = getFoundryConfig();

  if (!endpoint || !apiKey) {
    throw new Error(
      "Microsoft Foundry fallback is not configured. Set AZURE_AI_FOUNDRY_ENDPOINT and AZURE_AI_FOUNDRY_API_KEY."
    );
  }

  const client = ModelClient(endpoint, new AzureKeyCredential(apiKey));
  const response = await client.path("/chat/completions").post({
    body: {
      model: FOUNDRY_MODEL,
      temperature: 0.2,
      max_tokens: 1300,
      response_format: {
        type: "json_object",
      },
      messages: [
        { role: "system", content: SYSTEM_INSTRUCTION },
        { role: "user", content: prompt },
      ],
    },
  });

  if (isUnexpected(response)) {
    const reason =
      typeof response.body?.error?.message === "string"
        ? response.body.error.message
        : "Foundry returned an unexpected response.";

    if (isFoundryPolicyBlockedMessage(reason)) {
      throw new FoundryPolicyBlockedError(reason);
    }

    throw new Error(reason);
  }

  const messageContent = response.body.choices?.[0]?.message?.content;
  if (typeof messageContent !== "string" || messageContent.trim().length === 0) {
    throw new Error("Foundry returned an empty completion.");
  }

  const parsed = extractJsonCandidate(messageContent);
  return normalizeAnalysisResult(parsed);
}

export async function POST(request: Request) {
  let groundingResult: TavilyGroundingResult | null = null;

  try {
    const payload = await request.json();
    const text = payload?.text;

    if (typeof text !== "string" || text.trim().length === 0) {
      return NextResponse.json(
        { error: "Request body must include a non-empty text string." },
        { status: 400 }
      );
    }

    const now = new Date();
    const today = now.toISOString().slice(0, 10);

    groundingResult = await buildTavilyGrounding(text, now);
    const prompt = buildGroundedPrompt(text, today, groundingResult.promptContext);

    try {
      const geminiResult = await runGeminiAnalysis(prompt);
      console.info("[Analysis] Completed with Gemini primary path");
      return NextResponse.json(
        mergeGroundingIntoResult(geminiResult, groundingResult),
        { status: 200 }
      );
    } catch (geminiError) {
      console.error("Gemini analysis failed, attempting Foundry fallback:", geminiError);
    }

    try {
      const foundryResult = await runFoundryAnalysis(prompt);
      console.info("[Analysis] Completed with Foundry fallback path");
      return NextResponse.json(
        mergeGroundingIntoResult(foundryResult, groundingResult),
        { status: 200 }
      );
    } catch (foundryError) {
      if (foundryError instanceof FoundryPolicyBlockedError) {
        console.warn("[Analysis] Foundry policy blocked, using heuristic fallback");
        const heuristicResult = buildPolicyFallbackAnalysis(text, foundryError.message);
        return NextResponse.json(
          mergeGroundingIntoResult(heuristicResult, groundingResult),
          { status: 200 }
        );
      }
      throw foundryError;
    }
  } catch (error) {
    console.error("All analysis providers failed:", error);

    const fallbackResult = groundingResult
      ? mergeGroundingIntoResult(DEFAULT_ANALYSIS_RESULT, groundingResult)
      : DEFAULT_ANALYSIS_RESULT;

    return NextResponse.json(fallbackResult, { status: 500 });
  }
}
