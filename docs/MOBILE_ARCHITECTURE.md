# MPLADSentinel Architecture & Developer Handoff

This document provides a comprehensive overview of the current architecture, implementation status, and integration points for the MPLADSentinel Flutter application. It is specifically designed to facilitate the upcoming backend integration with a Spring Boot portal.

---

### 1. Project Overview

**MPLADSentinel** is a Flutter-based mobile application designed for field officers to conduct on-site inspections of MPLADS (Members of Parliament Local Area Development Scheme) projects. 

**Problem it solves:** It ensures the authenticity and integrity of field inspections by mandating real-time photo capture, appending verified EXIF metadata (GPS, timestamp), uploading evidence to an immutable, decentralized storage network (IPFS via Pinata), and generating a tamper-proof "canonical JSON" record for the final inspection report.

**Current implemented functionality:**
- Local mock authentication.
- SQLite-based offline storage for inspections, officers, and photos.
- Secure camera capture with integrated GPS coordinates and timestamps via EXIF data.
- Direct integration with Pinata IPFS for photo evidence upload and CID generation.
- Form validation and canonical JSON generation for completed inspections.

---

### 2. Current Architecture

The application currently operates with a local-first architecture, relying on SQLite for state management and an external IPFS pinning service for evidence storage.

```text
Flutter Mobile App
       │
       ├── UI / Screens
       ├── Models
       ├── Services
       └── SQLite
              │
              └── Local inspection/project data

Flutter
   │
   └── Pinata API
            │
            └── IPFS
                   └── Photo CIDs
```

- **UI / Screens:** Flutter widgets handling user interaction, form input, and camera flows.
- **Models:** Dart classes (`Officer`, `Inspection`, `InspectionPhoto`) mapping to SQLite tables and JSON payloads.
- **Services:** Utility classes like `PinataService` for external API communication.
- **SQLite:** The on-device database storing assignments, completed forms, and offline states.
- **Pinata API / IPFS:** The decentralized storage layer. The app pushes images here and receives a Content Identifier (CID) in return.

---

### 3. Implemented Phases

**Currently Implemented:**
- **Phase 1:** Basic UI framework, navigation, and mock login.
- **Phase 2:** Camera integration, GPS tracking, app-generated timestamps, EXIF writing/reading, and local SQLite persistence.
- **Phase 3:** Pinata service integration, IPFS uploading, and CID handling/storage.
- **Phase 4:** Canonical JSON generation, form validation, and marking inspections as locally completed.

**Future Planned Functionality (Not Implemented):**
- Spring Boot backend synchronization (REST APIs).
- Dynamic role-based authentication and token handling.
- Direct blockchain interaction (smart contracts).

---

### 4. Data Models

#### `Officer`
| Field | Type | Purpose |
| ----- | ---- | ------- |
| `id` | String | Unique identifier (e.g. OFF102) |
| `name` | String | Officer's full name |
| `phone` | String | Contact number |
| `email` | String | Contact email |
| `password` | String | Local mock authentication password |

#### `Inspection`
| Field | Type | Purpose |
| ----- | ---- | ------- |
| `id` | int? | Primary key in SQLite |
| `projectName` | String | Display name of the project |
| `projectId` | String | Unique reference to the project assigned |
| `location` / `parcelSite` | String | Textual location descriptions |
| `dueDate` | String | Deadline for the inspection |
| `status` | String | 'PENDING' or 'COMPLETED' |
| `sentToPortal` | bool | Sync flag (whether submitted to backend) |
| `workVisible` ... `siteAccessible` | bool? | Boolean form questionnaire responses |
| `overallCondition` / `remarks` | String? | Textual form responses |
| `submissionLat` / `Lng` | double? | GPS coordinates at the time of form submission |
| `canonicalJson` | String? | The finalized JSON payload storing the entire record |

#### `InspectionPhoto`
| Field | Type | Purpose |
| ----- | ---- | ------- |
| `id` | int? | Primary key |
| `inspectionId` | int | Foreign key to `Inspection` |
| `localPath` | String? | Temporary local file path |
| `cid` | String? | IPFS Content Identifier |
| `lat` / `lng` | double? | GPS coordinates at the time of capture |
| `capturedAt` | String? | Timestamp of capture |
| `uploadStatus` | String | 'pending', 'uploading', 'success', 'failed' |

---

### 5. SQLite Database Schema

- **Database Name:** `mplad_sentinel.db`
- **Database Version:** 2

**`officers` table**
- `id` (TEXT PRIMARY KEY)
- `name` (TEXT)
- `phone` (TEXT)
- `email` (TEXT)
- `password` (TEXT)

