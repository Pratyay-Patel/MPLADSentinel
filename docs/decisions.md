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