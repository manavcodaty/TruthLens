import type { ReactNode } from "react";
import {
  AlertTriangle,
  BadgeCheck,
  Clock3,
  FileSearch,
  Flag,
  Globe,
  Link2,
  ListChecks,
  ShieldAlert,
  Telescope,
} from "lucide-react";

import { cn } from "@/lib/utils";
import {
  AnalysisResult,
  AnalysisFlag,
  getCredibilityConfig,
} from "@/lib/analysis";

interface AnalysisResultViewProps {
  result: AnalysisResult;
  compact?: boolean;
}

const TONE_CLASS: Record<string, { badge: string; bar: string; panel: string }> = {
  strong: {
    badge: "border-emerald-200 bg-emerald-50 text-emerald-800",
    bar: "bg-emerald-600",
    panel: "border-emerald-200/60 bg-emerald-50/70",
  },
  positive: {
    badge: "border-teal-200 bg-teal-50 text-teal-800",
    bar: "bg-teal-600",
    panel: "border-teal-200/60 bg-teal-50/70",
  },
  mixed: {
    badge: "border-amber-200 bg-amber-50 text-amber-800",
    bar: "bg-amber-600",
    panel: "border-amber-200/60 bg-amber-50/70",
  },
  caution: {
    badge: "border-orange-200 bg-orange-50 text-orange-800",
    bar: "bg-orange-600",
    panel: "border-orange-200/60 bg-orange-50/70",
  },
  risk: {
    badge: "border-rose-200 bg-rose-50 text-rose-800",
    bar: "bg-rose-600",
    panel: "border-rose-200/60 bg-rose-50/70",
  },
  neutral: {
    badge: "border-slate-200 bg-slate-50 text-slate-700",
    bar: "bg-slate-500",
    panel: "border-slate-200/60 bg-slate-50/70",
  },
};

function getFlagTone(flag: AnalysisFlag): string {
  const type = flag.type.toLowerCase();

  if (type.includes("emotional") || type.includes("sensational")) {
    return "border-amber-200 bg-amber-50/80 text-amber-900";
  }

  if (type.includes("bias") || type.includes("framing")) {
    return "border-violet-200 bg-violet-50/80 text-violet-900";
  }

  if (type.includes("source") || type.includes("evidence")) {
    return "border-cyan-200 bg-cyan-50/80 text-cyan-900";
  }

  if (type.includes("context") || type.includes("omission")) {
    return "border-orange-200 bg-orange-50/80 text-orange-900";
  }

  return "border-slate-200 bg-slate-50/80 text-slate-900";
}

function SectionCard({
  title,
  icon,
  children,
  className,
}: {
  title: string;
  icon: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <article className={cn("rounded-2xl border border-border/80 bg-card/85 p-5", className)}>
      <h3 className="inline-flex items-center gap-2 text-sm font-semibold tracking-[0.03em] text-foreground">
        {icon}
        {title}
      </h3>
      <div className="mt-4">{children}</div>
    </article>
  );
}

function formatRetrievedAt(isoTimestamp: string): string {
  if (!isoTimestamp) {
    return "Unavailable";
  }

  const parsed = new Date(isoTimestamp);
  if (Number.isNaN(parsed.valueOf())) {
    return "Unavailable";
  }

  return parsed.toLocaleString();
}

function recencyLabel(recency: string): string {
  if (recency === "fresh") {
    return "Fresh";
  }
  if (recency === "recent") {
    return "Recent";
  }
  if (recency === "aging") {
    return "Aging";
  }
  if (recency === "stale") {
    return "Stale";
  }
  return "Unknown";
}

