# MPLADSentinel Frontend

The web portal for MPLADSentinel. A single application serves every role, and
what each user sees is decided by their account. The interface adapts to that
role, so the same portal works for ministry staff, state and district
authorities, auditors, Members of Parliament and citizens.

## Stack

- React 19 with TypeScript
- Vite
- React Router
- Vitest with Testing Library, ESLint and Prettier

## How it is organised

- **One design system.** Colours, type, spacing and shapes come from a single
  token set, so every screen looks and behaves consistently.
- **Role-aware navigation.** The menu and each screen reflect what the
  signed-in role is allowed to do. This is for usability only; access is
  enforced by the backend.
- **Data through one layer.** Screens never call the server directly. They read
  through a provider layer that can talk to the live backend or to a built-in
  demonstration dataset, so the portal can also be explored without a server.

## Running

```bash
npm install
npm run dev        # http://localhost:5173
```

The development server forwards API requests to the backend, which must be
running on port 8081 (see the backend README).

## Configuration

Copy `.env.example` to `.env` and adjust as needed. Only variables with the
`VITE_` prefix are available to the browser.

| Variable | Purpose |
|---|---|
| `VITE_API_BASE_URL` | Where API requests are sent (default `/api`) |
| `VITE_DATA_SOURCE` | `api` for the live backend, `demo` for the built-in dataset |

## Build and test

```bash
npm run build      # type-check and production build
npm run lint
npm test
```
