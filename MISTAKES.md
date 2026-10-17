# Known Mistakes

A running ledger of real bugs and bad patterns caught in this repo, so the same
mistake doesn't get made twice. Every agent working on this codebase should check
the entries relevant to what it's touching before writing code. Log a new entry the
moment a mistake is found or fixed — don't wait, don't summarize from memory later.

Format: one entry per mistake. Keep each one short: what happened, why it happened,
the rule going forward. No fix commentary, no praise, no filler.

---

## 2026-10-16 — Any patient could make themselves admin (FOR ALL RLS + UPDATE-only guard)

**What happened:** `patients_self_or_admin` was `FOR ALL`, so a patient could DELETE their own row and INSERT a new one with `role = 'admin'` — `protect_patient_privileged_fields` only runs `BEFORE UPDATE`. A leftover `exercises` policy "Enable all for authenticated users" (`FOR ALL using true`) also let any patient edit/delete exercises. Separately, the passkey login took its expected challenge from the client, so a captured response could be replayed.
**Why:** permissive policies OR together — one broad `FOR ALL` policy silently overrides every narrow one next to it; and column guards written for UPDATE don't cover DELETE+INSERT.
**Rule:** write RLS per command (select/insert/update/delete), never `FOR ALL` on a table with privileged columns; after any policy change list *all* policies on the table, not just the new one. Anything a guard protects on UPDATE must also be unreachable via INSERT. Security nonces (WebAuthn challenges) live server-side, never round-trip through the client.

## 2026-10-15 — Overlays and zoom were inaccessible (IS 5568 / WCAG)

**What happened:** the viewport set `maximumScale: 1` (pinch-zoom disabled); the shared `Modal` and every full-screen flow (player, pre/post workout, onboarding, coach sheet, passkey prompt) had no `role="dialog"`, no Escape, and didn't move or trap focus; the closed coach sheet stayed tabbable off-screen; the pain-area body diagram was pointer-only; "coming soon" rows were dimmed with `opacity-50` (contrast 2.1:1).
**Why:** overlays were built visually (fixed + z-index) and checked only by eye and touch; nothing ran an axe scan or a keyboard pass.
**Rule:** any new overlay gets `role="dialog" aria-modal` + `useDialog` (`app/hooks/useDialog.ts`); anything parked off-screen gets `inert`; pointer-only widgets need a keyboard/button alternative; dim with muted text tokens, never `opacity`; never set `maximumScale`. Update `/accessibility` when what's accessible changes.

## 2026-10-15 — Press feedback snapped instead of animating (`transition-[transform,…]` + `active:scale`)

**What happened:** the onboarding cards, chips and CTA (and the press feedback first added to the login pages) used `transition-[transform,background-color,…]` with `active:scale-[0.97]`. The press shrink happened instantly, with no transition.
**Why:** in Tailwind v4, `scale-*` / `translate-*` set the CSS `scale` / `translate` properties, not `transform`, so a transition list that names only `transform` never covers them.
**Rule:** for anything pressable use `transition-ui` (globals.css), or name `scale` / `translate` explicitly in an arbitrary `transition-[…]` list. `transition-transform` is fine — in v4 it includes them.

## 2026-10-14 — AI server actions had no auth check

**What happened:** `chatWithAssistant` (admin co-pilot + patient coach) and `generateResearchFacts` accepted calls from anyone, signed in or not, and spent Anthropic credits on them. Only `askWorkoutBuilderAssistant` checked the caller.
**Why:** a `"use server"` export looks like an internal function, but it is a public POST endpoint whose id ships in the client bundle; the UI only being shown to admins protects nothing.
**Rule:** every server action that costs money or touches data takes the caller's access token and checks it with `verifyCaller` (`app/lib/serverAuth.ts`) before doing anything — `isAdmin` for admin tools, a verified user for patient tools. Cap input sizes too.

## 2026-10-15 — Fitness workouts saved with RPE null (stale state read in the same handler)

**What happened:** 10 of 12 full workouts in `workout_logs` had `rpe = null`. For fitness patients `handleRpeSelect` called `setRpeScore(num)` and then `submitFinalFeedback()` in the same handler, which read `rpeScore` from the closure — still the previous render's `null`. Clinical patients were unaffected only because they go through one more screen (pain after) first.
**Why:** React state set in a handler isn't visible until the next render; reading it right after `setX` reads the old value.
**Rule:** when a handler both sets state and immediately uses the value, pass the value along as an argument (`submitFinalFeedback(null, num)`) — never read the state variable back in the same tick.

