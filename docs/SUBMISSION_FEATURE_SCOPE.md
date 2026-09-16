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
4. Real map component on project lookup (location can stay hardcoded for now) — **DONE, verified**
5a. Contractor–vendor collusion graph visualization — **DONE, verified (reframed as real vendor-concentration HHI, see below)**
5b. Human-in-the-loop approve/reject UI + dual-authority sign-off (extends `AssignmentStatus`) — **DONE, verified (written-confirmation gate, plus the full real dual-authority sign-off backend + frontend, see Feature 6 below)**
6. RBAC dropdown-only login modal (no real auth flow needed behind it) — **DONE, verified** (see "Feature 6b" below; real-mode signs out + redirects to `/login` rather than skipping auth)
7. Alerts and Notifications UI (send-notice action for high-risk projects) — **DONE, verified, full backend + frontend** (see below)
7.5. Recommend a Work — citizen e-SAKSHI-style work recommendation — **DONE, verified, full backend + frontend** (added mid-session, not in the original 8; see below)
7.6. Citizen photo upload for Grievances & Recommend a Work — **DONE, frontend-only, verified** (added mid-session, not in the original 8; see below)
8. De-duplication of works UI/flow — **DONE, verified, full backend + frontend** (see below)
9. National "Works across India" dashboard bubble map → replaced with a real Leaflet/OSM map — **DONE, verified** (added mid-session, not in the original 8; see below)

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

---

## Feature 4 — Real map on project lookup

**Status: DONE, verified in-browser (demo build).** Frontend-only, no backend needed.

**Data-availability check (done before building, per CLAUDE.md §8 anti-hallucination rule):** `docs/data-source.md` §13.11 states explicitly: "Geo coordinates (lat/long) | NOT PROVIDED | none anywhere." Only free-text `state`, `district`, `location` strings exist per work — never real coordinates. So exact per-work site mapping is impossible with real data.

**Decision (user-approved):** state-level real centroid — the map centres on the project's actual `state` field using genuine (not fabricated) approximate state-centroid coordinates. Different states show visibly different map positions; this is honestly labelled as approximate, never claimed as the exact work site.

**Implementation:**
- Found and reused **existing** infrastructure instead of duplicating it: `coordForState()` in `frontend/src/ui/indiaGeo.ts` already has real lat/lon centroids for all 28 states + 8 UTs (previously only used by the schematic `IndiaBubbleMap` dashboard widget) — and `RISK_LEVEL_COLOR` in `riskColors.ts` already defines the exact HIGH/MEDIUM/LOW/UNKNOWN colors used everywhere else in the app (`RiskLevelBadge`, `RiskSignals` donut).
- New component `frontend/src/ui/ProjectLocationMap.tsx`: a real Leaflet map (OpenStreetMap tiles, pan/zoom, zoom +/- controls — same as the reference screenshot) using `react-leaflet`. A `CircleMarker` (not the default Leaflet pin icon, which needs bundler-specific image-path workarounds) is colored by `riskLevel` when provided, or a neutral brand blue otherwise. A permanent tooltip labels the state + district. A caption always states: *"Approximate — centred on `<state>`. Exact work-site coordinates are not available in the source data."*
- Wired into `ProjectDetail.tsx`'s existing "Location" card, right after the existing free-text location fields. `riskLevel` is only passed through when `showRisk` is true (the page's existing role-based risk-visibility gate) — so the map never leaks risk information to a role that isn't already shown risk elsewhere on the page.
- New dependencies: `leaflet`, `react-leaflet` (v5, React-19-compatible), `@types/leaflet` (dev).

**Real bug found and fixed mid-build:** jsdom (the test environment) has no real layout engine, so Leaflet's vector-renderer picking threw (`Cannot use 'in' operator to search for '_leaflet_id' in null`) as soon as the map mounted, breaking 3 existing `ProjectDetail.test.tsx` tests that don't even test map behavior. Fixed by mocking `react-leaflet` with plain passthrough elements in `src/test/setup.tsx` (renamed from `.ts` since it now contains JSX) — a standard, documented pattern for testing components that wrap map libraries.

**Verified:** `tsc --noEmit` clean, `eslint` clean, full `vitest` suite back to the same 2 pre-existing unrelated failures (no regressions). Visually verified in-browser (demo build): a HIGH-risk Maharashtra project shows a red pin correctly centered on Maharashtra; an UNKNOWN-risk Uttar Pradesh project shows a gray pin over Uttar Pradesh; opening the same project via the register's `?section=record` link (risk hidden) shows a neutral blue pin, confirming the RBAC gate on risk-coloring works.

**Not done / explicitly out of scope for now:** adding the same map to the citizen-facing public project view (`CitizenProjectView.tsx`) — citizens don't see risk scores by design, so it would need a neutral-only variant. Raise this if you want it added too.

**Post-review change (user-requested):** the two on-screen disclaimer lines ("Location is recorded as a free-text description..." above the map, and "Approximate — centred on `<state>`..." below it) were removed for a cleaner look. **The underlying behavior is unchanged** — the map still only shows a state-level approximation, not the exact work site — this only removes the visible caveat text. Worth remembering if a judge asks how precise the map is: the honest answer (state-level, not exact site) is no longer stated in the UI itself, so it may need to be said verbally in the demo.

---

## Feature 9 — National dashboard map: bubble map → real Leaflet map

**Status: DONE, verified in-browser (demo build).** Frontend-only. Not one of the original 8 numbered features — added mid-session after the user saw the individual-project Leaflet map (Feature 4) and wanted the same treatment applied to the "Works across India" national dashboard widget, which had been a schematic SVG bubble map.

