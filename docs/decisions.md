# MPLADSentinel — Architecture & Development Decisions

This document records decisions that have been agreed upon for MPLADSentinel.

Claude must treat these decisions as constraints unless the project owner explicitly approves a change.

---

## D1 — Backend Architecture

**Decision:** Use a Spring Boot modular monolith.

The backend will contain logically separated modules while remaining within a single Spring Boot application.

Do not introduce microservices unless explicitly approved.

---

## D2 — Frontend

**Decision:** Use a single React + TypeScript web application.

Role-based interfaces will be provided within the same application rather than creating separate applications for each user role.

---

## D3 — Backend–Frontend Communication

**Decision:** The React frontend communicates with the Spring Boot backend through REST APIs.

The frontend must not directly access PostgreSQL or external backend infrastructure.

---

## D4 — Database

**Decision:** Use PostgreSQL as the primary application database.

PostgreSQL will store operational/application data including project information, verification records, user/role information, IPFS references, grievances and relevant application events.

---

## D5 — Security

**Decision:** Use Spring Security for authentication and authorization.

Role-Based Access Control (RBAC) will be enforced at the backend/API level.

Frontend UI restrictions alone must never be considered sufficient authorization.

---

## D6 — AI Architecture

**Decision:** AI/ML functionality will be provided through a separate Python-based AI service.

Spring Boot will act as the integration layer between the main application and the AI service.

The specific ML models and techniques will be selected based on actual data availability and validated requirements.

---

## D7 — Evidence Storage

**Decision:** Use IPFS/Pinata for storing large evidence files such as field photographs and documents.

The actual evidence file is stored in IPFS.

The corresponding CID is stored as a reference in PostgreSQL.

---

## D8 — Field Verification Data Flow

**Decision:** The mobile application will upload evidence to IPFS and send a lightweight structured metadata payload to Spring Boot.

The payload may contain information such as:

- Project ID
- IPFS CID
- Verification/status information
- Timestamp
- Remarks
- Other relevant metadata

Spring Boot stores the application record in PostgreSQL and coordinates any required blockchain audit event.

The actual evidence file is not stored in PostgreSQL.

---

## D9 — Blockchain

**Decision:** Use Hyperledger Fabric as a permissioned blockchain for selected audit and integrity events.

The blockchain will not store the complete project database or large evidence files.

Only selected information required for auditability/integrity will be recorded.

---

## D10 — Blockchain Access

**Decision:** Citizens must not directly access the Hyperledger Fabric network.

Citizens will receive publicly releasable blockchain-backed audit/integrity information through controlled Spring Boot APIs.

The permissioned ledger remains an internal system component.

---

## D11 — Blockchain Integration

**Decision:** Spring Boot will communicate with Hyperledger Fabric through a dedicated blockchain service/integration layer.

The blockchain service remains separate from the main application logic while being integrated into the overall modular-monolith architecture.

---

## D12 — Mobile Application

**Decision:** The field verification interface will primarily be implemented through the Flutter mobile application.

The mobile application is responsible for field-level activities such as:

- Capturing evidence
- Uploading evidence to IPFS
- Sending verification metadata to Spring Boot
- Recording field observations

The web portal does not replace the field verification workflow.

---

## D13 — Web Portal

**Decision:** The web portal will focus on monitoring, analytics, project information, administration, auditing and citizen transparency.

The Field Officer verification workflow is primarily handled by the mobile application.

---

## D14 — Data Source Strategy

**Decision:** Official MPLADS/MoSPI data is the preferred authoritative data source.

Where suitable granular project-level data is not conveniently available through the official system, the currently usable Empowered Indian APIs may be used as a secondary data-access source.

Secondary-source data must not be represented as directly originating from the official MPLADS system.

---

## D15 — External API Integration

**Decision:** External MPLADS/secondary APIs will be integrated through the Spring Boot backend.

The React frontend must not depend directly on external MPLADS APIs for core application functionality.

---

## D16 — Round 1 Scope

**Decision:** Round 1 prioritizes a reliable end-to-end core workflow over the number of completed features.

P0 features must be completed before P1 features are attempted.

Features explicitly deferred from the initial Round 1 implementation include:

- F7 — Duplicate / Similar Project Detection
- F8 — Delayed Project Prediction
- F9 — Geospatial Project Intelligence

The complete Round 1 scope is maintained in:

`docs/round1-scope.md`

---

## D17 — Infrastructure

**Decision:** Additional infrastructure such as Kafka, Redis, Kubernetes, separate microservices or other distributed components will not be introduced without a concrete requirement and explicit approval.

The system should remain as simple as possible while satisfying the required functionality.

---

## D18 — Development Approach

**Decision:** Development will proceed incrementally according to the approved implementation plan.

