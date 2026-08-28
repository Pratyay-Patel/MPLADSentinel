# MPLADSentinel — System Architecture

## 1. Architecture Overview

MPLADSentinel will use a **modular monolith architecture** centered around a Spring Boot backend.

The system consists of:

- React + TypeScript web portal
- Flutter mobile application for field officers
- Spring Boot backend
- PostgreSQL database
- Separate AI service
- Separate blockchain service
- IPFS/Pinata for evidence storage
- Hyperledger Fabric permissioned ledger

The Spring Boot backend acts as the primary integration layer between the web portal, mobile application, database, AI service, blockchain service and IPFS.

## 2. High-Level Architecture

```text
                         MPLADSentinel
                              |
             +----------------+----------------+
             |                                 |
             v                                 v
     React Web Portal                    Flutter Mobile App
             |                                 |
             | REST API                      | REST API
             +---------------+-----------------+
                             |
                             v
                  +----------------------+
                  |     Spring Boot      |
                  |   Modular Monolith   |
                  |----------------------|
                  | REST Controllers     |
                  | Business Services    |
                  | Security / RBAC      |
                  | AI Integration       |
                  | Blockchain Integration|
                  | IPFS Integration     |
                  +----------+-----------+
                             |
            +----------------+----------------+
            |                |                |
            v                v                v
       PostgreSQL       AI Service      Blockchain Service
                                             |
                                             v
                                    Hyperledger Fabric

                    IPFS / Pinata
                         ^
                         |
                  Evidence / Media

```

## 3. Web Portal

A single React + TypeScript application will provide role-based interfaces.

Initial web roles:

MP
District Authority
State Authority
MoSPI / Ministry
Auditor
Citizen

The Field Officer interface will primarily be provided through the Flutter mobile application.

The web portal communicates with the Spring Boot backend through REST APIs.

## 4. Backend

Spring Boot will be implemented as a modular monolith.

Major backend responsibilities:

REST APIs
Business logic
Authentication and authorization
Role-Based Access Control (RBAC)
MPLADS data integration
PostgreSQL access
AI service integration
IPFS integration
Blockchain service integration
Audit/event handling

Spring Security will handle authentication and authorization.

RBAC must be enforced at the backend/API level and not only through frontend UI restrictions.

## 5. Data Storage Responsibilities
PostgreSQL

Stores operational/application data such as:

Project information
Financial/project metadata
User and role information
Verification records
IPFS CIDs/references
Grievances
Application-level audit/event information
IPFS / Pinata

Stores large evidence files such as:

Field photographs
Documents
Other verification evidence

The CID is stored in PostgreSQL as a reference to the evidence.

Hyperledger Fabric

Used as a permissioned audit ledger.

Only selected important audit events are recorded, such as:

Project-related state changes
Evidence submission
Verification events
Important approvals/actions

The complete project database and large evidence files are NOT stored on the blockchain.

## 6. Field Verification Flow

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
      |             |
      v             |
Spring Boot <-------+
      |
      +-------> PostgreSQL
      |          Verification Record + CID
      |
      +-------> Blockchain Service
                    |
                    v
             Hyperledger Fabric
                Audit Event

```

The mobile application submits a structured payload to Spring Boot containing information such as:

Project ID
IPFS CID
Verification/status information
Timestamp
Remarks and other relevant metadata
The actual evidence remains in IPFS.

## 7. Citizen Access

Citizens do not directly access the Hyperledger Fabric network.

Instead:

Hyperledger Fabric
       |
       v
Spring Boot
       |
 Public/Authorized API
       |
       v
Citizen Portal

The citizen portal displays only publicly releasable information and blockchain-backed audit/integrity information through controlled backend APIs.

## 8. Security
Spring Security for authentication and authorization
Role-Based Access Control (RBAC)
Backend-level permission enforcement
Secure API access
Secrets managed through environment/configuration rather than source code
Citizens receive read-only access to publicly releasable information

## 9. Architecture Principles
Prefer modular monolith architecture.
Keep frontend, backend, AI and blockchain responsibilities clearly separated.
PostgreSQL is the primary application database.
IPFS is used for large evidence files.
Hyperledger Fabric is used only for selected immutable audit events.
Citizens never directly interact with the permissioned blockchain.
Do not introduce additional infrastructure such as Kafka, Redis or microservices unless there is a concrete requirement and the decision is explicitly approved.                  