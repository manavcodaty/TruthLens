import { AnalyzeWorkspace } from "@/components/analysis/analyze-workspace";
import { SiteFooter } from "@/components/site/site-footer";
import { SiteHeader } from "@/components/site/site-header";
import { getExampleById } from "@/lib/examples";

interface AnalyzePageProps {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}

export default async function AnalyzePage({ searchParams }: AnalyzePageProps) {
  const resolvedSearchParams = (await searchParams) ?? {};

  const textParam =
    typeof resolvedSearchParams.text === "string"
      ? resolvedSearchParams.text
      : undefined;
  const sampleParam =
    typeof resolvedSearchParams.sample === "string"
      ? resolvedSearchParams.sample
      : undefined;

  const sample = getExampleById(sampleParam);
  const initialText = textParam ?? sample?.text ?? "";

  const initialMode = sample
    ? sample.category === "Headline"
      ? "Headline"
      : sample.category === "Social post"
        ? "Post"
        : "Article"
    : "Article";

  return (
    <>
      <SiteHeader activeTab="analyze" />
      <AnalyzeWorkspace initialText={initialText} initialMode={initialMode} />
      <SiteFooter />
    </>
  );
}
