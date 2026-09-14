"use server";

import { generateObject } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import { z } from "zod";
import { XMLParser } from "fast-xml-parser";
import type { ResearchFinding } from "@/app/types";

const SEMANTIC_SCHOLAR_SEARCH_URL = "https://api.semanticscholar.org/graph/v1/paper/search";
const PUBMED_ESEARCH_URL = "https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi";
const PUBMED_EFETCH_URL = "https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi";
const NCBI_TOOL_NAME = "OptimalMotionResearchAgent"; // NCBI's usage guidelines ask requests to self-identify via `tool`

const SEMANTIC_SCHOLAR_POOL_SIZE = 15; // fetched by relevance, re-sorted by citation count when the pool is combined below
const PUBMED_POOL_SIZE = 10;
const TOP_PAPERS_COUNT = 3;
const FETCH_TIMEOUT_MS = 15_000;
const MAX_FETCH_RETRIES = 3;
const RETRY_BASE_DELAY_MS = 1_000; // Semantic Scholar's introductory tier is 1 req/sec; starting backoff at 1s means a retry never lands sooner than that, and each subsequent retry only backs off further

// One paper's shape after fetching, regardless of which index it came from —
// everything downstream (dedup, ranking, the LLM call) works off this
// instead of the two source-specific response shapes.
interface CandidatePaper {
  source: "semantic_scholar" | "pubmed";
  title: string;
  abstract: string;
  year: number | null;
  url: string;
  citationCount: number | null; // PubMed's E-utilities don't expose this — always null for "pubmed" candidates
}

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

async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchWithTimeout(url: string, init: RequestInit, timeoutMs: number): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

// Exponential backoff/retry wrapper used for every external call in this
// file. Retries on 429 (rate limited) and 5xx (upstream is busy) — anything
// else (4xx like a bad request) fails immediately since retrying won't help.
async function fetchWithRetry(url: string, init: RequestInit, label: string): Promise<Response> {
  for (let attempt = 0; ; attempt++) {
    let res: Response;
    try {
      res = await fetchWithTimeout(url, init, FETCH_TIMEOUT_MS);
    } catch (err) {
      if (attempt >= MAX_FETCH_RETRIES) throw err;
      await sleep(RETRY_BASE_DELAY_MS * 2 ** attempt);
      continue;
    }
    if (res.ok) return res;
    const isRetryable = res.status === 429 || res.status >= 500;
    if (isRetryable && attempt < MAX_FETCH_RETRIES) {
      await sleep(RETRY_BASE_DELAY_MS * 2 ** attempt);
      continue;
    }
    throw new Error(`${label} נכשל (קוד ${res.status})`);
  }
}

// Fetches a relevance-ranked candidate pool from Semantic Scholar. Citation
// count is used later, once this is merged with the PubMed pool, to rank the
// combined set — not here, since sorting a single source in isolation would
// throw away PubMed's clinical results before they ever get a chance.
async function fetchSemanticScholarCandidates(query: string): Promise<CandidatePaper[]> {
  const params = new URLSearchParams({
    query,
    fields: "title,abstract,year,url,citationCount",
    limit: String(SEMANTIC_SCHOLAR_POOL_SIZE),
  });
  const headers: Record<string, string> = {};
  if (process.env.SEMANTIC_SCHOLAR_API_KEY) headers["x-api-key"] = process.env.SEMANTIC_SCHOLAR_API_KEY;

  const res = await fetchWithRetry(`${SEMANTIC_SCHOLAR_SEARCH_URL}?${params.toString()}`, { headers }, "חיפוש Semantic Scholar");
  const json: SemanticScholarSearchResponse = await res.json();
  const candidates = json.data ?? [];

  return candidates
    .filter((p): p is SemanticScholarPaper & { abstract: string } => Boolean(p.title && p.abstract && p.abstract.length > 40))
    .map((p) => ({
      source: "semantic_scholar" as const,
      title: p.title,
      abstract: p.abstract,
      year: p.year,
      url: p.url ?? `https://www.semanticscholar.org/search?q=${encodeURIComponent(p.title)}`,
      citationCount: p.citationCount,
    }));
}

const pubMedXmlParser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: "@_", textNodeName: "#text" });

