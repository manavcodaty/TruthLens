# TruthLens

TruthLens is an explainable credibility analysis platform for headlines, articles, and social posts.

Instead of acting like a simple “true / false” checker, TruthLens helps users understand **why** a piece of content should be trusted, questioned, or verified further. It analyzes submitted text for weak sourcing, emotional manipulation, missing context, and other credibility signals, then returns a structured explanation.

## Why TruthLens?

Online misinformation is often not completely fabricated. More often, it is:

- weakly sourced
- emotionally manipulative
- missing key context
- framed in a misleading way
- exaggerated beyond what the evidence supports

TruthLens is built to help users slow down and think critically before they believe or share what they see.

---

## Features

- **Explainable credibility analysis**
  - Returns a credibility score, summary, claims, flags, source notes, context notes, and next steps
- **Live web grounding**
  - Uses Tavily-grounded evidence for time-sensitive claims
- **Multi-model architecture**
  - Runs Gemini first, then falls back to Llama 3.1 8B through Azure AI Foundry
- **Structured output normalization**
  - Ensures consistent response shape across model paths and fallbacks
- **Citations and grounding metadata**
  - Surfaces checked sources and grounding status in the final result
- **Simple analysis workspace**
  - Supports headline, article, and post-style inputs

---

## Tech Stack

### Frontend
- Next.js
- React
- TypeScript
- Tailwind CSS
- Lucide React
- shadcn-style UI utilities

### Backend / AI
- Next.js Route Handlers
- Google Gemini (`@google/generative-ai`)
- Azure AI Foundry / Llama fallback (`@azure-rest/ai-inference`)
- Tavily grounding support (`@tavily/core`)

### Other
- Convex
- ESLint
- PostCSS

---

## How it Works

1. A user pastes a headline, article excerpt, or post into the workspace.
2. The frontend sends the content to `POST /api/analyze`.
3. The analysis route:
   - prepares the input
   - builds a live web grounding pack
   - runs Gemini first
   - falls back to Azure AI Foundry if needed
   - normalizes the result into a consistent shape
4. The UI renders:
   - credibility summary
   - main claims
   - warning flags
   - source notes
   - context notes
   - next steps
   - citations / grounding status

---

## Repository Structure

```txt
TruthLens/
├── public/
├── convex/
│   └── _generated/
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   └── analyze/
│   │   │       └── route.ts
│   │   └── ...
│   ├── components/
│   │   └── analysis/
│   │       └── analyze-workspace.tsx
│   ├── lib/
│   │   ├── analysis.ts
│   │   └── ...
│   └── ...
├── package.json
├── next.config.ts
├── components.json
├── TAVILY_SETUP.md
└── README.md
```

### Key Files

- `src/app/api/analyze/route.ts`  
  Main backend orchestrator for prompt construction, Tavily grounding, model execution, fallback logic, and response shaping.

- `src/lib/analysis.ts`  
  Shared result types, default result, credibility configs, citation parsing, grounding parsing, and normalization logic.

- `src/components/analysis/analyze-workspace.tsx`  
  Main client-side analysis workspace that submits text to `/api/analyze`.

---

## Getting Started

### 1. Clone the repository

```bash
git clone https://github.com/manavcodaty/TruthLens.git
cd TruthLens
```

### 2. Install dependencies

```bash
npm install
```

### 3. Configure environment variables

Create a `.env.local` file and add the required API keys.

At minimum, you will likely need values for:

```bash
# Gemini
GEMINI_API_KEY=your_key_here
GEMINI_MODEL=your_model_here

# Tavily
TAVILY_API_KEY=your_key_here

# Azure AI Foundry / fallback model
AZURE_AI_FOUNDRY_ENDPOINT=your_endpoint_here
AZURE_AI_FOUNDRY_API_KEY=your_key_here
```

> Note: `route.ts` supports multiple Azure Foundry environment variable aliases. Check the current implementation if you want to use alternative names.

### 4. Start the development server

```bash
npm run dev
```

Then open:

```txt
http://localhost:3000
```

---

## Available Scripts

```bash
npm run dev
npm run build
npm run start
npm run lint
```

---

## API

### `POST /api/analyze`

Analyzes submitted text and returns a structured credibility result.

### Example request

```json
{
  "text": "BREAKING: Dubai will go into a full citywide curfew tonight after secret emergency meetings..."
}
```

### Example response shape

```json
{
  "credibilityScore": "Mixed / use caution",
  "summary": "A concise overall explanation of the credibility assessment.",
  "mainClaims": ["Claim 1", "Claim 2"],
  "flags": [
    {
      "type": "Emotional Language",
      "quote": "BREAKING",
      "explanation": "Uses urgency to provoke rapid sharing."
    }
  ],
  "sourceNotes": "Summary of source quality and source reliability.",
  "contextNotes": "Notes on missing context, uncertainty, or evolving details.",
  "nextSteps": ["Check official statements", "Look for corroboration from major outlets"],
  "citations": [],
  "grounding": {
    "attempted": true,
    "succeeded": true,
    "searchQueries": [],
    "usedExtract": false,
    "warning": null,
    "retrievedAt": "",
    "isTimeSensitive": true
  },
  "warnings": []
}
```

---

## Current Analysis Design

TruthLens is built around an **explanation-first** approach.

The system does not just classify content. It tries to answer:

- What claims are being made?
- Which parts are supported, unsupported, or overstated?
- Is the language emotionally manipulative?
- Are sources strong, weak, missing, or unclear?
- Is important context missing?
- What should the user verify next?

This makes the product more useful than a simple binary label.

---

## Current Fallback Flow

The backend is designed with layered fallback behavior:

1. Build the grounded analysis input
2. Try **Gemini**
3. If Gemini fails, try **Azure AI Foundry / Llama**
4. If Foundry is policy-blocked, use heuristic fallback
5. Normalize into the standard TruthLens result shape

This keeps the product more resilient during live use.

---

## Roadmap

Planned improvements include:

- richer source transparency in the UI
- stronger current-events grounding
- improved landing page and onboarding
- side-by-side comparison of two articles or claims
- sample analyses for first-time users
- better handling of fast-moving geopolitical and breaking-news claims

---

## License

This repository currently includes the **Unlicense**.

---

## Acknowledgments

TruthLens was created as a hackathon project focused on helping users navigate misinformation with more clarity, context, and critical thinking.

