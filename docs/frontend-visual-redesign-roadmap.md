# Frontend Visual Redesign Roadmap

**Goal:** make the web portal *look* as polished and content-rich as the competitor
(`https://sankalp-main-ruby.vercel.app/`) using **only the features and data we already have**.
No new capabilities, no fake pages, no invented metrics.

**Status:** planning. Owner creates the branch; each phase is one reviewable commit.
Suggested branch: `feature/frontend-visual-redesign`.

---

## 1. What the competitor actually does (and doesn't)

Looked at their Dashboard, `/risk`, and `/ai-insights` on 2026-09-06.

### They are **not** more capable than us

| Their page | Reality |
|---|---|
| `/ai-insights` | Empty placeholder: *"Detailed AI-generated insights and recommendations will appear here."* |
| `/risk` | Single column: 4 tiles + a bullet list of factors + one pie chart. **No per-work table, no indicators per work, no drill-down.** Ours is richer. |
| Dashboard numbers | ~18 hard-coded rows; every figure static; *"sample demonstration data"* disclaimer on every page. |
| `/fund-utilization`, `/compliance`, `/analytics`, `/reports` | Mostly stubs. |

Our portal has **more real content**: ~6,044 works, 34 states/UTs, ~₹289.9 cr recorded
payments, a 6-rule transparent risk engine, per-work indicators, a recommended-action
card, a 6-dimension checklist, real RBAC, a working grievance workflow, Compare MPs with
official MoSPI allocations.

### What they do better — **presentation only**

1. **Longer sidebar (9 items).** Several are empty, but the rail *reads* as a big product.
   Ours has 5 monitoring items + 2 public = looks sparse.
2. **The dashboard is a mosaic of ~6 small distinct panels**, each a *teaser* that links
   deeper — not a wall of tables:
   `4 KPI tiles` → `India map + risk pie (side by side)` → `6 risk-factor bars` →
   `4 named anomaly cards (Cost Overrun 84 · Duplicate Works 23 · Unusual Payments 41 ·
   Delayed 386)` → `short project table (~6 rows, not the full list)` → `Alert Center (3 items)`.
3. **Named anomaly categories as cards** ("84 Cost Overrun cases") make the analysis feel
   concrete. Our equivalent is a generic grey "risk factors" bar list.
4. **Cheap "live system" chrome:** breadcrumbs, an *"AI Monitoring Active"* status pill,
   a *"Talk to SANKALP"* button.
5. **Grid discipline:** 4-up and 2×2 card grids, so every screen fills the width and looks
   composed instead of a single narrow scrolling column.

---

## 2. Our real problem: three near-identical scrolling tables

| Page | What it shows today | Overlap |
|---|---|---|
| **Overview** (`/dashboard`) | KPI cards, risk donut + factor bars, "Projects requiring attention", financial + work-distribution bars, **then a full 25-row `ProjectExploration` table with its own `DashboardFilters` block**, then the India map | The embedded table + second filter block **duplicates `/projects`** |
| **Projects** (`/projects`) | Global filter bar + a second local filter block + 25-row register table with a risk badge column | Risk badge competes with `/risk` |
| **Risk & Alerts** (`/risk`) | Global filter bar + 4 risk tiles + **the same donut + the same factor bars as the Overview** + a second filter block + 25-row table (every work again) + indicators column | Donut/bars are **literally the same component** as Overview; table is `/projects` again with one extra column |

Plus: **every page stacks the global filter bar and a second local filter block.**

The competitor looks denser because each of their screens has **one job** and is laid out
as a grid. Ours looks repetitive because three screens do the **same job** in one long column.

---

## 3. Roadmap

Each phase is independently shippable and committable. Phases 0–1 are the credibility fix
(mostly deletion). Phases 2–3 are the visual-density fix. Phases 4–6 are polish.

### Phase 0 — Assign each page one job (decision only, no code)

Write this into `dashboard.css` / page doc-comments so intent is enforced:

| Page | Its one job | Must NOT contain |
|---|---|---|
| **Overview** | The 30-second national picture — glanceable aggregates + teasers that link out | A working/paginated table; a second filter block |
| **Projects** | The full register — the *only* exhaustive searchable / filterable / exportable table | Risk *reasons* inline (badge only) |
| **Risk & Alerts** | The triage queue — **only flagged works** (HIGH + MEDIUM), sorted by score, with indicators + recommended action | "Every work again"; a chart identical to Overview's |
| **Project detail** | The single deep source of truth (already good) | — |
| **Compare MPs / Citizen / Grievances / Audit** | Unchanged | — |

