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

## Testing rule — split by who's testing

- **Claude's own verification** (in-browser, before handing a feature back): the `--mode demo` / local-fixture build is fine and preferred — no login needed, fast, no credentials involved. Claude never enters a login password into a form regardless of build (browser-automation rule), so demo mode is what makes independent visual verification possible at all.
- **Manual test steps given to the user**: always against the real backend (`npm run dev` normally, real login) — that's the actual deployed system that will be redeployed after this branch merges, so that's what the user should be confirming.

## Time-constrained build rule (from SESSION_HANDOFF.md, restated)

Prioritize building attractive, working **frontend** UI for each feature below. Where a feature needs real backend logic that isn't feasible in the time available, back the UI with sample/representative data — that's fine and normal. **Never claim in the PPT/video that a sample-data-backed screen reflects a real, tested, verified computation.** Each feature entry below states explicitly whether it's real end-to-end or frontend + sample data.

## Feature list (owner: this session/user's portion — portal-side only)

1. Color hues / light background accents on existing components — **DONE, committed**
2. Warm/cool custom icons (not Canva-sticker style) — **DONE, verified**
3. More borders / "bubbly" card styling (Nirikshak-AI-like) — **DONE, verified**
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

---

## Feature 2 — Icons (warm/cool-toned, real-product style)

**Status: DONE, verified in-browser (demo build).** Real, fully-implemented feature (pure presentation — no backend).

**Finding:** the existing icon system (`frontend/src/ui/icons.tsx`) is already a proper 16px stroke line-icon set (`currentColor`, consistent weight) — not a Canva-sticker problem at all. The actual gap vs. the competitor references is **coverage**: `SectionHeader` (used ~30 times across the app) has no icon slot, so most section titles render as plain text with nothing next to them, unlike the competitor screenshots where nearly every heading/card has a colored icon chip.

**Plan:**
1. Add ~8 new icons to `icons.tsx`, reusing the existing stroke style: `BookIcon`, `MapPinIcon`, `NetworkIcon`, `CameraIcon`, `BellIcon`, `LockIcon`, `CopyIcon`, `CalendarIcon` — chosen to cover both this feature and upcoming ones (map, collusion graph, alerts, escrow, dedup).
2. Add optional `icon` + `tone` (same `StatusTone` used by `MetricCard`) to `SectionHeader`, rendering a small colored icon chip left of the heading.
3. Wire an icon + tone onto every existing `SectionHeader` call site, matched to what that section actually is (e.g. Financial intelligence → Rupee/warning, Risk signals → Alert-triangle/danger, Location → MapPin/info), reusing existing icons where they already fit.