## 2026-10-15 — AI answers cut off: thinking used the whole max_tokens

**What happened:** testing the admin co-pilot on "build a 4-day program with weekly volume per muscle", the reply came back as one cut-off line. At `effort: "medium"` the model spent 7.9k of `max_tokens: 8000` on thinking; at 16000 it spent 15.8k (145 s) and still never answered.
**Why:** thinking tokens count toward `max_tokens`, and a volume-counting task invites exhaustive thinking. The code also didn't check `stop_reason === "max_tokens"`, so a truncated answer looked like a real one.
**Rule:** every AI call checks `stop_reason` for `max_tokens` and says so. Leave real headroom in `max_tokens`, and lower `effort` for heavy calculation tasks; test long requests locally before shipping.

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

## 2026-09-17 — `tempo_eccentric`/`tempo_pause`/`tempo_concentric` have columns but no UI ever sets them

**What happened:** `package_exercises` and `patient_exercises` have had `tempo_eccentric`/
`tempo_pause`/`tempo_concentric` (nullable int) since `20260901084753_patient_and_package_
exercises_tempo`, but no admin builder control (protocol or direct-assign) has ever written
to them — every row has them `null`. Surfaced while building the Program Library's PDF
export, which was asked to display Tempo: it now renders "—" for every real program, since
there's no way to actually set a value yet.
**Why:** the tempo columns were migrated ahead of the UI that was supposed to use them, and
nothing since has closed that gap.
**Rule:** don't assume a column existing means a feature is wired end-to-end — check for a
UI control that writes to it, not just the migration that added it. Adding a tempo
sets/reps-style input to the builder (mirroring `rest_time_seconds`'s pills) is the actual
fix, still open.

## 2026-09-18 — Admin builder's "Clinical Cues" field actually wrote to `description`

**What happened:** the exercise builder form had a textarea labeled "דגשים קליניים (אופציונלי)"
("Clinical Cues") that was bound to `exDesc`/`description` — not to `exercises.patient_cues`,
a column that's existed since the same migration as `common_mistake` but had zero UI wired to
it anywhere. So "Clinical Cues" entered by an admin actually landed in the exercise's general
description text (shown to patients under "ביצוע נכון"/Correct Execution in
`ExerciseInfoModal`), while `patient_cues` stayed permanently empty.
**Why:** likely a copy-paste/relabel slip at some point — the label text was updated but the
bound state/column wasn't.
**Rule:** when a form label and its bound field name disagree, trust neither blindly — check
the column that label is supposed to map to actually has a real writer, the same way the
tempo entry above got caught. Fixed here by giving `patient_cues` its own real textarea
(rendered with a ✅ prefix per line) and relabeling the old one "תיאור / הנחיות ביצוע".

## 2026-09-21 — `pt-safe`/`pb-safe` classes don't do anything — no such utility exists

**What happened:** `WorkoutPlayer.tsx` and `PatientShell.tsx`'s bottom nav use `pt-safe`/
`pb-safe` classes expecting them to pad for `env(safe-area-inset-*)` (notch/home-indicator).
Neither is a real Tailwind utility, and this project defines no custom one (no
`tailwind.config`, and `globals.css` has no `@utility pt-safe`/`pb-safe`) — so every one of
those classes has been a silent no-op the whole time. It happened to look fine anyway because
each spot also carries a normal padding class alongside it (e.g. `pt-safe px-5 md:px-8 pt-5`)
that was doing the actual visible spacing, masking the fact that the safe-area half was dead.
One correctly-working example already exists for comparison:
`PatientCoachSheet.tsx`'s `pb-[max(1rem,env(safe-area-inset-bottom))]`.
**Why:** likely copied from a different project/template that did define these utilities, and
never verified against this project's own Tailwind setup.
**Rule:** don't trust a "safe"-looking utility class name at face value — grep for where it's
actually defined before relying on it for real device behavior (notches, home indicators)
that's easy to not notice missing in a desktop browser. Fixed only at the one call site this
session actually touched (`PatientShell.tsx`'s `<main>`, using the same working
`pt-[max(1rem,env(safe-area-inset-top))]` pattern as `PatientCoachSheet.tsx`) — the
`WorkoutPlayer.tsx`/bottom-nav instances are still the dead no-op and worth a real fix later.

## 2026-09-22 — Equipment was never a real column, just keyword-sniffed from name/description

**What happened:** Neither `PlanTab.tsx`'s workout-overview equipment row nor `DiyBuilderTab.tsx`'s
equipment filter (`matchesEquip`) ever read a real equipment field — both guessed by lowercasing
an exercise's name/description and checking `.includes()` against hardcoded Hebrew/English
keywords ("מתח", "pull up", "dip", etc.), duplicated slightly differently in each file. An
`EQUIPMENT_LIST` constant already existed in `catalog.ts` and was already used to populate the
DIY builder's filter dropdown, but nothing ever wrote a matching id anywhere — the dropdown just
fed its label text into the same keyword-sniffing.
**Why:** `exercises` never had an equipment column, so equipment "detection" was bolted on as a
text heuristic instead. It happened to look approximately right for common cases but silently
missed/misclassified anything not in the fixed keyword list.
**Rule:** added a real `exercises.equipment text[]` column
(`20260922120000_exercises_add_equipment.sql`) and wired the admin builder to actually write to
it (mirroring the `prime_movers`/`synergists` chip-picker pattern). Both call sites now read
`exercise.equipment` directly — no more keyword sniffing. If a filter/aggregation over exercise
data looks like it's parsing free text instead of reading a typed column, that's the same
red flag as the `target_muscle` comma-packing entry above — check whether a real column exists
before trusting the text-parsing code.

## 2026-09-28 — Research tab failed in production: ANTHROPIC_API_KEY never set on Vercel

**What happened:** The admin "הידעת?" research tab always showed "אחזור המאמרים הצליח אך יצירת
הסיכומים נכשלה" in production. Paper retrieval (Semantic Scholar/PubMed, no key needed) worked,
but every Claude summarization call failed because `ANTHROPIC_API_KEY` lived only in
`.env.local`. `vercel env ls` listed just the Supabase vars. `generateResearchFacts` swallowed
each `Promise.allSettled` rejection and returned a generic message, so the real cause
(authentication) never appeared in the UI.
**Rule:** any new server-side env var added to `.env.local` must also be added to Vercel
(`vercel env add NAME production`, plus preview). Server actions that depend on a key should
check for it up front and return a specific error. Don't collapse settled rejections into a
generic message: include the first rejection's reason.

<!-- Add new entries above this line, newest first is fine but not required. -->

## 2026-09 — Tailwind v4 color token named `base` hijacked `text-base`

**What happened:** During the color-token re-theme, `--color-base` was registered in
`@theme` so `bg-base` would work. Tailwind v4 then resolved every `text-base` /
`md:text-base` to `color: var(--bg-base)` instead of the 1rem font size — text went
dark-on-dark and lost its size, with no build error.
**Why:** v4 utilities share one namespace per prefix: `text-*` looks up both
`--text-*` (font sizes) and `--color-*`, and the color won.
**Rule:** never name a `--color-*` theme key after an existing utility value
(`base`, `xs`…`9xl`, `sm`/`md`/`lg` for shadows, etc.). The app shell color is
exposed as `bg-shell` for this reason. After adding theme keys, check the generated
CSS for the affected class, not just that the page renders.

## 2026-10 — Overlays opened inside the patient `<main>` hide under the bottom nav

**What happened:** The Explore workout preview (shared `Modal`) opened as a `fixed z-[200]`
bottom sheet, but its last button ("הוסף ללו"ז שלי") sat under the patient bottom nav, so
patients never saw the option. Same trap PatientCoachSheet had hit earlier.
**Why:** PatientShell's scrolling `<main>` is `relative z-0` — its own stacking context.
Any fixed descendant, whatever its z-index, is painted inside that z-0 layer and loses to
the nav (`fixed z-50`, a sibling of `<main>`).
**Rule:** any full-screen overlay/sheet that can be opened from a patient tab must render
through `createPortal(..., document.body)` (as `Modal` and `PatientCoachSheet` now do) —
don't try to win with a higher z-index.

## 2026-10-05 — Research agent answered the topic, not the specific question

**What happened:** Asking the admin research tab a specific question ("what is the optimal eccentric phase") returned papers about eccentric training in general, and the "הידעת" headline reflected a general finding instead of the question.
**Why:** The planner collapsed the request into topic keywords (the qualifier "optimal"/duration/tempo was dropped), the original wording never reached the screener or summarizer, the screener's "2 = same phenomenon" tier let general-topic papers through, only one query per index was run on a ~25-paper pool, screening saw only the first 600 chars of each abstract, and the "guarantee one PubMed result" swap could replace a relevant paper with a less relevant one.
**Rule:** a retrieval pipeline must carry the user's exact question end to end and treat "same topic" and "answers the question" as different tiers. In `researchAgent.ts` the planner now emits a separate `aspectEn`/`aspectTerms`, runs up to 3 PubMed queries, screens with the original request, shows only direct matches when any exist, and tags the rest `matchLevel: "related"`.

## 2026-10 — Reading localStorage in a useState initializer caused a hydration mismatch

**What happened:** `ExerciseMediaPlayer` read the remembered camera angle with
`useState(() => localStorage...)`. Server HTML rendered angle 1, the client's first
render picked angle 2, React logged a hydration mismatch and kept the server
attributes — so the remembered angle was never shown after a reload.
**Why:** a `useState` initializer runs during hydration with browser-only data the
server never had.
**Rule:** browser-only state (localStorage, matchMedia) in a client component goes
through `useSyncExternalStore` with a server snapshot (or is set after mount) — never
a `useState` initializer. Keep an in-memory fallback so the UI still works when
localStorage throws (private mode).

## 2026-10-10 — Signup confirmation / password-reset emails linked to localhost

**What happened:** A new user's confirmation email and the "forgot password" email both
opened `localhost:3000` on the phone (Safari: can't connect / ERR_CONNECTION_FAILED).
**Why:** `signUp`, `resetPasswordForEmail` and `signInWithOAuth` passed no redirect URL,
so Supabase used the project's Auth **Site URL** — still set to `http://localhost:3000`
from development.
**Rule:** auth calls that send the user away pass `emailRedirectTo` / `redirectTo:
window.location.origin` (`useAuthSession.ts`), and the Supabase project keeps Site URL =
the production domain with production, Vercel previews and localhost in the Redirect URLs
allow-list — an origin missing from that list silently falls back to the Site URL.

## 2026-10-10 — `animate-in` / `fade-in` / `slide-in-from-*` classes never animated anything

**What happened:** ~35 elements (every patient tab root, the workout player screens,
pre/post-workout flows, the shared `Modal` sheet, `Toast`, plus admin tabs) carried
`animate-in fade-in` / `zoom-in` / `slide-in-from-bottom` etc. They all appeared
instantly — those utilities come from the `tailwindcss-animate` / `tw-animate-css`
plugin, which this project has never installed, so Tailwind emits nothing for them.
**Why:** same trap as `pb-safe`: an unknown class name is silently ignored, no build error.
**Rule:** don't use `animate-in`-family classes. Real motion goes in `globals.css`
(`@theme` keyframes like `landing-*`, or transitions + `@starting-style` like
`.sheet-panel`). All removed (2026-10-10); `RegisterPage` got a real `animate-card-in` instead.
Same story for `no-scrollbar` (6 carousels showed a scrollbar) — now a real `@utility` in
`globals.css`.
Don't "fix" this by installing the plugin — it would switch on 500–700ms fades on tab
switches and every workout-player screen.

## 2026-10-10 — Swipe-to-finish logged sets the patient hadn't done

**What happened:** the workout player finished the current set on any touch that ended
≥50px to the right of where it started — no vertical check, no speed check, no visual
feedback. Wiping sweat, adjusting the phone or a diagonal scroll could log a set.
**Why:** a distance-only threshold, tracked in state (which also re-rendered the whole
player on every `touchmove`).
**Rule:** gestures that write data need a clearly intentional shape — horizontal
dominance (|dx| ≥ 2|dy|), a deliberate distance (80px) or a real flick (≥40px at
>0.5px/ms), forward relative to the UI direction — and track touches in refs
(`useWorkoutSession.ts` onTouch*).

## 2026-10-10 — In Tailwind v4, `scale-*` is not `transform`

**What happened:** replacing `transition-all` with `transition-[transform,…]` on buttons
that use `active:scale-90` made the press snap instead of animate.
**Why:** v4's `scale-*` / `translate-*` / `rotate-*` utilities set the individual CSS
`scale` / `translate` / `rotate` properties, not `transform`.
**Rule:** an explicit transition list for those utilities names `scale` (etc.), or use
`transition-transform`, which v4 expands to all four.

## 2026-10-10 — Plan tab showed a workout on rest days, and "אימון 6" for Saturday

**What happened:** the home hero always showed `patientCategories[0]` — the first program
of the *week* — so on a day with nothing scheduled it offered "0 תרגילים · 0 בלוקים" with
a play button into an empty list (and the rest-day card never appeared for anyone with a
program). The detail subtitle printed the weekday id as a workout number ("אימון 6" on
Saturday, "אימון 0" on Sunday) next to today's date even when another day was selected.
**Why:** both reused week-level / id values where a day-level, human value was needed.
Found with the `/dev/plan?data=one` fixture (break-ui), not with the demo data.
**Rule:** anything labelled "today" / "this day" filters by the selected day; ids
(`DAYS_OF_WEEK` "0"–"6") are never rendered — map them to `DAYS_OF_WEEK[].label`.

## 2026-10-10 — A `*/` inside a CSS comment took down every page in dev

**What happened:** a comment in `app/globals.css` mentioned Tailwind's `scale-*/translate-*`
utilities. The `*/` in that text closed the comment early, the rest of the sentence was
parsed as CSS, and Turbopack failed to compile globals.css — every route returned a 500.
**Why:** typecheck and ESLint don't read CSS, so the pre-commit checks passed; only
loading a page showed it. Caught before commit.
**Rule:** never write `*/` (e.g. `foo-*/bar-*` globs) inside a CSS comment. After editing
`globals.css`, compile it — load a page, or `npx @tailwindcss/cli -i app/globals.css -o /tmp/x.css`
— not just `tsc`/`eslint`.

## 2026-10-10 — Profile streak, Calendar cards and saved-program days showed the wrong thing

**What happened (all found with the `/dev/tabs` fixtures, none with demo data):**
- Profile "ימי רצף" was `min(total workouts, 14)` whenever the last log was within two
  days — 9 workouts over six months read as a 9-day streak; 300 straight days read as 14.
- Calendar: tapping the second program's card on a day opened the first program, because
  only week + day were handed to the Plan tab, which shows the first program that day.
- My workouts: a saved day whose exercises had been deleted from the catalog still had an
  active "יום 2 (0)" start button (an empty session), and missing exercises vanished silently.
**Rule:** a stat's name is its spec — "streak" means consecutive days, computed from the
dates. A navigation handoff passes everything that identifies the target (here the program
name), not just enough to land nearby. Hydrating saved ids against the catalog must surface
what didn't resolve.

## 2026-10-10 — Workout player's primary buttons fell off short screens

**What happened:** the player is `fixed inset-0 overflow-hidden` with its content vertically
centered and no scroll. At 375×667 the rest screen's "דלג"/"+15" ended at 748px with plain
demo data (804px with a long name), and "סיום סט" was cut off on the active screen with a
70-char exercise name — unreachable. Mobile Safari's toolbars make the real height smaller
still, so this hit common iPhones, not just small ones. Real 4:5 media (350px tall at
280px wide) is taller than the placeholder the measurement used, so it was worse in practice.
**Why:** a fixed, non-scrolling full-screen layout sized against one tall test device.
**Rule:** full-screen flows need a scrolling middle (`flex-1 min-h-0 overflow-y-auto`) with
the primary action `sticky bottom-0`, and media/rings sized by `dvh` as well as width.
Check every full-screen screen at 375×667 and 320×568 (`/dev/player`).

## 2026-10-11 — A finished `fill-mode: both` transform animation anchors `position: fixed` children

**What happened (caught before shipping):** the screen-push animation (`step-in`, used on
wrappers around whole screens) had `animation-fill-mode: both`. A transform animation that
stays "in effect" after it ends keeps making its element the containing block for
`position: fixed` descendants — so the builder's toast and the Plan detail's fixed CTA bar
would have been positioned relative to the animated wrapper instead of the viewport.
**Rule:** entrance keyframes on anything that can contain fixed/sticky UI use
`fill-mode: backwards` (no lingering effect), and fixed bars stay outside the animated
element (Plan detail animates its sections, not the root holding the CTA bar).

## 2026-10-11 — A second toast silently cancelled the first one's undo

**What happened:** `notify()` kept a single toast slot, so removing builder day 2 and then
day 3 replaced day 2's "ביטול" toast — day 2 could no longer be undone, with nothing on
screen saying so. The toast also kept counting down while the user reached for "ביטול",
and while the app was in the background.
**Rule:** feedback that carries an action is a promise — it stacks (`ui/feedback.ts`, up to
3) instead of being replaced, pauses while pointed at / while `document.hidden`, and moves
to the top edge while a sheet or full-screen flow owns the bottom of the screen.
**Testing note:** React's `onPointerEnter` is built from `pointerover`/`pointerout`, so
synthetic `pointerenter` events don't reach it; and the browser pane reports
`document.hidden` while it isn't displayed, which pauses every toast.

## 2026-10-11 — Home showed "no plan / no data" while it was still loading; landing used 100vh

**What happened:** `usePatientData` had no loaded flag, so on open the home screen rendered
its empty states — the "מנוחה פעילה" card, "הנתונים יופיעו כאן…", even the starter-program
offer (when Explore's fetch landed first) — for a patient who had a plan, until the data
arrived. Separately, the landing and auth pages used `min-h-screen` (100vh), which on iOS
Safari is taller than the visible area, so the landing's bottom-pinned buttons could sit
under the browser toolbar.
**Rule:** a hook that fetches exposes `hasLoaded`; screens show a skeleton with the final
layout's footprint until then, and an empty state only once the data says it's empty.
Full-height pages use `min-h-dvh`, and bottom-pinned UI adds `env(safe-area-inset-bottom)`.

## 2026-10-12 — System Back left the app from inside a workout, sheet or the builder

**What happened:** the app is a single page whose screens are React state, with no history
entries — so Android's back gesture (or the browser's back button) inside a sheet, the
full-screen builder, a program screen or a running workout navigated away from the app
entirely, discarding an in-progress workout.
**Rule:** every layer that covers the screen calls `useBackDismiss(active, close, guard?)`
(`app/hooks/useBackDismiss.ts`): it owns one history entry, Back closes only the top
layer, and layers holding unsaved work pass a `guard` that asks first (the workout and
AMRAP players). New full-screen/sheet UI must opt in.

## 2026-10-12 — `exercises.equipment = {dumbbells}` is a catch-all for gym machines

**What happened:** building the mid-workout swap's "at home" filter, Smith-machine squats,
leg press, lat pulldown and cable exercises came back as home options for a patient with
dumbbells: all 79 `gym`-tagged non-kettlebell exercises carry `equipment = {dumbbells}`
whatever they really use. Also, the swap path logged the set under the *original*
exercise id (`activeAssign.exercise.id`) instead of the one performed.
**Rule:** don't trust `equipment` alone to mean "doable at home" — `fitsSetting`
(`app/utils/exerciseSwap.ts`) also requires a `gym`-tagged "dumbbells" exercise to say
dumbbell in its name. Fix the data (real machine/barbell/cable equipment ids) rather than
adding more heuristics. Anything that records a set uses `displayedExercise`, not
`activeAssign.exercise`.

## 2026-10-13 — Rest/exercise timers froze while the PWA was in the background

**What happened:** patients (all on iPhone, installed as a home-screen PWA) reported that
the rest timer stopped when they switched to another app mid-rest. Both countdowns in
`useWorkoutSession` subtracted 1 from state on every `setInterval` tick, and iOS suspends a
backgrounded page's timers — so no ticks, no time passing. (The AMRAP player already used
a wall-clock deadline and was fine.)
**Rule:** never count time by counting ticks. Keep a deadline (`Date.now() + seconds`) in a
ref, derive the remaining seconds from it on each tick, and resync on `visibilitychange` /
`pageshow`. Pausing stores the remaining seconds and drops the deadline.

## 2026-10-13 — A swipe inside a sheet over the workout player could finish a set

**What happened:** the player's swipe handlers sit on its root element, and the sheets
opened over it (exercise info, swap) render through a portal into `<body>` — but React
still bubbles their touch events up the component tree to the player. A horizontal swipe
inside a sheet could log a set the patient hadn't done.
**Rule:** gesture handlers on a parent that hosts portal children check
`e.currentTarget.contains(e.target)` (real DOM containment) before acting.

## 2026-10-14 — Exercise content: placeholders, run-on lines and wrong muscles

**What happened:** a full review of the 289 exercises found 26 with "לא צוין" as the
mistakes text, ~60 gym exercises with all cues on one line (shown as one long ✅ instead
of a list), English/jargon in patient-facing text, one exercise carrying another's cues,
and wrong muscles in the map (pull-ups with "rotator cuff" as the main muscle, biceps and
traps listed on every press, chest/triceps on every row, forearm *extensors* for grip).
About 180 rows also store lines as "- …", which rendered as "✅ - …".
**Rule:** cues/mistakes are one point per line, no bullets (the UI adds ✅/❌ and now strips
a leading "-"), Hebrew only, no "לא צוין". Muscles follow the movement: prime_movers =
what the exercise trains, synergists = what assists — and the muscle map shows exactly
those two, so a wrong id is a visible error. Fixed in 20261014120000_exercise_content_review.sql.
