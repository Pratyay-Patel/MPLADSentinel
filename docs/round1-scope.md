# MPLADSentinel — Round 1 Implementation Scope

## 1. Objective

The Round 1 goal is to demonstrate a polished and functional foundation of MPLADSentinel rather than the complete planned system.

The primary demonstration should prove the following flow:

```text
MPLADS Data
    ↓
Spring Boot + PostgreSQL
    ↓
React Web Portal
    ↓
Project Intelligence
    ↓
Basic Risk Detection
```

The implementation must prioritize reliability and a coherent end-to-end workflow over the number of features completed.

## 1.1 Round 1 Delivery Strategy

This section refines how the P0/P1 scope below is delivered. The original scope was written assuming the complete Spring Boot backend (real MPLADS ingestion hardening, and a full repository/service/controller layer per API) would ship inside Round 1. That is not the working plan.

The working plan for Round 1 is:

1. Deliver a complete, demo-viable **web frontend** covering every Round 1 screen — Government Dashboard, Project Register, Project Details, Risk & Alerts, RBAC, Citizen Portal, Grievances.
2. The frontend reads all data through a `DataProvider` abstraction (decision D26). During this phase the active implementation is `DemoDataProvider`, backed by controlled seed data whose record structure mirrors the backend `Work` model exactly.
3. Backend integration is a **follow-on** step. It is wired screen by screen by switching each screen's data path from `DemoDataProvider` to `ApiDataProvider` (real Spring Boot APIs). No screen UI is rewritten for this.
4. Client-side risk (`deriveRisk`, D29) and the client RBAC scaffold (D30) are stand-ins for their server-side counterparts and are replaced the same way.

Consequences for the scope below:

- P0 is considered met, for demo purposes, when a screen is complete and correct on the `DataProvider` seam. The real backend API behind it is a separate, later step.
- IPFS evidence (P1.1), the blockchain audit event (P1.2) and the Audit Timeline (P1.3) depend on backend and verification/ledger events. They are **deferred to the backend-integration phase** and are not built as frontend-only screens now.
- Seed data must never be labelled "demo" in the UI (it will be replaced by real data with no UI change); it is only distinguishable in code (the `900_000_000+` id range and `DemoDataProvider`).

The backend-integration phase begins with **authentication + a login page** (D31), then the **`/api/works` family** of read endpoints, then the **server-side risk engine** (D22), then the **grievances table + API**, and finally the optional IPFS / blockchain / Audit Timeline work. `VITE_DATA_SOURCE=api` is flipped **per capability** as each endpoint lands — not big-bang — and no screen UI is rewritten.

## 2. P0 — Must Have

These features form the minimum acceptable Round 1 implementation. Per §1.1, "delivered" here means complete on the frontend `DataProvider` seam; the backend API behind each is a follow-on step.

P0.1 — MPLADS Data Integration
Consume available MPLADS project data through the verified REST API.
Store required project data in PostgreSQL.
Expose project data through Spring Boot REST APIs.
Do not assume fields that have not been verified from the actual API response.
P0.2 — Government Project Dashboard

Provide a polished React + TypeScript dashboard with:

Project statistics
Project status overview
Financial information where available
Risk indicators

P0.3 — Project Register

Provide a dedicated searchable/filterable register of all works, separate from the dashboard's compact exploration table.

Full work list with search
Filters (state, district, house, category, lifecycle status, risk level)
Per-row status and risk indicators
Link through to Project Details

P0.4 — Project Details

Provide a detailed project view containing available information such as:

Project/work description
Location
MP/constituency
Estimated cost
Payment/expenditure information where available
Status
Available timeline information
Risk status
P0.5 — Basic Risk Detection

Implement an initial rule-based/statistical risk engine.

The system should:

Calculate an initial project risk score.
Identify available financial/project irregularities.
Assign an appropriate risk level.
Display the reasons contributing to the risk.

Advanced ML models are not required for Round 1.

P0.6 — Basic RBAC

