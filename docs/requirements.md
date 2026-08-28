# MPLADSentinel — System Requirements

## 1. Purpose

MPLADSentinel is an AI-powered monitoring and analytics platform for MPLADS implementation.

The platform is intended to identify anomalies, irregularities, inefficiencies and potential misuse of funds while providing authorities with risk-based insights, monitoring tools and auditability.

---

## 2. Core Functional Requirements

| ID | Feature | Description | Primary Users |
|---|---|---|---|
| F1 | MPLADS Data Integration | Import project, sanction, expenditure, progress and completion data from available MPLADS data sources. | System / Ministry |
| F2 | Project Intelligence Dashboard | Provide a unified view of MPLADS projects including cost, progress, timeline and risk information. | MoSPI, State, District, MP |
| F3 | AI Risk Score | Assign a dynamic risk score to projects based on relevant financial, temporal and execution indicators. | Authorities |
| F4 | Financial Anomaly Detection | Identify unusual expenditure, payment patterns, spending spikes and cost-related anomalies. | MoSPI, State, District |
| F5 | Progress–Expenditure Mismatch | Identify cases where reported physical progress is inconsistent with expenditure. | District, State, MoSPI |
| F6 | Cost Benchmarking | Compare project costs with similar works based on relevant project characteristics to identify unusually high costs. | Authorities |
| F7 | Duplicate / Similar Project Detection | Identify potentially duplicate or highly similar works using project details, location and financial information. | MoSPI, District |
| F8 | Delayed Project Prediction | Identify ongoing projects that are likely to experience delays or miss expected completion timelines. | District, State |
| F9 | Geospatial Project Intelligence | Provide geographical analysis of projects, including clusters, nearby works and spatial patterns. | Authorities / Public |
| F10 | AI Risk Explanation | Explain the factors contributing to a project's risk score or alert. | Authorities |
| F13 | Mobile Field Verification | Allow field officers to record project verification information, photographs, GPS/location information and remarks through the mobile application. | Field Officers |
| F14 | Evidence Integrity | Maintain verifiable references/hashes for submitted evidence so that subsequent modification can be detected. | Authorities / Auditors |
| F15 | Permissioned Audit Ledger | Maintain a tamper-evident history of important project and verification events. | MoSPI, State, District, Agencies |
| F16 | Role-Based Approval Workflow | Restrict important state-changing actions to authorized roles and support controlled approval workflows. | District, State, MoSPI |
| F17 | Audit Timeline | Provide a chronological view of important project events such as sanction, fund release, progress, verification and completion. | Authorities / Auditors |
| F18 | Public Project Portal | Allow citizens to search and view publicly releasable MPLADS project information and status. | Citizens |
| F19 | Public Integrity Verification | Allow citizens/researchers to verify the integrity of publicly displayed records using blockchain-backed references/hashes. | Citizens / Researchers |
| F24 | Cross-Project Analytics | Identify broader district/state-level patterns such as recurring anomalies, agencies and project trends. | MoSPI, State |

---

## 3. Supporting Platform Capabilities

### Authentication and Authorization

The platform shall provide secure authentication and role-based authorization for different categories of users.

### Role-Based Access Control

Access to data and operations shall depend on the user's authorized role.

Initial roles include:

- MP
- District Authority
- State Authority
- MoSPI / Ministry
- Auditor
- Citizen
- Field Officer (primarily through the mobile application)

### Auditability

Important project and verification actions should be traceable through application records and, where applicable, the permissioned audit ledger.

### Evidence Management

Field photographs and other verification evidence should be associated with the relevant project and remain retrievable through their stored references.

### Citizen Transparency

Citizens should only receive publicly releasable project and audit/integrity information. Direct access to the permissioned blockchain network is not provided.

---

## 4. Feature Dependencies

Several advanced features depend on the availability and quality of historical MPLADS data.

In particular:

- Advanced risk modelling requires sufficient historical project data.
- Delay prediction requires suitable historical completion/timeline data.
- Duplicate/similar project detection requires sufficiently detailed project descriptions and location information.
- Geospatial analysis requires reliable geographic/project location information.
- Financial anomaly detection depends on the availability of appropriate expenditure and payment data.

The system must therefore verify actual data availability before implementing or relying on a feature.

---

## 5. Development Status

The complete feature set represents the planned vision of MPLADSentinel.

The features are divided into implementation priorities separately in:

`docs/round1-scope.md`

Features **F7, F8 and F9** are explicitly deferred from the initial Round-1 implementation and may be developed in later phases.

Advanced ML capabilities may initially use rule-based/statistical approaches where appropriate and can be progressively enhanced as suitable data and validated models become available.