**User's spec:** replace the SVG map with a real Leaflet/OpenStreetMap map, same functionality (one bubble per state sized by work count, hover shows the risk-level breakdown), bubbles must stay a **single blue hue only** (not colored by risk), inspired by a competitor's "National Risk Map" screen.

**Implementation:**
- New component `frontend/src/ui/IndiaLeafletMap.tsx`, replacing `IndiaBubbleMap.tsx` (deleted — confirmed zero other call sites first) at its one usage site, `RegionalInsight.tsx` on the dashboard.
- Reuses the same real state-centroid coordinates (`coordForState()` in `indiaGeo.ts`) as Feature 4's per-project map — one shared source of truth for state positions across both features.
- `CircleMarker` per state, radius scaled by `sqrt(works / maxWorks)` (same formula as the old SVG version), single brand-blue hue (`--color-brand-500`) with translucent fill — never risk-colored, per the explicit "blue only" instruction.
- Hover shows a `react-leaflet` `Tooltip` with the same content as before: state name, work count, and `<N> high · <N> medium · <N> low` — reusing the existing `.india-map__tip-*` CSS classes for identical typography.
- **Cleanup:** deleted `IndiaBubbleMap.tsx` (dead after the swap) and pruned `indiaGeo.ts` down to only what's still shared (`STATE_COORDS`, `coordForState`) — removed the schematic-projection-only helpers (`projectLat`, `projectLon`, `MAP_VIEW_W/H`, the outline polygon) that existed solely to draw the old SVG map and had no other callers.

**Verified:** `tsc --noEmit` clean, `eslint` clean, full `vitest` suite — 284/286 pass (same 2 pre-existing failures; one additional AuditPage test failure during one run was confirmed flaky/unrelated by re-running it in isolation, where it passed). Visually verified in-browser (demo build): real pannable/zoomable OSM map renders with translucent blue bubbles sized by state work-count; hovering a bubble (tested on Rajasthan) shows the correct "4 works · 1 high · 2 medium · 1 low" tooltip, matching the old SVG map's behavior exactly.

---

## Feature 5a — Contractor–vendor "collusion graph" → reframed as real Vendor Concentration (HHI)

**Status: DONE, verified.** Real, live-computed feature — no sample/mock data, no backend needed.

**Why this isn't the literal competitor screenshot:** the competitor's graph shows a *shared director linking multiple distinct companies* — a claim that would need real company-registry data (MCA21) we don't have anywhere in this project. Using **real vendor names** to depict a **fabricated cross-company link** would be an unsupported accusation against actual named businesses — a materially different, more serious problem than the earlier "don't overclaim feature completeness" issue, and one this session declined to build regardless of whose product does it. This was raised and discussed with the user before building.

**What's real instead:** the user provided real payment data for a real work (#1991, Hoshiarpur) showing vendor **"MS AMAN ENTERPRISES"** receiving 8 of 20 installments. That's a genuine, already-loaded (`payments` prop already fetched for every Project Detail page), zero-new-data signal — good enough to compute an actual **Herfindahl-Hirschman Index** over vendor payment share within a single work, using the standard formula and the standard DOJ/FTC concentration thresholds (<1500 not concentrated, 1500–2500 moderately, ≥2500 highly). Verified against the user's real numbers: **HHI = 4861, "Highly concentrated"**, dominant vendor 68.4% share (₹3,42,000 of ₹5,00,000) — this is a real calculation, not a mockup number, and it works automatically for **every** work with ≥2 named vendors in its payment installments, not just this one example.

**Implementation:**
- `frontend/src/pages/project-detail/vendorConcentration.ts` — pure function `computeVendorConcentration(payments)`: groups payments by vendor name, computes each vendor's % share of the work's total recorded amount, computes HHI, returns `null` when there are fewer than 2 named vendors (nothing meaningful to show).
- `frontend/src/pages/project-detail/VendorConcentrationGraph.tsx` — renders a hub-and-spoke layout (this work as the hub, vendors as spoke cards below, tone-colored by share: ≥40% danger, ≥20% warning, else neutral — reusing the tone system from Features 1/3), capped at 6 vendors shown + "+N more" for the rest, with an HHI badge and an explicit "indicator for review, not proof of collusion" caption (same honesty framing used everywhere else in the app, e.g. `RiskInsights`).
- Wired into `ProjectDetail.tsx` right after the Payments section, gated by the same `showRisk` RBAC flag as the risk panel and the map's risk-coloring (Feature 4) — this is risk-adjacent analysis, so it follows the same visibility rule.
- Icon: reused the `NetworkIcon` already added in Feature 2 — no new icon needed.

**Real bug found and fixed during visual verification:** the hub-and-spoke CSS drew a small vertical "stem" line above each vendor card up to a shared horizontal bridge line — this looked right for a single row, but for vendors that wrapped to a second row, their stems pointed into empty space above them instead of reaching the bridge (which only exists above row 1), making them look disconnected. Fixed by removing the per-card stems and keeping only the single shared bridge line, which reads correctly regardless of how many rows the vendor cards wrap to.

**Verification method:** wrote 2 automated tests using the user's real numbers — `vendorConcentration.test.ts` (checks the HHI math: HHI=4861, top vendor 68.4%/₹3,42,000, total ₹5,00,000, 12 distinct vendors) and `VendorConcentrationGraph.test.tsx` (checks the component renders those numbers correctly). For the visual/CSS check specifically (no multi-vendor example exists in the demo fixtures — every demo work has exactly one vendor), the real numbers were temporarily substituted into one demo fixture, viewed in-browser, the wrapping bug above was found and fixed, and the fixture was then fully reverted (`git diff` confirmed clean) before finishing. `tsc --noEmit` clean, `eslint` clean, full `vitest` suite 288/290 pass (same 2 pre-existing unrelated failures).

