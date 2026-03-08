import "server-only";

import {
  tavily,
  type TavilyClient,
  type TavilyExtractOptions,
  type TavilyExtractResponse,
  type TavilySearchOptions,
  type TavilySearchResponse,
} from "@tavily/core";

import type { AnalysisCitation, AnalysisGrounding } from "@/lib/analysis";

type SearchResult = TavilySearchResponse["results"][number];
type ExtractResult = TavilyExtractResponse["results"][number];
type EvidenceConsistency = "consistent" | "mixed" | "sparse";
type RecencyMarker = "fresh" | "recent" | "aging" | "stale" | "unknown";
type SourceType = "official" | "major-news" | "institutional" | "reference" | "other";

interface ClaimClassification {
  isTimeSensitive: boolean;
  isBreaking: boolean;
  isHighStake: boolean;
  prioritizeOfficialSources: boolean;
}

interface SearchOutcome {
  query: string;
  response?: TavilySearchResponse;
  error?: string;
}

interface RankedSource {
  title: string;
  url: string;
  domain: string;
  snippet: string;
  publishedAt: string | null;
  score: number;
  sourceType: SourceType;
  recency: RecencyMarker;
  rankingScore: number;
  excerpt?: string;
}

export interface TavilyGroundingResult {
  promptContext: string;
  citations: AnalysisCitation[];
  grounding: AnalysisGrounding;
  warnings: string[];
}

const TIME_SENSITIVE_TERMS = [
  "today",
  "tonight",
  "right now",
  "breaking",
  "just announced",
  "live",
  "latest",
  "currently",
  "this morning",
  "this evening",
  "urgent",
  "now",
  "within hours",
  "immediately",
];

const BREAKING_TERMS = [
  "breaking",
  "developing",
  "just in",
  "emergency",
  "confirmed now",
  "alert",
  "evacuation",
  "shutdown",
  "lockdown",
  "curfew",
];

const HIGH_STAKE_TERMS = [
  "war",
  "missile",
  "strike",
  "attack",
  "election",
  "resigned",
  "resignation",
  "appointed",
  "killed",
  "died",
  "earthquake",
  "flood",
  "wildfire",
  "outbreak",
  "health advisory",
  "sanction",
  "ruling",
  "supreme court",
  "market crash",
  "bank run",
  "flight cancelled",
  "airline disruption",
  "product recall",
  "service outage",
];

const OFFICIAL_PRIORITY_TERMS = [
  "government",
  "ministry",
  "white house",
  "president",
  "prime minister",
  "police",
  "military",
  "department",
  "agency",
  "health authority",
  "court",
  "regulator",
  "ministry",
  "central bank",
  "official statement",
];

const SENSATIONAL_TERMS = [
  "breaking",
  "shocking",
  "secret",
  "they don't want you to know",
  "must watch",
  "urgent",
  "panic",
  "exposed",
  "100%",
  "guaranteed",
  "everyone must",
  "share now",
  "immediately",
  "before it's deleted",
];

const OFFICIAL_DOMAIN_PATTERNS = [
  /\.gov$/i,
  /\.gov\./i,
  /\.mil$/i,
  /\.mil\./i,
  /\.int$/i,
  /who\.int$/i,
  /un\.org$/i,
  /europa\.eu$/i,
  /ec\.europa\.eu$/i,
];

const MAJOR_NEWS_DOMAINS = new Set([
  "reuters.com",
  "apnews.com",
  "bbc.com",
  "nytimes.com",
  "washingtonpost.com",
  "wsj.com",
  "bloomberg.com",
  "ft.com",
  "theguardian.com",
  "npr.org",
  "aljazeera.com",
  "cnn.com",
  "abcnews.go.com",
  "cbsnews.com",
  "nbcnews.com",
]);

const REF_DOMAIN_PATTERNS = [
  /wikipedia\.org$/i,
  /britannica\.com$/i,
  /ourworldindata\.org$/i,
];

const STOP_ENTITY_TOKENS = new Set([
  "source",
  "url",
  "headline",
  "article",
  "post",
  "breaking",
  "urgent",
  "today",
  "tonight",
  "this",
  "that",
  "they",
  "these",
  "those",
]);

let tavilyClientSingleton: TavilyClient | null = null;

function getTavilyClient(): TavilyClient | null {
  const apiKey = process.env.TAVILY_API_KEY?.trim();
  if (!apiKey) {
    return null;
  }

  if (!tavilyClientSingleton) {
    tavilyClientSingleton = tavily({ apiKey });
  }

  return tavilyClientSingleton;
}

