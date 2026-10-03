# MPLADSentinel

A transparency and accountability platform for the Members of Parliament Local
Area Development Scheme (MPLADS). It turns public scheme data into early,
explainable signals for the people who oversee the scheme, and gives citizens a
clear, safe view of works in their area.

Built for the Smart India Hackathon 2026 (Problem Statement 26102, Ministry of
Statistics and Programme Implementation).

## What it does

- **Oversight for authorities** — a role-aware portal covering the Ministry,
  state and district administrations, auditors and Members of Parliament, each
  with the view their role needs.
- **Explainable risk intelligence** — every signal comes with the reasons behind
  it. Outputs are indicators for review, never findings of wrongdoing.
- **Transparency for citizens** — a simplified public view of works, with a
  guided channel to raise concerns and track them.
- **Controlled, auditable actions** — consequential decisions require a written
  justification and an independent second sign-off, and every step is recorded.

## Architecture

A modular monolith built around a Spring Boot backend, which is the single
integration point for the database, data ingestion, external services and the
web frontend. The React frontend talks to the backend over REST only, and access
is enforced on the server, not just in the interface.

## Technology

| Area | Technology |
|---|---|
| Frontend | React, TypeScript, Vite |
| Backend | Java 21, Spring Boot, Spring Security, Maven |
| Database | PostgreSQL, Flyway |
| Tooling | Docker (local database), JUnit, Vitest |

The stack is entirely open source.

## Running locally

Prerequisites: JDK 21, Node.js 22 LTS, Docker (optional, for the local database).

```bash
# 1. environment
cp .env.example .env
cp frontend/.env.example frontend/.env

# 2. database (optional)
docker compose up -d

# 3. backend — http://localhost:8081/api/health
cd backend && ./mvnw spring-boot:run

# 4. frontend — http://localhost:5173
cd frontend && npm install && npm run dev
```

The sign-in page offers one-click demo accounts for each role, so every part of
the portal can be explored without creating an account.

## Build and test

| | Command |
|---|---|
| Backend | `cd backend && ./mvnw verify` |
| Frontend | `cd frontend && npm run build && npm run lint && npm test` |