Implement the foundation for role-based access within the single React application and Spring Boot backend.

Initial roles:

MP
District Authority
State Authority
MoSPI / Ministry
Auditor
Citizen

Backend authorization must enforce permissions; frontend restrictions alone are insufficient.

P0.6a — Client RBAC scaffold *(done)*

Role context, role→area access map (`canAccess`), role-gated navigation, and the `RequireRole` route guard. Role chosen from a header selector, persisted to `localStorage`. This is UX only — see decision D30.

P0.6b — Backend authentication + login *(done — backend-integration step B1)*

- Seeded demo users, one per web role (`app_user` table, Flyway V5; `AuthUserSeeder`); no self-registration (decision D31).
- `POST /api/auth/login`, `GET /api/auth/me`, `POST /api/auth/logout`. Stateful `HttpSession`, BCrypt password hashing.
- `SecurityConfig`: `anyRequest().permitAll()` → `authenticated()`; public = `POST /api/auth/login`, `GET /api/health`, actuator health/info. Unauthenticated calls get a JSON `ApiErrorResponse` 401. Per-endpoint authority rules land with each business API (B2 onward). CSRF stays disabled for Round 1 (documented limitation in `SecurityConfig`).
- A `/login` page replaces the header role selector; `SessionProvider` resolves the session from `GET /api/auth/me`. The header shows the signed-in user + "Sign out". `RequireAuth` gates the shell; `RequireRole` / `canAccess` are unchanged — they now read the authenticated role.

## 3. P1 — Implement If P0 Is Stable

These features are valuable for the demonstration but must not delay completion of P0.

Per §1.1, P1.1–P1.3 depend on backend services and verification/ledger events. They are **deferred to the backend-integration phase** and are not built as frontend-only screens during the current frontend sprint. P1.4 and P1.5 are frontend screens and are delivered on the `DataProvider` seam alongside P0.

P1.1 — IPFS Evidence (deferred to backend-integration phase)
Upload a sample project/field-verification evidence file through the appropriate flow.
Store the resulting CID as a project/verification reference.
Actual evidence remains stored in IPFS/Pinata.
P1.2 — Basic Blockchain Audit Event (deferred to backend-integration phase)
Integrate with the blockchain service if it is ready.
Record one or more important audit events through Hyperledger Fabric.
Do not attempt to implement the complete blockchain workflow for Round 1.
P1.3 — Basic Audit Timeline (deferred to backend-integration phase)

Display important project events in chronological order. Depends on verification/ledger events that do not exist until backend integration.

P1.4 — Basic Citizen Portal *(done — frontend + B2 public works API)*

Provide a read-only interface for:

Searching projects
Viewing publicly releasable project information
Viewing available project status/progress
Viewing blockchain-backed audit/integrity information through Spring Boot APIs

Citizens must not directly access the Hyperledger Fabric network.

P1.5 — Grievances (citizen submission + authority review) *(done — frontend + B4 API)*

- **Citizen:** a submission form (category, subject, description, optional
  related work / contact) plus a read-only list of grievances they have raised.
- **Authorities (MoSPI / State / District; Auditor read-only):** no submission
  form — a review queue. List all grievances, filter by status / work /
  category, open one, and move it through
  `SUBMITTED → UNDER_REVIEW → ACTIONED → CLOSED` with an action note.
- **Persistence:** a `grievances` table (Flyway V6 — V5 is `app_user`) with
  `GET / POST / PATCH /api/grievances`.

The frontend role-split (form vs. queue, status transitions) can land ahead of
persistence on the `DataProvider` seam; until the table exists the
`DemoDataProvider` holds grievances for the browser session only.

P1.6 — Citizen self-registration *(backend-integration step B4a — after B1–B4, decision D32)*

- Public `POST /api/auth/register` creating an `app_user` with role **always
  server-assigned `CITIZEN`** — the role is never read from the request body.
- Fields: display name, email (unique), password + confirmation, with
  server-side strength / format validation; duplicate email → 409.
