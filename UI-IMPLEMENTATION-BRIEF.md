# Implementation Brief — Optimal Motion UI Direction

This document is meant to be pasted directly into Claude Code in VS Code, working on the real repo (`optimal-motion`), to implement the approved design direction.

**Design canvas (12 screens — patient app mobile 390×844, marketing/admin desktop 1440-wide, RTL):**
https://claude.ai/code/artifact/bbc33ba3-e29f-4fe7-9328-796d1b8d9c6d

Before starting — open the link and look at all 12 screens: Main, WorkoutActive, WorkoutRest, Login, PremiumStore, Profile, DiyBuilder, MyWorkouts (patient app, mobile), Landing + LandingMobile (public marketing page, desktop + mobile), AdminExerciseLibrary, ProtocolBuilder (practitioner console, desktop). These are static mockups (raw HTML/CSS, not React code) — the goal is to **match their structure, spacing, and visual hierarchy** inside the real components, not to copy the HTML verbatim.

**Scope note:** only 2 of the 7 admin screens were mocked up (Exercise Library and Protocol Builder — the two screens with the richest, most reusable patterns: card/grid + form, and a drag-and-drop board). The other 5 admin tabs (מעקב קליני/Dashboard, ניהול תיקים/CRM, שיוך ידני/manual assignment, עריכת תוכניות/plan editing, ביקורת וידאו/video review) were deliberately left unmocked — extrapolate their look from the same tokens, sidebar, and card/form/list patterns established in these two screens when you get to them, rather than waiting for a mockup of every single one.

---

## Ground rules

1. **Zero-breaking-changes**: do not delete or rewrite existing business logic (state management, Supabase calls, calculations) without explicit review. This is a visual/UX change, not a refactor.
2. Work **one screen at a time**: implement, run locally, look at it in the browser, then move on. Don't attempt all 12 screens in one pass.
3. Two screens (DiyBuilder + MyWorkouts) additionally require a **new data layer**, not just CSS — detailed below under "New data layer required."
4. Preserve full RTL support (`dir="rtl"`, correct arrow directions) and the existing Rubik font.
5. **The admin console is being deliberately reskinned from light to dark.** The real admin UI today (`app/components/admin/LegacyAdminApp.tsx`) is a fully light theme (`bg-[#f8fafc]`, white cards) with a dark sidebar branded "ClinicPro" — a different visual language from the patient app, and apparently a leftover brand name from before this became "Optimal Motion". Both mockups translate the admin console into the same dark-premium language as the rest of the app, with "Optimal Motion" in the sidebar instead of "ClinicPro". This was reviewed and explicitly approved — it's not a guess, go ahead and reskin the whole admin console this way, not just the two mocked-up screens.

---

## Design tokens established

```css
--bg-app: #0c0a09;      /* stone-950, base background */
--card: #1c1c1e;
--border: #292524;
--teal: #14b8a6;
--teal-light: #2dd4bf;   /* functional/brand accent — stays across all screens */
--amber: #f59e0b;
--amber-light: #fbbf24;
--orange: #ea580c;
--emerald: #10b981;
--emerald-light: #34d399; /* unique to the rest-between-sets screen */
```

Additions for the "warm pass" (Main + Login only — other screens keep teal as the accent):
```css
coral: rgba(248,113,86,1)   /* text: #f87156 */
gold/olive: #facc15         /* rgba(234,179,8,x) for backgrounds */
terracotta: #fdba74         /* rgba(251,146,60,x) for backgrounds */
```

New category tag colors (DiyBuilder + MyWorkouts, patient-facing — 4 categories):
```css
Kettlebell (קטלבל):  #f59e0b  /* rgba(245,158,11,x) */
Yoga (יוגה):          #f87156  /* rgba(248,113,86,x) */
Strength (שרירים):    #60a5fa  /* rgba(59,130,246,x) */
Mobility (מוביליטי):  #facc15  /* rgba(234,179,8,x) */
```

Admin category/tag colors (AdminExerciseLibrary + ProtocolBuilder — the real `ADMIN_TAGS` taxonomy has 7 values, a different set from the patient-facing one above; do not conflate the two systems):
```css
Calisthenics (קליסטניקס): #14b8a6  /* rgba(20,184,166,x) */
Gym (מכון כושר):          #a78bfa  /* rgba(167,139,250,x) */
Yoga (יוגה):               #f87156  /* rgba(248,113,86,x) */
Mobility (מוביליטי):       #facc15  /* rgba(234,179,8,x) */
Kettlebell (קטלבל):        #f59e0b  /* rgba(245,158,11,x) */
Plyometrics (פליומטרי):    #fb923c  /* rgba(251,146,60,x) */
Rehab (שיקום):             #60a5fa  /* rgba(96,165,250,x) */
```

Admin-specific surface tokens:
```css
--sidebar-bg: #161311;  /* slightly distinct from --bg-app for sidebar depth */
```

Font: Rubik (already set up in `app/layout.tsx` via `next/font/google`) — no change needed.

---

## Screen → real file mapping