### Phase 1 — De-duplicate (biggest win, mostly removal)

1. **Overview:** delete the `DashboardFilters` + `ProjectExploration` section entirely
   (`GovernmentDashboard.tsx`, the `<section aria-labelledby="dash-explore-heading">` block).
   Replace with a compact **"Works to review" mini-list**: reuse `ProjectsRequiringAttention`
   styling, cap at **5 rows**, no pager, no filters, with two links —
   `Open full register →` (`/projects`) and `Open risk queue →` (`/risk`).
   Data already available as `view.attention`.
2. **Risk & Alerts:** default the list to **HIGH + MEDIUM only**. Put LOW / UNKNOWN behind a
   `Show all levels` toggle. This is what makes `/risk` genuinely different from `/projects`.
   (`RiskAlerts.tsx` — seed `filters.level` handling; keep `?level=` deep-link override.)
3. **Risk & Alerts:** replace the donut (identical to Overview's `RiskSignals`) with a
   **severity strip** the triage queue actually needs: a headline `"{n} works need review"`
   + a horizontal HIGH/MED/LOW/UNKNOWN count bar. Keep the risk-factor bars here (useful for
   triage). Result: no chart appears twice in the app.
4. **Projects:** keep the risk **badge + score** column (a useful signal in the register),
   but never render reasons there — reasons live on `/risk` and detail. (Already the case;
   lock it in the doc-comment.)

**Commit:** `refactor(frontend): give Overview / Projects / Risk distinct jobs; remove duplicate table + chart`

### Phase 2 — Make the sidebar read as a full product (existing routes only)

`navItems.tsx` — regroup into **three captioned groups** and promote sections we already
have as components into first-class nav entries:

```
MONITORING
  Overview            /dashboard
  Project Register    /projects
  Risk & Alerts       /risk           [badge: "{HIGH count}"]
ANALYSIS
  Compare MPs         /compare
  Regional Map        /regional        ← thin route reusing <RegionalInsight/>
  Financial Overview  /financial       ← thin route reusing <FinancialIntelligence/> + <WorkDistribution/>
GOVERNANCE
  Audit Trail         /audit
  Citizen Portal      /citizen
  Grievances          /grievances
```

- `Regional Map` and `Financial Overview` are **new routes wrapping components that already
  exist** — no new data, no new logic. They give the rail two more real destinations and
  each gets its own breadcrumbable page.
- Add a small count badge next to `Risk & Alerts` — we already compute `countsByLevel`.
- If new routes are undesirable: at minimum add the 3 group captions (icons already exist)
  + the badge. That alone removes the "empty" feel.

**Commit:** `feat(nav): grouped sidebar with Analysis section + risk count badge`

### Phase 3 — Turn Overview into a mosaic (layout only — reflow existing sections)

Target desktop grid (12-col), all from components that already exist:

| Row | Left | Right |
|---|---|---|
| 1 | **4 KPI `MetricCard`s** (`NationalOverview`) — full-width 4-up | |
| 2 | **India map** (`RegionalInsight`) — 8 col | **Risk donut** (`RiskSignals` donut half) — 4 col |
| 3 | **Financial intelligence** — 6 col | **Work distribution** — 6 col |
| 4 | **Named anomaly cards, 4-up** — see below | |
| 5 | **"Works to review" mini-list (5)** — 7 col | **"Latest alerts" (top 3 HIGH by score)** — 5 col |

**Named anomaly cards (row 4)** — the single highest-impact idea to copy, and it is a pure
re-skin of data we already compute:

- Take `summarizeRiskFactors(risks)` output (already used for the bar list).
- Render the top 4–6 as clickable cards: big count + rule label + one-line description,
  e.g. *"Payments exceed estimate — 84 works"*, *"Full payout before completion — 37"*.
- Each links to `/risk?factor=<ruleId>` (needs a small `factor` filter added to
  `RiskAlerts` — wiring existing `risk.reasons`/rule ids, **not** a new metric).
- Every card maps to a **real rule id** from `src/data/risk/rules.ts`
  (`PAYMENT_OVERSPEND`, `FULL_PAYOUT_BEFORE_COMPLETION`, `SINGLE_INSTALLMENT_FULL`,
  `DORMANT_NO_PAYMENTS`, `COST_COHORT_OUTLIER`, `PAYMENT_DATA_UNAVAILABLE`). No fabricated
  categories.

CSS only: add a 12-col grid utility + `2-up` / `4-up` card-grid classes, equalise card
heights per row, tighten card padding.

**Commit:** `feat(dashboard): mosaic layout + named anomaly cards from existing rule data`

### Phase 4 — Cheap "live system" chrome (small, high perceived value)

- **Breadcrumb row** under `PageHeader` on every page (`Home / Risk & Alerts`).
- **Honest status pill** in `AppHeader`: `Demo data · 6,044 works · 34 states/UTs`.
  Doubles as our credibility line against their *"sample demonstration data"* disclaimer.
- **Consistent card header** everywhere: icon + title + optional right-aligned action link,
  via the existing `SectionHeader` primitive (apply where it's missing).
- Section captions like *"From the latest ingestion"* where literally true.

**Commit:** `feat(shell): breadcrumbs + dataset status pill + consistent section headers`

### Phase 5 — Visual density polish (tokens / CSS only, no structure change)

- Card padding tighter; per-row equal heights; the grid utilities from Phase 3 applied app-wide.
- `MetricCard`: use the existing `hint` slot for a definition or delta line so tiles aren't bare numbers.
- Section-header icons (icon set already exists in `src/ui/icons.tsx`).
- Empty states: replace generic copy with "why this is empty + the one action to take".
- Recheck `ResponsiveContainer` heights are explicit px (known recharts gotcha).

**Commit:** `style(frontend): density pass — grids, metric hints, section icons, empty states`

### Phase 6 (optional) — one honest differentiator panel

Small Overview card: **"Why these flags are trustworthy"** — *"6 transparent rules · every
flag shows its reasons · indicator, not proof, a human investigates"* with a link to a
one-page rules explainer. This is the direct, honest answer to their hard-coded
*"AI confidence 94%"*.

**Commit:** `feat(dashboard): transparent-risk explainer card`

---

## 4. Before / after at a glance

| Symptom today | After |
|---|---|
| Overview, Projects, Risk each show a ~25-row table | One table (Projects). Overview shows a 5-row teaser. Risk shows only flagged works. |
| Same donut on Overview and Risk | Donut on Overview only; Risk gets a severity strip. |
| Two filter blocks per page | Global filter bar only on Overview; Projects/Risk keep their one local block. |
| Sidebar: 7 items, feels empty | 9 items in 3 captioned groups + a count badge. |
| Overview = long single column | 5-row mosaic grid, fills the width. |
| Generic grey "risk factors" bar list | 4–6 named anomaly cards with counts, each drilling into `/risk`. |
| No breadcrumbs / status chrome | Breadcrumbs + honest dataset status pill on every page. |

---

## 5. Guardrails (do not repeat their mistakes)

- **No padding the nav with empty pages.** Every nav item must land on real content.
- **No invented anomaly types or metrics** (CLAUDE.md §8). The anomaly cards map 1:1 to
  rule ids in `src/data/risk/rules.ts`.
- **Keep the drill-down richness** on project detail — it is our advantage over them.
- **Keep "indicator, not proof" framing** everywhere (CLAUDE.md §17).
- **Missing data stays "unknown"**, never "zero", never "fraud" (CLAUDE.md §8).
- Demo/secondary-source data is never labelled as the official MoSPI system (CLAUDE.md §9).

---

## 6. Sequencing

1. Phase 0 (decision) → 1 (de-dup) → **stop, review, demo** — this alone removes the
   "repetitive" impression.
2. Phase 2 (nav) + 3 (mosaic) → **stop, review** — this closes the visual-density gap.
3. Phases 4–6 as time allows.

One commit per phase, on `feature/frontend-visual-redesign` (owner creates the branch and
commits).

---

## 7. First-hand side-by-side notes (both apps opened 2026-09-06/07)

Ran our app locally in demo mode (`npm run dev -- --mode demo`) and clicked through
`sankalp-main-ruby.vercel.app` as MoSPI. What actually reads worse on our side:

### 7.1 Redundancy — confirmed exactly

- **Overview → "Project exploration"**: a *second* filter block (House / Category / Search)
  + a full 14-row table + "Open full register →". It is a near-clone of `/projects`.
- **`/risk`**: the "donut + Most common risk factors" card is **pixel-identical** to the
  Overview's "Risk signals" card. Same component, same data, same place on screen.
- **`/projects`** table ≈ the Overview exploration table (one extra MP column).
- **Every page** stacks the global filter bar (Year / State / District / Status) **and**
  a second local filter row right under it.

### 7.2 Density & polish gaps

| What I saw on ours | Competitor |
|---|---|
| Content is one narrow column (~1150px) with a wide empty right gutter; sidebar column mostly empty → whole screen reads sparse | Every screen fills the width with 4-up and 8/4 split grids |
| **India bubble map is dead last** on the Overview, and looks empty — grey blob + 6 plain circles | Map is the **first** panel, shaded, circle-size legend, sits beside the risk donut |
| KPI tiles are bare: label + number + one faint hint line | Tiles have a colored icon, a delta with arrow ("+8.4% from previous year"), color accents |
| Risk factors = a grey horizontal bar list ("Dormant, no payments — 4") | 4 bold **named anomaly cards**: "Cost Overrun / 84 Projects / View Cases" |
| Thin borders, muted palette, weak shadows — sections blur together | Stronger elevation, clear card separation, category color |
| Header: logo + "Ask" + language + persona + Sign out | logo+tagline, global search, "Talk to SANKALP", **"AI Monitoring Active" pill**, notifications bell, avatar |
| Sidebar: 7 items, faint icons, captions `MONITORING` / `PUBLIC`, no counts | 9 items, bolder icons, one `MONITORING` group |
| No breadcrumb anywhere | `Home / MPLADS Overview` breadcrumb on every page |

### 7.3 Data-volume problem (important for a live side-by-side)

Demo fixtures contain **14 works / ₹61.4 L**. The competitor's (fake) headline numbers are
**12,486 projects / ₹842.67 Cr**. Side by side, our demo looks trivial — even though our
**real ingested dataset is ~6,044 works across 34 states/UTs, ~₹289.9 cr recorded
payments**. Fix before any demo (see Block G).

### 7.4 What already beats them (protect these)

- "Projects requiring attention" rows carry real indicator text
  ("Recommended 38 months ago with no payment records (long-dormant)") — their Alert Center
  is 3 hardcoded cards.
- Per-work risk score + indicators + the rule breakdown on project detail.
- Real persona/RBAC switch, working grievance workflow, Compare MPs with official allocation.
- Their `/ai-insights`, `/fund-utilization`, `/compliance`, `/analytics`, `/reports` are
  stubs or empty placeholders.

### 7.5 UI nits found while implementing (owner-reported)

- **Filter row misaligned** on `/risk` and `/projects`: the search input renders lower than
  the two selects beside it (no label row). Fix → Block E.
- **`Export CSV` duplicated** on `/risk` — `/projects` already exports the same work columns
  and has a risk-level filter. Remove it from `/risk`. Fix → Block B.

---

## 8. The 1-day execution plan (only tomorrow available)

~8 working hours, one developer. Ordered by impact. **Blocks A–C are non-negotiable** —
they fix the actual complaint. D–F are the visual-parity layer. Each block is one commit on
`feature/frontend-visual-redesign` (owner commits). Keep `npm test` green — the listed
tests **will** break and must be updated inside the same block.

### Block A — Kill the duplication (1.0 h) — *biggest perceived win, mostly deletion*

- `pages/dashboard/GovernmentDashboard.tsx`: delete the entire
  `<section aria-labelledby="dash-explore-heading">` block — that removes `DashboardFilters`
  **and** `ProjectExploration` from the Overview. Delete the now-unused imports.
- Replace it with a **"Works to review" teaser**: reuse `ProjectsRequiringAttention`'s table
  styling, pass `view.attention.slice(0, 5)`, no pager, no filters, header row with two
  links — `Open full register →` (`/projects`) and `Open risk queue →` (`/risk`).
  (Simplest: render `<ProjectsRequiringAttention items={view.attention.slice(0,5)} />` and
  drop the separate old attention section, or keep attention as-is and make this the 5-row
  variant — pick one, don't show both.)
- `pages/risk/RiskAlerts.tsx`: delete the `<Card>` holding the `DonutChart` +
  `Most common risk factors` `BarList` (it is the Overview's `RiskSignals` again). Replace
  with a one-line **severity strip**: `"{filtered.length} works need review"` + a thin
  HIGH/MED/LOW/UNKNOWN count row (reuse `countsByLevel`, already computed).
- Keep the risk **factor bars** on `/risk`? No — they move to the anomaly cards (Block D).
  For now just remove the duplicate card; the metric-card row stays.
- Tests to update: `GovernmentDashboard.test.tsx` (drops "Project exploration" assertions),
  `RiskAlerts.test.tsx` (drops donut assertion).
- **Commit:** `refactor(frontend): remove duplicated table + risk chart across Overview/Risk`

### Block B — Make `/risk` a triage queue, not "every work again" (0.5 h)

- `pages/risk/RiskAlerts.tsx`: default `filters.level` view to **HIGH + MEDIUM**. Add a
  `Show all levels` checkbox/toggle that clears it. Preserve the `?level=` deep-link
  override (voice bar depends on it) — if `?level=` is present, honour it.
- Update the page description line to "Flagged works, most severe first…".
- **Remove the `Export CSV` (`ExportMenu`) control from `/risk`** — it is redundant with
  `/projects`, which already has a `Risk level` filter + the same work-column CSV export.
  One export surface, on the full register. Drop `handleExport`, the `export` imports and
  the `ExportMenu` from `RiskAlerts.tsx`; keep `Clear filters`. Re-check
  `RiskAlerts.test.tsx` for any export assertion.
- Tests: `RiskAlerts.test.tsx` — assert the default list excludes LOW/UNKNOWN; assert no
  `Export CSV` control is rendered.
- **Commit:** `feat(risk): default to flagged works (HIGH+MEDIUM); drop redundant CSV export`

### Block C — Overview mosaic reflow (1.5 h) — *CSS + reorder existing sections only*

Reorder `DashboardBody` JSX and add grid classes in `pages/dashboard/dashboard.css`:

1. `GlobalFilterBar` (unchanged).
2. `NationalOverview` — 4 KPI cards, `4-up` grid, full width.
3. **New row:** `RegionalInsight` (India map) at **8 col left** + `RiskSignals` donut half
   at **4 col right**. Move `RegionalInsight` up from the bottom; split `RiskSignals` so
   only the donut renders here (factor bars go to Block D).
4. `FinancialIntelligence` (6 col) + `WorkDistribution` (6 col) — already a two-col, just
   normalise widths/heights.
5. Anomaly cards row — placeholder now, filled in Block D.
6. "Works to review" teaser (from Block A) at 7 col + a small "Latest alerts" list
   (top 3 HIGH by score, reuse attention data) at 5 col.

Add to `dashboard.css`: `.dash-grid` (12-col), `.col-4/.col-6/.col-8/.col-12`,
`.card-grid--4up`, equal-height rows (`align-items: stretch`), tighter card padding.
Verify every `ResponsiveContainer` still has an explicit px `height={N}`.

- Tests: `GovernmentDashboard.test.tsx` — order-independent queries (`getByRole`/text), so
  mostly safe; fix any that assert DOM order.
- **Commit:** `feat(dashboard): mosaic grid layout — map up top, equal-height rows`

### Block D — Named anomaly cards (1.5 h) — *re-skin of `summarizeRiskFactors`*

- New `pages/dashboard/sections/AnomalyCards.tsx`: take `summarizeRiskFactors(risks)` (the
  data the old bar list used), render the top 4–6 as cards: big count, rule label, one-line
  description, `View cases →`.
- Route each card to `/risk?factor=<slug>`. **The codebase exposes no rule ids** — neither
  the demo engine nor the backend returns them — so reuse the existing stable
  `RiskFactorCategory` from `data/risk/riskFactors.ts` (`classifyRiskReason` keyword-buckets
  the free-text reasons). Slugs added there: `cost-overspend`, `payout-before-completion`,
  `single-installment-payout`, `dormant-no-payments`, `cost-outlier-vs-peers`,
  `payment-data-unavailable`, `other-signal` (+ `riskFactorFromSlug`, `RISK_FACTOR_DESCRIPTIONS`).
- `pages/risk/RiskAlerts.tsx`: add a `factor` filter — read `?factor=<slug>`, keep rows
  where `risk.reasons.some(r => classifyRiskReason(r) === factor)` (wiring existing data;
  **not** a new metric). A factor scope spans all levels (bypasses the HIGH+MEDIUM default)
  and shows a dismissible "Scoped to risk factor: …" chip.
- `RiskSignals` bar list already gone (Block C made the Overview donut-only); nothing to drop.
- Tests: new `AnomalyCards` test (counts + links); `RiskAlerts.test.tsx` `?factor=` case.
- **Commit:** `feat(dashboard): named anomaly cards linking into the risk queue`

### Block E — Visual polish pass (1.0 h) — *tokens / CSS, no structure*  ✅ done

- ✅ `MetricCard`: optional `icon` slot; the 4 Overview KPIs get brand-tinted icon chips
  (`LayoutGrid / ClipboardList / CircleCheck / Rupee` — the last three added to `ui/icons.tsx`).
  **No `delta` slot** — there is no historical/time-series data, so a delta would be an
  invented value (CLAUDE.md §8). `hint` keeps the existing one-line definition.
- ✅ Elevation: `.ui-card` and `.ui-metric` now use `--border-strong` + `--shadow-md` (one
  step up). *Skipped* the per-card 3px brand top-border — too heavy applied across a full
  page of cards; the `.dash-attention` hero keeps its accent as the single emphasis.
- ✅ `SectionHeader` applied to `NationalOverview` (was the last bare `<h2>`); dead
  `.dash-section-title` removed.
- ✅ Filter-row alignment: `align-items: end` on `.risk-filters__grid` and
  `.reg-filters__grid` — search input now shares the selects' baseline on `/risk` and
  `/projects`.
- *Deferred:* empty-state copy rewrites (low impact).
- *(done early, in Block B follow-up)* `/risk` review summary is now an amber callout banner
  with a count chip (`.risk-summary__*`), and the "show all levels" checkbox is a pill switch
  (`.risk-toggle__*`). Apply the same banner/switch styling vocabulary elsewhere if reused.
- **Commit:** `style(frontend): KPI icons + deltas, stronger elevation, consistent section headers`

### Block F — Shell / header chrome (0.75 h)  ✅ partial

- ✅ `layout/AppHeader.tsx`: **dataset status pill** — `● Demo data · full dataset 6,044
  works · 34 states/UTs` (green dot + "Live data" in API mode). Reads `resolveDataSource()`
  only — **no data fetch** in the shell (`AppShell.test.tsx` renders without a
  `DataProviderProvider`). `DATASET_SCALE` is a hardcoded real figure (docs/data-source.md).
- ✅ **Breadcrumbs** — `PageHeader` already renders a `breadcrumbs` prop; added
  `Home / {page}` to the 7 top-level pages and prepended `Home` to the 2 detail pages that
  already had crumbs. No new component needed.
- ❌ *Skipped the sidebar HIGH-count badge* — needs a risk-count fetch wired into the shell
  (AppShell has no page data hook / provider in tests). Disproportionate for a cut-list
  block. Sidebar group captions (`MONITORING` / `PUBLIC`) already exist.
- **Commit:** `feat(shell): dataset status pill + breadcrumbs`

### Block G — Fix the demo data volume (0.5 h) — *do this or the side-by-side hurts*

Pick the cheapest that works for the demo machine:

1. **Best:** run the SIH demo in **API mode** against the real ingested DB
   (6,044 works / ₹289.9 cr) — set `VITE_DATA_SOURCE=api`, backend + Postgres up. Numbers
   instantly dwarf theirs and are real.
2. **If backend won't be up:** enlarge the demo fixture bundle (more rows in
   `src/data/demo/…`) to a few hundred representative works, and/or
3. **Always:** the status pill from Block F carries the real scale even when the on-screen
   slice is small.

- **Commit:** `chore(demo): <api-mode switch | larger fixture set> for realistic scale`

### Buffer — tests, lint, QA (1.0 h)

`npm test`, `npm run lint`, then click every page in the browser at 1280 and 1440 widths.
Known test files touched: `GovernmentDashboard.test.tsx`, `RiskAlerts.test.tsx`,
`ProjectRegister.test.tsx` (unchanged but re-run), `AppShell.test.tsx`, plus the two new
section tests.

### If you fall behind — cut in this order

`F` (chrome) → second half of `E` → `D` (anomaly cards).
**Never cut A, B, C** — those are the whole point.

### End-of-day state

- Overview: filter bar → 4 KPI cards → map + donut → financial + distribution →
  4–6 anomaly cards → 5-row "works to review" + latest alerts. No embedded register,
  no second filter block.
- `/risk`: flagged works only, severity strip (not the Overview donut again), `?factor=`
  drill-in from the anomaly cards.
- `/projects`: unchanged (it is correctly the one full table).
- Header has a status pill + breadcrumbs; sidebar has captions + a risk badge.
- Demo shows realistic scale (API mode or the pill).