**Post-review polish round (user request, referencing more competitor screenshots):**
1. **Animated "flowing" dashed connector lines + colored hover halo** — done, pure visual polish, no honesty concerns. Required reworking the vendor row from `flex-wrap` (multiple rows) to a single always-one-row horizontal-scroll strip first, so each card's animated connector line always lines up correctly with the shared bridge line above it (the old wrapping version had the exact bug this reasoning predicts — confirmed and avoided).
2. **"Bipartite graph" terminology** — added to the caption ("A work-vendor bipartite graph: this work on one side, its vendors on the other..."). This is accurate, not a stretch: a work connected to multiple vendors, with no edges within either side, is structurally a bipartite graph. Did **not** add "NetworkX" anywhere, since that's a specific real library this project doesn't use — saying so would be a false technical claim, unlike the structurally-true "bipartite" description.
3. **Real risk score added to the hub** — the work's own already-computed risk score (0-100, same number shown in the Risk Assessment card elsewhere on the page) now also appears as a second badge next to the HHI badge. Zero new computation — just surfacing an existing real number in one more place.
4. **Declined: a fabricated "collusion %"** — the competitor's "95% COLLUSION" figure has no real formula behind it (HHI measures payment concentration, not collusion likelihood; there is no computation anywhere in this project for "collusion probability"). Explained to the user why this is a materially different, more serious problem than the earlier honest-framing questions (it's inventing a finding, not relabeling a real one) and it was not added to the real HHI graph. If this number is wanted for the PPT/video specifically, that would need to be raised and decided explicitly — it is not present in the shipped UI.

**Follow-up: full visual redesign of the "Next Milestone" preview to closely match the competitor's cluster-diagram screenshot** (user request, with a reference screenshot). Rebuilt `CartelDetectionPreview.tsx` from the earlier simple 3-tier list into a proper diagram: header with icon, a colour-coded legend row (contractor/director/work), a director node with dashed pink lines fanning to 3 contractor boxes, then a criss-crossing lattice of solid/dashed lines down to 3 work-ID boxes with one highlighted — built as inline SVG lines + absolutely-positioned HTML nodes over a fixed-aspect-ratio canvas (positions derived from a single set of viewBox constants, so the SVG lines and HTML boxes always agree).

**One request declined, explained to the user, and a fictional-only design used instead:** the user asked to use the *real* vendor names from the HHI graph above (MS AMAN ENTERPRISES, etc.) in this diagram, keeping only the director name fictional. Declined — pairing a real, identifiable company name with a fabricated cross-tender collusion scheme and a fictional director would be an unsupported accusation against a real business, even inside a box captioned "illustrative." Built with an entirely fictional director + 3 fictional contractors (Shivalik Infra Projects, Ganges Valley Constructions, Himgiri Buildwell — carried over from the first version) and fictional "MPLAD-DEMO-#" work IDs instead, so every name and number in the diagram is self-consistently fictional.

**Real bug found and fixed during visual verification:** the director node's box height was too short for its 3 lines of text (name / "Common director" / "95% signature match (example)") combined with `overflow: hidden`, silently clipping the third line. Fixed by increasing the director node's height in the layout constants.

**Verified:** `tsc --noEmit` clean, `eslint` clean, full `vitest` suite 288/290 (same 2 pre-existing unrelated failures). Visually verified in-browser (demo build, via the same temporary-fixture-then-revert method as before, confirmed `git diff` clean afterward) — diagram renders correctly, text no longer clips, lines connect correctly to every node.

**Follow-up round 2 (user request):**
1. **Declined again, same reasoning:** using the real vendor names (MS AMAN ENTERPRISES etc.) *and* real ingested work IDs in this fabricated cross-tender/common-director diagram, specifically because it would "look more real." Explained this makes it riskier, not safer — a viewer has no way to tell it's fictional once built from real names and real IDs. Agreed compromise: keep names/IDs fictional, but format the work IDs realistically (`MPLAD-45213` style instead of `MPLAD-DEMO-1`) so it's visually polished without being mistakable for a real record.
2. **Flowing animated dashed lines** added to the diagram's connector edges (`stroke-dashoffset` keyframe animation), matching the real HHI graph's vendor-node connector animation. Solid "strongest tie" lines don't animate (no dash pattern to animate) — only the dashed ones flow.
3. **Hover lift + colored glow** added to every node in the diagram (director/contractor/work), same pattern as the real graph's vendor-node hover treatment.
4. **Given its own title and Card**, matching "Vendor concentration (HHI)" — split out of the shared Card into its own `<Card>` + `<SectionHeader title="Cross-tender cluster detection" ...>`, with the "Architected — next milestone..." text moved into the SectionHeader's description. Removed the outer grey dashed wrapper the mockup used to sit in — it now sits directly on the Card's white background with only the diagram's own normal (non-dashed, non-grey) border, exactly like the real graph above it.

**Verified:** `tsc --noEmit` clean, `eslint` clean. Full `vitest` suite showed a transient 3rd failure (`AppShell.test.tsx`) under concurrent load from the browser verification sessions — confirmed via `git stash` that this failure **pre-exists on the clean committed tree** with none of today's changes applied, so it's unrelated; a clean re-run afterward returned to the standard 288/290 (2 pre-existing failures). Visually verified in-browser (demo build, same temporary-fixture-then-revert method, `git diff` confirmed clean afterward): new title renders correctly, grey box is gone, hover lift + colored glow confirmed on a contractor node.

