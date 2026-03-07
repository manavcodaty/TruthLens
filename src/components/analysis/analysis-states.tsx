import { Loader2 } from "lucide-react";

export function AnalysisEmptyState() {
  return (
    <div className="rounded-2xl border border-dashed border-border bg-card/70 p-10 text-center">
      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
        Ready When You Are
      </p>
      <h2 className="mt-3 font-display text-3xl text-foreground">No analysis yet</h2>
      <p className="mx-auto mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground">
        Paste content in the left panel and run analysis to see claims,
        credibility signals, source quality notes, context gaps, and next checks.
      </p>
    </div>
  );
}

function Skeleton({ className }: { className: string }) {
  return <div className={`animate-pulse rounded-md bg-muted ${className}`} />;
}

export function AnalysisLoadingState() {
  return (
    <div className="space-y-4 rounded-2xl border border-border/80 bg-card/85 p-6">
      <p className="inline-flex items-center gap-2 text-sm font-medium text-foreground">
        <Loader2 className="size-4 animate-spin text-primary" />
        Analysing credibility signals...
      </p>
      <Skeleton className="h-22 rounded-xl" />
      <div className="grid gap-3 md:grid-cols-2">
        <Skeleton className="h-38 rounded-xl" />
        <Skeleton className="h-38 rounded-xl" />
      </div>
      <Skeleton className="h-30 rounded-xl" />
    </div>
  );
}
