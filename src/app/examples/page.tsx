import Link from "next/link";
import { ArrowRight, ExternalLink, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import { SiteFooter } from "@/components/site/site-footer";
import { SiteHeader } from "@/components/site/site-header";
import { ANALYSIS_EXAMPLES } from "@/lib/examples";

export default function ExamplesPage() {
  return (
    <>
      <SiteHeader activeTab="examples" />

      <main className="mx-auto w-full max-w-[1240px] px-6 pb-16 pt-10 lg:px-10">
        <section className="space-y-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            Curated examples
          </p>
          <h1 className="font-display text-5xl leading-tight text-foreground">
            Understand the output before your first real run.
          </h1>
          <p className="max-w-3xl text-base leading-relaxed text-muted-foreground">
            These sample cases are designed to show how TruthLens handles
            sensational claims, bias-heavy framing, and seemingly balanced text.
          </p>
        </section>

        <section className="mt-10 grid gap-4 lg:grid-cols-2">
          {ANALYSIS_EXAMPLES.map((example) => (
            <article
              key={example.id}
              className="rounded-2xl border border-border/80 bg-card/85 p-6"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                    {example.category}
                  </p>
                  <h2 className="mt-2 text-2xl font-semibold text-foreground">
                    {example.title}
                  </h2>
                </div>
                <Sparkles className="size-5 text-primary" />
              </div>

              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                {example.summary}
              </p>

              <div className="mt-4 rounded-xl border border-border/70 bg-background/70 p-4 text-sm leading-relaxed text-foreground">
                {example.text}
              </div>

              <div className="mt-5 flex flex-wrap items-center gap-2">
                <Button
                  render={
                    <Link href={`/analyze?sample=${example.id}`}>
                      Analyse this sample <ArrowRight className="size-4" />
                    </Link>
                  }
                  className="rounded-full"
                />
                <Button
                  variant="outline"
                  render={
                    <Link href={`/compare?left=${example.id}`}>
                      Compare mode <ExternalLink className="size-4" />
                    </Link>
                  }
                  className="rounded-full"
                />
              </div>
            </article>
          ))}
        </section>

        <section className="mt-12 rounded-3xl border border-border/80 bg-card p-8 text-center">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            Ready for your own content?
          </p>
          <h2 className="mt-3 font-display text-4xl text-foreground">
            Move from examples to real-world claims.
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground">
            Paste your own headline, article excerpt, or social post and get the
            same structured credibility breakdown.
          </p>
          <div className="mt-6 flex justify-center">
            <Button
              render={<Link href="/analyze">Open workspace <ArrowRight className="size-4" /></Link>}
              className="rounded-full px-4"
            />
          </div>
        </section>
      </main>

      <SiteFooter />
    </>
  );
}
