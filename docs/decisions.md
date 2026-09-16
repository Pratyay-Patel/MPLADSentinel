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

**Implemented (B3):** `com.mpladsentinel.mplads.risk` — `RiskEngine` +
`RiskRuleSet`, 6 rules (`PAYMENT_OVERSPEND`, `FULL_PAYOUT_BEFORE_COMPLETION`,
`SINGLE_INSTALLMENT_FULL`, `DORMANT_NO_PAYMENTS`, `COST_COHORT_OUTLIER`,
`PAYMENT_DATA_UNAVAILABLE`) using only verified source fields (no
physical-progress / geospatial / duplicate / delay-prediction rule). Score =
Σweights capped 100; ≥55 HIGH, ≥25 MEDIUM, >0 LOW; `UNKNOWN` when nothing fired
and nothing is assessable. Deterministic (injected `Clock`). Exposed at
`GET /api/works/risk` (bulk) and `GET /api/works/{id}/risk` (single),
authority-only. Scores are **investigation indicators, never proof** (§17).

The 6 rules are a 1:1 port of the client `frontend/src/data/risk/rules.ts`,
which is retained as the demo-mode risk source and kept in sync by hand.

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
  Citizen sees the public areas (citizen portal, grievances) only. *(Updated
  2026-08-30, commit d6e5d39: the `projects` area — the authority Project
  Register — was narrowed from all-roles to authorities. Citizens browse works
  through the Citizen Portal (`/citizen`), which calls the public works API;
  routing them at `/projects` sent them to the authority `/api/works` endpoint
  and produced a 403.)*
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

**Implemented (B4a).** `app_user.email` (Flyway V7, unique); `AuthService.register`
+ public `POST /api/auth/register` (`RegisterRequest` has no `role` field — the
server always sets `CITIZEN`; `username = lower(email)`; establishes the session
and returns the `SessionUser`). Duplicate email → 409; password mismatch /
`< 8` chars / bad email → 400. Frontend `/register` page (public, outside the
shell) linked from `/login`; the login field is relabelled "Username or email".
Email verification, password reset and abuse throttling remain out of Round 1.

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
two; it can no longer reach `listProjects` / `getProject`. *(2026-08-30, commit
d6e5d39: the `projects` RBAC area was also narrowed to authorities (see D30), so
a citizen no longer routes to the authority `/api/works` endpoint at all — the
403 was still reachable via the `/projects` route before this.)*

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

## D34 — Field-officer inspections & the Audit Trail (portal side)

**Decision:**

Deliver the portal-only slice of the field-verification workflow
(`docs/portal-app-integration-plan.md`), plus a **read-only Pinata/IPFS demo**
for evidence. Full spec: `docs/inspections-audit-feature.md`.

- **Field-officer accounts.** A new `WebRole.FIELD_OFFICER`. Field officers are
  `app_user` rows with a unique `officer_code` (e.g. `OFF102`) and a `phone`,
  populated only for that role (Flyway **V8**, which also relaxes
  `ck_app_user_role`). Authority-provisioned only — no self-registration.
  `FieldOfficerSeeder` creates `OFF101`–`OFF105` at startup under the existing
  `mplads.auth.*` seeding gate; `OFF102 / Rahul Sharma` matches
  `docs/MOBILE_ARCHITECTURE.md`. `FIELD_OFFICER` has **no** authority-facing
  endpoints and is denied every existing API in `SecurityConfig`.
- **Assignments.** `inspection_assignment` (V8) links a `source_work_id` (not an
  FK — the work may be un-ingested, same rule as `grievance.work_reference`) to
  an officer, with `status ASSIGNED → IN_PROGRESS → COMPLETED` or `CANCELLED`
  (`AssignmentStatus.canTransitionTo` enforces the lifecycle; a partial-unique
  index allows one open assignment per work+officer). APIs: `GET /api/officers`;
  `GET/POST/PATCH /api/assignments`. `POST`/`PATCH` → `MOSPI`/`STATE`/`DISTRICT`;
  `GET` → any government role. New frontend `/inspections` tab (Monitoring
  group, area `inspections`; assign + advance for those three roles, read-only
  for Auditor/MP).
- **Audit Trail.** The placeholder `/audit` page becomes a **work-level**
  chronological timeline built from the assignment row (Requested → In progress
  → Completed / Cancelled → Field evidence). Populated from PostgreSQL — **no
  Hyperledger Fabric** (deferred; the `canonical_json`-hashing anchor step in the
  parent plan is additive).
- **Demo boundary (temporary).** The Flutter app is not connected yet, so the
  *contents* of the "Inspection completed" event (questionnaire answers, overall
  condition, remarks) are **hardcoded illustrative values**, shown for any
  assignment whose status is `COMPLETED` and clearly labelled as not-yet-wired
  (CLAUDE.md §8). The assignment events and their dates are real.
- **Pinata / IPFS (real, read-only).** `GET /api/audit/{workId}/photos` calls the
  Pinata Files API (`/v3/files/{network}?order=DESC&limit=2`) with a
  backend-only `PINATA_JWT` (env; never in the frontend / Vercel / git /
  source — CLAUDE.md §7) and returns `{ photos: [{cid,name,url}], configured }`
  with gateway URLs. `configured:false` (no JWT) → empty list, the page renders
  a "not connected" note rather than an error. Ordering is Pinata's upload time,
  **not** EXIF. The Audit page shows the two images as thumbnails with a
  lightbox.

**Deferred (unchanged from the parent plan):** the Flutter `/api/mobile/**`
channel and its JWT auth; `field_inspection` / `field_inspection_photo` tables
and canonical-JSON ingest; matching photos to an inspection via CIDs in a
payload; Fabric anchoring.

