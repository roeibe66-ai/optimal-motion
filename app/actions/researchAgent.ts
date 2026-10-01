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

const SEMANTIC_SCHOLAR_POOL_SIZE = 15; // fetched by relevance, re-ranked (evidence tier, then citation count) when the pool is combined below
const PUBMED_POOL_SIZE = 10;
const TOP_PAPERS_COUNT = 3;
const FETCH_TIMEOUT_MS = 15_000;
const MAX_FETCH_RETRIES = 3;
const RETRY_BASE_DELAY_MS = 1_000; // Semantic Scholar's introductory tier is 1 req/sec; starting backoff at 1s means a retry never lands sooner than that, and each subsequent retry only backs off further

// Academic quality bar (admin request, 2026-09): only surface papers from the
// last RECENCY_YEARS_LIMIT years, and rank meta-analyses/systematic reviews/
// RCTs above observational studies and case reports. Applied as a real
// filter/sort on the fetched candidate pool below — NOT as free-text
// instructions handed to the LLM, since by the time the model sees a paper
// it has already been picked; it has no papers to choose between and can't
// "prioritize" evidence tiers it's never shown. See classifyEvidence/
// selectTopPapers for where this is actually enforced.
const RECENCY_YEARS_LIMIT = 20;

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
  venue: string | null; // journal/venue name, used for the top-tier-journal ranking boost below
  publicationTypes: string[]; // Semantic Scholar's own classification, or PubMed's MeSH-indexed PublicationTypeList — feeds classifyEvidence
}

interface SemanticScholarPaper {
  title: string;
  abstract: string | null;
  year: number | null;
  url: string | null;
  citationCount: number | null;
  venue: string | null;
  publicationTypes: string[] | null;
}

interface SemanticScholarSearchResponse {
  data?: SemanticScholarPaper[];
}

// How the free-text request was understood — returned to the admin UI so a
// surprising result set can be traced back to the query that produced it.
export interface ResearchInterpretation {
  topicHe: string;
  focusEn: string;
  pubmedQuery: string;
  semanticScholarQuery: string;
}

export type ResearchAgentResult =
  | { ok: true; findings: ResearchFinding[]; interpretation: ResearchInterpretation }
  | { ok: false; error: string };

const SUMMARY_MODEL = "claude-sonnet-5";
// Query planning and relevance screening are short structured calls on the
// critical path before summarization even starts — the fast model keeps the
// whole search inside a reasonable wait.
const ROUTING_MODEL = "claude-haiku-4-5-20251001";
const MIN_POOL_BEFORE_BROADENING = 4;
const MIN_RELEVANCE_SCORE = 2;
const SCREENING_ABSTRACT_CHARS = 600;

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

