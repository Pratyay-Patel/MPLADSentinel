# MPLADSentinel — Claude Code Project Instructions

## 1. Project Identity

**Project:** MPLADSentinel

**SIH Problem Statement:** 26102

**Objective:** Build an AI-powered MPLADS monitoring and analytics platform to identify anomalies, inefficiencies, irregularities and potential misuse of funds while improving transparency, accountability and auditability.

This project is being developed for the Smart India Hackathon.

---

## 2. Source of Truth

Before implementing or modifying functionality, consult the relevant project documentation.

| Document | Purpose |
|---|---|
| `docs/problem-statement.md` | Official problem statement and required outcome |
| `docs/architecture.md` | Agreed system architecture |
| `docs/requirements.md` | Complete planned feature set |
| `docs/round1-scope.md` | Current Round 1 implementation priorities |
| `docs/data-source.md` | Data sources, verified fields and data limitations |
| `docs/decisions.md` | Agreed architectural and development decisions |

These documents should be treated as the project's source of truth.

Do not silently contradict or replace an established decision.

If documentation conflicts with another document or with the actual implementation, stop and report the conflict rather than guessing.

---

## 3. Current Technology Stack

The currently agreed stack is:

### Frontend
- React
- TypeScript

### Backend
- Spring Boot
- Spring Security
- REST APIs

### Database
- PostgreSQL

### AI
- Separate Python-based AI service

### Blockchain
- Hyperledger Fabric
- Separate blockchain integration/service layer

### Evidence Storage
- IPFS / Pinata

### Mobile
- Flutter

Do not replace these technologies or introduce major architectural alternatives without explicit approval.

---

## 4. Architecture Rules

The system uses a **modular monolith architecture** centered around Spring Boot.

### Core flow

```text
React Web Portal
        |
        v
Spring Boot Modular Monolith
        |
        v
PostgreSQL
```

The Spring Boot backend is the primary integration layer.

It communicates with:

- PostgreSQL
- AI service
- Blockchain service
- IPFS
- External MPLADS data sources

The mobile application also communicates with Spring Boot.

Storage responsibilities

PostgreSQL

- Operational/application data
- Project data
- Verification records
- User/role information
- IPFS references
- Grievances
- Relevant application events

IPFS / Pinata

- Actual field photographs
- Documents
- Other large evidence files

Hyperledger Fabric

- Selected immutable audit/integrity events
- Not the complete application database
- Not large evidence files


**Important rule**

Never store large evidence files directly in PostgreSQL when they are intended to be stored in IPFS.

Never store the complete project database on Hyperledger Fabric.

## 5. Blockchain Access Rule

Hyperledger Fabric is a **permissioned ledger**.

Citizens must never directly access:

- Fabric peers
- Fabric channels
- Chaincode
- Ledger internals
- Blockchain network infrastructure

Citizen-facing blockchain-backed information must be exposed through controlled Spring Boot APIs.

Preferred flow:

```
Hyperledger Fabric
        |
        v
Spring Boot
        |
        v
Citizen Portal
```

Only publicly releasable information should be exposed to citizens.

## 6. Field Verification Flow

The field verification workflow is primarily handled by the Flutter mobile application.

Expected flow:
```
Field Officer
      |
      v
Flutter Mobile App
      |
      +-------> IPFS / Pinata
      |             |
      |             v
      |            CID
      |
      +-------> Spring Boot
                    |
          +---------+---------+
          |                   |
          v                   v
     PostgreSQL        Blockchain Service
                              |
                              v
                     Hyperledger Fabric
```

The mobile application sends a lightweight structured metadata payload to Spring Boot.

The payload may contain:

- Project ID
- IPFS CID
- Verification/status information
- Timestamp
- Remarks
- Other relevant metadata

The actual evidence remains in IPFS.

## 7. Security Rules

Spring Security is responsible for authentication and authorization.

RBAC must be enforced at the backend/API level.

Never rely solely on frontend UI restrictions for authorization.

Initial roles include:

- MP
- District Authority
- State Authority
- MoSPI / Ministry
- Auditor
- Citizen
- Field Officer

Users must only be able to perform operations permitted by their role.

Sensitive operations must be protected at the API/service layer.

Never expose:

- Database credentials
- API keys
- IPFS secrets
- Fabric credentials
- Other secrets

in source code.

Use environment variables or appropriate secure configuration.

## 8. Data Integrity & Anti-Hallucination Rules

This project relies on external MPLADS data.

Therefore:

Never assume data.

Before implementing functionality that depends on an external field:

1. Inspect the actual API response.
2. Verify the field name.
3. Verify its data type.
4. Check whether it is consistently populated.
5. Check the source documentation where available.

Never invent:

- API endpoints
- API parameters
- Database fields
- MPLADS records
- Financial values
- Project progress
- Completion dates
- Payment information

If information is unavailable, explicitly report that limitation.

Important distinction

Do not automatically interpret:

- Missing data as zero
- Missing payment records as fraud
- Null values as valid measurements
- Unavailable information as negative evidence

Synthetic/mock data may be used for UI development where necessary, but it must be clearly distinguishable from real data.

## 9. External Data Integration

The external MPLADS API should be accessed through the Spring Boot backend.

The React frontend must not directly depend on external MPLADS APIs for core functionality.

The current secondary granular data source is documented in:

docs/data-source.md

The official MPLADS/MoSPI source remains the preferred authoritative source.

Do not represent secondary-source data as directly originating from the official MPLADS system.

## 10. Round 1 Scope