| Mockup | Real file | Type of change |
|---|---|---|
| Main.dc.html | `app/components/patient/tabs/PlanTab.tsx` | Visual only |
| WorkoutActive / WorkoutRest | `app/components/patient/workout/WorkoutPlayer.tsx` + `app/hooks/useWorkoutSession.ts` | **Visual + UX flow change (input relocation)** |
| Login.dc.html | `app/components/marketing/LoginPage.tsx` (+ `LandingPage.tsx` for background) | Visual only |
| PremiumStore.dc.html | `app/components/patient/tabs/PremiumStoreTab.tsx` | Visual only |
| Profile.dc.html | `app/components/patient/tabs/ProfileTab.tsx` | Visual + Hebrew labels for stats |
| DiyBuilder.dc.html | `app/components/patient/tabs/DiyBuilderTab.tsx` | Visual **+ new feature** (categories, save) |
| MyWorkouts.dc.html | Entirely new screen/route | **New feature** |
| Landing.dc.html / LandingMobile.dc.html | `app/components/marketing/LandingPage.tsx` | Visual + content simplification |
| AdminExerciseLibrary.dc.html | `app/components/admin/LegacyAdminApp.tsx` (`adminTab === "exercises"`) | Visual reskin (light → dark) |
| ProtocolBuilder.dc.html | `app/components/admin/LegacyAdminApp.tsx` (`adminTab === "builder"`) | Visual reskin (light → dark) |

---

## Screen-by-screen notes

### Main (PlanTab.tsx)
- Warmer mood: warm-toned (amber/copper) hero gradient instead of the cold dark one, amber avatar.
- Remove fake data already flagged in the audit: hardcoded "45 Minutes", hardcoded "For All Levels", `fakeProgressPercent`.
- Category cards (yoga/mobility) in matching warm tones.

### WorkoutActive + WorkoutRest (WorkoutPlayer.tsx, useWorkoutSession.ts)
This is the most significant UX change, per explicit request:
- **Move** the rep-count input from the active screen to the rest screen, together with RIR input.
- On the active screen: show only a compact "X reps · set Y/Z" pill (not a large centered readout) inside the existing button row (info/difficulty), not as a separate element.
- **Remove** the Block pills from the active screen.
- **Replace** the "Swap exercise" button with two functions: make it easier / make it harder.
- A single floating primary action button (not wrapped in a card) at the bottom of the active screen.
- Rest screen: a reps stepper + RIR row (0/1/2/3/4+) in one card, a 176px ring timer in emerald green, "up next" as a compact single line.
- ⚠️ Reminder from the audit: there's a known bug in `useWorkoutSession.ts` (`exTimer` never seeded — broken exercise timer). This is **not** part of this visual work — track it separately, but worth flagging to Claude Code so it doesn't accidentally "fix" it while passing through the file without review.

### Login (LoginPage.tsx / LandingPage.tsx)
- Replace the generic stock photo background (Unsplash) with a hand-drawn warm gradient — solves the visual goal and also addresses the duplicate background image reused across several screens.
- White/near-white login card with a deep shadow, labels at proper contrast (`#57534e`, not the too-faded `#a8a29e` on a light background).

### PremiumStore (PremiumStoreTab.tsx)
- 3 track cards: Calisthenics (owned, teal), Yoga (locked, amber), Kettlebell (locked, amber) — using the real descriptions from `catalog.ts`.
- ⚠️ Make sure the arrow direction on the "Go to workout" button is correct for RTL (a "forward" arrow in RTL points left, not right).

### Profile (ProfileTab.tsx)
- Hebrew labels for the stats (streak days / rank / workouts) instead of hardcoded English.
- The rank name itself (Silver/Gold/etc.) stays in English — it's a schema data value, not a UI-chrome label.
- Make sure the haptics toggle direction matches the real existing logic (`hapticsEnabled ? "left-1" : "right-1"`) — don't change behavior, just make sure the visuals match it.

### DiyBuilder (DiyBuilderTab.tsx) — includes a new feature
- Category filter row above the catalog: All / Kettlebell / Yoga / Strength / Mobility.
- A colored category tag on every exercise in the catalog (see color table above).
- A secondary "Save workout" button next to the existing "Start workout now" button.
- A "My Workouts" button/link in the screen header, leading to the new screen.

