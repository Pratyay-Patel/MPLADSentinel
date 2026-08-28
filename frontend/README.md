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
├── layout/     AppLayout — application shell
├── pages/      route screens (HomePage, NotFoundPage)
├── router/     route table (AppRouter.tsx)
├── styles/     global styles
└── test/       test setup
```

Rules:

- All backend calls go through `src/api/`. Components must not call `fetch`
  directly.
- The frontend never calls external MPLADS / third-party APIs — those are
  integrated server-side by the Spring Boot backend only.

## Configuration

`.env` (git-ignored; see `.env.example`). Only `VITE_`-prefixed vars reach the
client.

| Variable                    | Purpose                                         | Default                 |
| --------------------------- | ----------------------------------------------- | ----------------------- |
| `VITE_API_BASE_URL`         | Base path/URL for backend calls                 | `/api`                  |
| `VITE_DEV_API_PROXY_TARGET` | Backend target the dev server proxies `/api` to | `http://localhost:8081` |

## Commands

```bash
npm install
npm run dev            # dev server on http://localhost:5173 (proxies /api -> backend)
npm run build          # type-check + production build
npm run lint
npm run format         # prettier --write
npm test               # vitest run
```