// Fetches a relevance-ranked candidate pool from Semantic Scholar, already
// scoped server-side to the last RECENCY_YEARS_LIMIT years via the `year`
// range param (cheaper than fetching old papers just to discard them
// locally). Citation count / evidence tier / journal are used later, once
// this is merged with the PubMed pool, to rank the combined set — not here,
// since sorting a single source in isolation would throw away PubMed's
// clinical results before they ever get a chance.
async function fetchSemanticScholarCandidates(query: string): Promise<CandidatePaper[]> {
  const currentYear = new Date().getFullYear();
  const params = new URLSearchParams({
    query,
    fields: "title,abstract,year,url,citationCount,venue,publicationTypes",
    limit: String(SEMANTIC_SCHOLAR_POOL_SIZE),
    year: `${currentYear - RECENCY_YEARS_LIMIT}-${currentYear}`,
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
      venue: p.venue,
      publicationTypes: p.publicationTypes ?? [],
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

// PubMed's PublicationTypeList is manually indexed by NLM librarians (MeSH
// terms like "Systematic Review", "Randomized Controlled Trial", "Meta-
// Analysis", "Case Reports") — a more reliable evidence-type signal than
// Semantic Scholar's own (sparser, auto-classified) publicationTypes field.
function extractPublicationTypes(article: Record<string, unknown> | undefined): string[] {
  const list = (article?.["PublicationTypeList"] as Record<string, unknown> | undefined)?.["PublicationType"];
  return toArray(list).map((t) => nodeText(t));
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
      const journal = article?.["Journal"] as Record<string, unknown> | undefined;
      return {
        source: "pubmed",
        title,
        abstract,
        year: extractYear(article),
        url: `https://pubmed.ncbi.nlm.nih.gov/${pmid}/`,
        citationCount: null,
        venue: nodeText(journal?.["Title"]) || null,
        publicationTypes: extractPublicationTypes(article),
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

// Two-step E-utilities flow: esearch finds relevant PMIDs (scoped server-side
// to the last RECENCY_YEARS_LIMIT years via mindate/maxdate, same recency
// bar as the Semantic Scholar side), efetch pulls the full records (title/
// abstract/year/journal/publication types) for those ids. The second call
// necessarily happens after the first resolves, which already spaces the two
// PubMed requests out in time — no separate throttling needed on top of that.
async function fetchPubMedCandidates(query: string): Promise<CandidatePaper[]> {
  const currentYear = new Date().getFullYear();
  const searchParams = new URLSearchParams({
    db: "pubmed",
    term: query,
    retmax: String(PUBMED_POOL_SIZE),
    sort: "relevance",
    retmode: "json",
    datetype: "pdat",
    mindate: `${currentYear - RECENCY_YEARS_LIMIT}`,
    maxdate: `${currentYear}`,
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

// --- Evidence hierarchy (admin request, 2026-09) -----------------------
//
// Classifies a candidate into a study-design tier using two real signals:
// the source's own publication-type classification (Semantic Scholar's
// `publicationTypes`, or PubMed's MeSH-indexed PublicationTypeList — the
// latter is manually assigned by NLM librarians and considerably more
// reliable) and, as a fallback, keyword matches in the title/abstract text
// itself (abstracts routinely self-describe as "a systematic review of...",
// "a randomized controlled trial", etc.). There is deliberately no signal
// here for journal impact factor or quartile ranking — neither API exposes
// bibliometric data like that, and guessing it from a venue name would risk
// the LLM fabricating a "Q1" or "high impact factor" claim with nothing
// real behind it. TOP_TIER_JOURNALS below is the closest honest substitute:
// a small curated allowlist of journals genuinely well known in sports
// medicine/orthopedics/exercise physiology, used only as a same-tier
// tiebreaker, never as a hard filter (a hard filter risks zero results for
// a niche topic, which would break the feature outright).
type EvidenceTier = "meta_analysis" | "systematic_review" | "rct" | "cohort" | "other" | "case_report";

const EVIDENCE_TIER_RANK: Record<EvidenceTier, number> = {
  meta_analysis: 5,
  systematic_review: 4,
  rct: 3,
  cohort: 2,
  other: 1,
  case_report: 0, // "single-case reports... unless absolutely necessary" — bottom of the ranking, not excluded outright
};

const EVIDENCE_LABEL_HE: Record<EvidenceTier, string> = {
  meta_analysis: "מטה-אנליזה",
  systematic_review: "סקירה שיטתית",
  rct: "ניסוי מבוקר אקראי (RCT)",
  cohort: "מחקר עוקבה/תצפיתי",
  other: "מאמר מדעי",
  case_report: "דיווח מקרה",
};

const TOP_TIER_JOURNALS = [
  "british journal of sports medicine",
  "sports medicine",
  "american journal of sports medicine",
  "journal of orthopaedic & sports physical therapy",
  "journal of orthopaedic and sports physical therapy",
  "medicine & science in sports & exercise",
  "medicine and science in sports and exercise",
  "journal of applied physiology",
  "scandinavian journal of medicine & science in sports",
  "scandinavian journal of medicine and science in sports",
  "journal of strength and conditioning research",
  "physical therapy",
  "clinical journal of sport medicine",
  "journal of athletic training",
  "knee surgery, sports traumatology, arthroscopy",
  "arthroscopy",
];

function isTopTierJournal(venue: string | null): boolean {
  if (!venue) return false;
  const v = venue.toLowerCase();
  return TOP_TIER_JOURNALS.some((journal) => v.includes(journal));
}

function classifyEvidence(candidate: CandidatePaper): EvidenceTier {
  const types = candidate.publicationTypes.map((t) => t.toLowerCase());
  const text = `${candidate.title} ${candidate.abstract}`.toLowerCase();
  const hasType = (needle: string) => types.some((t) => t.includes(needle));
  const hasText = (needle: string) => text.includes(needle);

  if (hasType("meta-analysis") || hasType("meta analysis") || hasText("meta-analysis") || hasText("meta analysis")) return "meta_analysis";
  if (hasType("systematic review") || hasText("systematic review")) return "systematic_review";
  if (
    hasType("randomized controlled trial") ||
    hasType("clinical trial") ||
    hasText("randomized controlled trial") ||
    hasText("randomised controlled trial") ||
    hasText(" rct ")
  )
    return "rct";
  if (hasType("case reports") || hasText("case report") || hasText("case series")) return "case_report";
  if (hasType("observational study") || hasType("comparative study") || hasText("cohort") || hasText("case-control") || hasText("case control"))
    return "cohort";
  return "other";
}
// Letter grade shown to the admin next to each result — a coarse, readable
// summary of the same study-design tier the ranking used.
const EVIDENCE_GRADE: Record<EvidenceTier, "A" | "B" | "C"> = {
  meta_analysis: "A",
  systematic_review: "A",
  rct: "B",
  cohort: "C",
  other: "C",
  case_report: "C",
};

// Sample size as the abstract itself states it — "23 studies", "n = 120",
// "412 participants". Regex over the text, never inferred, so a result with
// no stated sample simply shows none. For reviews both the study count and
// the pooled participant count are reported when present.
const PARTICIPANT_NOUNS =
  "participants|patients|subjects|athletes|adults|individuals|people|women|men|volunteers|runners|players|children|adolescents|older adults|elderly";
function parseCount(raw: string): number {
  return Number(raw.replace(/,/g, ""));
}
function extractSampleSizeHe(abstract: string, isReview: boolean): string | null {
  const parts: string[] = [];
  // Only reviews report "N studies" as their sample; elsewhere it's usually
  // a reference to prior work.
  const studies = isReview && abstract.match(/\b(\d{1,4})\s+(?:randomi[sz]ed\s+)?(?:controlled\s+)?(?:studies|trials|RCTs)\b/i);
  if (studies) parts.push(`${parseCount(studies[1]).toLocaleString("he-IL")} מחקרים`);
  const participants =
    abstract.match(new RegExp(`\\b(\\d{1,3}(?:,\\d{3})+|\\d{2,6})\\s+(?:${PARTICIPANT_NOUNS})\\b`, "i")) ??
    abstract.match(/\b[nN]\s*=\s*(\d{1,3}(?:,\d{3})+|\d{1,6})\b/);
  if (participants) parts.push(`${parseCount(participants[1]).toLocaleString("he-IL")} משתתפים`);
  return parts.length > 0 ? parts.join(" · ") : null;
}
// -------------------------------------------------------------------------

// Ranks by relevance score (when screening ran), then evidence tier (meta-analyses and systematic reviews above
// RCTs above cohort/observational studies above everything else, case
// reports last), then by whether it's in a recognized top-tier journal,
// then by citation count — implementing "hierarchy of evidence" as an
// actual multi-key sort rather than a single blended score, so a highly-
// cited case report can never outrank a systematic review the way a purely
// additive score could. PubMed candidates carry no citation count so they
// sort to the bottom of that final tiebreaker within their tier. Since the
// whole point of querying PubMed is clinical coverage Semantic Scholar
// might miss, this then guarantees at least one PubMed result survives into
// the final selection when PubMed returned any — swapping it in for the
// weakest-ranked slot — rather than letting the sort quietly exclude it
// every time.
function selectTopPapers(pool: CandidatePaper[], count: number, relevanceOf: (p: CandidatePaper) => number = () => 0): CandidatePaper[] {
  const ranked = [...pool].sort((a, b) => {
    // Directly-on-question papers first: for a specific question, a paper
    // that actually answers it beats a stronger study design on an adjacent
    // topic. Only screened-in papers reach here, so this is 3-vs-2.
    const relevanceDiff = relevanceOf(b) - relevanceOf(a);
    if (relevanceDiff !== 0) return relevanceDiff;
    const tierDiff = EVIDENCE_TIER_RANK[classifyEvidence(b)] - EVIDENCE_TIER_RANK[classifyEvidence(a)];
    if (tierDiff !== 0) return tierDiff;
    const journalDiff = Number(isTopTierJournal(b.venue)) - Number(isTopTierJournal(a.venue));
    if (journalDiff !== 0) return journalDiff;
    return (b.citationCount ?? -1) - (a.citationCount ?? -1);
  });
  const top = ranked.slice(0, count);
  if (top.some((p) => p.source === "pubmed")) return top;

  const bestPubMed = ranked.find((p) => p.source === "pubmed");
  if (bestPubMed && top.length > 0) top[top.length - 1] = bestPubMed;
  return top;
}

// --- Free-text routing ---------------------------------------------------
//
// The admin types whatever they're curious about ("למה כואב אחרי אימון
// ביום השני", "does foam rolling actually do anything", "kinesiophobia") —
// in Hebrew or English, as a keyword or a whole question. Neither index
// understands that well: PubMed's esearch wants English terms (ideally
// MeSH-mapped boolean syntax) and Semantic Scholar's relevance search works
// best on a handful of keywords. The planner translates the request into
// both, plus a broader fallback used when the precise query comes back thin.
const queryPlanSchema = z.object({
  topicHe: z.string().describe("תיאור קצר בעברית (עד 10 מילים) של מה שהבנת שהמשתמש מחפש"),
  focusEn: z.string().describe("The underlying research question in one English sentence"),
  pubmedQuery: z
    .string()
    .describe('PubMed esearch term in English using boolean syntax, e.g. (kinesiophobia OR "fear of movement") AND (rehabilitation OR exercise). No field tags other than [MeSH Terms]/[tiab].'),
  semanticScholarQuery: z.string().describe("3-8 English keywords for Semantic Scholar relevance search, no boolean operators or quotes"),
  broadQuery: z.string().describe("2-4 English keywords for a broader fallback search on the same topic"),
});

type QueryPlan = z.infer<typeof queryPlanSchema>;

const QUERY_PLANNER_SYSTEM_PROMPT = `You route free-text research requests for a physiotherapy / strength-training / rehabilitation app to academic search engines (PubMed and Semantic Scholar).

The request may be in Hebrew or English, a single term or a full question, casual or clinical. Infer the underlying research question in the context of exercise, sports medicine, physiotherapy, pain science and rehabilitation, and translate it into precise English search queries using standard scientific terminology (e.g. "שרירים תפוסים אחרי אימון" -> delayed onset muscle soreness; "כאבי גב" -> low back pain).

Keep the PubMed query focused enough to return on-topic papers but not so narrow that it returns nothing — prefer OR-grouped synonyms over long AND chains (at most 2-3 AND-ed concepts). Always wrap every OR group in parentheses and quote multi-word phrases — PubMed evaluates AND/OR strictly left to right, so an unparenthesized query silently means something else.`;

function fallbackPlan(input: string): QueryPlan {
  return { topicHe: input, focusEn: input, pubmedQuery: input, semanticScholarQuery: input, broadQuery: input };
}

async function planQuery(input: string): Promise<QueryPlan> {
  try {
    const { object } = await generateObject({
      model: anthropic(ROUTING_MODEL),
      schema: queryPlanSchema,
      system: QUERY_PLANNER_SYSTEM_PROMPT,
      prompt: `Request: ${input}`,
    });
    return object;
  } catch (err) {
    // Degrade to searching the raw text rather than failing the whole search
    // — still useful for plain English keyword input.
    console.error("Research query planning failed:", err);
    return fallbackPlan(input);
  }
}

const relevanceSchema = z.object({
  scores: z
    .array(z.object({ index: z.number().int(), score: z.number().int().min(0).max(3) }))
    .describe(
      "One entry per paper: 3 = its main finding directly answers the question, 2 = studies the same specific phenomenon and adds useful insight on it, 1 = same general topic but a different question (e.g. a supplement trial when the question is about mechanism), 0 = off-topic. Be strict: most papers in a keyword search are 1."
    ),
});

// The evidence-tier sort in selectTopPapers knows nothing about the
// question — left alone it happily picks an unrelated meta-analysis over an
// on-topic RCT. This screens the pool against the planner's research
// question first, so the tier ranking only chooses among relevant papers.
// Returns null when screening fails, meaning "don't filter".
async function scoreRelevance(focusEn: string, pool: CandidatePaper[]): Promise<Map<number, number> | null> {
  const listing = pool.map((p, i) => `[${i}] ${p.title}\n${p.abstract.slice(0, SCREENING_ABSTRACT_CHARS)}`).join("\n\n");
  try {
    const { object } = await generateObject({
      model: anthropic(ROUTING_MODEL),
      schema: relevanceSchema,
      system: "You screen academic papers for relevance to a research question. Score every paper listed, judging only from the title and abstract excerpt.",
      prompt: `Research question: ${focusEn}\n\nPapers:\n\n${listing}`,
    });
    return new Map(object.scores.map((s) => [s.index, s.score]));
  } catch (err) {
    console.error("Research relevance screening failed:", err);
    return null;
  }
}

async function fetchPool(pubmedQuery: string, semanticScholarQuery: string) {
  const [s2Result, pubmedResult] = await Promise.allSettled([fetchSemanticScholarCandidates(semanticScholarQuery), fetchPubMedCandidates(pubmedQuery)]);
  if (s2Result.status === "rejected") console.error("Semantic Scholar fetch failed:", s2Result.reason);
  if (pubmedResult.status === "rejected") console.error("PubMed fetch failed:", pubmedResult.reason);
  return {
    candidates: [...(s2Result.status === "fulfilled" ? s2Result.value : []), ...(pubmedResult.status === "fulfilled" ? pubmedResult.value : [])],
    bothFailed: s2Result.status === "rejected" && pubmedResult.status === "rejected",
    firstError: s2Result.status === "rejected" ? s2Result.reason : pubmedResult.status === "rejected" ? pubmedResult.reason : null,
  };
}

function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}
// -------------------------------------------------------------------------

const paperFactSchema = z.object({
  summaryHe: z.string().describe("תקציר קצר ופשוט של מסקנת המחקר, 2-3 משפטים, בעברית ברורה להדיוט"),
  didYouKnowHe: z
    .string()
    .describe("כותרת 'הידעת' קצרה: משפט אחד בלבד, עד 12 מילים, בעברית, הממצא המרכזי בלבד — בלי הקדמות, בלי 'מחקר מצא ש', בלי פרטים משניים"),
});

const RESEARCH_AGENT_SYSTEM_PROMPT = `את/ה עוזר/ת מחקר עבור אפליקציית כושר ושיקום פיזיותרפי בשם Eccentric (Optimal Motion).

הקשר חשוב: המאמר שאתה מקבל כבר עבר סינון ודירוג מראש על ידי המערכת לפי היררכיית ראיות מדעית (מטה-אנליזות וסקירות שיטתיות מדורגות ראשונות, אחריהן ניסויים מבוקרים אקראיים, אחריהן מחקרי עוקבה/תצפית, ודיווחי מקרה בודדים רק כמוצא אחרון), פורסם ב-20 השנים האחרונות, ונבחר גם לפי מספר הציטוטים שלו. תפקידך אינו לבחור או לדרג מאמרים - זה כבר נעשה. תפקידך הוא לסכם באמינות את מה שסופק לך.

בהינתן כותרת ותקציר של מאמר אקדמי (באנגלית), עליך:
1. לכתוב סיכום קצר ופשוט של מסקנת המחקר, בעברית ברורה ונגישה, ללא ז'רגון מחקרי.
2. לכתוב כותרת "הידעת" קצרה וחדה: משפט אחד בלבד, עד 12 מילים, בעברית, המבוססת אך ורק על ממצאי המאמר, ומנוסחת עבור מתאמנים/מטופלים באפליקציה - לא עבור אנשי מקצוע. זו כותרת שמוצגת באותיות גדולות — רק הממצא המרכזי, בלי הקדמות ("מחקר חדש מצא ש..."), בלי אחוזים או מספרים משניים ובלי הסברים. את ההסבר המלא שמור לסיכום.
   דוגמה טובה: "אימון כוח פעמיים בשבוע מפחית כאבי ברך."
   דוגמה ארוכה מדי: "מחקר שבדק מאות משתתפים מצא שאימוני כוח המבוצעים פעמיים בשבוע לאורך שמונה שבועות עשויים להפחית משמעותית כאבי ברך."

כללים:
- התבסס אך ורק על התוכן שסופק. אל תמציא נתונים, מספרים או פרטים שלא מופיעים בתקציר.
- אל תיתן ייעוץ רפואי אישי או המלצת טיפול - רק עובדה כללית מהמחקר.
- אל תטען בשום צורה שהמאמר פורסם בכתב עת "Q1" או בעל "Impact Factor" גבוה - מידע כזה לא סופק לך ואסור להמציא אותו.
- כתוב בעברית תקנית וטבעית בלבד, ללא מילים באנגלית.`;

async function summarizePaperInHebrew(paper: { title: string; abstract: string; year: number | null }, focusEn: string) {
  const { object } = await generateObject({
    model: anthropic(SUMMARY_MODEL),
    schema: paperFactSchema,
    system: RESEARCH_AGENT_SYSTEM_PROMPT,
    prompt: `השאלה שהמשתמש התעניין בה (באנגלית): ${focusEn}\nאם המאמר עונה עליה, הדגש בעובדת ה"הידעת" את הזווית הזו. אם לא — כתוב פשוט את הממצא המעניין ביותר שלו, בלי להזכיר את השאלה ובלי לציין שהמאמר לא עונה עליה.\n\nכותרת: ${paper.title}\nשנת פרסום: ${paper.year ?? "לא ידוע"}\nתקציר: ${paper.abstract}`,
  });
  return object;
}

/**
 * Free-text hybrid literature search: a fast model first routes the admin's
 * request (Hebrew or English, keyword or full question) into English
 * PubMed/Semantic Scholar queries, both indexes are searched concurrently
 * (last RECENCY_YEARS_LIMIT years, broadening automatically when the precise
 * query comes back thin), the pooled/deduplicated results are screened for
 * relevance to the question, ranked by evidence hierarchy (meta-analyses/
 * systematic reviews > RCTs > cohort studies > case reports) then citation
 * count, and the best 3 (at least one PubMed result when available) are
 * turned into a Hebrew summary + "Did you know?" fact each. Safe to call
 * directly from a client component (e.g. the admin research tab).
 */
export async function generateResearchFacts(query: string): Promise<ResearchAgentResult> {
  const trimmed = query.trim();
  if (!trimmed) return { ok: false, error: "יש להזין נושא לחיפוש" };
  // Without this every model call fails and the search surfaces only a
  // generic "summaries failed" — which is exactly how a missing key in the
  // Vercel project went unnoticed.
  if (!process.env.ANTHROPIC_API_KEY) return { ok: false, error: "ANTHROPIC_API_KEY לא מוגדר בסביבת השרת — יש להוסיף אותו להגדרות הפרויקט" };

  const plan = await planQuery(trimmed);

  let fetched = await fetchPool(plan.pubmedQuery, plan.semanticScholarQuery);
  let combinedPool = dedupeCandidates(fetched.candidates);
  if (combinedPool.length < MIN_POOL_BEFORE_BROADENING && plan.broadQuery && plan.broadQuery !== plan.pubmedQuery) {
    const broad = await fetchPool(plan.broadQuery, plan.broadQuery);
    combinedPool = dedupeCandidates([...combinedPool, ...broad.candidates]);
    if (!broad.bothFailed) fetched = { ...fetched, bothFailed: false };
  }

  // Only fail outright if BOTH sources failed — one down shouldn't sink a
  // hybrid search when the other came back with usable results.
  if (combinedPool.length === 0 && fetched.bothFailed) {
    return { ok: false, error: `החיפוש נכשל בשני מאגרי המידע: ${errorMessage(fetched.firstError)}` };
  }
  if (combinedPool.length === 0) return { ok: false, error: `לא נמצאו מאמרים עם תקציר זמין בנושא "${plan.topicHe}" ב-20 השנים האחרונות. נסה ניסוח רחב יותר.` };

  const relevance = await scoreRelevance(plan.focusEn, combinedPool);
  let screenedPool = combinedPool;
  if (relevance) {
    const relevant = combinedPool.filter((_, i) => (relevance.get(i) ?? 0) >= MIN_RELEVANCE_SCORE);
    if (relevant.length === 0) {
      return { ok: false, error: `נמצאו מאמרים, אך אף אחד מהם לא עוסק ישירות ב"${plan.topicHe}". נסה ניסוח אחר או רחב יותר.` };
    }
    screenedPool = relevant;
  }

  const relevanceByPaper = new Map(combinedPool.map((p, i) => [p, relevance?.get(i) ?? 0]));
  const papers = selectTopPapers(screenedPool, TOP_PAPERS_COUNT, (p) => relevanceByPaper.get(p) ?? 0);

  const settled = await Promise.allSettled(
    papers.map(async (paper): Promise<ResearchFinding> => {
      const facts = await summarizePaperInHebrew({ title: paper.title, abstract: paper.abstract, year: paper.year }, plan.focusEn);
      const tier = classifyEvidence(paper);
      const evidenceLabelHe = EVIDENCE_LABEL_HE[tier];
      return {
        paperTitle: paper.title,
        paperUrl: paper.url,
        year: paper.year,
        summaryHe: facts.summaryHe,
        didYouKnowHe: facts.didYouKnowHe,
        // Computed deterministically from the same publicationTypes/keyword
        // signals selectTopPapers ranked on — not LLM-generated, so it can't
        // drift from what actually determined this paper's rank.
        evidenceLabelHe,
        citationLabelHe: `מקור: ${evidenceLabelHe}${paper.year ? `, ${paper.year}` : ""}`,
        evidenceGrade: EVIDENCE_GRADE[tier],
        citationCount: paper.citationCount,
        venue: paper.venue,
        isTopTierJournal: isTopTierJournal(paper.venue),
        sampleSizeHe: extractSampleSizeHe(paper.abstract, tier === "meta_analysis" || tier === "systematic_review"),
      };
    })
  );

  const rejections = settled.filter((r): r is PromiseRejectedResult => r.status === "rejected");
  rejections.forEach((r) => console.error("Research summary failed:", r.reason));
  const findings = settled.filter((r): r is PromiseFulfilledResult<ResearchFinding> => r.status === "fulfilled").map((r) => r.value);

  if (findings.length === 0) {
    return { ok: false, error: `אחזור המאמרים הצליח אך יצירת הסיכומים נכשלה: ${errorMessage(rejections[0]?.reason)}` };
  }
  return {
    ok: true,
    findings,
    interpretation: { topicHe: plan.topicHe, focusEn: plan.focusEn, pubmedQuery: plan.pubmedQuery, semanticScholarQuery: plan.semanticScholarQuery },
  };
}
