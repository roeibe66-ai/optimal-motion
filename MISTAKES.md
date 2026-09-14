# Known Mistakes

A running ledger of real bugs and bad patterns caught in this repo, so the same
mistake doesn't get made twice. Every agent working on this codebase should check
the entries relevant to what it's touching before writing code. Log a new entry the
moment a mistake is found or fixed — don't wait, don't summarize from memory later.

Format: one entry per mistake. Keep each one short: what happened, why it happened,
the rule going forward. No fix commentary, no praise, no filler.

---

## 2026-08 — Reps/sets fallback used string concatenation instead of numeric addition

**What happened:** `handleFinishAction`'s fallback for reps used string concatenation
(`+`) instead of numeric addition, so results silently corrupted instead of erroring.
**Why:** `patient_exercises.sets`/`reps` were still typed as `text` at the time (later
migrated to `integer`, see `20260830_patient_exercises_sets_reps_to_integer.sql`), so
JS `+` picked string mode by default.
**Rule:** never assume a numeric-looking Supabase column is actually numeric — check
the migration that defines it. When doing arithmetic on any value that came from
Supabase, coerce explicitly (`Number(x)`) rather than trusting the inferred type.

## 2026-09 — Duplicate Supabase client at repo-root `lib/supabase.ts`

**What happened:** A second, unused copy of the Supabase client existed at
`lib/supabase.ts` (root), identical to the real one at `app/lib/supabase.ts`, but not
imported anywhere. Confusing for anyone editing the wrong copy.
**Why:** likely created once during a refactor and never cleaned up.
**Rule:** there is exactly one Supabase client: `app/lib/supabase.ts`. If you ever see
another copy anywhere in the tree, that's a `lessons-learned` flag, not a second
source of truth — delete it.

## 2026-09 — `git worktree remove` left the directory on disk, silently duplicating lint scope

**What happened:** `.claude/worktrees/friendly-dhawan-bd96c3` was removed from git's worktree
registry (`git worktree remove --force` reported success, and `git worktree list` no longer
showed it), but the directory itself was never deleted from disk. It also was never
gitignored. Weeks later, `npm run lint` reported 552 errors/5708 warnings — ESLint was
silently walking a second full copy of the entire app inside that leftover folder.
**Why:** `git worktree remove` unregistering a worktree is not the same as the directory
being gone — never assumed one implies the other again without checking `ls`, not just
`git worktree list`.
**Rule:** after removing a worktree, verify the directory is actually gone (`ls`), and make
sure `.claude/worktrees/` is gitignored so a leftover one can never again get linted/built as
part of the app. If lint output balloons far beyond what a change could plausibly cause,
suspect a stray directory before suspecting the change.

## 2026-09 — `target_muscle` sometimes holds several comma-separated ids, not one

**What happened:** `exercises.target_muscle` is typed and labeled everywhere as a single
muscle id, and the admin form only ever lets you pick one. But live data has at least one
exercise ("chin up") with `"lower-back,biceps,chest"` stored in that single field — caught
because ExerciseMuscleMap tried to look it up as one id, failed, and silently dropped it
from the diagram while still showing the raw broken string in its text fallback.
**Why:** a chin-up genuinely works more than one primary mover, so whoever entered it
worked around the single-select UI rather than the data being simply wrong. The schema
comment lied about the real content.
**Rule:** never trust a column's type comment over what's actually in it — split
`target_muscle` on `,` defensively wherever it's read, the same as `secondary_muscles`
already is. If this pattern shows up in more exercises, it's worth revisiting whether
`target_muscle` should just become multi-select in the admin form instead of being worked
around.

<!-- Add new entries above this line, newest first is fine but not required. -->
