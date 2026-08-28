# MPLADSentinel Backend

Spring Boot modular monolith. Primary backend and integration layer for
MPLADSentinel (SIH PS 26102).

## Stack

- Java 21 (Java 21 LTS)
- Spring Boot 3.4.x (Web, Security, JDBC, Actuator, Validation)
- Maven
- PostgreSQL 16.x + Flyway migrations

> Stack versions are fixed by `docs/decisions.md` (D25). Exact patch versions are
> pinned in `pom.xml` (Spring Boot `3.4.2`) and `docker-compose.yml`
> (`postgres:16-alpine`).

## Package structure

```
com.mpladsentinel
├── MpladSentinelApplication      application entry point
├── config                       cross-cutting configuration (security, CORS)
├── common                       shared web response shapes + error handling
└── platform.health              operational /api/health endpoint
```

Business capabilities are added as sibling packages
(`project`, `risk`, `ingestion`, `audit`, `evidence`, `grievance`, ...), each
with its own controller / service / repository layers, in later phases.

## Configuration

All environment-specific and sensitive values come from environment variables
(see `../.env.example`). Local-development defaults are baked into
`src/main/resources/application.yml`.

| Variable | Purpose | Local default |
|---|---|---|
| `MPLADS_DB_URL` | JDBC URL | `jdbc:postgresql://localhost:5544/mpladsentinel` |
| `MPLADS_DB_USERNAME` | DB user | `mpladsentinel` |
| `MPLADS_DB_PASSWORD` | DB password | `change-me-locally` |
| `MPLADS_SERVER_PORT` | HTTP port | `8081` |
| `MPLADS_CORS_ALLOWED_ORIGINS` | Allowed browser origins (CSV) | `http://localhost:5173` |
| `SPRING_PROFILES_ACTIVE` | Active profile | `dev` |

The local default DB port is **5544**, matching `docker-compose.yml`. It is
deliberately not the conventional 5432, which is often taken by a native
PostgreSQL install. If nothing else uses 5432 on your machine you can set
`POSTGRES_PORT=5432` and `MPLADS_DB_URL=jdbc:postgresql://localhost:5432/mpladsentinel`
in a local `.env` (compose) / environment (backend).

## Running

```bash
# 1. start PostgreSQL (from repo root)
docker compose up -d

# 2. run the backend
cd backend
./mvnw spring-boot:run        # or: mvn spring-boot:run
```

Health check: `GET http://localhost:8081/api/health`

## Build & test

```bash
./mvnw verify        # compile + run tests
```

The test suite does not require a database — datasource and Flyway
auto-configuration are excluded for tests (`src/test/resources/application.properties`).

## Security

`SecurityConfig` establishes the security *structure* only (stateless, CSRF off,
no form login / HTTP Basic, configurable CORS). There is no authentication or
RBAC yet and endpoints are currently open. Real authentication and
backend-enforced RBAC are implemented in the dedicated RBAC phase.