Each major implementation phase will be developed and tested independently before moving to the next phase.

Working functionality should be prioritized over prematurely implementing advanced features.

---

## D19 — Git & Version Control

**Decision:** Git operations that modify repository state are controlled by the project owner.

Claude may freely perform Git read operations when useful, including:

- `git status`
- `git log`
- `git diff`
- Branch inspection
- Commit/history inspection

Claude must NOT perform the following unless explicitly instructed by the project owner:

- Commit
- Push
- Merge
- Rebase
- Branch creation
- Branch deletion
- Other repository-history/state-changing Git operations

Development must never be performed directly on `main`.

Every new implementation phase or feature from the approved development plan must use a dedicated feature branch.

The project owner will create/switch branches and perform commits/pushes.

---

## D20 — Change Control

Existing architectural decisions must not be changed silently.

If Claude identifies a reason to change an established architectural decision, it must:

1. Explain the issue.
2. Explain the proposed alternative.
3. Explain the impact.
4. Wait for explicit approval before changing the architecture.


## D21 — Repository Structure
Decision: MPLADSentinel will use a monorepo containing frontend, backend,
AI service, blockchain service, mobile application and shared documentation.

## D22 — Round 1 Risk Engine
Decision: The initial Round 1 rule/statistical risk engine will be implemented
inside Spring Boot. The separate Python AI service will be introduced when
advanced ML functionality is required.

## D23 — Field Officer Role
Decision: Field Officer is a backend RBAC role but does not have a dedicated
web interface in Round 1. Field Officer functionality is primarily provided
through the Flutter mobile application.

## D24 — Project Foundation
Decision: Project Foundation consists of repository structure, development
tooling, frontend/backend scaffolding, configuration, database connectivity,
migration framework, security foundation and build verification. It does not
include business functionality or MPLADS integration.

## D25 — Development Stack Versions

**Decision:**

The following versions/major versions are adopted for the initial MPLADSentinel implementation to prioritize stability and compatibility during development:

- Java 21 LTS
- Spring Boot 3.4.x
- Maven
- React 19.x
- TypeScript 5.7.x
- Vite 6.x
- React Router 7.x
- Node.js 22 LTS
- npm
- PostgreSQL 16.x
- Flyway

## D26 — Frontend Data Provider Abstraction

**Decision:**

The Round-1 frontend is built broadly across the planned screens using a
controlled demo data source first, and individual screens migrate to the real
Spring Boot REST APIs as those APIs are implemented.

To make that migration a configuration change rather than a UI rewrite, the
frontend accesses data only through a `DataProvider` abstraction
(`frontend/src/data/`):

- React screens call a feature-level service (e.g. `useProjectsService`), which
  depends on a `DataProvider`, not on `fetch`, the API client, or fixtures.
- Two `DataProvider` implementations exist: `DemoDataProvider` (local,
  clearly-marked demo fixtures) and `ApiDataProvider` (real data via the existing
  centralized API client in `frontend/src/api/`). The browser still never calls
  PostgreSQL, IPFS, Hyperledger Fabric or external MPLADS/Empowered Indian APIs
  directly.
- The active provider is selected from the `VITE_DATA_SOURCE` env var
  (`demo` default, or `api`).
- Frontend domain types mirror the backend `Work` model; no field is introduced
  that the backend does not expose.
- Demo fixtures will later be derived from real ingested MPLADS records; they
  remain served through `DemoDataProvider` so no UI change is needed.

No new state-management or data-fetching framework (Redux, Zustand, React
Query, …) is introduced. A small `AsyncState` contract + `useAsyncData` hook
covers loading / empty / success / error.

This decision does not change the overall system architecture (D1–D3): the web
portal still communicates with the backend only through REST APIs.

## D27 — Frontend Visual Foundation

**Decision:**

The Round-1 web portal's visual layer is built with plain CSS plus a centralized
CSS-custom-property design-token system (`frontend/src/styles/tokens.css`) and a
small set of reusable presentation primitives (`frontend/src/ui/`). It uses a
reusable application shell (`frontend/src/layout/AppShell`) — sticky header, left
sidebar navigation collapsing to a drawer below 1024px, routed content area.

No UI-component library, CSS framework or CSS-in-JS runtime (Tailwind, MUI,
Chakra, styled-components, …) is introduced. The system font stack is used; no
web-font dependency is added.

Status is never communicated by colour alone (semantic glyph + text label
alongside colour).

Charting: no charting dependency is added in this phase. The Government Dashboard
phase decides whether a single lightweight charting library is warranted.

This is a UI-implementation decision; it does not alter `architecture.md`,
`requirements.md` or `round1-scope.md`.

## D28 — Dashboard charting: no library

