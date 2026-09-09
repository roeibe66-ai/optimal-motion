"use server";

import { generateObject } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import { z } from "zod";
import type { ResearchFinding } from "@/app/types";

const SEMANTIC_SCHOLAR_SEARCH_URL = "https://api.semanticscholar.org/graph/v1/paper/search";
const CANDIDATE_POOL_SIZE = 20; // fetched by relevance, then re-sorted by citation count below
const TOP_PAPERS_COUNT = 3;
const FETCH_TIMEOUT_MS = 15_000;

interface SemanticScholarPaper {
  title: string;
  abstract: string | null;
  year: number | null;
  url: string | null;
  citationCount: number | null;
}

interface SemanticScholarSearchResponse {
  data?: SemanticScholarPaper[];
}

export type ResearchAgentResult = { ok: true; findings: ResearchFinding[] } | { ok: false; error: string };

async function fetchWithTimeout(url: string, init: RequestInit, timeoutMs: number): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

// Fetches a relevance-ranked candidate pool from Semantic Scholar, then
// re-sorts it by citation count so the studies handed to the LLM are both
// on-topic (relevance search) and well-established (citation count) rather
// than just the single most-cited paper on any tangentially related topic.
async function fetchTopCitedPapers(query: string): Promise<(SemanticScholarPaper & { abstract: string })[]> {
  const params = new URLSearchParams({
    query,
    fields: "title,abstract,year,url,citationCount",
    limit: String(CANDIDATE_POOL_SIZE),
  });
  const headers: Record<string, string> = {};
  if (process.env.SEMANTIC_SCHOLAR_API_KEY) headers["x-api-key"] = process.env.SEMANTIC_SCHOLAR_API_KEY;

  const res = await fetchWithTimeout(`${SEMANTIC_SCHOLAR_SEARCH_URL}?${params.toString()}`, { headers }, FETCH_TIMEOUT_MS);
  if (!res.ok) throw new Error(`חיפוש המאמרים נכשל (Semantic Scholar, קוד ${res.status})`);
  const json: SemanticScholarSearchResponse = await res.json();
  const candidates = json.data ?? [];

  return candidates
    .filter((p): p is SemanticScholarPaper & { abstract: string } => Boolean(p.title && p.abstract && p.abstract.length > 40))
    .sort((a, b) => (b.citationCount ?? 0) - (a.citationCount ?? 0))
    .slice(0, TOP_PAPERS_COUNT);
}

const paperFactSchema = z.object({
  summaryHe: z.string().describe("תקציר קצר ופשוט של מסקנת המחקר, 2-3 משפטים, בעברית ברורה להדיוט"),
  didYouKnowHe: z.string().describe("משפט 'הידעת' אחד עד שניים, קליט, בעברית, מבוסס על ממצאי המחקר בלבד"),
});

const RESEARCH_AGENT_SYSTEM_PROMPT = `את/ה עוזר/ת מחקר עבור אפליקציית כושר ושיקום פיזיותרפי בשם OptimalMotion.
בהינתן כותרת ותקציר של מאמר אקדמי (באנגלית), עליך:
1. לכתוב סיכום קצר ופשוט של מסקנת המחקר, בעברית ברורה ונגישה, ללא ז'רגון מחקרי.
2. לכתוב עובדת "הידעת" בת משפט עד שניים, קליטה וסקרנית, בעברית, המבוססת אך ורק על ממצאי המאמר, ומנוסחת עבור מתאמנים/מטופלים באפליקציה - לא עבור אנשי מקצוע.

כללים:
- התבסס אך ורק על התוכן שסופק. אל תמציא נתונים, מספרים או פרטים שלא מופיעים בתקציר.
- אל תיתן ייעוץ רפואי אישי או המלצת טיפול - רק עובדה כללית מהמחקר.
- כתוב בעברית תקנית וטבעית בלבד, ללא מילים באנגלית.`;

async function summarizePaperInHebrew(paper: { title: string; abstract: string; year: number | null }) {
  const { object } = await generateObject({
    model: anthropic("claude-sonnet-5"),
    schema: paperFactSchema,
    system: RESEARCH_AGENT_SYSTEM_PROMPT,
    prompt: `כותרת: ${paper.title}\nשנת פרסום: ${paper.year ?? "לא ידוע"}\nתקציר: ${paper.abstract}`,
  });
  return object;
}

/**
 * Searches Semantic Scholar for `query`, keeps the 3 highest-cited relevant
 * papers that have an abstract, and asks Claude to turn each abstract into a
 * Hebrew summary + "Did you know?" fact for the app. Safe to call directly
 * from a client component (e.g. the future research tab).
 */
export async function generateResearchFacts(query: string): Promise<ResearchAgentResult> {
  const trimmed = query.trim();
  if (!trimmed) return { ok: false, error: "יש להזין נושא לחיפוש" };

  let papers: (SemanticScholarPaper & { abstract: string })[];
  try {
    papers = await fetchTopCitedPapers(trimmed);
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "שגיאה בחיפוש מאמרים" };
  }
  if (papers.length === 0) return { ok: false, error: "לא נמצאו מאמרים רלוונטיים עם תקציר זמין לנושא זה" };

  const settled = await Promise.allSettled(
    papers.map(async (paper): Promise<ResearchFinding> => {
      const facts = await summarizePaperInHebrew({ title: paper.title, abstract: paper.abstract, year: paper.year });
      return {
        paperTitle: paper.title,
        paperUrl: paper.url ?? `https://www.semanticscholar.org/search?q=${encodeURIComponent(paper.title)}`,
        year: paper.year,
        summaryHe: facts.summaryHe,
        didYouKnowHe: facts.didYouKnowHe,
      };
    })
  );

  const findings = settled.filter((r): r is PromiseFulfilledResult<ResearchFinding> => r.status === "fulfilled").map((r) => r.value);

  if (findings.length === 0) return { ok: false, error: "אחזור המאמרים הצליח אך יצירת הסיכומים נכשלה" };
  return { ok: true, findings };
}