- Frontend `/register` page (public, outside the shell) linked from `/login`
  ("Create a citizen account"). On success: sign in and land on `/citizen`.
- Government roles (MoSPI / State / District / Auditor / MP) remain
  administrator-provisioned — they cannot self-register.
- Round-1 minimal: email verification, password reset and abuse throttling /
  captcha on the public endpoint are noted as limitations to add before any
  production use, not built for the demo unless time allows.

## 4. P2 — Deferred

The following features are explicitly outside the Round 1 implementation scope:

F7 — Duplicate / Similar Project Detection
F8 — Delayed Project Prediction
F9 — Geospatial Project Intelligence
Advanced ML risk models
SHAP-based advanced explanations
Advanced cross-project analytics
Complete blockchain workflow
Advanced citizen integrity features
Advanced grievance-management workflows

These may be implemented in later development phases.

## 5. Implementation Priority

Development follows this order. Steps 1–4 built the backend foundation and the MPLADS ingestion + persistence + source-API client. Steps 5 onward are the frontend sprint on the `DataProvider` seam (§1.1), followed by backend API integration.

```
1. Project Foundation                         [done]
        ↓
2. MPLADS API Integration                     [done]
        ↓
3. PostgreSQL Data Layer                      [done]
        ↓
4. Spring Boot REST APIs                      [done — B1 auth, B2 works read APIs, B3 risk engine, B4 grievances, B4a citizen registration]
        ↓
--- frontend sprint (DataProvider seam) ---
5. React Dashboard                            [done]
        ↓
6. Project Details                            [done]
        ↓
7. Basic Risk Detection (client deriveRisk)   [done]
        ↓
8. RBAC scaffold (client)                     [done]
        ↓
9. Project Register                           [done]
        ↓
10. Citizen Portal                            [done]
        ↓
11. Grievances (frontend, DataProvider seam)  [done]
        ↓
11a. Grievances role-split (citizen form vs.  [done]
     authority review queue + status flow),
     still on the DataProvider seam
        ↓
     P0 FRONTEND COMPLETE — Round 1 demo surface ready
        ↓
--- backend integration (flip VITE_DATA_SOURCE=api per capability) ---
12. B1 — Backend auth + login page             [done]
    (seeded demo users, D31; app_user Flyway V5;
     /api/auth/login|me|logout; stateful session;
     SecurityConfig → authenticated(); /login page +
     RequireAuth; header sign-out)
        ↓
13. B2 — Works read APIs                        [done]
    - GET /api/works, /api/works/{id}, /api/works/summary,
      /api/works/{id}/payments — authority roles only (D33)
    - GET /api/public/works, /api/public/works/{id} — limited public
      projection for the Citizen Portal (D33)
    - flip listProjects / getProject / getProjectSummary /
      getProjectPayments + listPublicProjects / getPublicProject
    - IngestionStartupRunner (mplads.ingestion.run-on-startup) populates
      the dev/demo DB; ingestion stays HTTP-free otherwise. The `sample`
      step ingests the first N pages of recommended+completed works per
      state (verified `state` filter) for a geographically diverse slice,
      instead of state-alphabetical sequential paging
    - interim frontend perf: the list screens render all works at once, so
      DataTable got client-side pagination (pageSize=25) and the risk fan-out
      was cut (one probe, not one rejected call per work, pre-B3). Proper
      server-side paging is B4b.
        ↓
14. B3 — Risk engine (rule-based, server-side, D22)              [done]
    - com.mpladsentinel.mplads.risk: RiskEngine + RiskRuleSet (the 6
      rules ported 1:1 from the client deriveRisk — same ids/weights/
      thresholds), injected Clock for deterministic tests
    - GET /api/works/risk (bulk — the list screens call this once) and
      GET /api/works/{id}/risk (single — the detail page); authority-only
    - flip getProjectRisk + new listProjectRisks; loadProjectsWithRisk
      fetches projects + risks in parallel (one request each, not one
      per work)
    - client deriveRisk (rules.ts) kept as the demo-mode risk source,
      kept in sync with the backend by hand
        ↓
15. B4 — Grievances API                                          [done]
    - grievance table (Flyway V6); GET /api/grievances (citizen sees
      only their own, every other role sees all), POST (CITIZEN only —
      government roles cannot raise one), PATCH /{id} (MoSPI/State/
      District only). submitted_by_user_id links the raiser (AppUserDetails
      gained id()).
    - flip listGrievances / submitGrievance / updateGrievanceStatus;
      the grievances service builds its work-picker from
      listPublicProjects (a citizen cannot call /api/works)
    - EVERY DataProvider method is now backed by a real endpoint. This
      closes the B1–B4 core set.
        ↓
15a. B4a — Citizen self-registration (D32)                       [done]
     - app_user.email (Flyway V7); public POST /api/auth/register —
       role ALWAYS server-assigned CITIZEN, username = email, signs in
       on success; 409 on a duplicate email, 400 on validation.
     - /register page (public, outside the shell) linked from /login;
       the login field is now "Username or email".
     - Government roles stay admin-provisioned. No email verification /
       password reset / rate-limiting in Round 1 (documented, D32).
        ↓
15b. B4b — Works pagination + filtering API (updates D33)  [DEFERRED to post-Round-1]
     GET /api/works and GET /api/public/works to take page/size + server-side
     filters (state, district, category, lifecycle, risk, search) and return a
     paged envelope; DataProvider gains a paged+filtered list method; the 4 list
     screens drop the "fetch everything" approach.
     Deferred: at ~6k demo works the B2 client-side pagination (DataTable
     pageSize=25) keeps loads ~2-3s, which is acceptable for Round 1. B4b is
     the correct shape for the real ~83k dataset and is a ~15-file change
     across every list screen — done properly after Round 1.
        ↓
15d. Demo DB population + polish pass                            [done 2026-08-30]
     - Works ingested via the `sample` step (first page of recommended +
       completed per state) → ~6044 works across 34 states.
     - Payments ingested via the `payments` step (run 69, PARTIAL): 4212 works
       `FETCHED_PRESENT`, 1483 `FETCHED_ABSENT`, 349 `FETCH_ERROR`
       (Empowered Indian API burst-protection 429s — retryable). 7338
       `work_payment` rows; `/api/works/summary` `totalRecordedPayments`
       ≈ ₹289.9 cr. Top up the 349 later with
       `MPLADS_INGEST_PAYMENTS_DELAY=1500ms`.
     - Polish pass (commit d6e5d39): user-facing meta/disclaimer text softened
       or removed across all screens; `AREA_ROLES.projects` narrowed from
       all-roles to authorities (the Project Register is an authority screen —
       citizens use the Citizen Portal), so a citizen no longer routes to the
       authority `/api/works` endpoint; `ApiDataProvider` returns clean
       user-facing messages for 401 / 403 / network failures; seeded account
       display names lost the "(demo)" suffix and are refreshed on every boot.
        ↓
16. IPFS evidence
        ↓
17. Blockchain audit event
        ↓
18. Audit Timeline
```

If time becomes limited, stop at the highest completed stable priority rather than starting additional incomplete features.

6. Round 1 Development Rules
- P0 features take priority over all P1 features.
- P1 features must not delay or destabilize P0.
- P2 features must not be started during the Round 1 sprint unless explicitly approved.
- Do not introduce new infrastructure or major architectural changes solely to add a Round 1 feature.
- Do not implement advanced ML models without verifying that the required training data is available.
- Do not fabricate MPLADS data or silently substitute unverified fields.
- Synthetic/mock data may be used only where necessary for UI demonstration and must be clearly distinguishable from real data.
- Existing architecture must not be changed without explicit approval.
- Each implementation phase must be developed on its own feature branch.
- Development must not be performed directly on the main branch.