**Not touched:** sidebar nav icons (stay monochrome — different component, active-state styling risk, not requested), `PageHeader` (page-level titles didn't have icons in the reference screenshots either — it was card/section grids that did). Audit page (`AuditPage.tsx`) already had its own per-event-kind colored icons (`EVENT_META`) — left untouched, already ahead of this feature.

**Files touched:** `frontend/src/ui/icons.tsx` (8 new icons), `frontend/src/ui/SectionHeader.tsx`, `frontend/src/ui/ui.css`, and the icon+tone wiring in: `dashboard/sections/{NationalOverview,AnomalyCards,FinancialIntelligence,RegionalInsight,RiskSignals,WorkDistribution}.tsx`, `analytics/AnalyticsPage.tsx`, `compare/CompareMps.tsx`, `citizen/CitizenProjectView.tsx`, `grievances/Grievances.tsx`, `inspections/InspectionsPage.tsx`, `assistant/AssistantPage.tsx`, `project-detail/{ProjectDetail,RiskInsights,PaymentsSection}.tsx` — roughly 30 `SectionHeader` call sites in total.

**Verified:** `tsc --noEmit` clean, `eslint` clean (no unused imports despite ~15 new icon imports across files), full `vitest` suite — 284/286 pass, same 2 pre-existing unrelated failures as Feature 1. Visually verified in-browser (demo build) on Dashboard (all sections), Compare MPs, and Analytics — icon chips render correctly with the intended tone colors and don't disturb layout.

---

## Feature 3 — Borders / "bubbly" card styling

**Status: DONE, verified in-browser (demo build) — colored borders confirmed on Dashboard's National overview cards and Risk factors detected cards; hover-lift confirmed via CSS inspection (pure :hover pseudo-class, so mouseout revert is guaranteed).**

**Clarified two separate things were being asked for:**
1. **At-rest border style** — user showed two competitor styles: Code Acers (bold black border + hard offset shadow, "neubrutalism") vs. Nirikshak (thin colored border per card, matched to what the card represents — red=risk/anomaly, amber=time-risk, green=AI/positive, blue=general info). **User chose the Nirikshak-style subtle colored border**, logically tone-matched — this is exactly Feature 1's existing tone system, just needs to go full-perimeter instead of top-only.
2. **Hover interaction** — user separately asked for cards to lift slightly on hover and settle back on mouse-out (not present in either static reference image, since that's an interaction, not a photo-able style). Added independently of the border-color decision.

**Implementation:**
- `MetricCard` (`ui.css` `.ui-metric`): border changed from `border: var(--border-strong); border-top: 3px solid <tone>` (gray sides, colored top only) to a full 2px border colored by tone on all sides — `border-color` override per tone instead of `border-top-color`.
- `AnomalyCards` (`dashboard.css` `.anomaly-card`): same change, from a 3px left-accent to a full 2px tone-colored border.
- `Card` (generic `.ui-card`, used ~40+ places for section wrappers) and `.dash-attention` (the "Projects requiring attention" hero panel): no tone concept (they wrap mixed content), so border unchanged — only the hover-lift added.
- **Hover-lift**, added to all four (`ui-card`, `ui-metric`, `anomaly-card`, `dash-attention`): `transition: transform 150ms ease, box-shadow 150ms ease`, `:hover { transform: translateY(-3px); box-shadow: var(--shadow-lg); }`.
- **Not touched:** the small `risk-summary__count` badge inside the Risk & Alerts warning banner, and the audit-timeline node glyph — neither is an independently-hoverable "card," so adding lift there would look noisy rather than purposeful.

**Verified:** `tsc --noEmit` clean, `eslint` clean.

**Implementation note (found mid-build, not in the original plan):** `MetricCard`'s tone only colored the icon chip — cards with no `icon` prop (all of `RiskAlerts.tsx`, half of `CompareMps.tsx`) showed no accent at all. Fixed by also applying the tone as a 3px top-border accent on the card itself, so it's visible with or without an icon. `AnomalyCards.tsx` cards get a left-border + tinted-background accent instead (cycled across 4 tones, since those are dynamic risk-factor cards, not a fixed set of 4 semantic categories).

**Verified:** `tsc --noEmit` clean; full `vitest` suite run — 284/286 pass, the 2 failures (`PlaceholderPage.test.tsx`) confirmed pre-existing and unrelated (reproduced with this feature's changes fully stashed out). Visually verified in-browser via the existing `--mode demo` persona-picker build (no backend needed) across Dashboard, Risk & Alerts, Compare MPs, and Analytics — all four pages show the intended distinct light-blue/beige/light-green/red accents, semantically mapped where the data has a real meaning (risk levels) and cycled for visual variety where it doesn't (comparison tiles, anomaly cards).

**Side discovery:** the `--mode demo` build already has a full RBAC-style **persona picker** (`LoginPage.tsx` + `DEMO_PERSONAS`) — a card grid to choose MoSPI/State/District/Auditor/MP/Citizen and enter with no real login. This overlaps heavily with planned Feature 6 ("RBAC dropdown-only login modal") — worth revisiting whether Feature 6 is largely already done, or just needs restyling from cards to a dropdown, when we get to it.

**Post-review fixes (user caught these from screenshots, both real bugs):**
1. Compare MPs: "Highest fund utilisation" and "Lowest flagged share" were both `success` (duplicate adjacent color) — changed "Lowest flagged share" to `warning`.
2. Cards with no explicit `tone` (e.g. "Recorded Payments") rendered with an invisible transparent border, breaking visual consistency with their tone-bearing neighbors — fixed by making the default border color the existing brand blue instead of transparent, so every card always shows an accent.
3. Same duplicate-adjacent-color mistake found on Analytics ("Sanctioned (total)" and "Recorded payments" both `warning`) — removed the tone from "Recorded payments" so it uses the now-visible default brand border.
