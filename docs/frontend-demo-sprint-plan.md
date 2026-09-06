# Frontend Demo Sprint — Build Reference

**Goal:** ship a visually strong, frontend-only demo to Vercel in 1–2 days, closing
the visible gap with the competitor app while leaning on our real-data advantage.

**Constraint:** frontend only, `VITE_DATA_SOURCE=demo`, **no backend**. Backend
hosting is a later, separate step.

**Branch:** `feature/demo-frontend-polish` (owner creates; no work on `main`).

---

## Context: competitor teardown (sankalp-main-ruby.vercel.app)

Lovable-generated, Vercel-hosted, **~18 hardcoded fake works**, every number
static, disclaimer on every page. Polished but shallow.

- **Real pages:** Dashboard (KPI cards, crude India bubble-blob, risk donut,
  AI-risk-factor bars, 4 count cards, table, alert panel), Projects (paginated
  searchable table), Project Detail (recommended-action card, multi-dimensional
  risk fingerprint /100 bars, "AI Investigation Assistant", "Audit Time Machine",
  "Risk Relationship Graph"), Risk & Anomalies (count cards, donut, factor bars),
  Alerts (cards with severity, AI-confidence %, metric chips), Reports (5 export
  cards).
- **Empty stubs:** Fund Utilization, AI Insights, Compliance.
- **Weak:** Analytics = a 3-row table.
- **Top bar:** global search, "Talk to SANKALP" voice popup (Web Speech API +
  suggested commands), "Select Language" (**Google Translate widget** — 8 Indian
  languages), status pill, persistent filter bar (Year/State/District/
  Constituency/MP/Status).

### Where we lag (frontend)

1. No charting library at all — we have `MetricCard` + `DataTable` + CSS `BarList`.
2. No map — we render 34 states of real data as a table.
3. No multilingual.
4. No voice/assistant entry point.
5. Thinner project detail (no recommended-action, no multi-dimension breakdown).
6. No persistent global filter bar.

### Where we are stronger (the demo script must hammer these)

1. **Real data** — ~6,044 works, 34 states/UTs, ~₹289.9 cr real recorded
   payments, real MPLADS source. They have 18 fake rows.
2. Real backend, RBAC (6 roles), real auth, citizen portal + registration,
   grievances workflow.
3. Transparent, reproducible **rule-based** risk engine with honest
   "indicator, not proof" framing (CLAUDE.md §17). Their "AI confidence 94%" is
   hardcoded.

### Do NOT copy

Empty stub pages; the "Audit Time Machine" (needs historical snapshots we do not
have — never fake it); fabricated confidence numbers; their branding.

---

## Dependency policy

Prefer **zero new dependencies**: static India SVG for the map, hand-rolled SVG
donut, `<script>` translate widget, browser-native Web Speech API. Only add a
charting library (`recharts`) if hand-rolled SVG proves too slow to build — and
only with owner sign-off (CLAUDE.md §11 / §19).

---

## Task list (build in this order)

Status: `[ ]` todo · `[~]` in progress · `[x]` done

### P0 — makes a demo possible at all

- [x] **P0.1 — Demo-auth mode + persona picker**
  - **Goal:** on a backendless deploy, let a viewer "sign in" as any of the 6
    roles and land in that role's view. Citizen self-registration disabled here.
  - **Approach:** when `VITE_DATA_SOURCE === 'demo'` (or a new
    `VITE_DEMO_AUTH` flag), `SessionProvider` skips `GET /api/auth/me` and
    `POST /api/auth/login`. Login page becomes a persona picker
    (MoSPI / State / District / Auditor / MP / Citizen). Session set in memory +
    `sessionStorage` so refresh keeps it. `logout` clears it and returns to the
    picker. `register` in this mode is a no-op with an inline "disabled in demo"
    note.
  - **Files:** `src/auth/SessionProvider.tsx`, `src/pages/LoginPage.tsx`,
    `src/auth/RequireAuth.tsx` (unchanged if session shape is preserved),
    `src/data/selectDataProvider.ts` (or a sibling `demoAuthEnabled()` helper),
    `src/vite-env.d.ts`, `src/pages/RegisterPage.tsx` (guard).
  - **Acceptance:** with no backend running, open the app → persona picker →
    pick "MoSPI" → land on `/dashboard` with the authority nav; pick "Citizen" →
    land on `/citizen`; refresh keeps the persona; logout returns to picker;
    `/register` shows the disabled note. Existing tests still green.
  - **Keep real auth intact:** `VITE_DATA_SOURCE=api` path is untouched.

