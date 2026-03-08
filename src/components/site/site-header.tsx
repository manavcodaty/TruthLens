import Link from "next/link";

import { BrandLogo } from "@/components/site/brand-logo";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/", label: "Home", key: "home" },
  { href: "/analyze", label: "Analyze", key: "analyze" },
  { href: "/examples", label: "Examples", key: "examples" },
  { href: "/compare", label: "Compare", key: "compare" },
] as const;

export type SiteTab = (typeof NAV_ITEMS)[number]["key"];

interface SiteHeaderProps {
  activeTab?: SiteTab;
}

export function SiteHeader({ activeTab }: SiteHeaderProps) {
  return (
    <header className="sticky top-0 z-50 border-b border-border/70 bg-background/92 backdrop-blur-xl">
      <div className="mx-auto flex h-18 w-full max-w-[1560px] items-center justify-between px-4 lg:px-6">
        <Link
          href="/"
          className="inline-flex items-center gap-3 text-sm font-semibold tracking-[0.06em] text-foreground"
        >
          <BrandLogo className="h-8" priority />
          <span className="text-base md:text-lg">TruthLens</span>
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "rounded-full px-3 py-2 text-sm transition",
                activeTab === item.key
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <Button
            render={
              <Link href="/examples" className="hidden md:inline-flex">
                Browse Samples
              </Link>
            }
            variant="ghost"
            className="text-muted-foreground"
          />
          <Button
            render={<Link href="/analyze">Open Workspace</Link>}
            className="rounded-full px-4"
          />
        </div>
      </div>
    </header>
  );
}
