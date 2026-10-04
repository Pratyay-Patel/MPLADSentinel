# MPLADSentinel Backend

The server behind MPLADSentinel. It is the single point of integration: it
stores and serves the data, runs the analysis, enforces who can see and do what,
and is the only component that talks to external services.

## Stack

- Java 21, Spring Boot 3, Spring Security
- PostgreSQL with versioned schema migrations (Flyway)
- Maven

## How it is organised

The application is a modular monolith. Each domain (data ingestion, analysis,
auditing, citizen input and so on) is a self-contained module with its own
logic, while shared configuration, security and API conventions live in one
place. Keeping it as a single deployable keeps operations simple.

Security is enforced here, not in the browser. Every request is checked against
the signed-in user's role, so the rules hold even if a client misbehaves.

## Configuration

Settings come from environment variables; sensible local defaults are built in.
Sensitive values are never stored in the repository.

| Variable | Purpose |
|---|---|
| `MPLADS_DB_URL` | Database connection URL |
| `MPLADS_DB_USERNAME` / `MPLADS_DB_PASSWORD` | Database credentials |
| `MPLADS_SERVER_PORT` | HTTP port (default `8081`) |
| `MPLADS_CORS_ALLOWED_ORIGINS` | Browser origins allowed to call the API |
| `SPRING_PROFILES_ACTIVE` | `dev` or `prod` |

The database runs in Docker for local development (`docker compose up -d` from
the repository root). See the root README for the full local setup.

## Running

```bash
cd backend
./mvnw spring-boot:run
```

Health check: `GET http://localhost:8081/api/health`

## Build and test

```bash
./mvnw verify
```

The test suite runs against a real PostgreSQL instance in a container, so the
same schema and queries are exercised as in deployment.