- [x] **P0.2 — Vercel deploy config**
  - **Goal:** `frontend/` builds and serves on Vercel with SPA routing.
  - **Approach:** `vercel.json` (or dashboard config) — build command
    `npm run build` in `frontend/`, output `dist/`, SPA rewrite
    `/(.*) → /index.html`. Env: `VITE_DATA_SOURCE=demo`. Document in
    `frontend/README.md`.
  - **Acceptance:** deep-linking `/risk` on the deployed URL loads the app (no
    404); the persona picker works; all demo screens render.

### P1 — highest visible impact

- [x] **P1.1 — India map on the dashboard**
  - **Goal:** replace/augment the table view of state data with a real India map
    coloured by our real per-state work counts + risk mix. This is the single
    best use of our data advantage.
  - **Approach:** static India states SVG (inline component, state `<path>`s with
    ids). Fill opacity ∝ work count; a small risk-tint. Hover → tooltip
    (state, works, HIGH/MED/LOW split). Click → dashboard filter set to that
    state. No map library. Source the SVG paths from a public-domain India-states
    SVG and inline them.
  - **Files:** new `src/ui/IndiaMap.tsx` + `src/ui/indiaMap.css`; wire into
    `src/pages/dashboard/sections/RegionalInsight.tsx` (or `NationalOverview`).
    Data: derive per-state aggregates from `DemoDataProvider` projects.
  - **Acceptance:** map renders all states/UTs, colour reflects demo data,
    hover tooltip correct, click filters the dashboard, dark-mode-safe, no
    horizontal page scroll, keyboard-focusable regions.

- [x] **P1.2 — Risk-distribution donut + risk-factor bars**
  - **Goal:** dashboard + Risk & Alerts get a HIGH/MED/LOW/UNKNOWN donut and a
    "risk factor frequency" bar list (how often each rule fires across the set).
  - **Approach:** hand-rolled SVG donut component (`src/ui/DonutChart.tsx`);
    reuse `BarList` for factor frequencies computed from the demo risk data
    (count of each rule id across all works). Consult the `dataviz` skill before
    finalising colours/legend.
  - **Files:** new `src/ui/DonutChart.tsx`; edit
    `src/pages/dashboard/sections/*` and `src/pages/risk/RiskAlerts.tsx`.
  - **Acceptance:** donut segments sum to the total, legend with counts +
    percentages, accessible label, theme-safe; factor bars sorted desc with
    counts.

- [x] **P1.3 — Multilingual (Google Translate widget)**
  - **Goal:** language switcher covering major Indian languages, matching the
    competitor.
  - **Approach:** inject the Google Website Translator `<script>` + a small
    styled trigger in the app header. No i18n framework. Note in code + README
    that this is a translation widget, not true i18n.
  - **Files:** `index.html` (script), `src/layout/AppShell.tsx` /
    header component (trigger + container), a bit of CSS to match our header.
  - **Acceptance:** switching to Hindi/Tamil/etc. translates visible UI text;
    switching back to English restores; does not break layout or the SPA router.

### P2 — memorable gimmick

- [x] **P2.1 — Voice command bar**
  - **Goal:** a "Talk to [product]" button that takes a spoken command and
    routes/filters, then speaks a short confirmation.
  - **Approach:** browser-native `SpeechRecognition` (no key, no backend). Popup
    with mic + 3 suggested commands. Keyword router: state names → dashboard
    filter; "risk"/"high risk" → `/risk`; "grievance(s)" → `/grievances`;
    "projects" → `/projects`; "overview"/"dashboard" → `/dashboard`. Speak a
    canned confirmation via `SpeechSynthesis`. Graceful fallback text when the
    API is unavailable (Firefox/Safari).
  - **Files:** new `src/ui/VoiceCommand.tsx` + css; wire into header; a small
    `parseCommand(text): {route?, filter?}` pure function with unit tests.
  - **Acceptance:** in Chrome, saying "show high risk in Maharashtra" navigates
    to `/risk` (or dashboard) filtered to Maharashtra and speaks a confirmation;
    unsupported browsers show a typed-input fallback; no crash without mic
    permission.

