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

## 2. P0 — Must Have

These features form the minimum acceptable Round 1 implementation.

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
Search and filtering
Risk indicators
P0.3 — Project Details

Provide a detailed project view containing available information such as:

Project/work description
Location
MP/constituency
Estimated cost
Payment/expenditure information where available
Status
Available timeline information
Risk status
P0.4 — Basic Risk Detection

Implement an initial rule-based/statistical risk engine.

The system should:

Calculate an initial project risk score.
Identify available financial/project irregularities.
Assign an appropriate risk level.
Display the reasons contributing to the risk.

Advanced ML models are not required for Round 1.

P0.5 — Basic RBAC

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

P1.1 — IPFS Evidence
Upload a sample project/field-verification evidence file through the appropriate flow.
Store the resulting CID as a project/verification reference.
Actual evidence remains stored in IPFS/Pinata.
P1.2 — Basic Blockchain Audit Event
Integrate with the blockchain service if it is ready.
Record one or more important audit events through Hyperledger Fabric.
Do not attempt to implement the complete blockchain workflow for Round 1.
P1.3 — Basic Audit Timeline

Display important project events in chronological order.

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

Development should follow this order:

``` 
1. Project Foundation
        ↓
2. MPLADS API Integration
        ↓
3. PostgreSQL Data Layer
        ↓
4. Spring Boot REST APIs
        ↓
5. React Dashboard
        ↓
6. Project Details
        ↓
7. Basic Risk Detection
        ↓
8. RBAC
        ↓
             P0 COMPLETE
        ↓
9. IPFS
        ↓
10. Blockchain Audit Event
        ↓
11. Audit Timeline
        ↓
12. Citizen Portal / Grievance

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