function normalizeWhitespace(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

function stripSourceUrlPrefix(text: string): string {
  return text.replace(/^\s*source\s+url\s*:\s*\S+\s*/i, "").trim();
}

function splitIntoSentences(text: string): string[] {
  return text
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => normalizeWhitespace(sentence))
    .filter((sentence) => sentence.length > 0);
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function truncate(value: string, maxLength: number): string {
  if (value.length <= maxLength) {
    return value;
  }

  return `${value.slice(0, Math.max(0, maxLength - 1)).trimEnd()}…`;
}

function extractNamedEntities(text: string): string[] {
  const matches = text.match(/\b(?:[A-Z][a-z]+|[A-Z]{2,})(?:\s+(?:[A-Z][a-z]+|[A-Z]{2,})){0,4}\b/g) ?? [];

  const entities = matches
    .map((entity) => normalizeWhitespace(entity))
    .filter((entity) => entity.length >= 3)
    .filter((entity) => {
      const token = entity.toLowerCase();
      return !STOP_ENTITY_TOKENS.has(token);
    });

  return Array.from(new Set(entities)).slice(0, 6);
}

function sanitizeClaimForQuery(text: string): string {
  let sanitized = stripSourceUrlPrefix(text)
    .replace(/https?:\/\/\S+/gi, " ")
    .replace(/[#*_`~|<>]/g, " ")
    .replace(/[“”"'()[\]{}]/g, " ");

  for (const term of SENSATIONAL_TERMS) {
    const pattern = new RegExp(`\\b${escapeRegExp(term)}\\b`, "gi");
    sanitized = sanitized.replace(pattern, " ");
  }

  sanitized = sanitized.replace(/\s+/g, " ").trim();
  return sanitized;
}

function classifyClaim(text: string): ClaimClassification {
  const lower = text.toLowerCase();
  const hasTimeTerm = TIME_SENSITIVE_TERMS.some((term) => lower.includes(term));
  const isBreaking = BREAKING_TERMS.some((term) => lower.includes(term));
  const isHighStake = HIGH_STAKE_TERMS.some((term) => lower.includes(term));
  const prioritizeOfficialSources = OFFICIAL_PRIORITY_TERMS.some((term) =>
    lower.includes(term)
  );
  const hasIsoDate = /\b20\d{2}-\d{2}-\d{2}\b/.test(text);
  const hasShortDate =
    /\b\d{1,2}[/-]\d{1,2}(?:[/-]\d{2,4})?\b/.test(text) ||
    /\b(?:jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*\s+\d{1,2}\b/i.test(
      text
    );

  const isTimeSensitive =
    hasTimeTerm || isBreaking || isHighStake || hasIsoDate || hasShortDate;

  return {
    isTimeSensitive,
    isBreaking,
    isHighStake,
    prioritizeOfficialSources,
  };
}

function buildSearchQueries(
  text: string,
  classification: ClaimClassification,
  now: Date
): string[] {
  const cleanedInput = sanitizeClaimForQuery(text);
  const claimSentences = splitIntoSentences(cleanedInput);
  const baseClaim = normalizeWhitespace(claimSentences.slice(0, 2).join(" "));
  const condensedBase = truncate(baseClaim || cleanedInput, 180);
  const entities = extractNamedEntities(cleanedInput);

  const formattedDate = now.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  const queryCandidates: string[] = [];

  if (condensedBase) {
    queryCandidates.push(condensedBase);
  }

  if (entities.length > 0) {
    const entityString = entities.slice(0, 4).join(" ");
    const officialSuffix = classification.prioritizeOfficialSources
      ? "official statement"
      : "verified report";

    queryCandidates.push(
      normalizeWhitespace(
        `${entityString} ${officialSuffix} ${classification.isTimeSensitive ? "today" : ""}`
      )
    );
  }

  if (classification.isTimeSensitive) {
    queryCandidates.push(
      normalizeWhitespace(`${condensedBase} latest updates ${formattedDate}`)
    );
  }

  if (classification.isBreaking || classification.isHighStake) {
    const anchor = entities.slice(0, 3).join(" ") || condensedBase;
    queryCandidates.push(
      normalizeWhitespace(
        `${anchor} rumor verification official sources ${formattedDate}`
      )
    );
  }

  const deduped = Array.from(
    new Set(
      queryCandidates
        .map((query) => truncate(query.trim(), 180))
        .filter((query) => query.length >= 16)
    )
  );

  return deduped.slice(0, 3);
}

function buildSearchOptions(
  classification: ClaimClassification
): TavilySearchOptions {
  const options: TavilySearchOptions = {
    searchDepth: classification.isTimeSensitive ? "advanced" : "basic",
    topic: classification.isTimeSensitive ? "news" : "general",
    maxResults: classification.isTimeSensitive ? 8 : 6,
    includeAnswer: "basic",
    includeRawContent: false,
    includeFavicon: true,
    chunksPerSource: classification.isTimeSensitive ? 3 : 2,
    autoParameters: false,
    exactMatch: false,
  };

  if (classification.isTimeSensitive) {
    options.timeRange = classification.isBreaking ? "day" : "week";
    options.days = classification.isBreaking ? 2 : 14;
  }

  return options;
}

function parseDate(value: string | null | undefined): Date | null {
  if (!value) {
    return null;
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.valueOf())) {
    return null;
  }

  return parsed;
}

function getRecencyMarker(
  publishedAt: string | null,
  retrievedAt: Date,
  isTimeSensitive: boolean
): RecencyMarker {
  const publishedDate = parseDate(publishedAt);
  if (!publishedDate) {
    return "unknown";
  }

  const ageInMs = Math.max(0, retrievedAt.valueOf() - publishedDate.valueOf());
  const ageInDays = ageInMs / (1000 * 60 * 60 * 24);

  if (isTimeSensitive) {
    if (ageInDays <= 1.25) {
      return "fresh";
    }
    if (ageInDays <= 7) {
      return "recent";
    }
    if (ageInDays <= 30) {
      return "aging";
    }
    return "stale";
  }

  if (ageInDays <= 30) {
    return "recent";
  }
  if (ageInDays <= 180) {
    return "aging";
  }
  return "stale";
}

function parseDomain(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./i, "").toLowerCase();
  } catch {
    return "unknown";
  }
}

function isAnyPatternMatch(domain: string, patterns: RegExp[]): boolean {
  return patterns.some((pattern) => pattern.test(domain));
}

function inferSourceType(domain: string): SourceType {
  if (isAnyPatternMatch(domain, OFFICIAL_DOMAIN_PATTERNS)) {
    return "official";
  }

  if (
    MAJOR_NEWS_DOMAINS.has(domain) ||
    Array.from(MAJOR_NEWS_DOMAINS).some((candidate) =>
      domain.endsWith(`.${candidate}`)
    )
  ) {
    return "major-news";
  }

  if (isAnyPatternMatch(domain, REF_DOMAIN_PATTERNS)) {
    return "reference";
  }

  if (domain.endsWith(".edu") || domain.endsWith(".ac.uk") || domain.endsWith(".org")) {
    return "institutional";
  }

  return "other";
}

function getSourceTypeScore(sourceType: SourceType): number {
  switch (sourceType) {
    case "official":
      return 24;
    case "major-news":
      return 18;
    case "institutional":
      return 12;
    case "reference":
      return 8;
    default:
      return 0;
  }
}

function getRecencyScore(recency: RecencyMarker, isTimeSensitive: boolean): number {
  if (!isTimeSensitive) {
    switch (recency) {
      case "fresh":
      case "recent":
        return 8;
      case "aging":
        return 2;
      case "stale":
        return -5;
      default:
        return 0;
    }
  }

  switch (recency) {
    case "fresh":
      return 20;
    case "recent":
      return 12;
    case "aging":
      return -3;
    case "stale":
      return -16;
    default:
      return -6;
  }
}

function rankSearchResult(
  result: SearchResult,
  retrievedAt: Date,
  classification: ClaimClassification
): RankedSource {
  const domain = parseDomain(result.url);
  const sourceType = inferSourceType(domain);
  const publishedAt = typeof result.publishedDate === "string" ? result.publishedDate : null;
  const recency = getRecencyMarker(
    publishedAt,
    retrievedAt,
    classification.isTimeSensitive
  );

  const rankingScore =
    (typeof result.score === "number" ? result.score : 0) * 100 +
    getSourceTypeScore(sourceType) +
    getRecencyScore(recency, classification.isTimeSensitive);

  return {
    title: normalizeWhitespace(result.title || "Untitled source"),
    url: result.url,
    domain,
    snippet: truncate(normalizeWhitespace(result.content || ""), 340),
    publishedAt,
    score: typeof result.score === "number" ? result.score : 0,
    sourceType,
    recency,
    rankingScore,
  };
}

function dedupeAndSelectSources(
  rankedSources: RankedSource[],
  maxSources = 5
): RankedSource[] {
  const bestByUrl = new Map<string, RankedSource>();

  for (const source of rankedSources) {
    const canonicalUrl = source.url.replace(/#.*$/, "").replace(/\/$/, "");
    const existing = bestByUrl.get(canonicalUrl);

    if (!existing || source.rankingScore > existing.rankingScore) {
      bestByUrl.set(canonicalUrl, source);
    }
  }

  const selected: RankedSource[] = [];
  const perDomainCount = new Map<string, number>();

  const sorted = Array.from(bestByUrl.values()).sort(
    (left, right) => right.rankingScore - left.rankingScore
  );

  for (const candidate of sorted) {
    const count = perDomainCount.get(candidate.domain) ?? 0;
    if (count >= 2) {
      continue;
    }

    selected.push(candidate);
    perDomainCount.set(candidate.domain, count + 1);

    if (selected.length >= maxSources) {
      break;
    }
  }

  return selected;
}

function inferEvidenceConsistency(
  selectedSources: RankedSource[],
  isTimeSensitive: boolean
): EvidenceConsistency {
  if (selectedSources.length < 2) {
    return "sparse";
  }

  const uniqueDomains = new Set(selectedSources.map((source) => source.domain)).size;
  const freshOrRecent = selectedSources.filter(
    (source) => source.recency === "fresh" || source.recency === "recent"
  ).length;

  if (isTimeSensitive && freshOrRecent < 2) {
    return "sparse";
  }

  if (uniqueDomains < 2) {
    return "mixed";
  }

  const staleCount = selectedSources.filter((source) => source.recency === "stale").length;
  if (staleCount > 0 && freshOrRecent > 0) {
    return "mixed";
  }

  return "consistent";
}

function shouldUseExtract(
  selectedSources: RankedSource[],
  classification: ClaimClassification,
  evidenceConsistency: EvidenceConsistency
): boolean {
  if (selectedSources.length === 0) {
    return false;
  }

  const hasShortSnippets = selectedSources.some((source) => source.snippet.length < 140);
  const hasOfficialSources = selectedSources.some(
    (source) => source.sourceType === "official"
  );

  return (
    evidenceConsistency !== "consistent" ||
    hasShortSnippets ||
    (classification.isTimeSensitive && classification.isHighStake) ||
    hasOfficialSources
  );
}

function selectExtractUrls(selectedSources: RankedSource[]): string[] {
  const priority: Record<SourceType, number> = {
    official: 5,
    "major-news": 4,
    institutional: 3,
    reference: 2,
    other: 1,
  };

  const ordered = [...selectedSources].sort((left, right) => {
    const priorityDelta = priority[right.sourceType] - priority[left.sourceType];
    if (priorityDelta !== 0) {
      return priorityDelta;
    }

    return right.rankingScore - left.rankingScore;
  });

  return ordered.slice(0, 3).map((source) => source.url);
}

function mergeExtractedContent(
  selectedSources: RankedSource[],
  extracted: ExtractResult[]
): RankedSource[] {
  const extractByUrl = new Map(
    extracted.map((item) => [item.url.replace(/\/$/, ""), item])
  );

  return selectedSources.map((source) => {
    const candidate = extractByUrl.get(source.url.replace(/\/$/, ""));
    if (!candidate || !candidate.rawContent) {
      return source;
    }

    return {
      ...source,
      excerpt: truncate(normalizeWhitespace(candidate.rawContent), 700),
    };
  });
}

function toCitation(source: RankedSource): AnalysisCitation {
  return {
    title: source.title,
    url: source.url,
    domain: source.domain,
    publishedAt: source.publishedAt,
    snippet: source.excerpt ? truncate(source.excerpt, 320) : source.snippet,
    sourceType: source.sourceType,
    recency: source.recency,
  };
}

function formatPromptContext(input: {
  retrievedAt: string;
  queries: string[];
  isTimeSensitive: boolean;
  evidenceConsistency: EvidenceConsistency;
  officialSourcesFound: boolean;
  staleEvidence: boolean;
  citations: AnalysisCitation[];
  warnings: string[];
}): string {
  const lines: string[] = [];

  lines.push("LIVE_WEB_GROUNDING_PACK");
  lines.push(`retrieved_at: ${input.retrievedAt}`);
  lines.push(`time_sensitive_claim: ${input.isTimeSensitive ? "yes" : "no"}`);
  lines.push(`evidence_consistency: ${input.evidenceConsistency}`);
  lines.push(`official_sources_found: ${input.officialSourcesFound ? "yes" : "no"}`);
  lines.push(`stale_evidence_detected: ${input.staleEvidence ? "yes" : "no"}`);
  lines.push("search_queries:");

  for (const query of input.queries) {
    lines.push(`- ${query}`);
  }

  if (input.warnings.length > 0) {
    lines.push("grounding_warnings:");
    for (const warning of input.warnings) {
      lines.push(`- ${warning}`);
    }
  }

  if (input.citations.length === 0) {
    lines.push("sources: none");
    return lines.join("\n");
  }

  lines.push("sources:");
  input.citations.forEach((citation, index) => {
    lines.push(`[${index + 1}] title: ${citation.title}`);
    lines.push(`url: ${citation.url}`);
    lines.push(`domain: ${citation.domain}`);
    lines.push(`published_at: ${citation.publishedAt ?? "unknown"}`);
    lines.push(`source_type: ${citation.sourceType ?? "other"}`);
    lines.push(`recency: ${citation.recency ?? "unknown"}`);
    lines.push(`snippet: ${citation.snippet}`);
  });

  return lines.join("\n");
}

function buildWarningMessage(message: string): string {
  return normalizeWhitespace(message).slice(0, 240);
}

async function runSearches(
  client: TavilyClient,
  queries: string[],
  options: TavilySearchOptions
): Promise<SearchOutcome[]> {
  const outcomes = await Promise.all(
    queries.map(async (query) => {
      try {
        const response = await client.search(query, options);
        return {
          query,
          response,
        } satisfies SearchOutcome;
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return {
          query,
          error: buildWarningMessage(message),
        } satisfies SearchOutcome;
      }
    })
  );

  return outcomes;
}

export async function buildTavilyGrounding(
  text: string,
  now = new Date()
): Promise<TavilyGroundingResult> {
  const retrievedAt = now.toISOString();
  try {
    const classification = classifyClaim(text);
    const queries = buildSearchQueries(text, classification, now);

    const grounding: AnalysisGrounding = {
      attempted: true,
      succeeded: false,
      searchQueries: queries,
      usedExtract: false,
      warning: null,
      retrievedAt,
      isTimeSensitive: classification.isTimeSensitive,
    };

    const warnings: string[] = [];

    console.info("[Tavily] Grounding started", {
      isTimeSensitive: classification.isTimeSensitive,
      isBreaking: classification.isBreaking,
      isHighStake: classification.isHighStake,
      queryCount: queries.length,
    });

    if (queries.length === 0) {
      warnings.push(
        "Could not derive strong search queries from input. Continuing with model analysis only."
      );

      grounding.warning = warnings[0];

      return {
        promptContext: formatPromptContext({
          retrievedAt,
          queries,
          isTimeSensitive: classification.isTimeSensitive,
          evidenceConsistency: "sparse",
          officialSourcesFound: false,
          staleEvidence: false,
          citations: [],
          warnings,
        }),
        citations: [],
        grounding,
        warnings,
      };
    }

    const client = getTavilyClient();
    if (!client) {
      warnings.push(
        "Live web grounding failed: TAVILY_API_KEY is not configured. Analysis may be less reliable for time-sensitive claims."
      );

      grounding.warning = warnings[0];

      return {
        promptContext: formatPromptContext({
          retrievedAt,
          queries,
          isTimeSensitive: classification.isTimeSensitive,
          evidenceConsistency: "sparse",
          officialSourcesFound: false,
          staleEvidence: false,
          citations: [],
          warnings,
        }),
        citations: [],
        grounding,
        warnings,
      };
    }

    const searchOptions = buildSearchOptions(classification);
    const outcomes = await runSearches(client, queries, searchOptions);

    const successfulSearches = outcomes.filter(
      (outcome): outcome is SearchOutcome & { response: TavilySearchResponse } =>
        Boolean(outcome.response)
    );

    const failedSearches = outcomes.filter(
      (outcome): outcome is SearchOutcome & { error: string } =>
        Boolean(outcome.error)
    );

    if (failedSearches.length > 0) {
      warnings.push(
        `One or more Tavily searches failed (${failedSearches.length}/${queries.length}).`
      );

      console.warn("[Tavily] Search failures", {
        failedSearches: failedSearches.map((item) => ({
          query: item.query,
          error: item.error,
        })),
      });
    }

    if (successfulSearches.length === 0) {
      warnings.push(
        "Live web grounding could not retrieve sources. Analysis continued with model-only evidence."
      );

      grounding.warning = warnings[0];

      return {
        promptContext: formatPromptContext({
          retrievedAt,
          queries,
          isTimeSensitive: classification.isTimeSensitive,
          evidenceConsistency: "sparse",
          officialSourcesFound: false,
          staleEvidence: false,
          citations: [],
          warnings,
        }),
        citations: [],
        grounding,
        warnings,
      };
    }

    const allRankedSources = successfulSearches.flatMap((outcome) =>
      outcome.response.results
        .filter((result) => result.url && result.content)
        .map((result) => rankSearchResult(result, now, classification))
    );

    let selectedSources = dedupeAndSelectSources(allRankedSources, 5);

    const initialConsistency = inferEvidenceConsistency(
      selectedSources,
      classification.isTimeSensitive
    );

    if (shouldUseExtract(selectedSources, classification, initialConsistency)) {
      const extractUrls = selectExtractUrls(selectedSources);
      const extractOptions: TavilyExtractOptions = {
        extractDepth: classification.isTimeSensitive ? "advanced" : "basic",
        format: "markdown",
        chunksPerSource: 2,
        includeFavicon: true,
        query: queries[0],
        timeout: 20,
      };

      try {
        const extractResponse = await client.extract(extractUrls, extractOptions);
        selectedSources = mergeExtractedContent(selectedSources, extractResponse.results);
        grounding.usedExtract = extractResponse.results.length > 0;

        console.info("[Tavily] Extract completed", {
          requestedUrls: extractUrls.length,
          extractedUrls: extractResponse.results.length,
          failedUrls: extractResponse.failedResults.length,
        });

        if (extractResponse.failedResults.length > 0) {
          warnings.push(
            `Some Tavily extract calls failed (${extractResponse.failedResults.length}/${extractUrls.length}).`
          );
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        warnings.push("Tavily extract failed for selected sources.");

        console.warn("[Tavily] Extract failed", {
          error: buildWarningMessage(message),
        });
      }
    }

    const evidenceConsistency = inferEvidenceConsistency(
      selectedSources,
      classification.isTimeSensitive
    );
    const officialSourcesFound = selectedSources.some(
      (source) => source.sourceType === "official"
    );
    const staleEvidence =
      selectedSources.length > 0 &&
      selectedSources.every(
        (source) => source.recency === "aging" || source.recency === "stale"
      );

    if (classification.isTimeSensitive && staleEvidence) {
      warnings.push(
        "Most retrieved sources are not recent for this time-sensitive claim. Confidence should be reduced."
      );
    }

    const citations = selectedSources.map(toCitation);
    grounding.succeeded = citations.length > 0;

    if (!grounding.succeeded) {
      warnings.push(
        "Live web grounding returned no usable citations. Analysis continued with model-only evidence."
      );
    }

    grounding.warning = warnings[0] ?? null;

    console.info("[Tavily] Grounding completed", {
      queryCount: queries.length,
      successfulSearches: successfulSearches.length,
      selectedSources: citations.length,
      usedExtract: grounding.usedExtract,
      isTimeSensitive: grounding.isTimeSensitive,
      evidenceConsistency,
      officialSourcesFound,
    });

    return {
      promptContext: formatPromptContext({
        retrievedAt,
        queries,
        isTimeSensitive: classification.isTimeSensitive,
        evidenceConsistency,
        officialSourcesFound,
        staleEvidence,
        citations,
        warnings,
      }),
      citations,
      grounding,
      warnings,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const warning =
      "Live web grounding encountered an internal error. Analysis continued with model-only evidence.";

    console.error("[Tavily] Grounding crashed unexpectedly", {
      error: buildWarningMessage(message),
    });

    const grounding: AnalysisGrounding = {
      attempted: true,
      succeeded: false,
      searchQueries: [],
      usedExtract: false,
      warning,
      retrievedAt,
      isTimeSensitive: false,
    };

    const warnings = [warning];

    return {
      promptContext: formatPromptContext({
        retrievedAt,
        queries: [],
        isTimeSensitive: false,
        evidenceConsistency: "sparse",
        officialSourcesFound: false,
        staleEvidence: false,
        citations: [],
        warnings,
      }),
      citations: [],
      grounding,
      warnings,
    };
  }
}