**Implementation note (found mid-build, not in the original plan):** `MetricCard`'s tone only colored the icon chip — cards with no `icon` prop (all of `RiskAlerts.tsx`, half of `CompareMps.tsx`) showed no accent at all. Fixed by also applying the tone as a 3px top-border accent on the card itself, so it's visible with or without an icon. `AnomalyCards.tsx` cards get a left-border + tinted-background accent instead (cycled across 4 tones, since those are dynamic risk-factor cards, not a fixed set of 4 semantic categories).

**Verified:** `tsc --noEmit` clean; full `vitest` suite run — 284/286 pass, the 2 failures (`PlaceholderPage.test.tsx`) confirmed pre-existing and unrelated (reproduced with this feature's changes fully stashed out). Visually verified in-browser via the existing `--mode demo` persona-picker build (no backend needed) across Dashboard, Risk & Alerts, Compare MPs, and Analytics — all four pages show the intended distinct light-blue/beige/light-green/red accents, semantically mapped where the data has a real meaning (risk levels) and cycled for visual variety where it doesn't (comparison tiles, anomaly cards).

**Side discovery:** the `--mode demo` build already has a full RBAC-style **persona picker** (`LoginPage.tsx` + `DEMO_PERSONAS`) — a card grid to choose MoSPI/State/District/Auditor/MP/Citizen and enter with no real login. This overlaps heavily with planned Feature 6 ("RBAC dropdown-only login modal") — worth revisiting whether Feature 6 is largely already done, or just needs restyling from cards to a dropdown, when we get to it.

**Post-review fixes (user caught these from screenshots, both real bugs):**
1. Compare MPs: "Highest fund utilisation" and "Lowest flagged share" were both `success` (duplicate adjacent color) — changed "Lowest flagged share" to `warning`.
2. Cards with no explicit `tone` (e.g. "Recorded Payments") rendered with an invisible transparent border, breaking visual consistency with their tone-bearing neighbors — fixed by making the default border color the existing brand blue instead of transparent, so every card always shows an accent.
3. Same duplicate-adjacent-color mistake found on Analytics ("Sanctioned (total)" and "Recorded payments" both `warning`) — removed the tone from "Recorded payments" so it uses the now-visible default brand border.

---

## Feature 5b — Human-in-the-loop approve/reject (written confirmation)

**Status: DONE, verified.** Real, fully end-to-end feature — not sample data, not a mockup.

**Scope decision:** of the two consequential `AssignmentStatus` transitions (`COMPLETED`, `CANCELLED`), only these now require confirmation — `IN_PROGRESS` is a routine step and still applies immediately. "Dual-authority sign-off" (a *second* authority approving before an action is final) is a separate, larger change to `AssignmentStatus`/the backend and was **not** built here — this feature is the written-confirmation gate only.

**What's real, not just UI theater:** `AssignmentPatch` already had a real `note` field, previously only set when an inspection is first requested, and already displayed on the real Audit Trail (`AuditPage.tsx`). This feature extends that same real field: the justification typed into the new confirmation dialog is persisted via the existing `service.updateAssignment(id, { status, note })` call and genuinely shows up on the Audit Trail afterward — confirmed by end-to-end testing (typed a real justification, saw it appear on the Audit Trail page after a real, separate client-side navigation).

**New reusable UI primitives** (neither existed before):
- `frontend/src/ui/ConfirmDialog.tsx` — a GitHub-delete-repo-style confirmation: the action stays disabled until the user types an exact confirmation word (`COMPLETE` / `CANCEL`) **and** writes a non-empty justification.
- `frontend/src/ui/Toast.tsx` — a floating, auto-dismissing (4s) notification, replacing the old plain inline text line.

**Wired into:**
- `frontend/src/pages/inspections/InspectionsPage.tsx` — the status `<Select>`'s `onChange` now calls `requestStatusChange()`, which opens `ConfirmDialog` for COMPLETED/CANCELLED and applies IN_PROGRESS immediately as before. On confirm, `advance(assignment, status, justification)` calls the real service and shows the `Toast`.
- `frontend/src/pages/audit/AuditPage.tsx` — fixed a real correctness issue found while wiring this up: the assignment's `note` was always shown under the "Inspection requested" event, which would be misleading once notes also get written at completion/cancellation time. Now the note shows under whichever event it actually corresponds to (requested / completed / cancelled), labelled accordingly ("Reason given at completion/cancellation").

**Real bug found and fixed during verification:** the initial in-browser check (via direct URL navigation between pages) showed the status reverting after navigating to the Audit Trail — this looked like a persistence bug. Root-caused it as **not** a bug: this session's browser-automation `navigate` calls do full page reloads, which reset the in-memory-only demo data provider (expected — there is no backend in `--mode demo`). Re-verified correctly using an in-app link click (real client-side SPA navigation, no reload): the completed status and the real justification note both persisted correctly.

**Verified:** `tsc --noEmit` clean, `eslint` clean. New test added (`InspectionsPage.test.tsx`): confirms the dialog opens instead of calling the service immediately, the confirm button stays disabled until both the exact word and a justification are provided, and the service is only called on confirm. Full `vitest` suite: 289/291 pass (same 2 pre-existing unrelated failures). Visually verified in-browser end-to-end: dialog opens and gates correctly, real justification text persists and shows correctly-placed on the real Audit Trail after a genuine client-side navigation.

## Feature 6 — Dual-Authority Sign-off (anti-bribery human-in-the-loop)

**Status: DONE, verified. Real backend + real frontend — not a demo-only simulation.**

**What it does:** Completing or cancelling an inspection assignment now requires two *different*, real individuals: one authority requests the sign-off with a written justification, and a genuinely different authority (not the same username) must independently confirm with their own written justification before the assignment actually closes. This directly counters the "single corrupt officer" scenario. `IN_PROGRESS` is unaffected — it's a routine step and still applies immediately with one officer.

**Design decision — layered pending state, not new enum values:** `AssignmentStatus.java`'s Javadoc explicitly documents that the 4 enum values (`ASSIGNED/IN_PROGRESS/COMPLETED/CANCELLED`) must stay stable because the deferred Flutter mobile app's contract depends on them. So instead of adding new statuses, a pending sign-off sits *on top of* the existing enum: 4 new nullable columns (`pending_status`, `pending_requested_by_user_id`, `pending_justification`, `pending_requested_at`) added in `V10__inspection_assignment_dual_signoff.sql`, with CHECK constraints enforcing they're all null or all set together, and `pending_status` can only be `COMPLETED`/`CANCELLED`.

**"A different authority" is a real, enforced concept, not cosmetic:** both the real backend (`AppUserDetails`, a genuine per-individual username distinct from role) and the frontend session (`SessionUser.username`) already carry real per-user identity. No new demo persona or schema was needed — any two of the existing MoSPI/State/District personas already qualify, since eligibility is by role-set membership, not a shared role.

**Backend (Spring Boot):**
- `V10` migration; `InspectionAssignment` entity gains `requestSignOff()`/`clearPendingSignOff()` plus the 4 pending fields.
- `InspectionAssignmentService.update()` now rejects direct PATCH to `COMPLETED`/`CANCELLED` with a message pointing at the sign-off endpoints.
- New `POST /api/assignments/{id}/sign-off/request` and `POST /api/assignments/{id}/sign-off/confirm`, secured to `MOSPI/STATE/DISTRICT` in `SecurityConfig`. `confirmSignOff()` rejects (409, via new `SignOffException`) if there's no pending request, or if the confirming user is the same user who requested it — the actual anti-corruption check. On success it writes a combined `note`: `"Completion requested by X: <justification>\nCompletion confirmed by Y: <justification>"`.
- Tests: `InspectionAssignmentControllerTest` — 5 new dual-sign-off tests (request doesn't change status until confirmed by a different user; same authority can't confirm its own request; confirming with nothing pending is rejected; a second request while one is pending is rejected; Auditor/MP can't request or confirm). `FlywayMigrationTest` updated for V10. **193/193 backend tests pass** (real Postgres via Testcontainers, real HTTP session-cookie logins — not mocked).

**Frontend:**
- `types.ts`/`DataProvider.ts` gain the pending fields and `requestAssignmentSignOff`/`confirmAssignmentSignOff`; both `ApiDataProvider` (real backend) and `DemoDataProvider` (in-memory) implement them, with the demo provider mirroring the backend's same-authority rejection using `readDemoSession()`.
- `InspectionsPage.tsx`: the status `<Select>`'s COMPLETED/CANCELLED path now opens a `ConfirmDialog` that calls `requestSignOff()` (not `updateAssignment`). A pending row shows "Awaiting sign-off for X — requested by Y"; a **"Confirm sign-off"** button appears only for a signed-in user whose username differs from the requester's, opening a second `ConfirmDialog` ("Finalize sign-off") that calls `confirmSignOff()`.
- `inspections.test.ts`: split the old combined test and added one asserting direct COMPLETED/CANCELLED is rejected, and one exercising the full request → same-user-rejected → different-user-confirms → merged-note flow (11/11 pass). `InspectionsPage.test.tsx`: rewrote the stale gating test and added a full two-identity UI test using `writeDemoSession()` to keep the React session and the demo provider's acting-user in sync (5/5 pass).

**Verified:** `tsc --noEmit` clean, `eslint` clean. Full frontend `vitest` suite: 292/294 pass (same 2 pre-existing unrelated failures, confirmed unrelated by running them against the pre-feature commit). Backend: 193/193 pass. Visually verified in-browser end-to-end using genuine in-app identity switches (Sign Out → persona picker, never a URL reload, since the demo provider's assignment list is an in-memory singleton that resets on reload): requested as MoSPI → correctly blocked from confirming its own request → switched to District Authority → confirmed → Audit Trail shows the real merged note crediting both authorities by name with both justifications.

## Feature 6b — RBAC dropdown (demo persona switcher + real-login redirect)

**Status: DONE, verified.** A "Role: X ▾" dropdown in the app header (`PersonaSwitcher.tsx`), colorful per-persona icons, active persona's label text colored to match.

**Two behaviours, one component, no auth bypass:**
- **Demo build:** picking a different persona calls the same `login(role, 'demo')` the `/login` persona cards use — a real session change.
- **Real backend build:** picking a different role calls `logout()` then navigates to `/login` — the user must authenticate for real as that role. This is a navigation shortcut, not a password-less switch, so it does not reintroduce the arbitrary-role-selection problem decision D31 retired — D31's own demo-auth carve-out is what the demo path already relies on.

**Verified:** `tsc`/`eslint` clean; 5 new tests (`PersonaSwitcher.test.tsx`) across both behaviours (demo direct-switch vs. real logout+redirect, mocking `../api/auth`). Visually verified in-browser: colorful icons + colored active label match the reference design; switching personas in demo mode genuinely changes the sidebar/RBAC view.

## Feature 7 — Alerts and Notifications (header bell + Send Notice)

**Status: DONE, verified. Real backend + real frontend.**

**Part 1 — notification bell (`NotificationBell.tsx`):** a header bell with an unread-count badge and a dropdown feed. Unread notifications render bold with a dot; "Mark all as read" dims them; "Clear all" empties the visible feed but only sets `dismissed = true` server-side — the row is retained, never deleted, exactly as asked.

**Part 2 — "Send Notice" (`SendNoticeButton.tsx`):** added directly into the existing "Projects requiring attention" table (Dashboard) and the Risk & Alerts table's Action column — no separate "SLA Delays" tab, per the explicit decision to fold this into the existing screens instead of copying the competitor's separate-tab layout. Clicking it creates a real notification addressed to the single seeded District Authority account (there are no per-district accounts yet — decision D31) and shows a toast, matching the competitor's one-click flow.

**Real backend (Spring Boot), not a demo-only simulation:**
- `V11__notification.sql`: a `notification` table (`recipient_user_id`, `category`, `title`, `message`, `source_work_id`, `is_read`, `dismissed`, `created_at`). `dismissed` is what "Clear all" sets.
- `NotificationService`: `sendSlaNotice()` validates the work is real (400 if not) and addresses the single seeded `DISTRICT` account. `listFor()` bootstraps a **real, one-time, per-recipient** set of `HIGH_RISK_WORK` alerts by reusing the existing rule-based `RiskEngine` (D22) — capped at 5, never re-seeded once present (even after "Clear all" dismisses them), and **never for CITIZEN/FIELD_OFFICER** roles, since risk is not exposed to citizens elsewhere in the app. `markRead`/`markAllRead`/`clearAll` are scoped to the caller's own notifications.
- `NotificationController`: `GET /api/notifications`, `POST /{id}/read`, `POST /mark-all-read`, `POST /clear` (any signed-in role, scoped to themselves), `POST /send-notice` (MoSPI/State/District/Auditor/MP only — the same roles that see the Dashboard/Risk pages).
- Tests: `NotificationControllerTest` (10 integration tests over real Postgres — idempotent seeding, citizen exclusion, send-notice RBAC, mark-read ownership, clear-all persistence) + `NotificationServiceTest` (10 Mockito unit tests for the seeding/capping logic, deliberately independent of the shared test Postgres's accumulated fixtures from other test classes). **212/212 backend tests pass.**

**Frontend:** `types.ts`/`DataProvider.ts` gain `AppNotification`/`NotificationCategory` and the 5 provider methods; `ApiDataProvider` and `DemoDataProvider` both implement them — the demo provider mirrors the backend exactly (one-time per-role high-risk seed reusing the same demo risk fixtures, citizen exclusion, `sendSlaNotice` always addressing the `DISTRICT` demo persona, "clear" dismisses rather than deletes).

**A real gap found and fixed during implementation:** the initial `seedHighRiskAlertsIfNeeded` had no role check, meaning a citizen loading their notifications would have triggered real HIGH-risk-work alerts into their own feed — leaking risk-assessment data the rest of the app deliberately keeps authority-only (`RiskController`'s own Javadoc: "Risk is not exposed to citizens"). Fixed on both backend (`RISK_VISIBLE_ROLES` in `NotificationService`) and frontend (`RISK_VISIBLE_ROLES` in `DemoDataProvider`) before this was verified, with a dedicated test on each side.

**Also found and fixed:** the frontend's `tsc --noEmit` had been silently checking nothing all along — `tsconfig.json` uses project references (`"files": []` + `references`), which requires `tsc -b` (build mode) to actually resolve and check anything; bare `--noEmit` was a no-op. Running `tsc -b --force` for real surfaced pre-existing gaps unrelated to this feature (two test files' hand-written `DataProvider` mocks were missing the dual-authority sign-off methods from a previous feature, and one pre-existing `StatusTone`/`MetricCard` type mismatch in `RiskAlerts.tsx`) — all fixed. `npm run build` (the real `tsc -b && vite build`) now succeeds.

**Verified:** real `tsc -b` build clean, `eslint` clean, real production `vite build` succeeds. Backend: 212/212 pass. Frontend: 307/309 vitest pass (2 pre-existing unrelated failures). Visually verified in-browser end-to-end: opened the bell as MoSPI and saw 5 real HIGH-risk-work alerts with real work titles/scores/reasons; clicked "Send Notice" on the Dashboard's "Projects requiring attention" table, button flipped to "Notice sent"; switched to District Authority via the persona picker and found the exact "Attention required: Multipurpose community centre" notice in their feed.

## Feature 7.5 — Recommend a Work (citizen e-SAKSHI-style recommendation)

**Status: DONE, verified. Real backend + real frontend.**

A separate "Recommend a Work" tab (`/recommend`) on both the Citizen Portal and every authority's nav, modelled on e-SAKSHI's real citizen-recommendation form — but corrected on two points the reference form got wrong:
- **No "Approximate Fund Estimate" field.** A citizen cannot reasonably price a proposed work; that estimate belongs to the sanctioning authority, not the requester.
- **Site GPS coordinates / maps link instead of free-text "Details of Locality."** A written locality description can't be checked; a coordinates/maps link at least points at a real place.

**The state → MP picker is real data, not invented:** derived client-side from `listPublicProjects()` — the same citizen-safe list the Citizen Portal already reads — so the MP/constituency options are real MPs actually attributed to real ingested works, filtered to the selected state, never a fabricated MP registry.

**Confirmation screen** matches the reference: a checkmark, a real generated tracking number (`CIT-<year>-<6 digits>`, collision-checked server-side), and "Assigned to `<MP>` (`<constituency>`)" — reusing the same MP the citizen picked.

**Real backend (Spring Boot), mirrors the grievance workflow exactly:**
- `V12__work_recommendation.sql`: a `work_recommendation` table (citizen fields, `location_category` RURAL/URBAN, `gps_coordinates_link`, `category` CHECK-constrained to a fixed sector list, `tracking_number` UNIQUE, `status` SUBMITTED → UNDER_REVIEW → RECOMMENDED/REJECTED).
- `WorkRecommendationService`: validates the category, generates the tracking number (retried on the astronomically unlikely collision), scopes reads (citizen sees own, everyone else sees all).
- `WorkRecommendationController`: `GET` (any signed-in role, self-scoped for a citizen), `POST` (CITIZEN only), `PATCH` (MoSPI/State/District only) — identical RBAC shape to grievances.
- Tests: `WorkRecommendationControllerTest` — 10 integration tests over real Postgres (tracking-number format and uniqueness, RBAC matrix, citizen-sees-own vs authority-sees-all, status workflow, validation, 404). **225/225 backend tests pass.**

**Frontend:** `types.ts`/`DataProvider.ts` gain `WorkRecommendation`/`RecommendationStatus`/`LocationCategory` and the 3 provider methods; `ApiDataProvider` and `DemoDataProvider` both implement them (the demo provider generates the same tracking-number format client-side). `RecommendWork.tsx` mirrors `Grievances.tsx`'s citizen-form/authority-review-queue split exactly, reusing `access.ts`'s existing MoSPI/State/District admin role set (renamed from the grievance-specific `GRIEVANCE_ADMINS` to the neutral `CORE_AUTHORITIES` now that a third feature shares it). New nav item and `/recommend` route, area `recommendations` open to every role (matches grievances).

**Verified:** real `tsc -b` build clean, `eslint` clean, real production `vite build` succeeds. Backend: 225/225 pass. Frontend: 320/322 vitest pass (2 pre-existing unrelated failures) — new coverage: `workRecommendations.test.ts` (3 tests: real state/MP derivation, tracking-number generation, status update) and `RecommendWork.test.tsx` (8 tests: validation, state-filtered MP dropdown, full submit-to-confirmation flow, authority review queue, RBAC-gated status control, error state). Visually verified in-browser end-to-end: submitted a real recommendation as a citizen with State=West Bengal (only the real West Bengal MP, "B. C. Das (Howrah)", appeared in the picker), got the confirmation screen with a real tracking number and "Assigned to B. C. Das (Howrah)"; switched to MoSPI and found the identical recommendation in the review queue; advanced it to Recommended and saw the update confirmed live.

## Feature 7.6 — Citizen photo upload (Grievances & Recommend a Work)

**Status: DONE, frontend-only by explicit user decision, verified.**

**What it is:** citizens can attach an optional photo when submitting a grievance ("Photo of the issue") or a work recommendation ("Site photo"), and — separately — can attach or replace a photo on an *already-submitted* record later (in case they didn't have photo evidence at filing time). Uploaded photos are visible on the authority review queues too. **Everything else about a submitted grievance/recommendation stays non-editable** — only the photo, and only by the citizen who can see it, per explicit user instruction not to change either table's schema.

**Why frontend-only:** the backend's `PinataClient` is read-only by design (its own Javadoc: "does not upload, pin, or delete anything") — there is no real IPFS/Pinata *write* path yet. User explicitly chose to build this as a **browser-tab-local, in-memory preview** for now rather than wait on a real upload path: `src/data/localPhotos.ts` is a plain module-level `Map` (not threaded through `DataProvider`/`ApiDataProvider` at all, since neither backend persists photos), keyed by `(kind, id)`. Visible to any role viewed in the same browser tab (including across a demo persona switch); gone on reload or in a new tab — identical behavior in the demo build and the real Vercel+EC2-deployed app, since nothing here touches a server.

**Implementation:**
- `PhotoUploadField` (dashed dropzone with an upload icon, live object-URL preview, 5MB/image-type validation) on both submission forms.
- `PhotoCell` (thumbnail + click-to-open lightbox) on every table that shows a grievance/recommendation, citizen and authority alike.
- `EditablePhotoCell` (thumbnail + "Add photo"/"Change" trigger) used **only** on the citizen's own table, for the post-submission attach/replace flow — the authority queues always show the read-only `PhotoCell`.
- `readFileAsDataUrl()` in `localPhotos.ts` downscales any photo whose longest side exceeds 1280px to a JPEG at quality 0.82 via an in-memory canvas before storing it — a real camera photo can be several MB at 3000+ px, and decoding that twice (table thumbnail + lightbox) was the actual source of a "takes a while to open" complaint before this was added.

**Real bug found and fixed:** `PhotoCell`'s lightbox was originally rendered inline in the table tree. `.ui-card:hover` (every table here sits inside a `Card`) applies a CSS `transform`, which becomes the *containing block* for a descendant `position: fixed` element — so while the cursor was hovering the card (i.e. right after clicking anything inside it), the lightbox positioned/sized itself against the Card's box instead of the viewport, and against a box that was mid-transition (150ms hover transition), which read as an intermittent flicker/glitch and layout jank. Fixed by rendering the lightbox through `createPortal(..., document.body)`, escaping the DOM tree entirely.

**Known unresolved issue (deprioritized by the user 2026-09-16, do not re-investigate unprompted):** opening/closing the photo lightbox is noticeably slower specifically on the **Grievances citizen view** than everywhere else (RecommendWork citizen, RecommendWork authority, and Grievances authority are all fast) — for every record and every photo, not tied to a specific one, not worsening over a session. A `MutationObserver` confirmed opening/closing causes zero DOM changes to the surrounding table; DOM size and downscaling were both confirmed non-issues; `decoding="async"` was added defensively but didn't change it. Root cause not found — see the `known-issue-grievances-citizen-photo-latency` memory for the full investigation trail before picking this back up.

**Verified:** `tsc -b --force` clean, `eslint` clean, full `vitest` suite passing (added `PhotoCell.test.tsx` — 4 tests including a regression test proving the lightbox escapes a `transform`-ed ancestor via the portal — plus new photo-upload/edit tests in `Grievances.test.tsx` and `RecommendWork.test.tsx`), same 2 pre-existing unrelated failures elsewhere in the suite. Real production `vite build` succeeds. Visually verified in-browser (demo build) on all 4 surfaces: uploaded a photo at submission time and via the post-submission "Add photo" flow, confirmed visibility across a same-tab persona switch, confirmed the lightbox opens centered (not clipped) even while hovering a Card.

## Feature 8 — De-duplication of Works (F7, decision D35)

**Status: DONE, verified. Real backend + real frontend.**

Full context and the corrected scope decision (this is about duplicate/near-duplicate **ingested work records**, not duplicate field-inspection photos — the user's initial competitor-inspired read of the feature name) are in decision **D35** in `docs/decisions.md`, and were captured in memory as soon as the scope was agreed, before any code was written.

**What it does:** flags pairs of ingested works that look like the same physical project listed or sanctioned more than once — same `state` + `district` + `category`, plus a near-identical `workDescription` and/or an `estimatedCost` within 20% of each other. Deterministic and explainable, same style as the Round-1 `RiskEngine` (D22) — an investigation indicator, never proof that two records are actually the same work. Deliberately **not** photo-duplicate detection: this project's Flutter field app is camera-only (no gallery picker) and geotags every photo before it goes straight to IPFS, which already structurally prevents the recycled-photo fraud that kind of check exists to catch — building it here would be unnecessary code for a problem this architecture doesn't have.

**Real backend (Spring Boot), separate from the risk engine on purpose:** `RiskRuleSet`'s own javadoc and decision D22 explicitly scope duplicate-detection **out** of that class, so this is a new `com.mpladsentinel.mplads.dedup` package (`DuplicateWorkEngine` + `DuplicateRuleSet` + `DuplicateController`), following the same rule-based pattern rather than bolting a rule onto D22's engine.
- Groups all ingested works by `(state, district, category)`; scores every pair within a group. Being in the same group alone never flags a pair (too many legitimate, distinct works share a location and category) — at least one real signal must fire: near-identical description (Jaccard word-overlap ≥ 0.6, weight 60) and/or overlapping estimated cost (relative difference ≤ 0.2, weight 30). Score capped at 100; `HIGH` ≥ 60, `MEDIUM` ≥ 30, `LOW` otherwise.
- `GET /api/works/duplicates`, matched by the existing `/api/works/**` authority-only rule in `SecurityConfig` — same role set as risk (MoSPI/State/District/Auditor/MP). No schema change, nothing persisted — computed live from the `work` table, exactly like risk.
- Tests: `DuplicateWorkEngineTest` (7 unit tests: grouping boundaries, each signal individually, combined scoring, missing-location/category skip-not-throw) + `DuplicateControllerTest` (2 integration tests over real Postgres: RBAC gating, a real near-duplicate pair found and an unrelated work correctly excluded). **Full backend suite: 253/253 pass.**

**Frontend:** `types.ts` gains `DuplicateConfidence`/`DuplicateWorkSummary`/`DuplicatePair`; `DataProvider.listDuplicateWorks()` on both providers — `ApiDataProvider` calls `GET /api/works/duplicates`, `DemoDataProvider` computes via `frontend/src/data/dedup/duplicateRules.ts`, a 1:1 port of the backend engine (same grouping, thresholds, weights), following the same "kept in sync by hand" convention `risk/rules.ts` already established for D22. New `/duplicates` page (Monitoring nav group, area `duplicates`, same authority-only role set as Risk & Alerts) lists candidate pairs with confidence, reasons, and a link into each work's detail page; a confidence filter narrows the table.

**Honest demo-data note:** the 14 hand-crafted demo fixtures (each already shaped to exercise one *risk*-rule outcome) have no two works sharing a state, district and category, so the demo build's `/duplicates` page genuinely shows an empty state — this is correct, not a bug. Adding two fixtures to force a visible demo example was tried and **reverted**: the demo project count is hardcoded (`14`) across roughly 11 unrelated test files, so doing this properly would mean updating all of them for a purely cosmetic concern on a bonus feature — out of proportion. Real ingested data (6,000+ works) will produce genuine pairs once connected; if a populated demo screenshot is wanted for the pitch video, the right move is to run against the real backend with real data, not fabricate demo fixtures.

**Verified:** backend `mvn -o test` 253/253 pass. Frontend: `tsc -b --force` clean, `eslint` clean; new `duplicateRules.test.ts` (7 tests) + `DuplicateWorks.test.tsx` (3 tests) + `ApiDataProvider`/`DemoDataProvider` additions; full suite 340/342 pass (2 pre-existing unrelated failures, confirmed via `git stash` earlier this session). Real production `vite build` succeeds. Visually verified in-browser (demo build): nav item and route render correctly for an authority role; a Citizen is redirected away from `/duplicates` and never sees the nav item; the empty state renders correctly given the demo fixture set's genuine absence of duplicates.