### MyWorkouts — entirely new screen
- List of saved workout cards: name, day, category tags (exercise count per category), "Start workout" / "Edit" buttons.
- "Build new workout" button at the bottom, returning to DiyBuilder.
- Requires new navigation (tab/route) — decide where it lives in `PatientShell.tsx` (a separate tab, or reachable only from within DIY Builder — the mockup currently assumes it's reachable only from DIY Builder, not from the main bottom nav).

### Landing (LandingPage.tsx) — desktop + mobile
- The real page today is nearly empty: just a hero title and two buttons on a generic stock photo (the same Unsplash photo reused elsewhere, already flagged in the audit). The mockup goes further: a full-bleed sunset background with a handstand-pose silhouette, darkened for legibility, with only the "OptimalMotion" wordmark near the top and the two CTAs ("כניסה למערכת" / "הרשמה למתאמנים") near the bottom — everything else was deliberately stripped out per explicit request, so don't add back a tagline or feature callouts.
- ⚠️ The mockup's background is a **hand-drawn CSS/SVG illustration**, not a photo — the design tool this was built in has no access to external images. Replace it with a real photo (someone in a handstand, warm sunset lighting, same darkened-overlay treatment for text legibility) when implementing — same composition, real image instead of the illustration.
- Two artboards (desktop 1440×900, mobile 390×844) since the real page is responsive (`md:` breakpoints) — implement one responsive component, not two separate pages.

### AdminExerciseLibrary + ProtocolBuilder (LegacyAdminApp.tsx admin console)
- Same dark sidebar across every admin screen (see "ground rules" #5 above for the light→dark reskin decision): "Optimal Motion" wordmark, 7 nav items with icons, active-state highlight, logout at the bottom. Build this as one shared sidebar component if it doesn't already exist as one — it's currently inlined per-tab in the monolith.
- **Exercise Library**: the "add new exercise" form (name/category, media URL, target + secondary muscles, admin tags, warning, clinical notes) redone as dark cards/sections instead of light `bg-blue-50`/`bg-red-50` panels — keep the same field structure and the `ADMIN_TAGS`/`AVAILABLE_MUSCLES` data sources, only the visual treatment changes. Grid of exercise cards below, each with a category badge (top-right on the thumbnail) and admin tag pills (with lock icon, matching the real "internal only" semantics).
- **Protocol Builder** — the most complex screen in the whole app: mode toggle (assign-to-patient / create-template), an AI-assist bar, a collapsed "automated periodization" banner (beta, stays collapsed by default — don't auto-expand it), a left-column draggable exercise list, and a right-column weekly timeline with 7 day drop-zones (populated ones show exercise chips with block/sets/reps-or-seconds/RIR fields + delete). Keep the existing `react-dnd`-less native drag-and-drop logic (`handleDragStart`/`handleDragOver`/`handleDrop`) — this is a visual reskin of that interaction, not a rebuild of it. Days must run ראשון→שבת (Sunday first) — a day-ordering bug was caught and fixed in the mockup, don't reintroduce it.

---

## New data layer required (DiyBuilder + MyWorkouts)

Unlike the other screens, these two are a **real feature, not just polish**:

1. **Exercise category**: every exercise needs a category field (one of 4 fixed values). Check whether Supabase's schema / `app/types/index.ts` already has a suitable field, and if not, add a column/enum. **Don't invent a schema without checking the existing structure first** (there may already be a similar taxonomy via `ADMIN_TAGS`/`AVAILABLE_MUSCLES` in `app/constants/catalog.ts`).
2. **Saving a DIY workout**: needs a new table/model (e.g. `patient_saved_workouts`) to store a built workout: name, day, exercise list, timestamps. Check appropriate RLS policies (Supabase Row Level Security) so each patient only sees their own saved workouts.
3. Recommended: Claude Code should **stop and propose a schema before writing any migration** — this is a structural change, not just UI.

---

## Reminder: bugs already flagged in the audit (not part of this work)

Don't touch these now, but keep them on the radar for later:
- Plaintext passwords + hardcoded admin login (`admin`/`admin`)
- `email_verified` never gets set to `true` — permanently blocks premium purchases
- Broken exercise timer (`exTimer` never seeded in `useWorkoutSession.ts`)
- No server-side auth boundary (single Supabase client with anon key) — this means RLS policies keyed on `patient_id` alone are not real protection without `auth.uid()` behind them (there's no Supabase Auth session to key off), so tables added since (e.g. `patient_saved_workouts`) were deliberately left at the same (lack of) protection level rather than faking a policy. **Real Supabase Auth + RLS across all patient-data tables needs to happen as its own dedicated pass before any real patient data goes into this app — not something to patch table-by-table.**

---

## Recommended workflow for Claude Code

1. Open a separate branch for this UI work (`git checkout -b ui-direction-patient`).
2. Go screen by screen, in this order: Main → WorkoutActive/Rest → Login → PremiumStore → Profile → Landing → DiyBuilder → MyWorkouts → AdminExerciseLibrary → ProtocolBuilder (patient app first since it's the primary experience; DiyBuilder/MyWorkouts pulled before admin since admin's Exercise Library and Protocol Builder both display exercise data DiyBuilder also touches; admin last since it's the largest single reskin).
3. After each screen: `npm run dev`, check it visually against the matching mockup on the canvas, commit.
4. For DiyBuilder + MyWorkouts: agree on the data layer (schema/migration) first, only then implement the UI.
5. Once the admin sidebar/shell is reskinned for AdminExerciseLibrary and ProtocolBuilder, apply the same dark treatment to the other 5 admin tabs using the established tokens and patterns — no mockup needed for those, per the scope note at the top of this brief.
6. At the end: `npm run lint` + `npm run build` to make sure nothing broke.
