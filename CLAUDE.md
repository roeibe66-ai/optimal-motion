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
  `AdminSidebar`, `AdminCoPilotDrawer`, ...)
- `app/components/patient/` — patient-facing app (`PatientShell` + tabs: `PlanTab`,
  `CalendarTab`, `DiyBuilderTab`, `MyWorkoutsScreen`, ...)
- `app/components/marketing/` — landing/login/register/reset-password pages
- `app/hooks/` — data & session hooks (`usePatientData`, `useAuthSession`,
  `useWorkoutSession`, `useSavedWorkouts`, `useReminders`, `useHaptics`,
  `usePlanSelection`, `useAIAssistantChat`, `useCuratedFacts`)
- `app/actions/` — server actions (`researchAgent.ts`, `aiAssistant.ts`)
- `app/constants/` — `translations.ts` (he/en `TRANSLATIONS` object), `catalog.ts`
  (exercise/muscle catalog)
- `app/utils/` — validation, premium, format, scoring helpers

**Data layer: Supabase, accessed directly from the client** via `app/lib/supabase.ts`
(there is only one copy now — a duplicate at repo-root `lib/supabase.ts` was removed;
always import from `app/lib/supabase.ts`). Tables in use: `patients`, `exercises`,
`packages`, `package_exercises`, `patient_exercises`, `workout_logs`, `curated_facts`.
Migrations live under `supabase/migrations/`.

**Auth is still custom, not Supabase Auth** — see `AUTH-MIGRATION-SPEC.md` for the
planned migration. **Known gap:** there is no server-side auth boundary; every table
is reachable via the public anon key, so RLS policies keyed on `patient_id` alone are
not real protection without `auth.uid()` behind them. Check `AUTH-MIGRATION-SPEC.md`
before touching auth or RLS policies.

**i18n**: single `TRANSLATIONS` object (`he`/`en`) in `app/constants/translations.ts`.
UI is RTL Hebrew by default (`app/layout.tsx` sets `lang="he" dir="rtl"`, Rubik font).

**In-progress work**: an AI assistant/coach feature (`app/actions/aiAssistant.ts`,
`useAIAssistantChat`, `AdminCoPilotDrawer`, `PatientCoachSheet`, `curated_facts` table)
may be uncommitted — check `git status` before assuming it's finished or merged.

**Deploy**: linked to Vercel (`.vercel/project.json`).

## Related docs

`PROJECT_BRIEF.md` (vision/design language), `UI-IMPLEMENTATION-BRIEF.md`,
`UX-AUDIT-REPORT.md`, `AUTH-MIGRATION-SPEC.md`.

## Known mistakes

`MISTAKES.md` is a running ledger of real bugs caught in this repo. Check it before
touching related code — especially anything involving Supabase column types, RLS, or
the Supabase client setup. Log a new entry there the moment a mistake is found or
fixed.