export function AnalysisResultView({
  result,
  compact = false,
}: AnalysisResultViewProps) {
  const config = getCredibilityConfig(result.credibilityScore);
  const tone = TONE_CLASS[config.tone];

  return (
    <div className={cn("space-y-6", compact && "space-y-5")}> 
      <section className={cn("rounded-3xl border p-6 shadow-[0_24px_55px_-45px_rgba(15,23,42,0.55)]", tone.panel)}>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-3xl space-y-2">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              Top Summary
            </p>
            <h2 className={cn("font-display text-3xl leading-tight text-foreground", compact && "text-2xl")}>
              {result.summary}
            </h2>
          </div>
          <span className={cn("inline-flex rounded-full border px-3 py-1 text-xs font-semibold", tone.badge)}>
            {config.label}
          </span>
        </div>

        <div className="mt-5 space-y-2">
          <div className="h-2.5 w-full overflow-hidden rounded-full bg-background/70">
            <div
              className={cn("h-full rounded-full transition-all", tone.bar)}
              style={{ width: `${config.score}%` }}
            />
          </div>
          <div className="flex justify-between text-[11px] uppercase tracking-[0.06em] text-muted-foreground">
            <span>High caution</span>
            <span>Mixed signals</span>
            <span>Higher confidence</span>
          </div>
          <p className="text-sm leading-relaxed text-muted-foreground">{config.guidance}</p>
        </div>
      </section>

      <div className={cn("grid gap-4", compact ? "xl:grid-cols-1" : "xl:grid-cols-2")}>
        <SectionCard title="Key Claims" icon={<ListChecks className="size-4 text-primary" />}>
          {result.mainClaims.length === 0 ? (
            <p className="text-sm text-muted-foreground">No explicit claims were extracted from this input.</p>
          ) : (
            <ol className="space-y-2">
              {result.mainClaims.map((claim, index) => (
                <li
                  key={`${claim}-${index}`}
                  className="rounded-xl border border-border/70 bg-background/75 px-3 py-2 text-sm leading-relaxed text-foreground"
                >
                  <span className="mr-2 font-semibold text-primary">{index + 1}.</span>
                  {claim}
                </li>
              ))}
            </ol>
          )}
        </SectionCard>

        <SectionCard title="Credibility Signals" icon={<Flag className="size-4 text-primary" />}>
          {result.flags.length === 0 ? (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-3 text-sm text-emerald-900">
              <p className="inline-flex items-center gap-2 font-medium">
                <BadgeCheck className="size-4" />
                No major risk flags were detected.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {result.flags.map((flag, index) => (
                <details
                  key={`${flag.type}-${index}`}
                  className={cn("group rounded-xl border px-3", getFlagTone(flag))}
                >
                  <summary className="cursor-pointer list-none py-3 text-sm font-semibold">
                    {flag.type}
                  </summary>
                  <div className="space-y-3 pb-3 text-sm leading-relaxed">
                    {flag.quote ? (
                      <p className="rounded-lg border border-black/10 bg-background/70 px-3 py-2 italic text-foreground">
                        “{flag.quote}”
                      </p>
                    ) : null}
                    <p className="text-foreground">{flag.explanation}</p>
                  </div>
                </details>
              ))}
            </div>
          )}
        </SectionCard>
      </div>

      <div className={cn("grid gap-4", compact ? "xl:grid-cols-1" : "xl:grid-cols-2")}>
        <SectionCard title="Live Web Grounding" icon={<Globe className="size-4 text-primary" />}>
          <div className="space-y-3">
            <div
              className={cn(
                "inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold",
                result.grounding.succeeded
                  ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                  : "border-amber-200 bg-amber-50 text-amber-900"
              )}
            >
              {result.grounding.succeeded ? (
                <>
                  <BadgeCheck className="size-3.5" />
                  Live grounding used
                </>
              ) : (
                <>
                  <ShieldAlert className="size-3.5" />
                  Grounding failed (model-only fallback)
                </>
              )}
            </div>

            <div className="grid gap-2 text-sm text-foreground">
              <p className="inline-flex items-center gap-2">
                <Clock3 className="size-4 text-muted-foreground" />
                Sources retrieved: {formatRetrievedAt(result.grounding.retrievedAt)}
              </p>
              <p>
                Time-sensitive claim:{" "}
                <span className="font-medium">
                  {result.grounding.isTimeSensitive ? "Yes" : "No"}
                </span>
              </p>
              <p>
                Queries run:{" "}
                <span className="font-medium">{result.grounding.searchQueries.length}</span>
              </p>
              <p>
                Deep extract used:{" "}
                <span className="font-medium">
                  {result.grounding.usedExtract ? "Yes" : "No"}
                </span>
              </p>
            </div>

            {result.warnings.length > 0 ? (
              <div className="space-y-2 rounded-xl border border-amber-200 bg-amber-50/75 p-3 text-sm text-amber-900">
                <p className="inline-flex items-center gap-2 font-semibold">
                  <AlertTriangle className="size-4" />
                  Grounding warnings
                </p>
                <ul className="space-y-1.5">
                  {result.warnings.map((warning, index) => (
                    <li key={`${warning}-${index}`} className="leading-relaxed">
                      • {warning}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
        </SectionCard>

        <SectionCard title="Source Analysis" icon={<Link2 className="size-4 text-primary" />}>
          <p className="text-sm leading-relaxed text-foreground">{result.sourceNotes}</p>
        </SectionCard>

        <SectionCard title="Missing Context" icon={<FileSearch className="size-4 text-primary" />}>
          <p className="text-sm leading-relaxed text-foreground">{result.contextNotes}</p>
        </SectionCard>
      </div>

      <SectionCard title="Checked Sources" icon={<Link2 className="size-4 text-primary" />}>
        {result.citations.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No live citations were available for this run.
          </p>
        ) : (
          <div className="space-y-2">
            {result.citations.map((citation, index) => (
              <article
                key={`${citation.url}-${index}`}
                className="rounded-xl border border-border/70 bg-background/75 p-3"
              >
                <a
                  href={citation.url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-sm font-semibold text-foreground underline-offset-2 hover:underline"
                >
                  {citation.title}
                </a>
                <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
                  <span>{citation.domain}</span>
                  <span>{citation.sourceType}</span>
                  <span>{recencyLabel(citation.recency)}</span>
                  <span>{citation.publishedAt ?? "Date unavailable"}</span>
                </div>
                <p className="mt-2 text-sm leading-relaxed text-foreground">{citation.snippet}</p>
              </article>
            ))}
          </div>
        )}
      </SectionCard>

      <SectionCard title="What To Verify Next" icon={<Telescope className="size-4 text-primary" />}>
        {result.nextSteps.length === 0 ? (
          <p className="text-sm text-muted-foreground">No recommended next checks were provided.</p>
        ) : (
          <ul className="space-y-2">
            {result.nextSteps.map((step, index) => (
              <li
                key={`${step}-${index}`}
                className="flex items-start gap-3 rounded-xl border border-border/70 bg-background/75 px-3 py-2 text-sm text-foreground"
              >
                <span className="inline-flex size-5 shrink-0 items-center justify-center rounded-full border border-border bg-card text-xs font-semibold text-primary">
                  {index + 1}
                </span>
                <span className="leading-relaxed">{step}</span>
              </li>
            ))}
          </ul>
        )}

        {result.flags.length > 0 ? (
          <p className="mt-4 inline-flex items-center gap-2 text-xs text-muted-foreground">
            <AlertTriangle className="size-3.5" />
            Treat this as guidance. For high-impact decisions, verify with independent primary sources.
          </p>
        ) : null}
      </SectionCard>
    </div>
  );
}
