# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Commands

- `npm run dev` — start the dev server (Next.js 16, Turbopack)
- `npm run build` — production build
- `npm run start` — run the production build
- `npm run lint` — ESLint (flat config, `eslint-config-next` core-web-vitals + typescript)

There is no test suite configured in this repo.

## Architecture

**Everything lives in one client component.** [app/page.tsx](app/page.tsx) (~2900 lines, `"use client"`) is effectively the whole app: landing page, admin console, and patient portal are all rendered from this single file, switched via a `currentView` state string (`"landing" | "admin" | "patient"`), not via routing. There is only one actual Next.js route (`/`) — [app/layout.tsx](app/layout.tsx) is the root layout (Hebrew `lang="he" dir="rtl"`, Rubik font, PWA manifest/theme-color). When making changes, expect to be editing large blocks of state/handlers/JSX within this one file rather than separate route or component files.

**Data layer: Supabase accessed directly from the client**, via [app/lib/supabase.ts](app/lib/supabase.ts) (imported in page.tsx as `../lib/supabase`). There are no API routes or server actions — every read/write is a `supabase.from(...)` call made straight from browser state using the public anon key. Tables in use: `patients`, `exercises`, `packages`, `package_exercises`, `patient_exercises`, `workout_logs`.

Note: a second, unused copy of the Supabase client exists at the repo-root [lib/supabase.ts](lib/supabase.ts) (identical content, not imported anywhere). Edit `app/lib/supabase.ts`, not the root one.

**Auth is custom, not Supabase Auth.** Admin login is a hardcoded `"admin"`/`"admin"` check in `handleLogin`. Patient login queries the `patients` table by email-or-phone plus a plaintext `password` column. The logged-in user is persisted client-side under the `optimalMotionUser` key in `localStorage` (if "remember me") or `sessionStorage`, and the current patient's assigned plan is additionally cached to `localStorage` under `om_offline_plan` for offline access.

**Domain model**, roughly:
- Admin builds a **library of exercises** (`exercises`) tagged by category/muscle/equipment (`ADMIN_TAGS`, `AVAILABLE_MUSCLES`, `EQUIPMENT_LIST` constants near the top of page.tsx).
- Exercises are grouped into **protocols/templates** (`packages` + `package_exercises`) or assigned directly to a patient (`patient_exercises`), organized by week/day/block (`DAYS_OF_WEEK`, blocks `A/B/C…`).
- Patients run assigned plans in a guided **workout mode** (rest timers, set/rep tracking, pain-before/RPE/pain-after feedback), which writes to `workout_logs`.
- `workout_logs` feeds the **progress charts** (recharts) and a rank/streak system (`getUserRank`).

**i18n** is a single inline `TRANSLATIONS` object (`he`/`en`) at the top of page.tsx; UI text is otherwise mostly hardcoded Hebrew strings throughout handlers (alerts, confirms), not routed through `TRANSLATIONS`.

**Notable libraries**: `react-body-highlighter` (muscle diagram, loaded via `next/dynamic` with `ssr: false`), `recharts` (progress charts), `lucide-react` (icons), Tailwind v4 via `@tailwindcss/postcss`.

**Deploy**: linked to Vercel (`.vercel/project.json`); this repo is not a git repository.
