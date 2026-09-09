# Full-Site UX/UI Audit Report (2026-09-03)

Per `claude/ux-audit-request.md`: read-only pass, no code changed. Every screen/component in the app was read against the token system documented in `ui-implementation-brief.md` and against the app's own established conventions (RTL direction rules, accessibility patterns already done correctly elsewhere). Known/deliberate items already logged elsewhere (the video-review "room" being an intentional mockup, the AI-assist bar and periodization panel being intentional betas awaiting the real Tier 3 AI work, `clinical_notes`/`patient_cues` dead columns, the non-mocked Detail/summary screen structure) are not re-flagged here.

Findings are grouped by risk/effort, per the request's ranking rule. Each item names the exact file so a fix is a quick lookup, not another investigation.

---

## Small polish — low risk, quick fixes

**1. Week switcher arrows point the wrong way (`app/components/patient/tabs/PlanTab.tsx`, ~line 129-147).**
The "previous week" button renders an unrotated `ChevronLeft` (points left) and "next week" renders `ChevronLeft` with `rotate-180` (points right). That's backwards from the app's own established RTL convention — confirmed by two independent references in the very same codebase: `CalendarTab.tsx`'s month switcher does it correctly (prev = `ChevronRight`, pointing right; next = `ChevronLeft`, pointing left), and `MyWorkoutsScreen.tsx` has an explicit code comment stating the rule ("ChevronRight, not Left: this is a back action, and in RTL that points right"). Fix: swap which button gets the rotation so it matches `CalendarTab`'s pattern.

**2. Language toggle missing on two of the four auth screens.** `LoginPage.tsx` and `LandingPage.tsx` both show a Hebrew/English toggle button; `RegisterPage.tsx` and `ResetPasswordPage.tsx` have none at all. A user who switched to English on the landing page has no way to switch back (or forward) once they reach Register or Reset Password.

**3. Login's primary button color doesn't match Register/Reset Password's.** `LoginPage.tsx`'s submit button is `bg-stone-900` (near-black); `RegisterPage.tsx` and `ResetPasswordPage.tsx` (same visual family, same white card) both use `bg-teal-500` for their primary CTA. Same is true of Login's "send reset link" button inside its own forgot-password sub-view. Worth picking one and applying it across all three.

**4. `WorkoutFinishFlow.tsx` shifts background shade mid-flow.** The "rpe" and "pain_after" steps use `bg-stone-900`; the "done" step (same flow, same component, immediately after) uses `bg-stone-950` — which is also what the rest of the app treats as its base background. Three sequential full-screen steps of one linear flow shouldn't visibly change base shade partway through. Recommend `bg-stone-950` throughout, matching `PreWorkoutFlow.tsx`'s two steps (which are already consistent with each other).

**5. Reminder day-picker uses purple for "selected"; everywhere else in the app uses teal.** In `ProfileTab.tsx`'s notification-days row, the selected state is `bg-purple-500`. Every other selection control in the app — bottom nav active tab, DIY category/body-part "all" chips, the Calendar tab's "today" ring, admin's active-tab pill — uses teal for "this is selected/active." Purple elsewhere on the same screen (the notification icon's `bg-purple-500/20` chip, a decorative background blur) is a fine category color; only the toggle's *selected state* reads as inconsistent.

**6. One place in the app uses raw emoji instead of the icon system.** `LegacyAdminApp.tsx`'s "עריכת תוכניות" tab (~line 1862) shows "⏱️ שניות:" / "🔄 חזרות:" — literal emoji characters. Everywhere else, including two other places in this same admin console that show the same is-it-time-or-reps distinction, uses either plain text or a `lucide-react` icon. Swap for a `Clock`/`Repeat` icon to match.

**7. A tap target well under standard size.** The "remove exercise" × button on `DiyBuilderTab.tsx`'s selected-exercise chips (~line 237) is `w-4 h-4` — 16×16px. Standard touch-target guidance calls for at least ~24px, ideally closer to 44px. Easy fix: bump the button (or its invisible padding) up; `MyWorkoutsScreen.tsx`'s equivalent delete button, at `w-8 h-8` (32px), is a closer-to-reasonable reference already in the app.

**8. Admin sidebar's "video reviews" badge is hardcoded to "1."** `AdminSidebar.tsx` line 80 renders a literal `1` in the notification-count badge, not a real count. It'll say "1" whether there are zero pending reviews or five. Low-risk visual fix once (or if) that tab gets real data.

---

## Bigger changes — need their own pass, not spot-fixes

**1. The category "Detail/summary" screen is entirely in English, in an otherwise all-Hebrew/RTL app.** `PlanTab.tsx`'s detail view (reached by tapping into a track, ~lines 300-428) shows "Details," "Classic," "Week X - Session Y," "Full body," "START SESSION," "Block A (Super-Set)" — every label on the screen. The code's own comment marks this as the one screen no mockup ever covered. This is the single most visible inconsistency in the app (every patient sees it on the way to actually training), and it needs a real Hebrew content pass across the whole screen, not a one-line fix.

