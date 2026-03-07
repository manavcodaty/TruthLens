"use client";

import { useState } from "react";
import { ArrowLeftRight, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { AnalysisResultView } from "@/components/analysis/analysis-result-view";
import {
  AnalysisResult,
  DEFAULT_ANALYSIS_RESULT,
  ResultStatus,
  normalizeAnalysisResult,
} from "@/lib/analysis";

interface CompareSideState {
  text: string;
  status: ResultStatus;
  result: AnalysisResult | null;
  error: string | null;
}

const DEFAULT_LEFT_TEXT =
  "Breaking: insiders claim the national power grid will fail this weekend, but officials are hiding the timeline.";
const DEFAULT_RIGHT_TEXT =
  "The utility board announced a scheduled maintenance window this weekend. Officials published a timeline and outage map for specific neighborhoods.";

interface CompareWorkspaceProps {
  initialLeftText?: string;
  initialRightText?: string;
}

function createInitialState(text: string): CompareSideState {
  return {
    text,
    status: "idle",
    result: null,
    error: null,
  };
}

async function runSingleAnalysis(text: string): Promise<AnalysisResult> {
  const response = await fetch("/api/analyze", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(
      typeof data?.error === "string"
        ? data.error
        : "Failed to analyse this side."
    );
  }

  return normalizeAnalysisResult(data);
}

export function CompareWorkspace({
  initialLeftText,
  initialRightText,
}: CompareWorkspaceProps) {
  const initialLeft = initialLeftText?.trim() ? initialLeftText : DEFAULT_LEFT_TEXT;
  const initialRight = initialRightText?.trim()
    ? initialRightText
    : DEFAULT_RIGHT_TEXT;

  const [left, setLeft] = useState<CompareSideState>(createInitialState(initialLeft));
  const [right, setRight] = useState<CompareSideState>(
    createInitialState(initialRight)
  );
  const [isComparing, setIsComparing] = useState(false);

  async function runComparison() {
    if (!left.text.trim() || !right.text.trim()) {
      setLeft((state) => ({
        ...state,
        status: !state.text.trim() ? "error" : state.status,
        error: !state.text.trim() ? "Add text for the left side." : state.error,
      }));
      setRight((state) => ({
        ...state,
        status: !state.text.trim() ? "error" : state.status,
        error: !state.text.trim() ? "Add text for the right side." : state.error,
      }));
      return;
    }

    setIsComparing(true);
    setLeft((state) => ({ ...state, status: "loading", error: null }));
    setRight((state) => ({ ...state, status: "loading", error: null }));

    const [leftResult, rightResult] = await Promise.allSettled([
      runSingleAnalysis(left.text.trim()),
      runSingleAnalysis(right.text.trim()),
    ]);

    if (leftResult.status === "fulfilled") {
      setLeft((state) => ({
        ...state,
        status: "success",
        result: leftResult.value,
        error: null,
      }));
    } else {
      setLeft((state) => ({
        ...state,
        status: "error",
        result: DEFAULT_ANALYSIS_RESULT,
        error:
          leftResult.reason instanceof Error
            ? leftResult.reason.message
            : "Failed to analyse the left side.",
      }));
    }

    if (rightResult.status === "fulfilled") {
      setRight((state) => ({
        ...state,
        status: "success",
        result: rightResult.value,
        error: null,
      }));
    } else {
      setRight((state) => ({
        ...state,
        status: "error",
        result: DEFAULT_ANALYSIS_RESULT,
        error:
          rightResult.reason instanceof Error
            ? rightResult.reason.message
            : "Failed to analyse the right side.",
      }));
    }

    setIsComparing(false);
  }

  function resetComparison() {
    setLeft(createInitialState(initialLeft));
    setRight(createInitialState(initialRight));
  }

  return (
    <main className="mx-auto w-full max-w-[1560px] px-4 pb-14 pt-10 lg:px-6">
      <section className="mb-8 space-y-3">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          Side-by-side comparison
        </p>
        <h1 className="font-display text-5xl leading-tight text-foreground">
          Compare two narratives before you trust either.
        </h1>
        <p className="max-w-3xl text-base leading-relaxed text-muted-foreground">
          Use the same credibility rubric on both sides to inspect differences in
          claims, sourcing quality, framing, and missing context.
        </p>
        <div className="flex items-center gap-2">
          <Button onClick={runComparison} disabled={isComparing}>
            {isComparing ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Comparing
              </>
            ) : (
              <>
                <ArrowLeftRight className="size-4" />
                Run side-by-side analysis
              </>
            )}
          </Button>
          <Button variant="outline" onClick={resetComparison}>
            Reset
          </Button>
        </div>
      </section>

      <div className="grid gap-5 lg:grid-cols-2">
        <section className="space-y-4 rounded-2xl border border-border/80 bg-card/90 p-5">
          <header className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
              Left input
            </p>
            <textarea
              value={left.text}
              onChange={(event) =>
                setLeft((state) => ({
                  ...state,
                  text: event.target.value,
                  status: "idle",
                  error: null,
                  result: null,
                }))
              }
              placeholder="Paste the first text or headline..."
              className="min-h-48 w-full resize-y rounded-xl border border-border bg-background px-3 py-2 text-sm leading-relaxed text-foreground outline-none transition focus:border-primary/50"
            />
          </header>

          {left.error ? (
            <p className="rounded-lg border border-destructive/20 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {left.error}
            </p>
          ) : null}

          {left.status === "loading" ? (
            <p className="inline-flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" />
              Analysing left side...
            </p>
          ) : null}

          {left.result ? <AnalysisResultView result={left.result} compact /> : null}
        </section>

        <section className="space-y-4 rounded-2xl border border-border/80 bg-card/90 p-5">
          <header className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
              Right input
            </p>
            <textarea
              value={right.text}
              onChange={(event) =>
                setRight((state) => ({
                  ...state,
                  text: event.target.value,
                  status: "idle",
                  error: null,
                  result: null,
                }))
              }
              placeholder="Paste the second text or headline..."
              className="min-h-48 w-full resize-y rounded-xl border border-border bg-background px-3 py-2 text-sm leading-relaxed text-foreground outline-none transition focus:border-primary/50"
            />
          </header>

          {right.error ? (
            <p className="rounded-lg border border-destructive/20 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {right.error}
            </p>
          ) : null}

          {right.status === "loading" ? (
            <p className="inline-flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" />
              Analysing right side...
            </p>
          ) : null}

          {right.result ? <AnalysisResultView result={right.result} compact /> : null}
        </section>
      </div>
    </main>
  );
}