Round 1 prioritizes a reliable end-to-end core workflow.

P0 — Must Have
- MPLADS data integration
- PostgreSQL data layer
- Spring Boot REST APIs
- Government project dashboard
- Project details
- Basic rule/statistical risk detection
- Basic RBAC

P1 — If P0 Is Stable
- IPFS evidence
- Basic blockchain audit event
- Basic audit timeline
- Citizen portal
- Citizen grievance form

P2 — Deferred
- Duplicate/similar project detection
- Delayed project prediction
- Geospatial intelligence
- Advanced ML models
- Advanced SHAP explanations
- Advanced cross-project analytics
- Complete blockchain workflow
- Advanced citizen integrity features
- Advanced grievance workflows

Do not start P2 work during the Round 1 sprint unless explicitly instructed.

Do not allow P1 work to delay or destabilize P0.

## 11. Development Philosophy

Prioritize:

1. Correctness
2. Reliability
3. Security
4. Maintainability
5. Simplicity
6. Feature completeness

Do not optimize for the number of technologies used.

Do not introduce technology simply because it is available.

Avoid unnecessary:

- Microservices
- Kafka
- Redis
- Kubernetes
- GraphQL
- Elasticsearch
- Additional databases
- Infrastructure complexity

unless a concrete requirement exists and the project owner explicitly approves the change.

## 12. Before Implementing a Feature

Before making code changes:

1. Read the relevant requirements.
2. Read the relevant architecture decisions.
3. Inspect the existing codebase.
4. Inspect the current Git state.
5. Identify affected modules/files.
6. Verify required data/API fields.
7. Consider whether the feature belongs to the current Round 1 scope.
8. Propose a concise implementation plan.
9. Identify potential risks or ambiguities.
10. Wait for approval when the task or scope is ambiguous.

Do not immediately start coding a large feature without first understanding the existing implementation.

## 13. Incremental Development

Implement features in small, verifiable increments.

After implementation:

1. Run appropriate tests.
2. Run the relevant build/type checks.
3. Inspect the resulting changes.
4. Check for regressions.
5. Report what was changed.
6. Report what was tested.
7. Report any known limitations.

Do not modify unrelated parts of the codebase while implementing a feature.

Prefer small changes that can be independently reviewed and reverted.

## 14. Frontend Rules

Use React + TypeScript.

Prefer:

- Reusable components
- Clear component boundaries
- Typed API responses
- Centralized API communication
- Clear separation of UI and business logic
- Accessible interfaces
- Consistent design patterns

Do not place substantial business logic directly inside UI components.

Do not make the frontend directly access PostgreSQL or external infrastructure.

Role-based UI visibility is useful for user experience, but backend authorization remains mandatory.

## 15. Backend Rules

Use Spring Boot and Spring Security.

Prefer:

- Clear module boundaries
- RESTful APIs
- DTOs where appropriate
- Service-layer business logic
- Repository/data-access separation
- Input validation
- Consistent error handling
- Secure authorization checks

Do not put substantial business logic inside controllers.

Do not expose database entities unnecessarily through public APIs.

Do not bypass Spring Security for convenience.

## 16. Database Rules

Use PostgreSQL as the primary application database.

Database changes must be deliberate and documented.

Do not:

- Delete existing data without explicit approval.
- Drop tables casually.
- Modify production-like data without confirmation.
- Store secrets in the database unnecessarily.
- Store large evidence files that belong in IPFS.

When modifying the schema, consider existing data and backward compatibility.

## 17. AI/ML Rules

AI functionality must be based on actual available data.

Before selecting or implementing an ML model:

1. Verify required data exists.
2. Inspect data quality.
3. Determine whether sufficient historical data exists.
4. Establish a meaningful baseline.
5. Validate model outputs.

For Round 1, rule-based/statistical risk detection is acceptable and preferred over prematurely building complex ML models.

Never claim that a model detects fraud with certainty.

Risk scores should be presented as indicators requiring investigation rather than definitive proof of fraud.

## 18. Git & Version Control

Claude may freely perform Git read operations when useful for understanding the project, including:

- git status
- git log
- git diff
- Branch inspection
- Commit/history inspection

Claude must NOT perform repository-state-changing Git operations unless explicitly instructed by the project owner.

This includes:

- Commit
- Push
- Merge
- Rebase
- Branch creation
- Branch deletion
- Checkout/switching branches
- Reset operations that modify working state
- Other history/state-changing Git operations

Development must never be performed directly on main.

Each new implementation phase or feature must use a dedicated feature branch.

The project owner will create/switch branches and perform commits and pushes.

Before beginning a new implementation phase, Claude should recommend an appropriate feature-branch name.

## 19. Change Control

Established architectural decisions must not be changed silently.

If a better alternative is identified:

1. Explain the current limitation.
2. Explain the proposed alternative.
3. Explain the benefits and drawbacks.
4. Identify affected components.
5. Wait for explicit approval.

Do not independently migrate the project to a new architecture or technology.

## 20. Communication Rules

When reporting work:

- Be concise.
- Clearly distinguish facts from assumptions.
- State when information has not been verified.
- Do not claim a feature works unless it has been tested.
- Report failed tests/builds rather than hiding them.
- Identify blockers early.
- Ask focused questions when required information is missing.

Do not use confident language to hide uncertainty.

## 21. Final Principle

When uncertain:

Do not guess. Inspect, verify, explain, and ask.

The objective is not to generate the maximum amount of code.

The objective is to build a reliable, maintainable and demonstrable MPLADSentinel system within the agreed scope.