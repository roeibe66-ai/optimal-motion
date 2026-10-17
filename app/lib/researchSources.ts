import "server-only";

// Two things the research agent (app/actions/researchAgent.ts) needs beyond
// search: which journals count as reputable, and the full text of an open-
// access paper.

// Roei, 2026-10-17: "הידעת" only from reputable journals in sports, rehab,
// medicine and above all physiotherapy. `abbr` is the NLM title abbreviation
// (PubMed's [ta] field), `name` the full title; a paper's venue must match one
// of them exactly (after normalizing), so "Physical Therapy" doesn't also let
// in every "... and Physical Therapy" journal.
export const REPUTABLE_JOURNALS: { abbr: string; name: string }[] = [
  // physiotherapy
  { abbr: "J Orthop Sports Phys Ther", name: "Journal of Orthopaedic and Sports Physical Therapy" },
  { abbr: "Phys Ther", name: "Physical Therapy" },
  { abbr: "J Physiother", name: "Journal of Physiotherapy" },
  { abbr: "Physiotherapy", name: "Physiotherapy" },
  { abbr: "Phys Ther Sport", name: "Physical Therapy in Sport" },
  { abbr: "Musculoskelet Sci Pract", name: "Musculoskeletal Science and Practice" },
  { abbr: "Man Ther", name: "Manual Therapy" },
  { abbr: "J Man Manip Ther", name: "Journal of Manual and Manipulative Therapy" },
  { abbr: "Int J Sports Phys Ther", name: "International Journal of Sports Physical Therapy" },
  // sports medicine and exercise science
  { abbr: "Br J Sports Med", name: "British Journal of Sports Medicine" },
  { abbr: "Am J Sports Med", name: "American Journal of Sports Medicine" },
  { abbr: "Sports Med", name: "Sports Medicine" },
  { abbr: "Med Sci Sports Exerc", name: "Medicine and Science in Sports and Exercise" },
  { abbr: "Scand J Med Sci Sports", name: "Scandinavian Journal of Medicine and Science in Sports" },
  { abbr: "J Sci Med Sport", name: "Journal of Science and Medicine in Sport" },
  { abbr: "J Strength Cond Res", name: "Journal of Strength and Conditioning Research" },
  { abbr: "Clin J Sport Med", name: "Clinical Journal of Sport Medicine" },
  { abbr: "J Athl Train", name: "Journal of Athletic Training" },
  { abbr: "Sports Health", name: "Sports Health" },
  { abbr: "Int J Sports Med", name: "International Journal of Sports Medicine" },
  { abbr: "Orthop J Sports Med", name: "Orthopaedic Journal of Sports Medicine" },
  { abbr: "Exerc Sport Sci Rev", name: "Exercise and Sport Sciences Reviews" },
  { abbr: "J Appl Physiol", name: "Journal of Applied Physiology" },
  { abbr: "Eur J Appl Physiol", name: "European Journal of Applied Physiology" },
  { abbr: "J Physiol", name: "Journal of Physiology" },
  // rehabilitation
  { abbr: "Arch Phys Med Rehabil", name: "Archives of Physical Medicine and Rehabilitation" },
  { abbr: "Clin Rehabil", name: "Clinical Rehabilitation" },
  { abbr: "Disabil Rehabil", name: "Disability and Rehabilitation" },
  { abbr: "Am J Phys Med Rehabil", name: "American Journal of Physical Medicine and Rehabilitation" },
  { abbr: "PM R", name: "PM and R" },
  { abbr: "Eur J Phys Rehabil Med", name: "European Journal of Physical and Rehabilitation Medicine" },
  { abbr: "J Rehabil Med", name: "Journal of Rehabilitation Medicine" },
  // orthopaedics, spine, pain
  { abbr: "Knee Surg Sports Traumatol Arthrosc", name: "Knee Surgery, Sports Traumatology, Arthroscopy" },
  { abbr: "Arthroscopy", name: "Arthroscopy" },
  { abbr: "J Bone Joint Surg Am", name: "Journal of Bone and Joint Surgery" },
  { abbr: "Bone Joint J", name: "Bone and Joint Journal" },
  { abbr: "Osteoarthritis Cartilage", name: "Osteoarthritis and Cartilage" },
  { abbr: "Spine", name: "Spine" },
  { abbr: "Spine J", name: "Spine Journal" },
  { abbr: "Eur Spine J", name: "European Spine Journal" },
  { abbr: "Pain", name: "Pain" },
  { abbr: "J Pain", name: "Journal of Pain" },
  { abbr: "Eur J Pain", name: "European Journal of Pain" },
  { abbr: "Clin J Pain", name: "Clinical Journal of Pain" },
  { abbr: "Gait Posture", name: "Gait and Posture" },
  { abbr: "Clin Biomech", name: "Clinical Biomechanics" },
  { abbr: "Ann Rheum Dis", name: "Annals of the Rheumatic Diseases" },
  // general medicine, reviews, ageing, sleep
  { abbr: "Cochrane Database Syst Rev", name: "Cochrane Database of Systematic Reviews" },
  { abbr: "Lancet", name: "Lancet" },
  { abbr: "BMJ", name: "BMJ" },
  { abbr: "JAMA", name: "JAMA" },
  { abbr: "JAMA Intern Med", name: "JAMA Internal Medicine" },
  { abbr: "N Engl J Med", name: "New England Journal of Medicine" },
  { abbr: "Ann Intern Med", name: "Annals of Internal Medicine" },
  { abbr: "Age Ageing", name: "Age and Ageing" },
  { abbr: "J Gerontol A Biol Sci Med Sci", name: "Journals of Gerontology Series A" },
  { abbr: "Sleep", name: "Sleep" },
  { abbr: "Sleep Med Rev", name: "Sleep Medicine Reviews" },
];

