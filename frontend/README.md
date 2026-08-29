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
  `DataTable`. Presentation only — no data access, no business logic.
- **Status** is never colour-only: `StatusBadge` also carries a shape glyph and a
  screen-reader label.
- **Charts** — no charting dependency yet; the dashboard phase decides.

Rules:

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
