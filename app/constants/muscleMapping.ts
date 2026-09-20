// Maps each AVAILABLE_MUSCLES id (the app's existing canonical muscle
// vocabulary — see catalog.ts, already used by the target_muscle picker and
// BODY_MODEL_MUSCLE_MAP) to the <path id="..."> values in
// public/anatomy/overlay.processed.svg that visually render it. Left/right
// pairs are already merged here (e.g. "chest" pulls both left_pec and
// right_pec) — AnatomyHeatmap and the admin muscle picker only ever deal in
// AVAILABLE_MUSCLES ids, never raw SVG path ids.
//
// Source of truth for path ids: public/anatomy/overlay.svg's
// vectornator:layerName attribute, processed by
// scripts/process-anatomy-svg.mjs into overlay.processed.svg (which injects
// a real `id` per path, deduping the several muscles drawn as 2+
// disconnected pieces sharing one layerName — e.g. "-2"/"-3" suffixes below).
// If overlay.svg is re-exported, re-run that script and re-check this file
// against its printed group list.
//
// Reusing AVAILABLE_MUSCLES (rather than a second parallel vocabulary keyed
// by the raw SVG names) was a deliberate choice: the source SVG's 124 paths
// reduce to 64 raw name-groups after stripping left/right, but several of
// those are just inconsistent spellings or side-mismatched names for what's
// actually one existing catalog muscle (e.g. "vastus_lat" on the left path,
// "vastus_lateralis" on the right one, for the same muscle) — not a case of
// finer anatomical detail than the catalog already has. Mapping onto
// AVAILABLE_MUSCLES resolves that for free and keeps prime_movers/synergists
// consistent with every other muscle reference in the app.
//
// NOT every raw SVG group is mapped. Excluded, with reasons:
//   - Joints (not muscles): back_knee_joint, elbow_joint, glenohumeral_joint,
//     hip_joint, knee_joint.
//   - No corresponding AVAILABLE_MUSCLES entry: brachiorad/brachrad/brachrads
//     (brachioradialis — not in the catalog), cet/cft (unclear — likely
//     tendon landmarks, not muscles), ext_digi/ext_longus (extensor
//     digitorum — not in the catalog), forarm/forearm (generic forearm mass;
//     the catalog only has forearm-flexors/forearm-extensors and the raw
//     name doesn't say which), itb/itb_back (iliotibial band — not a
//     muscle), ql (quadratus lumborum — not in the catalog), sratorius
//     (sartorius — not in the catalog).
// Per the same principle BODY_MODEL_MUSCLE_MAP already documents in
// catalog.ts: an unmapped region is left out entirely rather than
// approximated to a nearby muscle — anatomical accuracy over a fuller-looking
// picture. If any of these should actually be added, that's a deliberate
// follow-up, not a silent guess here.
//
// A few groups only have a path on one side (e.g. "iliopsoas" only has
// left_iliopsoas, "adductors" only has one left_adductor, "quadriceps"'s
// right vastus lateralis is right_vastus_lateralis) — this mirrors the
// source SVG's own naming (see the script's printed output) and most likely
// reflects the same side-inconsistent-naming pattern rather than a
// deliberately one-sided illustration; flagged, not silently "fixed" by
// guessing which other path should have matched.
//
// 2026-09-20 re-export notes: overlay.svg now has its own embedded
// background <image> (see AnatomyHeatmap.tsx) and added
// erector_spine/lower_erector_spine. It also renamed/dropped a few paths
// this map depended on — left_biceps/right_biceps (only *_biceps_brachi
// remains now), left_traps and the right_traps duplicate (only one
// right_traps left, alongside left_trap/right_trap), and right_adductor
// (only left_adductor remains) — all removed from the lists below rather
// than left pointing at ids that no longer exist. Re-run the processing
// script's printed group list after any future re-export and diff it
// against this file the same way, rather than assuming names are stable.
// That re-export also added ~84 paths with no real vectornator:layerName at
// all (auto-generated "Curve NNN" names) — these aren't muscles as far as
// this map is concerned and are simply never referenced here, same
// end result as the explicit exclusions above.
export const MUSCLE_SVG_PATH_MAP: Record<string, string[]> = {
  chest: ["left_pec", "right_pec"],
  "front-deltoids": ["left_ant_delt", "right_ant_delt"],
  "back-deltoids": ["left_back_delt", "right_back_delt"],
  "side-deltoids": ["left_mid_delt", "right_mid_delt", "right_mid_delt-2"],
  biceps: ["left_biceps_brachi", "right_biceps_brachi"],
  triceps: ["left_tricep", "right_tricep", "left_triceps", "right_triceps", "left_triceps_front", "right_triceps_front"],
  lats: ["left_lats", "right_lats"],
  trapezius: [
    "left_trap",
    "right_trap",
    "right_traps",
    "left_mid_trap",
    "right_mid_trap",
    "right_mid_trap-2",
    "left_upper_trap",
    "right_upper_trap",
    "right_upper_trap-2",
    "right_upper_trap-3",
  ],
  "serratus-anterior": ["left_low_ser", "right_low_ser", "right_mid_ser", "left_up_ser", "right_up_ser"],
  abs: [
    "left_ab",
    "left_ab-2",
    "up_left_rect_ab",
    "up_right_rect_ab",
    "mid_left_rect_ab",
    "mid_right_rect_ab",
    "low_left_rect_ab",
    "low_right_rect_ab",
    "lower_left_rect_ab",
    "lower_right_rect_ab",
  ],
  gluteal: ["left_glute_max", "right_glute_max", "left_glute_min", "right_glute_min"],
  "glute-medius": ["left_glute_med", "right_glute_med"],
  quadriceps: ["left_vastus_lat", "right_vastus_lateralis", "left_vastus_med", "right_vastus_med", "left_rectus_femoris", "right_rec_femoris"],
  hamstring: ["left_biceps_fem", "right_biceps_fem", "left_semiti", "right_semiti"],
  calves: ["left_gastro", "right_gastro", "left_gastro-2", "right_gastro-2", "left_sec_gastro", "right_sec_gastro"],
  soleus: ["left_front_soleus", "right_soleus_front"],
  adductors: ["left_add_mag", "right_add_mag", "left_adductor", "left_grac", "right_grac"],
  "hip-flexors": ["left_iliopsoas", "right_psoas", "left_tfl", "right_tfl"],
  "tibialis-anterior": ["left_tib_ant", "right_tib_ant"],
  "peroneus-longus": ["left_per_long", "right_per_long", "left_per_longus_back", "right_per_longus_back"],
  "forearm-extensors": ["left_ext_carpi_rad", "left_ext_carpi_rad-2", "right_ext_carpi_rad", "right_ext_carpi_rad-2"],
  // Added in the 2026-09-20 re-export — two tiers per side (a main erector
  // mass plus a separate lower-back piece), all merged into one catalog id
  // since the catalog doesn't distinguish erector regions any finer.
  "erector-spinae": ["left_erector_spine", "right_erector_spine", "lower_left_erector_spine", "lower_right_erector_spine"],
};

// Every muscle id this map can actually highlight — the admin builder's
// Prime Mover/Synergist picker should only offer these (not the full
// 30-entry AVAILABLE_MUSCLES list), since picking a muscle with no SVG paths
// would tag an exercise with something the heatmap can never render.
export const HEATMAP_MUSCLE_IDS = Object.keys(MUSCLE_SVG_PATH_MAP);
