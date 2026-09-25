# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in
this repository.

## Commands

- `npm run dev` — start the dev server (Next.js 16, Turbopack)
- `npm run build` — production build
- `npm run start` — run the production build
- `npm run lint` — ESLint (flat config, `eslint-config-next` core-web-vitals + typescript)

There is no test suite configured in this repo.

## Architecture

This is a git repository (`main` branch), deployed to Vercel.

**`app/page.tsx` is a thin router**, not the app itself: it renders one of
`LandingPage`, `LoginPage`, `RegisterPage`, `ResetPasswordPage`, `PatientShell`, or
`LegacyAdminApp` based on `currentView` from `AuthContext` (`app/context/AuthContext.tsx`).
Actual feature code lives under `app/components/`, organized by domain:

- `app/components/admin/` — practitioner/admin console (`LegacyAdminApp`,
  `AdminSidebar`, `AdminCoPilotDrawer`, `ExerciseFormModal`, `MusclePicker`, ...).
  `LegacyAdminApp` is gradually shedding tabs into `app/components/admin/tabs/`
  (`ExerciseLibraryTab`, `ProgramLibraryTab`, `ProgramPdfExport`,
  `ProgramSimulatorModal`) — follow that precedent (extracted tab component +
  a shared `*FormModal`) rather than adding new inline tab blocks to the legacy file.
- `app/components/patient/` — patient-facing app (`PatientShell` + tabs: `PlanTab`,
  `CalendarTab`, `DiyBuilderTab`, `MyWorkoutsScreen`, `ExploreTab`, `PremiumStoreTab`,
  `ProfileTab`, ...)
- `app/components/marketing/` — landing/login/register/reset-password pages
- `app/hooks/` — data & session hooks (`usePatientData`, `useAuthSession`,
  `useWorkoutSession`, `useSavedPrograms`, `useWorkouts`, `useExerciseHistory`,
  `usePasskeys`, `useReminders`, `useHaptics`, `usePlanSelection`,
  `useAIAssistantChat`, `useCuratedFacts`)
- `app/actions/` — server actions (`researchAgent.ts`, `aiAssistant.ts`, `passkeyAuth.ts`)
- `app/constants/` — `translations.ts` (he/en `TRANSLATIONS` object), `catalog.ts`
  (exercise/muscle catalog)
- `app/utils/` — validation, premium, format, scoring helpers

**Data layer: Supabase.** Client-side reads/writes go through `app/lib/supabase.ts`
(anon key, RLS-enforced; there is only one copy — a duplicate at repo-root
`lib/supabase.ts` was removed). `app/lib/supabaseAdmin.ts` is a separate
`server-only` service-role client (bypasses RLS) used from server actions that
must run before a session exists, e.g. the passkey login lookup in
`app/actions/passkeyAuth.ts` — never import it from client code. Tables in use:
`patients`, `exercises`, `packages`, `package_exercises`, `patient_exercises`,
`workout_logs`, `patient_saved_programs`, `patient_passkeys`, `workouts`,
`workout_likes`, `curated_facts`, `exercise_internal_notes`. Migrations live under
`supabase/migrations/`.

**Auth is real Supabase Auth** (email/password + Google OAuth + WebAuthn passkeys),
not the old custom plaintext-password system — see `AUTH-MIGRATION-SPEC.md` for the
original plan; that migration is done (`AuthContext.tsx` drives session/routing off
`supabase.auth.onAuthStateChange`, `patients.user_id` links to `auth.users`, and a
`role` column replaces the old hardcoded admin-string check). RLS is enabled on every
patient-data table, scoped to `auth.uid()` via a `is_admin()` security-definer
function (see `20260829_patients_rls_and_admin_check.sql` onward) — there is now a
real server-side auth boundary. Check `AUTH-MIGRATION-SPEC.md` and the RLS
migrations before touching auth or policies, since the pattern (self-row-via-`user_id`
or `is_admin()`) needs to be followed consistently on any new patient-scoped table.

**i18n**: single `TRANSLATIONS` object (`he`/`en`) in `app/constants/translations.ts`.
UI is RTL Hebrew by default (`app/layout.tsx` sets `lang="he" dir="rtl"`, Rubik font).
Some per-exercise fields also carry an English variant column (e.g. `name_en`,
`description_en`) resolved via `getExerciseName`/`pickLangText` in `app/utils/format.ts`.

**In-progress work** (uncommitted as of this writing — check `git status`): extracting
the exercise-library admin tab into `ExerciseLibraryTab.tsx` + `ExerciseFormModal.tsx`
(replacing an inline block in `LegacyAdminApp.tsx`), plus new nullable
`description_en`/`patient_cues_en`/`common_mistake_en` columns on `exercises`
(migration already applied to the live Supabase project). There's also an untracked
one-off `scripts/add_exercises_from_sheet.py` for bulk-importing exercises from a
Google Doc via the admin UI — not part of the app itself.

**Deploy**: linked to Vercel (`.vercel/project.json`).

## Related docs

`PROJECT_BRIEF.md` (vision/design language), `UI-IMPLEMENTATION-BRIEF.md`,
`UX-AUDIT-REPORT.md`, `AUTH-MIGRATION-SPEC.md`.

## Known mistakes

`MISTAKES.md` is a running ledger of real bugs caught in this repo. Check it before
touching related code — especially anything involving Supabase column types, RLS, or
the Supabase client setup. Log a new entry there the moment a mistake is found or
fixed.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