**2. The Hebrew/English language toggle is a partial implementation with a real RTL gap.** Two separate but related issues: (a) `app/constants/translations.ts` only covers ~26 chrome strings (nav labels, a handful of workout terms) — the overwhelming majority of visible copy across every screen is hardcoded Hebrew literals that the toggle doesn't touch at all, so switching to English currently changes very little of what's on screen; and (b) more importantly, the marketing/auth screens (`LoginPage`, `RegisterPage`, `LandingPage`, `WorkoutPlayer`, `PreWorkoutFlow`, `WorkoutFinishFlow`) all correctly compute `dir={lang === "he" ? "rtl" : "ltr"}` on their own root — but `PatientShell.tsx` and every tab it renders (`PlanTab`, `CalendarTab`, `DiyBuilderTab`, `ProfileTab`, `MyWorkoutsScreen`, `PremiumStoreTab`) never do. They only ever get `dir="rtl"` from the hardcoded `<html lang="he" dir="rtl">` in `layout.tsx`. So switching to English while inside the patient app (the toggle lives in `ProfileTab`, reachable from inside the patient app itself) would leave the *entire* main app in RTL layout regardless of the switch. This needs a scoping decision — finish real i18n and fix the `dir` gap, or scale back the toggle's visible surface (e.g. hide it inside the patient app, or clearly mark it as chrome-only) until it's actually ready — rather than a quick patch.

**3. Two settings rows in `ProfileTab.tsx` are dead ends that look identical to the working rows around them.** "ניהול מנוי פרימיום" (premium management) and "חשבוניות וקבלות" (invoices/receipts) have no `onClick` at all — the code comment confirms they were "ported as-is... not wired to anything." Visually they're indistinguishable from "שפת מערכת" or "התנתק מהמערכת" right below them: same hover state, same trailing chevron implying navigation. A patient taps one expecting something and nothing happens, with no signal it was never going to. Needs a product call — build them, or visibly mark them disabled/"coming soon" (dim the row, drop the chevron, maybe a small badge) so the UI stops promising something that isn't there.

**4. Form inputs across the app rely on placeholder text alone, with no `<label>`.** Every text input in `LoginPage.tsx`, `RegisterPage.tsx`, `ResetPasswordPage.tsx`, and `DiyBuilderTab.tsx`'s workout-name field, uses only a `placeholder` attribute — no associated `<label>`. That's a real accessibility gap (the hint disappears the moment someone starts typing, and screen readers have nothing to announce). It's also an internal inconsistency: the admin console (`LegacyAdminApp.tsx`) does this correctly throughout, with a real `<label>` above every field. Worth a pass to bring the patient/marketing side up to the same standard already established on the admin side.

**5. Icon-only buttons without `aria-label` are scattered across the app.** Concrete examples: `PlanTab.tsx`'s "back" chevron and "more" button on the Detail screen (~lines 303-309), `WorkoutPlayer.tsx`'s close (×) button (~line 123). The app already knows how to do this right in other places — `WorkoutPlayer.tsx`'s make-easier/make-harder buttons and `MyWorkoutsScreen.tsx`'s delete button both carry a proper `aria-label` — so this is a consistency gap to close, not a pattern to invent from scratch.

**6. Focus states are a bottom-border color change only, everywhere.** Virtually every text input in the app (`focus:border-teal-500`, paired with `outline-none` removing the browser default entirely) signals keyboard focus with just a 2px border-color shift on one edge. That's a weaker, less visible indicator than a full outline/ring, and it's applied uniformly enough across every form in the app that it reads as a deliberate pattern rather than an oversight — worth a deliberate decision (e.g. add a subtle focus ring alongside the border-color change) applied once, everywhere, rather than per-screen.

---

## One structural observation (its own conversation, not a bug)

The token table in `ui-implementation-brief.md` (`--bg-app`, `--card`, `--teal`, etc.) doesn't correspond to any real CSS custom properties — `app/globals.css` is untouched Next.js boilerplate with none of them defined. Every one of those values is duplicated as a literal hex code or Tailwind arbitrary-value class across roughly twenty component files, with no single source of truth. In practice the app is visually *very* consistent — this pass found only the handful of drift points listed above, on nearly twenty files reviewed by hand — which says the discipline has genuinely held up so far. But that consistency is currently a matter of care, not of the codebase preventing drift; worth its own conversation about whether to formalize the token table as real CSS variables (or a Tailwind theme extension) at some point, flagged separately per the audit's own ground rules rather than folded into a "fix."

---

## What was reviewed

Marketing/auth: `LandingPage`, `LoginPage`, `RegisterPage`, `ResetPasswordPage`, `PasswordFieldsWithStrength`. Patient: `PatientShell`, `PlanTab`, `CalendarTab`, `DiyBuilderTab`, `MyWorkoutsScreen`, `PremiumStoreTab`, `ProfileTab`. Workout flow: `WorkoutPlayer`, `PreWorkoutFlow`, `WorkoutFinishFlow`, `ExerciseInfoModal`, `BodyDiagram`. Shared UI: `Modal`, `RatingScale`. Admin: `LegacyAdminApp` (all 7 tabs), `AdminSidebar`. `globals.css` and `layout.tsx` for the token/font/dir baseline.