**Decision:**

The Government Intelligence Dashboard's visualisations (estimated-cost vs
recorded-payments comparison, recommended vs completed distribution, top states
by work count) are single-series horizontal bar comparisons over a small
dataset. They are implemented with a dependency-free `BarList` primitive
(`frontend/src/ui/BarList.tsx`, plain CSS). No charting library
(Recharts / Chart.js / D3 / …) is added — one would be disproportionate to the
need and add significant bundle weight. This can be revisited if a later screen
needs time-series or interactive charts.

Frontend risk fields (`riskLevel`, `riskReasons`) remain a demo view model on
`ProjectRisk`, kept separate from the source-of-truth `Project` fields; the
dashboard is wired so the real risk API can supply them later without changing
the presentation components. UI-implementation only — no change to
`architecture.md`, `requirements.md` or `round1-scope.md`.
## D29 — Frontend rule-based risk stand-in

**Decision:**

Until the Round-1 risk engine exists as a Spring Boot API (D22), risk indicators
shown in the web portal are produced by a client-side rule layer,
`frontend/src/data/risk/rules.ts` (`deriveRisk`).

- It is **not** an ML model and **not** the production engine. It evaluates the
  same *class* of rules the backend engine will, so the Risk & Alerts screen
  (`/risk`), the dashboard's "Projects Requiring Attention" section and the
  Project Details risk card can be built and demoed now.
- Every rule uses only fields the verified source provides (financial figures,
  installment count, payment-data state, recommended date, same-category cost
  cohort). There is deliberately **no** physical-progress, geospatial,
  duplicate-project or delay-prediction rule — the source has none of that
  (`docs/data-source.md` §14).
- Output is the existing `ProjectRisk` view model: `level`
  (`HIGH` / `MEDIUM` / `LOW` / `UNKNOWN`), a 0–100 `score`, and human-readable
  `reasons`. `UNKNOWN` means "not enough data to assess" and is never presented
  as a clean result; scores are indicators requiring investigation, never proof
  of misuse.
- Age-based rules (e.g. "recommended long ago, no payments") are evaluated
  against a fixed reference date (`RISK_REFERENCE_DATE` in the demo fixtures) so
  demo output is deterministic.
- The screens consume risk **only** through `DataProvider.getProjectRisk`. When
  the backend risk API lands, `ApiDataProvider.getProjectRisk` returns its
  response and this module is used only by `DemoDataProvider` (or removed) — no
  presentation component changes.

UI-implementation only — no change to `architecture.md`, `requirements.md` or
`round1-scope.md`. The authoritative risk engine remains a backend concern
(D22).

## D30 — Frontend RBAC scaffold

**Decision:**

The Round-1 web portal carries a client-side RBAC scaffold (`frontend/src/auth/`)
so role-aware navigation and screens can be built and demoed before backend
sign-in exists.

- **Roles** (`roles.ts`): MoSPI / Ministry, State Authority, District Authority,
  Auditor, MP, Citizen. Field Officer is omitted — it has no web interface in
  Round 1 (D23).
- **Access map** (`access.ts`): each routed screen belongs to an `Area`;
  `canAccess(role, area)` is the single role→visibility mapping. Round-1 rule:
  authority roles see all monitoring areas (overview, projects, risk, audit);
  Citizen sees Projects and the public areas (citizen portal, grievances) only.
- **Session** (`SessionProvider` / `useSession`): the active role is chosen from
  the header **Viewing as** selector and persisted to `localStorage`. This
  stands in for authentication; it performs none.
- **Enforcement points**: the sidebar hides items the role cannot access;
  `RequireRole` wraps each route and renders a "not available for your role"
  state instead of the screen.

This is a UX convenience only. It is **not** a security boundary: per D5,
Role-Based Access Control is enforced by Spring Security at the API layer, and
frontend restrictions alone are never sufficient. When backend auth lands, the
session is populated from the authenticated principal and the same `canAccess`
map keeps driving navigation.

UI-implementation only — no change to `architecture.md`, `requirements.md` or
`round1-scope.md` (this is scope item P0.5, "Basic RBAC", frontend portion).

## D31 — Round 1 authentication approach

**Decision:**

Backend authentication for Round 1 is deliberately minimal — enough to make the
RBAC enforcement (D5) real for the demo, without building a full identity
system.

- **Seeded demo users only.** One account per web role (MoSPI / Ministry, State
  Authority, District Authority, Auditor, MP, Citizen), created by a Flyway seed
  / bootstrap. No self-registration, no email verification, no password reset,
  no MFA.
- **Simple credential login.** `POST /api/auth/login` (username + password),
  `GET /api/auth/me`, logout. A stateful server session is preferred over JWT
  for a single SPA against a modular monolith; JWT is an acceptable alternative
  if it proves simpler in practice.
