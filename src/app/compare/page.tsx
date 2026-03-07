import { CompareWorkspace } from "@/components/analysis/compare-workspace";
import { SiteFooter } from "@/components/site/site-footer";
import { SiteHeader } from "@/components/site/site-header";
import { getExampleById } from "@/lib/examples";

interface ComparePageProps {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}

export default async function ComparePage({ searchParams }: ComparePageProps) {
  const resolvedSearchParams = (await searchParams) ?? {};
  const leftParam =
    typeof resolvedSearchParams.left === "string"
      ? resolvedSearchParams.left
      : undefined;
  const rightParam =
    typeof resolvedSearchParams.right === "string"
      ? resolvedSearchParams.right
      : undefined;

  const leftExample = getExampleById(leftParam);
  const rightExample = getExampleById(rightParam);

  return (
    <>
      <SiteHeader activeTab="compare" />
      <CompareWorkspace
        initialLeftText={leftExample?.text}
        initialRightText={rightExample?.text}
      />
      <SiteFooter />
    </>
  );
}