**`inspections` table**
- `id` (INTEGER PRIMARY KEY AUTOINCREMENT)
- `project_name` (TEXT)
- `project_id` (TEXT)
- `location` (TEXT)
- `parcel_site` (TEXT)
- `due_date` (TEXT)
- `status` (TEXT)
- `sent_to_portal` (INTEGER) - 0 or 1
- `work_visible`, `stage_matches`, `project_operational`, `materials_present`, `site_accessible` (INTEGER) - 0 or 1
- `overall_condition` (TEXT)
- `remarks` (TEXT)
- `submission_date`, `submission_time` (TEXT)
- `submission_lat`, `submission_lng` (REAL)
- `canonical_json` (TEXT)

**`inspection_photos` table**
- `id` (INTEGER PRIMARY KEY AUTOINCREMENT)
- `inspection_id` (INTEGER) - FOREIGN KEY references `inspections(id)`
- `local_path` (TEXT)
- `cid` (TEXT)
- `lat`, `lng` (REAL)
- `captured_at` (TEXT)
- `upload_status` (TEXT)

**Seed/Demo Data:** 
When the database is initialized, it seeds mock records (e.g., Officer `OFF102` with password `password123`) and 3 `PENDING` inspections. This is purely for offline development/demo purposes and must be replaced by real portal synchronization.

---

### 6. Inspection Lifecycle

The current logical flow from the code:

```text
Officer Login (Local SQLite check)
      ↓
Pending Inspections (Read from SQLite)
      ↓
Select Project
      ↓
Start Inspection
      ↓
Capture Photo (Using device camera)
      ↓
Obtain GPS (via Geolocator)
      ↓
Timestamp (App-generated)
      ↓
Write EXIF (Inject metadata to JPG)
      ↓
Verify EXIF locally
      ↓
Upload photo to Pinata/IPFS (POST multipart/form-data)
      ↓
Receive CID (from Pinata response)
      ↓
Store CID in SQLite (inspection_photos table)
      ↓
Fill inspection form (UI toggles & text fields)
      ↓
Validate (Ensure all required fields are filled)
      ↓
Generate canonical JSON (Compile form + CIDs)
      ↓
Store completed inspection locally (Update SQLite status='COMPLETED')
```

---

### 7. Photo/Evidence Flow

- **Camera-only capture:** The app prevents gallery uploads to ensure authenticity.
- **GPS/Timestamp:** Acquired directly from device sensors (`Geolocator`) and the system clock.
- **EXIF Injection:** Location and timestamp are written into the image's EXIF data.
- **Pinata Upload:** The image is uploaded immediately or queued.
- **CID Generation:** Pinata responds with an `IpfsHash` (CID).
- **Distinction:** The actual `image` is sent to IPFS. The `canonical JSON` never holds base64 image data; it only references the image using the immutable `CID`.

---

### 8. Pinata/IPFS Integration

- **Endpoint:** `https://api.pinata.cloud/pinning/pinFileToIPFS`
- **Gateway:** `https://gateway.pinata.cloud/ipfs/`
- **Authentication:** Loaded from a local `.env` file via `PINATA_JWT`.
- **Upload Flow:** Standard multipart/form-data POST request with a Bearer token.
- **Local Storage:** Only the CID is stored persistently in SQLite.

*(Note: Real API keys/JWTs are managed locally via `.env` which is excluded from source control. Do not commit `.env` files.)*

---

### 9. Canonical JSON

When an inspection is completed, the app constructs a final JSON payload representing the entire inspection event. 

**Example (Fictional Data):**
```json
{
  "inspection_id": "1",
  "project_id": "PRJ-2026-001",
  "officer": {
    "id": "OFF102",
    "name": "Rahul Sharma"
  },
  "submission": {
    "date": "2026-09-05",
    "time": "14:30:00",
    "latitude": 18.5204,
    "longitude": 73.8567
  },
  "responses": {
    "work_visible": true,
    "stage_matches": false,
    "project_operational": true,
    "materials_present": true,
    "site_accessible": true,
    "overall_condition": "Good"
  },
  "remarks": "Work is progressing as expected.",
  "photos": [
    {
      "cid": "QmDemoHash1234567890abcdef...",
      "latitude": 18.5205,
      "longitude": 73.8566,
      "captured_at": "2026-09-05 14:25:00",
      "exif_verified": true
    }
  ]
}
```
**Details:**
- **Why no image data:** Embedded base64 images bloat JSON size and ruin portability. IPFS CIDs provide immutable references instead.
- **Storage:** The serialized JSON string is stored in the `inspections` table under the `canonical_json` column.
- **Status:** Once generated, the inspection `status` is set to `COMPLETED` and `sentToPortal` is initialized to `false` (0).

---

### 10. Current Authentication / Officer Handling

**Currently:** Authentication is mocked. The app queries the local SQLite `officers` table for a matching ID and password (seeded on first run). 
**Future:** This is a temporary demo implementation. It will be replaced by an OAuth2 or JWT-based login mechanism speaking to the Spring Boot portal.

---

### 11. Planned Spring Boot Portal Integration

The intended architecture will connect Flutter to a Spring Boot backend backed by PostgreSQL.

