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

P1.4 — Basic Citizen Portal

Provide a read-only interface for:

Searching projects
Viewing publicly releasable project information
Viewing available project status/progress
Viewing blockchain-backed audit/integrity information through Spring Boot APIs

Citizens must not directly access the Hyperledger Fabric network.

P1.5 — Citizen Grievance Form

Provide a basic form through which citizens can submit project-related grievances.

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
4. Spring Boot REST APIs                      [partial — deferred to step 12]
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
9. Project Register                           [current]
        ↓
10. Citizen Portal
        ↓
11. Grievances
        ↓
     P0 FRONTEND COMPLETE — Round 1 demo surface ready
        ↓
--- backend integration ---
12. Spring Boot REST APIs per screen; switch each screen
    DemoDataProvider → ApiDataProvider
        ↓
13. IPFS evidence
        ↓
14. Blockchain audit event
        ↓
15. Audit Timeline
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