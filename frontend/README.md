# MPLADSentinel Frontend

React + TypeScript web portal for MPLADSentinel (SIH PS 26102).

## Stack

- React 19 + TypeScript
- Vite 6
- React Router
- ESLint 9 (flat config) + Prettier
- Vitest + Testing Library

## Structure

```
src/
├── api/        centralized typed backend client (client.ts) + endpoint modules
├── data/       data-provider layer (see below)
├── layout/     application shell — AppShell / AppHeader / AppSidebar + nav config
├── pages/      route screens: HomePage, NotFoundPage, and placeholder feature pages
├── router/     route table (AppRouter.tsx)
├── styles/     design tokens (tokens.css) + global reset + shell layout css
├── ui/         reusable presentation primitives + ui.css (see "UI foundation")
└── test/       test setup
```

## UI foundation (`src/styles/`, `src/layout/`, `src/ui/`)

- **Design tokens** — `src/styles/tokens.css` is the single source of truth for
  colour, typography, spacing, radius, borders, shadows, layout widths and
  control heights (CSS custom properties). Components never hardcode a visual
  value twice.
- **Application shell** — `layout/AppShell` = sticky header + left sidebar nav +
  scrollable content (`<Outlet />`). Below 1024px the sidebar becomes an
  off-canvas drawer toggled from the header. Structural only — no auth / RBAC.
- **Primitives** — import from `src/ui`: `Button`, `Card`, `Badge`,
  `StatusBadge`, `MetricCard`, `SectionHeader`, `PageHeader`, `Input`, `Select`,
  `SearchInput`, `Skeleton` / `LoadingState`, `EmptyState`, `ErrorState`,
  `DataTable`, `BarList`. Presentation only — no data access, no business logic.
- **Status** is never colour-only: `StatusBadge` also carries a shape glyph and a
  screen-reader label.
- **Charts** — no charting dependency. `BarList` (dependency-free horizontal
  bars) covers the dashboard's comparisons.

## Screens

- **`/dashboard`** — Government / MoSPI Intelligence Dashboard
  (`src/pages/dashboard/`). Intelligence-first: national metrics → Projects
  Requiring Attention (hero) → financial intelligence → work distribution →
  filters + project exploration → regional insight. Reads data only through
  `useDashboardService()` → `DataProvider` (seed fixtures until the backend APIs
  exist). Risk level/reasons come from the client rule layer (see `/risk`) via
  `getProjectRisk`.
- **`/projects`** — Project Register (`src/pages/projects/`). The full
  searchable/filterable list of every work — filters for state, district,
  house, category, status and risk level, plus free-text search. Distinct from
  the dashboard's compact exploration table (every work, more columns, its own
  route); the dashboard links here. Reads via `useProjectRegisterService()` →
  `DataProvider`; filtering is client-side.
- **`/projects/:id`** — Project Details (`src/pages/project-detail/`). The full
  single-work record — overview, location, financials (estimated vs final cost,
  kept distinct), a rule-based risk-assessment card, payments (state +
  installment rows via `getProjectPayments`), a source-date timeline, and
  provenance / data-quality flags. Built only from fields the source provides
  (no sanctioned amount, progress %, geo, delay). Reads via
  `useProjectDetailService()`; an unknown id shows a "work not found" state.
- **`/risk`** — Risk & Alerts (`src/pages/risk/`). Every work with a risk level
  (HIGH / MEDIUM / LOW / UNKNOWN), most severe first, with the actual rule-based
  indicators for each and per-level count tiles; filters by level, state,
  category and free text. Rules are computed client-side from financial and
  data-quality signals over the available work fields (`src/data/risk/rules.ts`)
  — not an ML model, and a stand-in for the Round-1 risk engine, which runs
  server-side. Reads via `useRiskService()` → `getProjectRisk`.
- **`/citizen`** & **`/citizen/:id`** — Citizen Portal (`src/pages/citizen/`).
  Read-only public browse of works + a public work view. Every work is served as
  a `PublicProject` (`data/features/citizen.ts` `toPublicProject`) that carries
  only publicly releasable fields — no risk score, no data-quality flags, no
  payment-retrieval internals or provenance framing. Reads via
  `useCitizenService()` → `DataProvider`.
