import {
  GoogleGenerativeAI,
  SchemaType,
} from "@google/generative-ai";
import type { ResponseSchema } from "@google/generative-ai";
import { NextResponse } from "next/server";

import { DEFAULT_ANALYSIS_RESULT } from "@/lib/analysis";

const MODEL_CANDIDATES = [
  process.env.GEMINI_MODEL,
  "gemini-2.5-flash",
  "gemini-2.0-flash",
  "gemini-2.5-flash-lite",
].filter((model): model is string => Boolean(model));

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

export async function POST(request: Request) {
  try {
    const payload = await request.json();
    const text = payload?.text;

    if (typeof text !== "string" || text.trim().length === 0) {
      return NextResponse.json(
        { error: "Request body must include a non-empty text string." },
        { status: 400 }
      );
    }

    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      throw new Error("GEMINI_API_KEY is not set.");
    }

    const prompt = `Analyze the following text. You MUST return ONLY a valid JSON object matching this exact schema: { credibilityScore: '...', summary: '...', mainClaims: ['...'], flags: [{ type: '...', quote: '...', explanation: '...' }], sourceNotes: '...', contextNotes: '...', nextSteps: ['...'] }. Text to analyze: ${text}`;

    const client = new GoogleGenerativeAI(apiKey);
    let lastError: unknown = null;

    for (const model of MODEL_CANDIDATES) {
      try {
        const generativeModel = client.getGenerativeModel({
          model,
          generationConfig: {
            responseMimeType: "application/json",
            responseSchema: RESPONSE_SCHEMA as unknown as ResponseSchema,
          },
        });

        const responseText = (await generativeModel.generateContent(prompt)).response.text();

        if (!responseText) {
          throw new Error("Gemini returned an empty response.");
        }

        return NextResponse.json(JSON.parse(responseText), { status: 200 });
      } catch (error) {
        lastError = error;

        const message = error instanceof Error ? error.message : String(error);

        if (!message.includes("404")) {
          throw error;
        }
      }
    }

    throw lastError ?? new Error("No Gemini model could be used.");
  } catch (error) {
    console.error("Gemini analysis failed:", error);
    return NextResponse.json(DEFAULT_ANALYSIS_RESULT, { status: 500 });
  }
}