// "Sports medicine (Auckland, N.Z.)", "The American journal of sports
// medicine", "Medicine & Science in Sports & Exercise" -> comparable form.
const normalize = (v: string) =>
  v
    .toLowerCase()
    .replace(/\([^)]*\)/g, " ")
    .replace(/&/g, " and ")
    .replace(/[.,:;'"’-]/g, " ")
    .replace(/^\s*the\s+/, "")
    .replace(/\s+/g, " ")
    .trim();

const ALLOWED = new Set(REPUTABLE_JOURNALS.flatMap((j) => [normalize(j.abbr), normalize(j.name)]));

export function isReputableJournal(venue: string | null | undefined): boolean {
  if (!venue) return false;
  return ALLOWED.has(normalize(venue));
}

// Appended to every PubMed query so the index itself only returns these.
export const PUBMED_JOURNAL_CLAUSE = `(${REPUTABLE_JOURNALS.map((j) => `"${j.abbr}"[ta]`).join(" OR ")})`;

// ---- Full text (Europe PMC, open-access papers) ----

const EUROPE_PMC = "https://www.ebi.ac.uk/europepmc/webservices/rest";
const FULL_TEXT_MAX_CHARS = 20_000;
const FETCH_TIMEOUT_MS = 15_000;

async function getWithTimeout(url: string) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    return await fetch(url, { signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

// The paper's body as plain text with "## " section headings, from Europe
// PMC's open-access full text — null when the paper isn't open access (or
// anything fails: the abstract is the fallback, never an error). Long papers
// keep Results onwards (results, discussion, conclusions), which is where the
// findings are.
export async function fetchOpenAccessFullText(ids: { pmid?: string | null; doi?: string | null }): Promise<string | null> {
  const query = ids.pmid ? `EXT_ID:${ids.pmid} AND SRC:MED` : ids.doi ? `DOI:"${ids.doi}"` : null;
  if (!query) return null;
  try {
    const search = await getWithTimeout(`${EUROPE_PMC}/search?query=${encodeURIComponent(query)}&resultType=lite&format=json&pageSize=1`);
    if (!search.ok) return null;
    const hit = (await search.json())?.resultList?.result?.[0];
    if (!hit?.pmcid || hit.isOpenAccess !== "Y") return null;

    const xmlRes = await getWithTimeout(`${EUROPE_PMC}/${hit.pmcid}/fullTextXML`);
    if (!xmlRes.ok) return null;
    const xml = await xmlRes.text();
    const body = xml.match(/<body[^>]*>([\s\S]*?)<\/body>/)?.[1];
    if (!body) return null;

    const text = body
      .replace(/<(table-wrap|fig|disp-formula|supplementary-material)[\s\S]*?<\/\1>/g, " ")
      .replace(/<title[^>]*>([\s\S]*?)<\/title>/g, "\n\n## $1\n")
      .replace(/<\/p>/g, "\n")
      .replace(/<[^>]+>/g, " ")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&amp;/g, "&")
      .replace(/[ \t]+/g, " ")
      .replace(/\n\s*\n\s*\n+/g, "\n\n")
      .trim();
    if (text.length < 1500) return null; // a stub, not a paper
    if (text.length <= FULL_TEXT_MAX_CHARS) return text;
    const results = text.search(/\n## [^\n]*result/i);
    return (results > 0 ? text.slice(results) : text).slice(0, FULL_TEXT_MAX_CHARS);
  } catch {
    return null;
  }
}
