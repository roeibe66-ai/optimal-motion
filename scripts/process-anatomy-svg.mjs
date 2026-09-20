// One-off/rerunnable processor for public/anatomy/overlay.svg (exported from
// Linearity Curve/Vectornator). Each <path> carries its real name only as a
// custom `vectornator:layerName="..."` attribute, not a standard `id` — so
// nothing in the DOM/CSS can address a path by muscle name as-is. This
// script reads that attribute, assigns a real `id` per path (deduping
// repeats — several muscles are drawn as 2+ disconnected path pieces sharing
// one layerName), and writes the result to overlay.processed.svg, which is
// what the app actually loads. Re-run this (`node scripts/process-anatomy-svg.mjs`)
// any time overlay.svg is re-exported.
//
// It also prints the derived canonical muscle groups (side-stripped) to
// stdout, which is how app/constants/muscleMapping.ts was hand-authored —
// re-run and diff that output if overlay.svg's layer names ever change.

import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SRC = path.join(__dirname, "..", "public", "anatomy", "overlay.svg");
const OUT = path.join(__dirname, "..", "public", "anatomy", "overlay.processed.svg");

const svg = readFileSync(SRC, "utf-8");
const lines = svg.split("\n");

const seenIds = new Map(); // slug -> count, for deduping repeated layerNames
const groups = new Map(); // canonicalBase -> Set of {side, id}

function slugify(raw) {
  return raw.trim().toLowerCase().replace(/\s+/g, "_");
}

function splitSide(slug) {
  const tokens = slug.split("_");
  const sideIdx = tokens.findIndex((t) => t === "left" || t === "right");
  if (sideIdx === -1) return { side: null, base: slug };
  const side = tokens[sideIdx];
  const base = tokens.filter((_, i) => i !== sideIdx).join("_");
  return { side, base };
}

let pathCount = 0;
const processedLines = lines.map((line) => {
  const match = line.match(/vectornator:layerName="([^"]+)"/);
  if (!line.includes("<path") || !match) return line;

  pathCount++;
  const rawName = match[1];
  if (rawName === "Layer 1") return line; // shouldn't occur on a <path>, guard anyway

  const slug = slugify(rawName);
  const count = seenIds.get(slug) ?? 0;
  seenIds.set(slug, count + 1);
  const id = count === 0 ? slug : `${slug}-${count + 1}`;

  const { side, base } = splitSide(slug);
  if (!groups.has(base)) groups.set(base, new Set());
  groups.get(base).add(JSON.stringify({ side, id }));

  // Inject id="..." right after the opening <path tag.
  return line.replace("<path ", `<path id="${id}" `);
});

writeFileSync(OUT, processedLines.join("\n"), "utf-8");

console.log(`Processed ${pathCount} paths -> ${OUT}`);
console.log(`\n${groups.size} canonical muscle groups:\n`);
for (const [base, entries] of [...groups.entries()].sort()) {
  const parsed = [...entries].map((e) => JSON.parse(e));
  const sides = parsed.map((p) => `${p.side ?? "none"}:${p.id}`).join(", ");
  console.log(`  ${base.padEnd(24)} ${sides}`);
}