```text
                Spring Boot Portal
                 PostgreSQL
                      │
             ┌────────┴────────┐
             │                 │
         Officers           Projects
                               │
                          Assignments
                               │
                               ↓
                        REST API
                               │
                               ↓
                        Flutter App
                               │
                             SQLite
```

**Portal → Flutter (Assignments)**
```text
GET /api/officers/{officerId}/projects
```
The Pending screen reads from SQLite. The app will feature a manual "Refresh" action that calls this endpoint to fetch assigned projects, update the local SQLite cache, and synchronize assignments.

**Flutter → Portal (Submissions)**
```text
POST /api/inspections
```
The app will send the `canonical_json` payload for any inspection where `sentToPortal = false`. The Spring Boot backend will parse this JSON and persist it in PostgreSQL. The backend can independently retrieve photos from the IPFS gateway using the provided CIDs.

---

### 12. Expected Future Entities (Portal Side)

The backend developer will likely map the Flutter application's concepts to the following relational entities:
- **Officer** (maps to Flutter `officer.id`)
- **Project** (maps to Flutter `project_id`)
- **Assignment** (junction table mapping an Officer to a Project)
- **Inspection** (stores form data, metadata, and links to the Project/Officer)
- **InspectionPhoto / Evidence** (stores IPFS CIDs, not blobs)

*(No backend database fields are finalized. The exact schema must be agreed upon based on the canonical JSON.)*

---

### 13. Proposed API Contract Requirements

*(These are to be finalized and implemented by the backend developer)*

- **Base URL:** Production/Staging endpoints.
- **Authentication mechanism:** e.g., JWT.
- **Login endpoint:** `POST /api/auth/login` (Returns JWT and Officer info).
- **Fetch assigned projects endpoint:** `GET /api/officers/{id}/projects`.
- **Submit inspection endpoint:** `POST /api/inspections` (Accepts the canonical JSON).
- **Optional inspection history endpoint:** `GET /api/officers/{id}/history`.
- **Request/Response JSON schemas:** Strict contracts based on the `canonical_json`.
- **HTTP status/error formats:** Standardized error wrapping.

---

### 14. Offline / Local-Storage Strategy

- **SQLite is the local cache:** All UI screens (Pending, Completed) read from SQLite. They do not block on network calls.
- **Explicit Portal Synchronization:** Syncing assignments happens explicitly through a user-triggered "Refresh" action.
- **Durable Completed Forms:** Completed inspections remain locally available on the device, allowing field officers to review their past work.
- **Resilient Uploads:** The `sent_to_portal` flag tracks synchronization state. If the device is offline during submission, it remains in SQLite as `COMPLETED` but `sent_to_portal = 0` until a future background sync or manual push succeeds.

---

### 15. Important Design Decisions

- **Camera-only capture:** Ensures photo integrity and prevents uploading old gallery images.
- **Independently obtained GPS & App-generated timestamp:** Used to double-check and inject metadata, ensuring location spoofing is mitigated.
- **EXIF Metadata:** Standardized way to embed spatial/temporal data physically inside the evidence file.
- **IPFS/CID instead of JSON Base64:** Decouples heavy binary data from lightweight text reporting, enabling fast synchronization and immutable evidence tracking.
- **SQLite local cache:** Essential for field operations where mobile data connectivity is unreliable.
- **Canonical JSON:** Standardizes the output format into a single, signable, hashable artifact.

---

### 16. Current Limitations / Future Work

**NOT YET IMPLEMENTED:**
- Real portal authentication (currently local mock).
- Dynamic officer/project assignment from Spring Boot.
- REST synchronization / Network API clients.
- PostgreSQL portal integration.
- Automated background syncing for completed inspections.
- Production-grade token/session handling.
- Blockchain smart contract integration.

---

### 17. Developer Handoff: What the Spring Boot Developer Needs to Know

Before creating the portal APIs, the backend developer should understand:

1. **Identifiers:** `officer_id` and `project_id` are strings generated/managed by the portal. The Flutter app expects to receive them and send them back untouched.
2. **Assignments:** The portal must provide a `GET` endpoint that returns a list of projects assigned to a specific officer. The app will cache this list in SQLite.
3. **Payload Structure:** The `POST` endpoint for submitting an inspection must be capable of receiving the nested `canonical_json` format (see Section 9). 
4. **Photos:** Do not expect multipart file uploads for inspection submissions. The Flutter app uploads photos directly to IPFS (via Pinata) first. The portal will receive **CIDs** (IPFS Hashes) in the JSON payload. The portal can construct a viewable image URL using an IPFS gateway (e.g., `https://gateway.pinata.cloud/ipfs/{cid}`).
5. **Idempotency:** The app will use `inspection_id` (currently a local SQLite ID, but ideally replaced by a UUID) to prevent duplicate submissions if a network request times out but succeeds on the server.
