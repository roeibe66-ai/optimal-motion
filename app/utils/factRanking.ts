import type { CuratedFact } from "@/app/types";

// Orders the "Did you know?" cards for one patient: facts they haven't seen
// yet first, then by how well a fact's tags (app/constants/knowledgeTags.ts)
// match where they report pain and what their program trains, then newest.

// Muscle ids from both vocabularies the app uses — AVAILABLE_MUSCLES (exercise
// prime movers) and react-body-highlighter (pain areas) — to body-area tags.
const MUSCLE_TO_AREA: Record<string, string> = {
  neck: "neck",
  head: "neck",
  "front-deltoids": "shoulder",
  "side-deltoids": "shoulder",
  "back-deltoids": "shoulder",
  "rotator-cuff": "shoulder",
  biceps: "elbow-wrist",
  triceps: "elbow-wrist",
  brachialis: "elbow-wrist",
  forearm: "elbow-wrist",
  "forearm-flexors": "elbow-wrist",
  "forearm-extensors": "elbow-wrist",
  "upper-back": "upper-back",
  trapezius: "upper-back",
  rhomboids: "upper-back",
  "lower-back": "lower-back",
  "erector-spinae": "lower-back",
  gluteal: "hip",
  "glute-medius": "hip",
  adductor: "hip",
  adductors: "hip",
  abductors: "hip",
  "hip-flexors": "hip",
  quadriceps: "knee",
  hamstring: "knee",
  knees: "knee",
  calves: "ankle-foot",
  soleus: "ankle-foot",
  "left-soleus": "ankle-foot",
  "right-soleus": "ankle-foot",
  "tibialis-anterior": "ankle-foot",
  "peroneus-longus": "ankle-foot",
};

const TOPICS_BY_PATIENT_TYPE: Record<string, string[]> = {
  clinical: ["pain", "tendon", "post-surgery", "return-to-sport"],
  fitness: ["strength", "hypertrophy", "endurance", "recovery"],
};

const PAIN_MATCH = 3;
const PROGRAM_MATCH = 2;
const TYPE_MATCH = 1;

export interface FactRankingInput {
  painAreas: string[]; // muscle ids from recent workout_logs.pain_areas
  programMuscles: string[]; // prime movers of the patient's current exercises
  patientType: string | null | undefined;
  seenIds: Set<string>;
}

const areasOf = (muscles: string[]) => new Set(muscles.map((m) => MUSCLE_TO_AREA[m.trim()]).filter(Boolean));

export function rankFactsForPatient(facts: CuratedFact[], { painAreas, programMuscles, patientType, seenIds }: FactRankingInput): CuratedFact[] {
  const painTags = areasOf(painAreas);
  const programTags = areasOf(programMuscles);
  const typeTopics = new Set(TOPICS_BY_PATIENT_TYPE[patientType ?? ""] ?? []);

  const score = (fact: CuratedFact) =>
    (fact.tags ?? []).reduce(
      (sum, tag) => sum + (painTags.has(tag) ? PAIN_MATCH : 0) + (programTags.has(tag) ? PROGRAM_MATCH : 0) + (typeTopics.has(tag) ? TYPE_MATCH : 0),
      0
    );

  // facts arrive newest first; the index keeps that as the last tiebreaker.
  return facts
    .map((fact, order) => ({ fact, order, seen: seenIds.has(fact.id) ? 1 : 0, score: score(fact) }))
    .sort((a, b) => a.seen - b.seen || b.score - a.score || a.order - b.order)
    .map((x) => x.fact);
}
