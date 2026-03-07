export interface AnalysisExample {
  id: string;
  title: string;
  category: string;
  summary: string;
  text: string;
}

export const ANALYSIS_EXAMPLES: AnalysisExample[] = [
  {
    id: "viral-breakthrough",
    title: "Viral breakthrough claim",
    category: "Social post",
    summary:
      "Urgent language and anonymous authority claims create pressure to act before verification.",
    text: "Breaking: insiders at a private AI lab have already built a model that can shut down global payment systems by next week. Mainstream outlets refuse to cover it. Banks are preparing emergency closures. Move your money now before accounts freeze.",
  },
  {
    id: "loaded-policy-thread",
    title: "Loaded policy thread",
    category: "Opinion thread",
    summary:
      "Strong framing and certainty with minimal evidence create a bias-heavy narrative.",
    text: "The new safety bill is proof that regulators are crushing open innovation on purpose. The biggest companies wrote the rules themselves, and independent researchers will be pushed out within months. This is the end of open knowledge unless people resist now.",
  },
  {
    id: "balanced-press-release",
    title: "Structured announcement",
    category: "News excerpt",
    summary:
      "Neutral tone and named institutions look stronger, but source independence still matters.",
    text: "Saab and the Kyiv School of Economics announced a collaboration framework for research in unmanned aerial systems and microelectronics. According to their joint statement, the partnership will focus on technical R&D programs, educational initiatives, and long-term innovation capacity for defense technology.",
  },
  {
    id: "sensational-headline",
    title: "Sensational headline",
    category: "Headline",
    summary:
      "High-impact claims with vague evidence can inflate confidence before full context is available.",
    text: "Scientists admit popular wellness supplement may reverse memory loss in two weeks, experts shocked by hidden data.",
  },
];

export function getExampleById(id?: string | null): AnalysisExample | undefined {
  if (!id) {
    return undefined;
  }

  return ANALYSIS_EXAMPLES.find((example) => example.id === id);
}
