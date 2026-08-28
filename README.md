# MPLADSentinel

AI-powered MPLADS monitoring and analytics platform for the Smart India
Hackathon (Problem Statement **26102**, Ministry of Statistics and Programme
Implementation).

MPLADSentinel helps authorities identify anomalies, inefficiencies,
irregularities and potential misuse of funds in MPLAD Scheme implementation,
improving transparency, accountability and auditability.

> **Status: Project Foundation phase.** This repository currently contains only
> the buildable project skeleton — no MPLADS data integration, database schema,
> or business features yet. See `docs/round1-scope.md` for what comes next.

## Repository layout

```
MPLADSentinel/
├── frontend/            React + TypeScript web portal (Vite)
├── backend/             Spring Boot modular monolith (Java 21, Maven) — primary integration layer
├── ai-service/          placeholder — separate Python AI service (added later)
├── blockchain-service/  placeholder — Hyperledger Fabric integration layer (added later)
├── mobile/              placeholder — Flutter field-verification app (added later)
└── docs/                project source-of-truth documentation
```

Only `frontend/` and `backend/` are scaffolded in this phase.

## Architecture (summary)

Modular monolith centered on Spring Boot. The backend is the sole integration
layer between the web portal, mobile app, PostgreSQL, the AI service, the
blockchain service, IPFS/Pinata and external MPLADS data sources. The React
frontend talks only to the backend over REST. Full detail in
[`docs/architecture.md`](docs/architecture.md).

## Technology stack

| Area | Technology |
|---|---|
| Frontend | React, TypeScript, Vite |
| Backend | Java 21, Spring Boot, Maven, Spring Security, REST |
| Database | PostgreSQL, Flyway |
| AI (later) | Separate Python service |
| Blockchain (later) | Hyperledger Fabric + integration layer |
| Evidence (later) | IPFS / Pinata |
| Mobile (later) | Flutter |

## Prerequisites

- JDK 21
- Maven 3.9+ (or use the `backend/mvnw` wrapper)
- Node.js 22 LTS and npm
- Docker (optional, for the local PostgreSQL container)

Adopted stack versions are fixed in [`docs/decisions.md`](docs/decisions.md) (D25).

## Getting started

```bash
# 0. environment
cp .env.example .env                 # adjust values; .env is git-ignored
cp frontend/.env.example frontend/.env

# 1. database (optional local container)
docker compose up -d

# 2. backend  ->  http://localhost:8081/api/health
cd backend && ./mvnw spring-boot:run

# 3. frontend ->  http://localhost:5173
cd frontend && npm install && npm run dev
```

The frontend dev server proxies `/api` to the backend, so the home page shows a
live backend-connectivity check.

## Build & test

| | Command |
|---|---|
| Backend | `cd backend && ./mvnw verify` |
| Frontend | `cd frontend && npm run build && npm run lint && npm test` |

## Documentation (source of truth)

| Document | Purpose |
|---|---|
| [`docs/problem-statement.md`](docs/problem-statement.md) | Official problem statement |
| [`docs/architecture.md`](docs/architecture.md) | Agreed system architecture |
| [`docs/requirements.md`](docs/requirements.md) | Complete planned feature set |
| [`docs/round1-scope.md`](docs/round1-scope.md) | Round 1 implementation priorities |
| [`docs/data-source.md`](docs/data-source.md) | Data sources, verified fields, limitations |
| [`docs/decisions.md`](docs/decisions.md) | Architectural & development decisions |

## Contributing / Git workflow

Development happens on dedicated feature branches — never directly on `main`.
Branch creation, commits, merges and pushes are performed by the project owner.
