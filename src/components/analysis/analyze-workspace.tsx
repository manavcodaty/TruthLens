"use client";

import { useMemo, useState } from "react";
import {
  AlertTriangle,
  Loader2,
  Sparkles,
  TextCursorInput,
  WandSparkles,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  AnalysisResult,
  DEFAULT_ANALYSIS_RESULT,
  ResultStatus,
  normalizeAnalysisResult,
} from "@/lib/analysis";
import { ANALYSIS_EXAMPLES } from "@/lib/examples";
import { AnalysisEmptyState, AnalysisLoadingState } from "./analysis-states";
import { AnalysisResultView } from "./analysis-result-view";

const INPUT_MODES = ["Headline", "Article", "Post"] as const;

type InputMode = (typeof INPUT_MODES)[number];

interface AnalyzeWorkspaceProps {
  initialText?: string;
  initialMode?: InputMode;
}

export function AnalyzeWorkspace({
  initialText = "",
  initialMode = "Article",
}: AnalyzeWorkspaceProps) {
  const [inputMode, setInputMode] = useState<InputMode>(initialMode);
  const [text, setText] = useState(initialText);
  const [sourceUrl, setSourceUrl] = useState("");
  const [status, setStatus] = useState<ResultStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AnalysisResult | null>(null);

  const characterCount = useMemo(() => {
    return text.trim().length > 0
      ? `${text.trim().length.toLocaleString()} characters`
      : "Paste content to begin";
  }, [text]);

  async function runAnalysis() {
    if (!text.trim()) {
      setStatus("error");
      setError("Add text before running analysis.");
      return;
    }

    setStatus("loading");
    setError(null);

    try {
      const payloadText = sourceUrl.trim()
        ? `Source URL: ${sourceUrl.trim()}\n\n${text.trim()}`
        : text.trim();

      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ text: payloadText }),
      });

      const data = await response.json();

      if (!response.ok) {
        const message =
          typeof data?.error === "string"
            ? data.error
            : "Failed to analyse the provided text.";
        throw new Error(message);
      }

      setResult(normalizeAnalysisResult(data));
      setStatus("success");
    } catch (caughtError) {
      setStatus("error");
      setResult(DEFAULT_ANALYSIS_RESULT);
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Something went wrong while running analysis."
      );
    }
  }

  function resetWorkspace() {
    setText("");
    setSourceUrl("");
    setStatus("idle");
    setResult(null);
    setError(null);
  }

  function applySample(sampleText: string, category: string) {
    setText(sampleText);
    if (category === "Headline") {
      setInputMode("Headline");
    } else if (category === "Social post") {
      setInputMode("Post");
    } else {
      setInputMode("Article");
    }

    setStatus("idle");
    setError(null);
  }

  return (
    <main className="mx-auto w-full max-w-[1560px] px-4 pb-14 pt-10 lg:px-6">
      <section className="mb-9 flex flex-wrap items-end justify-between gap-4">
        <div className="max-w-3xl space-y-2">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            Analysis Workspace
          </p>
          <h1 className="font-display text-5xl leading-tight text-foreground">
            Analyse claims with more context.
          </h1>
          <p className="text-base leading-relaxed text-muted-foreground">
            Paste content and review credibility signals in an explanation-first
            structure designed for careful reading.
          </p>
        </div>
      </section>

      <div className="grid gap-5 xl:grid-cols-[370px_minmax(0,1fr)_290px]">
        <aside className="space-y-4">
          <section className="rounded-2xl border border-border/80 bg-card/90 p-5">
            <h2 className="inline-flex items-center gap-2 text-sm font-semibold text-foreground">
              <TextCursorInput className="size-4 text-primary" />
              Input
            </h2>

            <div className="mt-4 grid grid-cols-3 gap-2">
              {INPUT_MODES.map((mode) => {
                const isActive = mode === inputMode;
                return (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => setInputMode(mode)}
                    className={`rounded-lg border px-2 py-2 text-xs font-semibold transition ${
                      isActive
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border bg-background text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {mode}
                  </button>
                );
              })}
            </div>

            <div className="mt-4 space-y-2">
              <label
                htmlFor="analysis-input"
                className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground"
              >
                {inputMode} Content
              </label>
              <textarea
                id="analysis-input"
                value={text}
                onChange={(event) => setText(event.target.value)}
                placeholder="Paste a headline, article excerpt, or post..."
                className="min-h-64 w-full resize-y rounded-xl border border-border bg-background/90 px-3 py-2 text-sm leading-relaxed text-foreground outline-none ring-0 transition focus:border-primary/50"
              />
              <p className="text-xs text-muted-foreground">{characterCount}</p>
            </div>

            <div className="mt-4 space-y-2">
              <label
                htmlFor="source-url"
                className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground"
              >
                Source URL (Optional)
              </label>
              <input
                id="source-url"
                type="url"
                value={sourceUrl}
                onChange={(event) => setSourceUrl(event.target.value)}
                placeholder="https://example.com/article"
                className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground outline-none transition placeholder:text-muted-foreground focus:border-primary/50"
              />
              <p className="text-xs leading-relaxed text-muted-foreground">
                Added as reference context in the analysis payload.
              </p>
            </div>

            <div className="mt-5 flex items-center gap-2">
              <Button onClick={runAnalysis} disabled={status === "loading"}>
                {status === "loading" ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    Analysing
                  </>
                ) : (
                  <>
                    <Sparkles className="size-4" />
                    Run analysis
                  </>
                )}
              </Button>
              <Button variant="outline" onClick={resetWorkspace}>
                Reset
              </Button>
            </div>
          </section>

          <section className="rounded-2xl border border-border/80 bg-card/90 p-5">
            <h2 className="inline-flex items-center gap-2 text-sm font-semibold text-foreground">
              <WandSparkles className="size-4 text-primary" />
              Quick sample inputs
            </h2>
            <div className="mt-3 space-y-2">
              {ANALYSIS_EXAMPLES.map((sample) => (
                <button
                  key={sample.id}
                  type="button"
                  onClick={() => applySample(sample.text, sample.category)}
                  className="w-full rounded-xl border border-border/80 bg-background/70 p-3 text-left transition hover:border-primary/35 hover:bg-background"
                >
                  <p className="text-sm font-semibold text-foreground">{sample.title}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {sample.summary}
                  </p>
                </button>
              ))}
            </div>
          </section>
        </aside>

        <section className="space-y-4">
          {error ? (
            <div className="rounded-xl border border-destructive/25 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              <p className="inline-flex items-center gap-2 font-medium">
                <AlertTriangle className="size-4" />
                {error}
              </p>
            </div>
          ) : null}

          {status === "loading" ? <AnalysisLoadingState /> : null}

          {status !== "loading" && result ? (
            <AnalysisResultView result={result} />
          ) : null}

          {status === "idle" ? <AnalysisEmptyState /> : null}
        </section>

        <aside className="space-y-4">
          <section className="rounded-2xl border border-border/80 bg-card/90 p-5">
            <h2 className="text-sm font-semibold text-foreground">How to read results</h2>
            <div className="mt-3 space-y-3 text-sm leading-relaxed text-muted-foreground">
              <p>
                Start with the top summary, then inspect the extracted claims and
                risk signals before deciding whether to trust or share.
              </p>
              <p>
                Source and context sections explain where evidence is strong,
                weak, or incomplete.
              </p>
              <p>
                Use <strong className="text-foreground">What To Verify Next</strong>
                {" "}
                as a checklist before citing the content.
              </p>
            </div>
          </section>

          <section className="rounded-2xl border border-border/80 bg-card/90 p-5">
            <h2 className="text-sm font-semibold text-foreground">Session snapshot</h2>
            <div className="mt-3 space-y-2 text-sm text-muted-foreground">
              <p>
                Last run status:{" "}
                <span className="font-medium text-foreground">
                  {status === "success"
                    ? "Completed"
                    : status === "loading"
                      ? "Analysing"
                      : status === "error"
                        ? "Needs retry"
                        : "Waiting"}
                </span>
              </p>
              <p>
                Claims captured:{" "}
                <span className="font-medium text-foreground">
                  {result?.mainClaims.length ?? 0}
                </span>
              </p>
              <p>
                Flags detected:{" "}
                <span className="font-medium text-foreground">
                  {result?.flags.length ?? 0}
                </span>
              </p>
            </div>
          </section>
        </aside>
      </div>
    </main>
  );
}