function toArray<T>(value: T | T[] | undefined | null): T[] {
  if (value == null) return [];
  return Array.isArray(value) ? value : [value];
}

// PubMed's XML nodes are either a plain string, or (once attributes like
// AbstractText's Label come into play) an object carrying the text under
// "#text" — this normalizes either shape to plain text.
function nodeText(node: unknown): string {
  if (node == null) return "";
  if (typeof node === "string") return node;
  if (typeof node === "number") return String(node);
  if (typeof node === "object" && "#text" in (node as Record<string, unknown>)) {
    return String((node as Record<string, unknown>)["#text"] ?? "");
  }
  return "";
}

// Structured abstracts split across multiple <AbstractText Label="..."> runs
// (BACKGROUND / METHODS / RESULTS / CONCLUSIONS) — this rejoins them into one
// block, prefixing each with its label when present.
function extractAbstract(abstractNode: unknown): string {
  const parts = toArray((abstractNode as Record<string, unknown> | undefined)?.["AbstractText"]);
  return parts
    .map((part) => {
      const text = nodeText(part);
      const label = typeof part === "object" && part !== null ? (part as Record<string, unknown>)["@_Label"] : undefined;
      return label ? `${String(label)}: ${text}` : text;
    })
    .filter(Boolean)
    .join(" ");
}

function extractYear(article: Record<string, unknown> | undefined): number | null {
  const pubDate = (article?.["Journal"] as Record<string, unknown> | undefined)?.["JournalIssue"] as Record<string, unknown> | undefined;
  const dateNode = pubDate?.["PubDate"] as Record<string, unknown> | undefined;
  const yearText = nodeText(dateNode?.["Year"]) || nodeText(dateNode?.["MedlineDate"]).slice(0, 4);
  const year = parseInt(yearText, 10);
  return Number.isFinite(year) ? year : null;
}

function parsePubMedArticles(xml: string): CandidatePaper[] {
  const parsed = pubMedXmlParser.parse(xml);
  const articles = toArray(parsed?.PubmedArticleSet?.PubmedArticle);

  return articles
    .map((entry): CandidatePaper | null => {
      const citation = entry?.MedlineCitation as Record<string, unknown> | undefined;
      const article = citation?.["Article"] as Record<string, unknown> | undefined;
      const pmid = nodeText(citation?.["PMID"]);
      const title = nodeText(article?.["ArticleTitle"]);
      const abstract = extractAbstract(article?.["Abstract"]);
      if (!pmid || !title || abstract.length <= 40) return null;
      return {
        source: "pubmed",
        title,
        abstract,
        year: extractYear(article),
        url: `https://pubmed.ncbi.nlm.nih.gov/${pmid}/`,
        citationCount: null,
      };
    })
    .filter((c): c is CandidatePaper => c !== null);
}

function ncbiCommonParams(): Record<string, string> {
  const params: Record<string, string> = { tool: NCBI_TOOL_NAME };
  if (process.env.NCBI_API_KEY) params.api_key = process.env.NCBI_API_KEY;
  if (process.env.NCBI_EMAIL) params.email = process.env.NCBI_EMAIL;
  return params;
}

// Two-step E-utilities flow: esearch finds relevant PMIDs, efetch pulls the
// full records (title/abstract/year) for those ids. The second call
// necessarily happens after the first resolves, which already spaces the two
// PubMed requests out in time — no separate throttling needed on top of that.
async function fetchPubMedCandidates(query: string): Promise<CandidatePaper[]> {
  const searchParams = new URLSearchParams({
    db: "pubmed",
    term: query,
    retmax: String(PUBMED_POOL_SIZE),
    sort: "relevance",
    retmode: "json",
    ...ncbiCommonParams(),
  });
  const searchRes = await fetchWithRetry(`${PUBMED_ESEARCH_URL}?${searchParams.toString()}`, {}, "חיפוש PubMed");
  const searchJson = await searchRes.json();
  const pmids: string[] = searchJson?.esearchresult?.idlist ?? [];
  if (pmids.length === 0) return [];

  const fetchParams = new URLSearchParams({
    db: "pubmed",
    id: pmids.join(","),
    rettype: "abstract",
    retmode: "xml",
    ...ncbiCommonParams(),
  });
  const fetchRes = await fetchWithRetry(`${PUBMED_EFETCH_URL}?${fetchParams.toString()}`, {}, "אחזור מאמרי PubMed");
  const xml = await fetchRes.text();
  return parsePubMedArticles(xml);
}