### P3 — depth if time remains

- [x] **P3.1 — Richer Project Detail**
  - Recommended-next-action card from the top rule hit; a small multi-dimension
    bar strip derived from our **real** rule categories (payment / payout /
    dormancy / cohort / data-availability) — backed by actual logic, unlike the
    competitor's. Optional "similar works" list (same category + nearby cost).
  - **Files:** `src/pages/project-detail/ProjectDetail.tsx` + a helper in
    `src/data/features/`.
  - **Acceptance:** values trace to real rule output; no fabricated metrics;
    UNKNOWN handled.
  - _"Similar works" list deferred — the detail service loads one work only;
    would need a DataProvider/service change. Not worth it for the demo._

- [x] **P3.2 — Persistent global filter bar** (year/state/district/status) shared
  across dashboard/projects/risk, reading/writing URL query params.
  - **A:** `src/filters/` — `globalFilters.ts` (pure filter + URL round-trip),
    `FilterProvider` + `context.ts` (URL is source of truth, re-asserted across
    navigation), `GlobalFilterBar`. Wired into `AppShell` (wraps the routed
    `<Outlet/>`) and fully into the **Dashboard**: the whole view (metrics, map,
    risk donut, attention list, exploration table) recomputes via new
    `filterDashboardView()` in `dashboard.ts`. Dashboard's own filter row
    trimmed to house/category/search.
  - **B:** `GlobalFilterBar` now also on **Project Register** and **Risk &
    Alerts**; their duplicated state/district/lifecycle selects removed (Risk
    keeps level/category/search, Projects keeps house/category/risk/search).
    Risk's metric cards + donut + factor bars recompute over the global-filtered
    rows. `applyGlobalFiltersBy` / `globalFilterOptions` helpers added. Filters
    carry across all three screens and stay in the URL.
    _Note: pre-existing brittle test `voiceCommands > matches multi-word state
    names` fails on `+` vs space in the query string — functionally fine
    (`URLSearchParams` decodes `+`), unrelated to this change._