- **SecurityConfig flips.** `anyRequest().permitAll()` becomes
  `authenticated()`, with per-endpoint authority rules matching the frontend
  `canAccess` map. `/api/health` stays public.
- **Frontend.** A login page replaces the D30 "Viewing as" dropdown.
  `SessionProvider` populates the session from `GET /api/auth/me` instead of
  `localStorage`. `RequireRole` and the client `canAccess` map are unchanged —
  they now read the authenticated role. Passwords/tokens are never stored in
  source (D5 / project rules).

This supersedes the "role dropdown" half of D30. The client `canAccess` map
stays client-side as a navigation/UX convenience; the backend remains the
authoritative check.

Advanced identity work (real IdP / SSO, Field Officer mobile auth, granular
approval permissions) is out of Round 1 scope.

## D32 — Citizen self-registration (post-B4)

**Decision:**

After the core backend integration (B1 auth, B2 works APIs, B3 risk engine,
B4 grievances API) is built and stable, add **citizen-only self-registration**.
This refines D31, which deliberately shipped B1 with seeded accounts and no
signup.

- **Scope: citizens only.** `POST /api/auth/register` is public and always
  creates the account with role `CITIZEN`. The role is assigned by the server
  and never taken from the request body. Government roles (MoSPI / Ministry,
  State Authority, District Authority, Auditor, MP) stay
  administrator-provisioned — there is no self-service path to a privileged
  role.
- **Data.** Registration collects display name, a unique email, and a password
  (with confirmation). A Flyway migration (V7, after `app_user` V5 and
  `grievances` V6) adds the columns needed — at minimum `email`, and an
  `email_verified` flag if verification is implemented.
- **Frontend.** A `/register` page, public and outside the application shell,
  linked from `/login`. On success the user is signed in and lands on
  `/citizen`.
- **Sequencing.** This is backend-integration step **B4a**. It must not begin
  before B1–B4 are stable, and it must not delay them.
- **Deliberately minimal for Round 1** (documented limitations, revisit before
  production): email verification, password reset, and abuse protection
  (rate limiting / captcha) on the public endpoint are optional and added only
  if time allows.

Superseded part of D31: "no self-registration" applied to B1; from B4a a
citizen may self-register. Everything else in D31 stands.

## D33 — Works read APIs: authority-facing vs. public split

**Decision:**

The B2 works read APIs are split into two endpoint families rather than one
shared endpoint with client-side field stripping:

- **`GET /api/works`, `/api/works/{id}`, `/api/works/summary`,
  `/api/works/{id}/payments`** — the full internal view (`WorkResponse`:
  data-quality flags, payment state, lifecycle, etc.). Restricted in
  `SecurityConfig` to the government roles (`MOSPI`, `STATE`, `DISTRICT`,
  `AUDITOR`, `MP`); a citizen session gets `403`.
- **`GET /api/public/works`, `/api/public/works/{id}`** — a server-narrowed
  projection (`PublicWorkResponse` / frontend `PublicProject`): only publicly
  releasable fields, no risk data, no data-quality flags, no payment internals,
  no provenance. Any authenticated session may read it; this is what the Citizen
  Portal calls.

**Why:** CLAUDE.md §5 / §14 — "only publicly releasable information should be
exposed to citizens." Narrowing on the server means a citizen's browser never
receives the internal fields at all, rather than relying on the frontend to
omit them from the view. It keeps the pre-backend behaviour (the demo
`toPublicProject` projection) but now enforced at the data boundary.

**Frontend:** the `DataProvider` gains `listPublicProjects` / `getPublicProject`;
`DemoDataProvider` derives them via `toPublicProject`, `ApiDataProvider` calls
the public endpoints. The Citizen Portal service (`citizen.ts`) uses only these
two; it can no longer reach `listProjects` / `getProject`.

**Not done in B2** (revisit at B4b — round1-scope §5): pagination and filtering
are client-side over the full list for both families. B4b makes `GET /api/works`
and `GET /api/public/works` take `page`/`size` + server-side filters and return a
paged envelope; the frontend adopts a paged list method and drops the
fetch-everything approach. Deferred to B4b so it lands once risk (B3) is a real
filterable field. A dedicated public *summary* endpoint is also not built (the
portal derives filter options from the list) — folded into B4b.

**Interim (B2, perf):** with ~6k demo works the list screens rendered 130k+ DOM
nodes and took 9–12 s. `DataTable` gained client-side pagination (`pageSize=25`)
and `loadProjectsWithRisk` now probes the risk endpoint once instead of firing
one rejected call per work while it is unimplemented (pre-B3). Stopgap; B4b is
the real fix.