function normalizeTitle(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\u0590-\u05FF]+/g, " ")
    .trim();
}

// The same paper is often indexed by both Semantic Scholar and PubMed —
// dedupes by normalized title, keeping whichever copy carries a citation
// count (Semantic Scholar's) when both are present.
function dedupeCandidates(candidates: CandidatePaper[]): CandidatePaper[] {
  const byTitle = new Map<string, CandidatePaper>();
  for (const candidate of candidates) {
    const key = normalizeTitle(candidate.title);
    if (!key) continue;
    const existing = byTitle.get(key);
    if (!existing || (existing.citationCount == null && candidate.citationCount != null)) {
      byTitle.set(key, candidate);
    }
  }
  return Array.from(byTitle.values());
}

// Ranks by citation count (Semantic Scholar's signal for "highly cited");
// PubMed candidates carry no citation count so they sort to the bottom of
// that pass. Since the whole point of querying PubMed is clinical coverage
// Semantic Scholar might miss, this then guarantees at least one PubMed
// result survives into the final selection when PubMed returned any —
// swapping it in for the weakest citation-ranked slot — rather than letting
// a citation-count sort quietly exclude it every time.
function selectTopPapers(pool: CandidatePaper[], count: number): CandidatePaper[] {
  const byCitations = [...pool].sort((a, b) => (b.citationCount ?? -1) - (a.citationCount ?? -1));
  const top = byCitations.slice(0, count);
  if (top.some((p) => p.source === "pubmed")) return top;

  const bestPubMed = byCitations.find((p) => p.source === "pubmed");
  if (bestPubMed && top.length > 0) top[top.length - 1] = bestPubMed;
  return top;
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
 * Hybrid literature search: queries Semantic Scholar (citation-ranked) and
 * PubMed/NCBI E-utilities (clinical coverage) concurrently, pools and
 * deduplicates the results, picks the best 3 (citation-ranked, with at least
 * one PubMed result guaranteed when available), and asks Claude to turn each
 * abstract into a Hebrew summary + "Did you know?" fact for the app. Safe to
 * call directly from a client component (e.g. the admin research tab).
 */
export async function generateResearchFacts(query: string): Promise<ResearchAgentResult> {
  const trimmed = query.trim();
  if (!trimmed) return { ok: false, error: "יש להזין נושא לחיפוש" };

  const [s2Result, pubmedResult] = await Promise.allSettled([fetchSemanticScholarCandidates(trimmed), fetchPubMedCandidates(trimmed)]);

  if (s2Result.status === "rejected") console.error("Semantic Scholar fetch failed:", s2Result.reason);
  if (pubmedResult.status === "rejected") console.error("PubMed fetch failed:", pubmedResult.reason);

  // Only fail outright if BOTH sources failed — one down shouldn't sink a
  // hybrid search when the other came back with usable results.
  if (s2Result.status === "rejected" && pubmedResult.status === "rejected") {
    const message = s2Result.reason instanceof Error ? s2Result.reason.message : "שגיאה בחיפוש מאמרים";
    return { ok: false, error: `החיפוש נכשל בשני מאגרי המידע: ${message}` };
  }

  const combinedPool = dedupeCandidates([
    ...(s2Result.status === "fulfilled" ? s2Result.value : []),
    ...(pubmedResult.status === "fulfilled" ? pubmedResult.value : []),
  ]);
  if (combinedPool.length === 0) return { ok: false, error: "לא נמצאו מאמרים רלוונטיים עם תקציר זמין לנושא זה" };

  const papers = selectTopPapers(combinedPool, TOP_PAPERS_COUNT);

  const settled = await Promise.allSettled(
    papers.map(async (paper): Promise<ResearchFinding> => {
      const facts = await summarizePaperInHebrew({ title: paper.title, abstract: paper.abstract, year: paper.year });
      return {
        paperTitle: paper.title,
        paperUrl: paper.url,
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