- [x] **P3.3 — Client-side CSV export** (was "Reports screen" — built as in-place
  export menus instead, matching Empowered Indian's "Export" button).
  `src/export/`: `csv.ts` (`toCsv` RFC-4180 quoting + `downloadCsv` Blob/BOM,
  +test), `workExport.ts` (`workCsvColumns`, `scopeWorks`, +test),
  `ExportMenu.tsx` (All / Completed only / Recommended only). Wired into the
  **Project Register** and **Risk & Alerts** filter footers; exports exactly the
  currently-filtered rows (global bar + local). Filename encodes the active
  state / risk level / scope. No backend.

---

## Teammate round 2 — five follow-up features (in priority order)

Empowered Indian reference checked live (2026-09-06). Their compare is anchored
on per-MP **Allocated Amount** + **Fund Utilization %** — we have **no per-MP
allocation** (`docs/data-source.md`), so ours must NOT show a "utilisation %"; it
compares only real per-work aggregates.

- [x] **F1 — CSV export.** Done as P3.3 above.
- [x] **F2 — Compare MPs.** New sidebar tab (`/compare`, `Area` `'compare'`,
  authorities only). `data/features/mpComparison.ts` (+test) `aggregateMps()`
  groups every work by `mpName` → works / recommended / completed / completion
  rate / Σ estimated cost / Σ recorded payments / payments÷estimate ratio /
  risk mix / flagged share / avg risk score. `CompareMps.tsx`: search-driven
  picker (max 4, `?mp=` repeated in URL), 3 summary KPI cards, a **recharts bar
  chart** (`MpCompareChart.tsx`, one coloured bar per MP + dashed all-MP-average
  reference line, dataviz palette slots 1–4, metric selector, value labels +
  x-axis names carry identity), detailed comparison table + "key insights"
  MetricCards + honesty note. **No allocation column, no "fund utilisation %"**
  (real aggregates only). Chart uses explicit-px `ResponsiveContainer` height
  (the DonutChart fix) to avoid the layout blow-up.
- [x] **F2b — official per-MP allocation.** Source CSVs (MoSPI eSAKSHI
  "Allocated Limit for Hon'ble MPs", 18th LS 543 + RS 230) in `docs/data/`.
  **Verification:** all 248 of our ingested MPs matched by normalised name +
  state (100%, 0 unmatched, 2 same-name collisions resolved by state); every one
  of the 201 MPs with recommended estimates has Σ estimated ≤ allocation.
  `scripts/gen-mp-allocations.mjs` (npm `gen:allocations`) → generated
  `src/data/mpAllocations.ts` (773 MPs keyed by normalised name; `lookupAllocation`
  disambiguates by state; +test). `mpComparison.ts` joins it → `MpStat.allocated`
  / `fundUtilisation` (both `null` when unmatched; +tests). Compare MPs gains an
  **Allocated limit** row + a real **Fund utilisation % (Σ estimated ÷
  allocated)** row and chart metric; a "Highest fund utilisation" insight card;
  footnote names the source. Unmatched / demo MPs show "—". Verified full-stack
  against real data (Andrew J. Syngkon ₹9.8 cr / 22%, etc.).
- [ ] **F3+F4 — visual polish (one commit).** `tokens.css`: deepen
  `--shadow-sm/md` (+ raise `--shadow-lg`) so cards read lifted; darken
  `--color-text` / `-secondary` / `-muted` (+ dark-theme) for more contrast,
  keeping WCAG AA.
- [ ] **F5 — collapsible sidebar.** Desktop collapse toggle → ~56px icon rail
  (icons per nav item + hover tooltip), state in `localStorage`. Mobile
  off-canvas drawer unchanged. `AppShell` / `AppSidebar` / `AppHeader` /
  `navItems` / `shell.css` + ~6 new icons.

### P4 — polish

- [ ] Motion/transitions on cards and route changes; empty-state pass; favicon +
  product name in the header; consistent page headers; a11y sweep
  (focus rings, aria labels on charts).

---

## Demo script anchors (for the pitch, not code)

- Open on the **India map** — "every state, real MPLADS works, real payment
  totals — not sample data."
- Switch persona to **Citizen** — show the public portal + file a grievance.
- Switch to **MoSPI** — Risk & Alerts, open a HIGH work, show the **transparent
  rule reasons** ("indicator, not proof — a human investigates").
- Language switch to Hindi mid-demo.
- One voice command.

---

## Running status / notes

_(update as we build)_

- 2026-09-05 — plan created.
- 2026-09-06 — **P0.1 done.** `VITE_DEMO_AUTH=true` → `SessionProvider` skips the
  backend; `LoginPage` shows a 6-persona picker; session persists in
  `sessionStorage`; `RegisterPage` shows a "disabled in demo" notice. Real
  backend auth path untouched. New: `src/auth/demoAuth.ts` (+ test). Also:
  `/` now redirects to the role landing page via `src/router/IndexRedirect.tsx`
  (removed the old foundation `HomePage` + its test). Typecheck clean; auth /
  login / register tests green (28).
- 2026-09-06 — **P0.2 done.** `npm run build:demo` (`vite build --mode demo` +
  `frontend/.env.demo`), `frontend/vercel.json` (SPA rewrite, build command).
  Verified: `npm run build:demo` succeeds; `vite preview` shows persona picker →
  MoSPI lands on `/dashboard`, Citizen lands on `/citizen`, sign-out returns to
  picker, no backend errors.
  **Vercel setup:** project Root Directory = `frontend`; it picks up `vercel.json`
  automatically. No dashboard env vars needed (`.env.demo` is committed).
- `recharts` greenlit by owner (2026-09-06).
- 2026-09-06 — **P1.2 done.** `recharts@3.10.1` added. New:
  `src/ui/DonutChart.tsx` (recharts pie, centre value, legend with count+%,
  per-slice tooltip), `src/ui/riskColors.ts` (dataviz status palette
  HIGH/MED/LOW/UNKNOWN), `src/data/risk/riskFactors.ts` +test
  (`classifyRiskReason` keyword-buckets a reason string into one of 6 categories;
  `summarizeRiskFactors` counts across the dataset). New section
  `src/pages/dashboard/sections/RiskSignals.tsx` (donut + factor `BarList`),
  wired into the dashboard after National overview and into `RiskAlerts.tsx`
  after the metric cards. Shared `.risk-signals` / `.donut` CSS in `ui.css`.
  Fixed a `ResponsiveContainer` layout blow-up (percent height → explicit px).
  Verified in the demo build on the dashboard and `/risk`.
  **Cost:** JS bundle 371 kB → 704 kB (114 kB → 214 kB gzip) from recharts +
  d3. Acceptable for the demo; code-split later if needed.
- 2026-09-06 — **P1.1 done.** No new dependency. New: `src/ui/indiaGeo.ts`
  (36 state/UT centroids + a ~36-point India outline polygon, one lon/lat
  projection), `src/ui/IndiaBubbleMap.tsx` (SVG outline + area-proportional
  bubbles, hover tooltip with the HIGH/MED/LOW split, keyboard-focusable when
  `onSelect` is passed). `regionStats()` added to `dashboard.ts` (+test) and
  `regions` to `DashboardData`. `RegionalInsight` rewritten to a two-column
  card: map + "top states" bar list; wired via `data.regions`. Positions and
  outline are approximate and labelled as such. Verified in the demo build —
  reads clearly as India, beats the competitor's blob.
- 2026-09-06 — **P2.1 done.** No dependency (browser `SpeechRecognition` +
  `speechSynthesis`). New: `src/ui/voiceCommands.ts` + test (`parseCommand`
  keyword-router → route + `?level=`/`?state=` for the risk screen, spoken
  reply), `src/layout/VoiceCommand.tsx` (header "Ask" button → panel with mic or
  a text fallback + 3 example chips). `RiskAlerts` now seeds its filters from the
  URL (`filtersFromParams`). `AppShell` scrolls content to top on route change
  so a command doesn't land mid-page. Verified: "Show high risk works in
  Maharashtra" → `/risk?level=HIGH&state=Maharashtra` with both filters applied
  ("2 works"); "Open grievances" → `/grievances`. Mic path works in Chrome;
  other browsers get the text box.
- 2026-09-06 — **P1.3 done.** No npm dependency — the Google Website Translator
  script is loaded from `index.html` (with CSS that kills its banner + body
  offset). New `src/layout/LanguageSwitcher.tsx`: our own header dropdown
  (12 languages incl. English, native scripts) that drives the hidden
  `.goog-te-combo`; "English" clears the `googtrans` cookie and reloads. Wired
  into `AppHeader`, styled for the dark header in `shell.css`. Verified: full UI
  (nav, cards, chart labels, donut centre) translates to Hindi and reverts.
  **Caveat:** needs internet (loads `translate.google.com/...`); offline it does
  nothing (graceful). Machine translation — quality varies.
- 2026-09-06 — **P3.1 done.** No dependency. New `src/data/risk/riskInsights.ts`
  +test: `recommendedAction(risk)` (reviewer's first step, keyed to the top
  reason's category) and `riskDimensions(risk)` (the six real rule dimensions as
  a fixed flagged/clear checklist, each carrying the matching reason string).
  Both read the shared `ProjectRisk` view model, so demo and API behave the
  same. New `src/pages/project-detail/RiskInsights.tsx` replaces the inline risk
  card — adds a "recommended next action" callout + the dimension checklist
  above the raw reason list; UNKNOWN / no-indicator branches unchanged.
  No fabricated per-dimension scores (the competitor's "/100" bars are faked).
  Typecheck + lint clean; new unit tests + ProjectDetail tests green.
- Next: P3.2 (persistent global filter bar), P3.3 (CSV export), P4 (polish).