- **`/grievances`** — Grievances (`src/pages/grievances/`). Role-aware:
  - **Citizen** (`reviewsGrievances(role) === false`) — a validated submission
    form (category, subject, description, optional related work / name / email)
    plus a table of the grievances they have raised.
  - **Authorities** — a review queue (no form). MoSPI / State / District can
    move each grievance through `SUBMITTED → UNDER_REVIEW → ACTIONED → CLOSED`
    and add an action note; Auditor and MP see it read-only.
  Provider methods `submitGrievance` / `listGrievances` / `updateGrievanceStatus`;
  the `DemoDataProvider` holds grievances for the browser session (lost on
  reload — a `grievances` table lands with backend integration), `ApiDataProvider`
  is `notImplemented`. Via `useGrievancesService()`.
- **`/login`** — sign-in screen (`src/pages/LoginPage.tsx`), rendered outside
  the shell. Posts to `POST /api/auth/login`; on success the session context
  flips to `authenticated` and the page redirects (to the attempted route, or a
  role-appropriate landing — `/dashboard`, or `/citizen` for a citizen).
- `/audit` renders a placeholder — the Audit Timeline is deferred to the
  backend-integration phase (it needs verification / ledger events).

Rules:

- **Authentication (decision D31).** `SessionProvider` resolves the session from
  `GET /api/auth/me` on load; `RequireAuth` gates the whole shell and redirects
  anonymous visitors to `/login`. The header shows the signed-in user and a
  **Sign out** control (`src/layout/UserMenu.tsx`) — there is no role selector;
  the role is whatever the account holds. Round-1 accounts are seeded demo logins
  (`mospi`, `state`, `district`, `auditor`, `mp`, `citizen`).
- Screens are role-gated (`src/auth/`): the sidebar hides sections the role
  cannot enter and `RequireRole` shows a "not available" state on a blocked
  route. Roles: MoSPI/Ministry, State/District Authority, Auditor, MP (all
  monitoring sections) and Citizen (Projects + public sections only). This is UX
  only — backend authorization (Spring Security, D5) is the real check.

- All backend calls go through `src/api/`. Components must not call `fetch`
  directly.
- The frontend never calls external MPLADS / third-party APIs — those are
  integrated server-side by the Spring Boot backend only.
- Screens read data through the `src/data/` provider layer (a feature service +
  `useDataProvider()` / `useAsyncData()`), never by importing demo fixtures or
  `src/api/*` directly.

## Data provider layer (`src/data/`)

```
React screens
     ↓  feature service   (features/*, e.g. useProjectsService)
     ↓  DataProvider      (interface; chosen from VITE_DATA_SOURCE)
     ↓
DemoDataProvider ─→ demo fixtures (src/data/demo/fixtures.ts, clearly-marked, not real MPLADS data)
ApiDataProvider  ─→ src/api/client.ts ─→ Spring Boot REST API
```

- Set `VITE_DATA_SOURCE` to `demo` (default) or `api`.
- Domain types live in `src/data/types.ts` and mirror the backend `Work` model —
  no invented fields.
- Provider methods reject with a `ProviderError` (`kind`: `notImplemented` |
  `unavailable` | `network` | `unknown`). `useAsyncData` turns an operation into
  `loading | empty | success | error`.
- A screen migrates from demo to API by flipping `VITE_DATA_SOURCE` (and, per
  operation, the ApiDataProvider method getting a real endpoint) — the component
  is untouched.

## Configuration

`.env` (git-ignored; see `.env.example`). Only `VITE_`-prefixed vars reach the
client.

| Variable                    | Purpose                                         | Default                 |
| --------------------------- | ----------------------------------------------- | ----------------------- |
| `VITE_API_BASE_URL`         | Base path/URL for backend calls                 | `/api`                  |
| `VITE_DEV_API_PROXY_TARGET` | Backend target the dev server proxies `/api` to | `http://localhost:8081` |
| `VITE_DATA_SOURCE`          | Data provider: `demo` or `api`                  | `demo`                  |

## Commands

```bash
npm install
npm run dev            # dev server on http://localhost:5173 (proxies /api -> backend)
npm run build          # type-check + production build
npm run lint
npm run format         # prettier --write
npm test               # vitest run
```
