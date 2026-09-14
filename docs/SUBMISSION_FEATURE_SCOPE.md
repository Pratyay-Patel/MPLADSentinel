# SIH PS-26102 National Submission — Feature Push Scope

Working doc for the time-constrained feature push ahead of the PS 26102 national submission (PPT + demo video). This is a checkpoint doc, not a full architecture doc — see `docs/architecture.md`, `docs/requirements.md`, `docs/round1-scope.md` for the long-term full-stack vision. **Those docs describe the eventual complete system; they are not a checklist that must be fully built before this submission.** Treat them as design/consistency reference only for this push.

See also `docs/SESSION_HANDOFF.md` for the competition context, the honest-framing rule, and the fabrication boundary — both still apply in full to everything below.

## Branch

All work for this feature batch happens on: **`feature/nationals-submission-frontend`**

## Competitor reference apps (for visual/UX inspiration only — do not copy layouts 1:1)

- Code Acers — MPLADS-AI / MoSPI Intelligence Dashboard: `sih26102-code-acers-mplads-ai.vercel.app`
- Nirikshak AI (Bharat Now Solutions) / "MPLADS e-SAKSHI 2.0": `bharatnowsolutions.com`

## Process rule — end of every feature

After implementing and verifying each feature (tsc + tests), always give the user:
1. **Manual test steps against the real backend** — exact clicks/routes/roles to check it themselves in a running app.
2. **A commit message** — the user runs `git commit` themselves (per CLAUDE.md §18, Claude never commits), so hand them a ready-to-use message, not just a description.

## Testing rule — real backend only, no demo build

**The `--mode demo` / local-fixture build must never be used to test features going forward** — real testing happens only against the real deployed backend (frontend on Vercel, backend on the AWS EC2 instance, or `npm run dev` locally against it), since that's what will actually be redeployed after this branch merges. Feature 1 was visually verified by this session using the demo build before this rule was set — that verification is superseded; the manual test steps below are real-backend only.

**Implication for how verification is split:** Claude verifies with `tsc --noEmit` and the test suite; the user does the actual in-browser check against the real backend, since Claude does not enter login passwords into forms (browser-automation rule, applies regardless of whose app or environment). If Claude ever needs to visually spot-check something itself, the user can sign in once in a shared browser tab and leave the session open for Claude to navigate within — never by handing over or having Claude type the password.

## Time-constrained build rule (from SESSION_HANDOFF.md, restated)

Prioritize building attractive, working **frontend** UI for each feature below. Where a feature needs real backend logic that isn't feasible in the time available, back the UI with sample/representative data — that's fine and normal. **Never claim in the PPT/video that a sample-data-backed screen reflects a real, tested, verified computation.** Each feature entry below states explicitly whether it's real end-to-end or frontend + sample data.

## Feature list (owner: this session/user's portion — portal-side only)

1. Color hues / light background accents on existing components — **in progress**
2. Warm/cool custom icons (not Canva-sticker style)
3. More borders / "bubbly" card styling (Nirikshak-AI-like)
4. Real map component on project lookup (location can stay hardcoded for now)
5a. Contractor–vendor collusion graph visualization
5b. Human-in-the-loop approve/reject UI + dual-authority sign-off (extends `AssignmentStatus`)
6. RBAC dropdown-only login modal (no real auth flow needed behind it)
7. Alerts and Notifications UI (send-notice action for high-risk projects)
8. De-duplication of works UI/flow

---

## Feature 1 — Color hues / light background accents

**Status: DONE, verified in-browser.** Real, fully-implemented feature (pure presentation — no backend, no sample-data caveat needed).

**Problem:** The dashboard reads as visually flat/monochrome compared to competitor references (uniform white cards, single blue icon-chip color everywhere), based on the ISIH round's own jury feedback and comparison against the two competitor apps above.