**Implemented.** Backend: V8 migration, `WebRole.FIELD_OFFICER`, `AppUser`
`officerCode`/`phone`, `FieldOfficerSeeder`, `inspection` package
(`InspectionAssignment` + `AssignmentStatus` + repo + service + the two
controllers), `audit` package (`PinataProperties`/`PinataClient`/`PinataConfig`,
`AuditEvidenceService`, `AuditController`), `SecurityConfig` matchers,
`mplads.pinata.*` config + `.env.example`. Frontend: `data/types` +
`DataProvider` methods (`listFieldOfficers` / `listAssignments` /
`createAssignment` / `updateAssignment` / `getAuditPhotos`) on both providers,
`data/features/inspections.ts` + `audit.ts`, `/inspections` and rebuilt `/audit`
pages, nav item + `access.ts` (`assignsInspections`). Tests: backend
`InspectionAssignmentControllerTest` / `FieldOfficerSeederTest` /
`PinataClientTest` / `AuditEvidenceServiceTest` (+ `FlywayMigrationTest`);
frontend `inspections` / `audit` service + page tests. Also repaired a
pre-existing `AuthUserSeederTest` failure touched by the `WebRole` change.
**Not yet verified:** the Pinata call against a real account (awaiting a
`PINATA_JWT`).

## D35 — De-duplication of Works (F7)

Decision: F7 ("Duplicate / Similar Project Detection") means detecting
duplicate/near-duplicate **ingested work records** — not duplicate
field-inspection photos, which was the user's initial read of the
competitor-inspired feature name. Confirmed against the exact requirements.md
wording ("duplicate or highly similar **works** using project details,
location and financial information") — it was always about project records.
Photo-duplicate detection (perceptual hashing etc.) is explicitly out of scope
here: the Flutter field app is camera-only (no gallery picker) and geotags
every photo before uploading straight to IPFS, which already structurally
prevents recycled/duplicate site-photo fraud — no additional code is needed to
defend against something the upload path already rules out.

F7 is P2/deferred in `docs/round1-scope.md`; building it now is a bonus
feature for the nationals submission, not catching up on a missed item.

**Implemented.** New `com.mpladsentinel.mplads.dedup` package, deliberately
separate from `com.mpladsentinel.mplads.risk` — `RiskRuleSet`'s own javadoc and
decision D22 explicitly declare duplicate-detection out of that class's scope,
so this is a new engine following the *same style* (deterministic, explainable,
rule-based, no ML), not a rule bolted onto D22's rule set.

- `DuplicateWorkEngine` groups all ingested works by `(state, district,
  category)` — comparing works in different locations or sectors isn't
  meaningful — then `DuplicateRuleSet` scores every pair within a group.
  Being in the same group alone never flags a pair (too many legitimate,
  distinct works share a state/district/category); at least one real signal
  must fire:
  - **Near-identical `workDescription`** — Jaccard similarity over lowercase
    word tokens (>2 chars) ≥ 0.6 → weight 60.
  - **Overlapping `estimatedCost`** — relative difference ≤ 0.2 → weight 30.
  - Score capped at 100; `HIGH` ≥ 60, `MEDIUM` ≥ 30, `LOW` otherwise. A pair is
    only ever produced when at least one signal fired (score > 0).
- Exposed at `GET /api/works/duplicates`, matched by the existing
  `/api/works/**` authority-only rule in `SecurityConfig` (same role set as
  risk: MoSPI/State/District/Auditor/MP) — simpler and consistent with every
  other `/api/works/**` sub-route, rather than the narrower "MoSPI, District"
  audience column in `docs/requirements.md`'s F7 row (a deliberate
  simplification, since citizens — the only role actually excluded either
  way — see neither).
- No schema change and nothing persisted — computed live from the `work`
  table, same as risk.
- Frontend: `DataProvider.listDuplicateWorks()` on both providers;
  `ApiDataProvider` calls `GET /api/works/duplicates`; `DemoDataProvider`
  computes via `frontend/src/data/dedup/duplicateRules.ts`, a 1:1 port of the
  backend engine (same grouping, thresholds and weights), following the same
  "kept in sync by hand" convention as `risk/rules.ts` for D22. New
  `/duplicates` page (Monitoring group, area `duplicates`, same
  authority-only role set as `risk`) lists candidate pairs with confidence,
  reasons, and links into each work's detail page.
- The demo fixture set (14 hand-crafted works, each already shaped to
  exercise one risk-rule outcome) has no two works sharing a state, district
  and category, so it genuinely produces zero pairs — the demo build's
  `/duplicates` page correctly shows an honest empty state. Adding fixture
  works to force a demo example was tried and reverted: the demo project
  count is hardcoded (`14`) across ~11 unrelated test files, so doing this
  properly would need updating all of them for a purely cosmetic demo
  concern — out of proportion for a bonus feature. Real ingested data (6,000+
  works) will produce real pairs once connected.

**Verified.** Backend: `DuplicateWorkEngineTest` (7 unit tests — grouping
boundaries, each signal individually, combined scoring, missing-data
skip-not-throw) + `DuplicateControllerTest` (2 integration tests over real
Postgres — RBAC gating, a real near-duplicate pair found and an unrelated work
excluded). Full backend suite: 253/253 pass. Frontend: `tsc -b --force` and
`eslint` clean; `duplicateRules.test.ts` (7 tests, mirroring the backend unit
tests) + `DuplicateWorks.test.tsx` (3 tests: renders pairs, filters by
confidence, empty state) + `ApiDataProvider`/`DemoDataProvider` additions; full
suite 340/342 pass (2 pre-existing unrelated failures). Real production
`vite build` succeeds. Visually verified in-browser (demo build): nav item
and route render correctly for an authority role and are inaccessible/hidden
for Citizen; the empty state renders correctly given the demo fixture set's
genuine absence of duplicates.
