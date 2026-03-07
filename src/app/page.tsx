import Link from "next/link";
import {
  ArrowRight,
  Brain,
  FileSearch,
  Flag,
  Link2,
  MessageSquareWarning,
  ShieldCheck,
  Sparkles,
  Waypoints,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { SiteFooter } from "@/components/site/site-footer";
import { SiteHeader } from "@/components/site/site-header";

const TRUST_ROLES = [
  "Students",
  "Journalists",
  "Researchers",
  "Educators",
  "Everyday readers",
];

const FEATURES = [
  {
    title: "Claim extraction",
    description:
      "Separate core claims from surrounding narrative to make fact-checking more direct.",
    icon: Sparkles,
  },
  {
    title: "Bias and framing signals",
    description:
      "Identify persuasive framing, loaded language, and rhetorical pressure cues.",
    icon: Flag,
  },
  {
    title: "Source-quality analysis",
    description:
      "Surface missing attribution, weak sourcing patterns, and indirect evidence chains.",
    icon: Link2,
  },
  {
    title: "Emotional language detection",
    description:
      "Highlight urgency tactics and emotionally charged wording designed to bypass scrutiny.",
    icon: MessageSquareWarning,
  },
  {
    title: "Context gap detection",
    description:
      "Call out missing baselines, omitted timelines, and absent comparative context.",
    icon: FileSearch,
  },
  {
    title: "Explainable output",
    description:
      "Each caution comes with rationale so users can review and challenge the reasoning.",
    icon: Brain,
  },
];

const HOW_IT_WORKS = [
  {
    title: "Paste content",
    body: "Drop in a headline, article excerpt, post, or thread exactly as you encountered it.",
  },
  {
    title: "Analyse credibility signals",
    body: "TruthLens evaluates claims, sourcing, framing, and context using a transparent rubric.",
  },
  {
    title: "Decide what to trust",
    body: "Get a structured readout of what looks reliable, what is weak, and what to verify next.",
  },
];

export default function HomePage() {
  return (
    <>
      <SiteHeader activeTab="home" />

      <main className="relative overflow-x-clip pb-14">
        <section className="mx-auto grid w-full max-w-[1560px] gap-16 px-4 pb-20 pt-14 lg:grid-cols-[1.1fr_0.9fr] lg:px-6">
          <div className="space-y-8">
            <p className="inline-flex items-center gap-2 rounded-full border border-border/80 bg-card px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              <ShieldCheck className="size-3.5 text-primary" />
              Explainable credibility analysis
            </p>

            <div className="space-y-5">
              <h1 className="font-display text-5xl leading-tight text-foreground sm:text-6xl">
                Analyse claims with
                <br />
                more context.
              </h1>
              <p className="max-w-2xl text-lg leading-relaxed text-muted-foreground">
                TruthLens helps you inspect headlines, posts, and articles for
                weak sourcing, emotional manipulation, framing bias, and missing
                context, so you can understand what to trust, question, or verify
                next.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <Button render={<Link href="/analyze">Try TruthLens <ArrowRight className="size-4" /></Link>} className="rounded-full px-4" />
              <Button
                variant="outline"
                render={<Link href="/examples">Explore sample analyses</Link>}
                className="rounded-full"
              />
            </div>

            <p className="text-sm text-muted-foreground">
              Built for careful readers who need signal clarity before sharing,
              citing, or publishing.
            </p>
          </div>

          <div className="rounded-3xl border border-border/80 bg-card/90 p-6 shadow-[0_24px_60px_-45px_rgba(15,23,42,0.5)]">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              Product demo preview
            </p>
            <div className="mt-3 rounded-2xl border border-border/70 bg-background/80 p-4">
              <p className="text-sm leading-relaxed text-foreground">
                &quot;Breaking: officials are hiding plans for citywide power
                outages next Friday. Move your money and stockpile supplies
                now.&quot;
              </p>
            </div>

            <div className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
              <div className="rounded-xl border border-amber-200/80 bg-amber-50/70 p-4">
                <p className="font-semibold text-amber-900">Credibility summary</p>
                <p className="mt-1 text-amber-800">
                  Mixed / use caution due to missing primary evidence.
                </p>
              </div>
              <div className="rounded-xl border border-orange-200/80 bg-orange-50/70 p-4">
                <p className="font-semibold text-orange-900">Risk flags</p>
                <p className="mt-1 text-orange-800">
                  Urgency language, unnamed insiders, and broad institutional
                  claims.
                </p>
              </div>
              <div className="rounded-xl border border-cyan-200/80 bg-cyan-50/70 p-4">
                <p className="font-semibold text-cyan-900">Source quality</p>
                <p className="mt-1 text-cyan-800">
                  No primary documents, no named experts, no publication chain.
                </p>
              </div>
              <div className="rounded-xl border border-violet-200/80 bg-violet-50/70 p-4">
                <p className="font-semibold text-violet-900">Missing context</p>
                <p className="mt-1 text-violet-800">
                  Timeline ambiguity and no baseline statistics for comparison.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="border-y border-border/70 bg-card/50">
          <div className="mx-auto flex w-full max-w-[1560px] flex-wrap items-center gap-3 px-4 py-6 lg:px-6">
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
              Trusted framing for
            </p>
            {TRUST_ROLES.map((role) => (
              <span
                key={role}
                className="rounded-full border border-border/80 bg-background/80 px-3 py-1 text-sm text-foreground"
              >
                {role}
              </span>
            ))}
          </div>
        </section>

        <section id="features" className="mx-auto w-full max-w-[1560px] px-4 py-20 lg:px-6">
          <div className="max-w-2xl space-y-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
              Feature overview
            </p>
            <h2 className="font-display text-4xl text-foreground">
              Credibility analysis built for explainability
            </h2>
            <p className="text-base leading-relaxed text-muted-foreground">
              Instead of one opaque score, TruthLens organizes output into a
              readable structure that shows why each caution was raised.
            </p>
          </div>

          <div className="mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((feature) => {
              const Icon = feature.icon;
              return (
                <article
                  key={feature.title}
                  className="rounded-2xl border border-border/80 bg-card/75 p-5"
                >
                  <div className="mb-4 inline-flex size-9 items-center justify-center rounded-lg border border-border bg-background text-primary">
                    <Icon className="size-4" />
                  </div>
                  <h3 className="text-base font-semibold text-foreground">
                    {feature.title}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                    {feature.description}
                  </p>
                </article>
              );
            })}
          </div>
        </section>

        <section className="bg-card/40">
          <div className="mx-auto w-full max-w-[1560px] px-4 py-20 lg:px-6">
            <div className="max-w-2xl space-y-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                How it works
              </p>
              <h2 className="font-display text-4xl text-foreground">
                Three steps from raw content to better judgment
              </h2>
            </div>

            <div className="mt-10 grid gap-4 md:grid-cols-3">
              {HOW_IT_WORKS.map((step, index) => (
                <article
                  key={step.title}
                  className="rounded-2xl border border-border/80 bg-background/85 p-5"
                >
                  <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-primary">
                    Step {index + 1}
                  </p>
                  <h3 className="mt-3 text-lg font-semibold text-foreground">
                    {step.title}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                    {step.body}
                  </p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="mx-auto w-full max-w-[1560px] px-4 py-18 lg:px-6">
          <div className="rounded-3xl border border-border/80 bg-card p-10 text-center shadow-[0_30px_75px_-50px_rgba(15,23,42,0.5)]">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              Ready to evaluate content with more clarity?
            </p>
            <h2 className="mx-auto mt-4 max-w-3xl font-display text-4xl leading-tight text-foreground">
              See credibility signals, not just conclusions.
            </h2>
            <p className="mx-auto mt-4 max-w-3xl text-base leading-relaxed text-muted-foreground">
              No sign-in required. Start with your own content or open curated
              examples to see how TruthLens explains each signal.
            </p>
            <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
              <Button
                render={<Link href="/analyze">Start analysing <ArrowRight className="size-4" /></Link>}
                className="rounded-full px-4"
              />
              <Button
                variant="outline"
                render={<Link href="/compare">Open comparison mode <Waypoints className="size-4" /></Link>}
                className="rounded-full"
              />
            </div>
          </div>
        </section>
      </main>

      <SiteFooter />
    </>
  );
}