**Root cause (verified in code):**
- `frontend/src/styles/tokens.css` already defines full semantic color sets (`success` = green, `warning` = pale beige/amber, `info` = light blue, `danger` = red, each with fg/bg/border) — but they're barely used for visual variety.
- `MetricCard` (`frontend/src/ui/MetricCard.tsx`, styled in `frontend/src/ui/ui.css`) — the stat-tile component reused across **4 pages** (Dashboard `NationalOverview.tsx`, `RiskAlerts.tsx`, `CompareMps.tsx`, `AnalyticsPage.tsx`) — hardcodes every icon chip to the same flat `--color-brand-050`, regardless of what the metric represents.
- The dashboard's "anomaly cards" (`AnomalyCards.tsx`) are all flat `--color-surface-sunken` gray with no per-category distinction.

**Fix:**
1. Add an optional `tone` prop to `MetricCard`: `'brand' | 'info' | 'success' | 'warning'`, mapping the icon-chip background/color to the **existing** semantic tokens (no new colors invented — stays consistent with status badges elsewhere in the app).
2. Apply tones on the dashboard's top 4 metrics (`NationalOverview.tsx`): Total works → info (light blue), Recommended works → warning (beige), Completed works → success (light green), Recorded payments → brand (existing blue).
3. Apply tones where semantically sensible on `RiskAlerts.tsx`, `CompareMps.tsx`, `AnalyticsPage.tsx` metric rows.
4. Give `AnomalyCards.tsx` a matching per-category left-border/icon accent instead of flat gray.
5. **Not touched:** layout, spacing, card shape/border style (that's Feature 3), fonts, data/logic.

**Files touched:** `frontend/src/ui/MetricCard.tsx`, `frontend/src/ui/ui.css`, `frontend/src/pages/dashboard/sections/NationalOverview.tsx`, `frontend/src/pages/dashboard/sections/AnomalyCards.tsx`, `frontend/src/pages/dashboard/dashboard.css`, `frontend/src/pages/risk/RiskAlerts.tsx`, `frontend/src/pages/compare/CompareMps.tsx`, `frontend/src/pages/analytics/AnalyticsPage.tsx`.

**Implementation note (found mid-build, not in the original plan):** `MetricCard`'s tone only colored the icon chip — cards with no `icon` prop (all of `RiskAlerts.tsx`, half of `CompareMps.tsx`) showed no accent at all. Fixed by also applying the tone as a 3px top-border accent on the card itself, so it's visible with or without an icon. `AnomalyCards.tsx` cards get a left-border + tinted-background accent instead (cycled across 4 tones, since those are dynamic risk-factor cards, not a fixed set of 4 semantic categories).

**Verified:** `tsc --noEmit` clean; full `vitest` suite run — 284/286 pass, the 2 failures (`PlaceholderPage.test.tsx`) confirmed pre-existing and unrelated (reproduced with this feature's changes fully stashed out). Visually verified in-browser via the existing `--mode demo` persona-picker build (no backend needed) across Dashboard, Risk & Alerts, Compare MPs, and Analytics — all four pages show the intended distinct light-blue/beige/light-green/red accents, semantically mapped where the data has a real meaning (risk levels) and cycled for visual variety where it doesn't (comparison tiles, anomaly cards).

**Side discovery:** the `--mode demo` build already has a full RBAC-style **persona picker** (`LoginPage.tsx` + `DEMO_PERSONAS`) — a card grid to choose MoSPI/State/District/Auditor/MP/Citizen and enter with no real login. This overlaps heavily with planned Feature 6 ("RBAC dropdown-only login modal") — worth revisiting whether Feature 6 is largely already done, or just needs restyling from cards to a dropdown, when we get to it. (Not something to test/build against directly, per the real-backend-only testing rule above — it's cited here purely as a code-reuse note.)

**Post-review fixes (user caught these from screenshots, both real bugs):**
1. Compare MPs: "Highest fund utilisation" and "Lowest flagged share" were both `success` (duplicate adjacent color) — changed "Lowest flagged share" to `warning`.
2. Cards with no explicit `tone` (e.g. "Recorded Payments") rendered with an invisible transparent border, breaking visual consistency with their tone-bearing neighbors — fixed by making the default border color the existing brand blue instead of transparent, so every card always shows an accent.
3. Same duplicate-adjacent-color mistake found on Analytics ("Sanctioned (total)" and "Recorded payments" both `warning`) — removed the tone from "Recorded payments" so it uses the now-visible default brand border.
