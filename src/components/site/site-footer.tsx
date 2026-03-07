import Link from "next/link";

const FOOTER_LINKS = [
  { href: "/", label: "Home" },
  { href: "/analyze", label: "Analyze" },
  { href: "/examples", label: "Examples" },
  { href: "/compare", label: "Compare" },
];

export function SiteFooter() {
  return (
    <footer className="border-t border-border/70 bg-card/70">
      <div className="mx-auto grid w-full max-w-[1560px] gap-8 px-4 py-10 text-sm text-muted-foreground lg:grid-cols-[1.4fr_1fr_1fr] lg:px-6">
        <div>
          <p className="font-medium tracking-[0.08em] text-foreground">TruthLens</p>
          <p className="mt-3 max-w-sm leading-relaxed">
            Explainable credibility analysis for headlines, articles, and social
            claims.
          </p>
        </div>

        <div>
          <p className="font-medium text-foreground">Product</p>
          <ul className="mt-3 space-y-2">
            {FOOTER_LINKS.map((link) => (
              <li key={link.href}>
                <Link href={link.href} className="transition hover:text-foreground">
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <p className="font-medium text-foreground">Positioning</p>
          <p className="mt-3 leading-relaxed">
            Built for students, journalists, researchers, educators, and readers
            who value evidence over noise.
          </p>
        </div>
      </div>
    </footer>
  );
}
