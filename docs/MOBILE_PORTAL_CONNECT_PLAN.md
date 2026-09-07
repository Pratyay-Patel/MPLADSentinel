# Portal Connection Plan

## 1. Goal
The existing Flutter MPLADSentinel field application currently operates using local SQLite storage and demo data. Our goal is to connect it to the Spring Boot portal, where the real officers, projects/works, and officer-to-work assignments will exist as the single source of truth.

## 2. Agreed Architecture
The Spring Boot portal with PostgreSQL acts as the server-side source of truth, while SQLite is utilized as the local cache for the Flutter field app.

```text
Spring Boot Portal
       |
   PostgreSQL
       |
  Officers
  Projects
  Assignments
       |
       | REST API
       v
Flutter Field App
       |
     SQLite
       |
  +----+----+
  |         |
Pending   Completed
```

## 3. Current Login Decision
The current Flutter login remains local for now. There will not be a portal JWT or session integrated into the field inspection workflow at this stage. 

**Reason:** Field inspections at large sites may take several hours to complete. The core inspection workflow should not depend on a short-lived portal session or token expiring in the middle of a task. Production-grade authentication and authorization are deferred as future work.

## 4. Current Officer Context
After login, the Flutter app retains the currently logged-in officer ID.

**Example:**
Officer ID = `OFF102`

This officer ID will be used when requesting assignments from the portal.

## 5. Manual Refresh Design
The Pending screen should **NOT** request data from the portal every time it opens.

**Normal Behavior:**
```text
Pending Screen
     |
     v
  SQLite
     |
     v
Display cached assignments
```

A dedicated "Refresh Assignments" button will explicitly contact the portal.

**Refresh Flow:**
```text
User presses Refresh
       |
       v
Get current logged-in officer ID
       |
       v
Request that officer's current assignments
       |
       v
Spring Boot Portal
       |
       v
Return only that officer's assigned works
       |
       v
Flutter updates SQLite
       |
       v
Pending screen reloads from SQLite
```
This design minimizes unnecessary network requests and allows the Pending screen to continuously function using locally cached data.

## 6. Officer-Specific Fetching
The Flutter app should request **only** the current logged-in officer's assignments.

**Proposed API:**
```text
GET /api/officers/{officerId}/projects
```
**Example:**
```text
GET /api/officers/OFF102/projects
```
*(Note: This endpoint name is only a proposed example and must be finalized by the Spring Boot developer.)*

**Important:** We will **NOT** design the mobile app to download every officer's assignments and filter them locally.
- It causes unnecessary data transfer.
- It wastes local storage.
- Unrelated officers' data should not be sent to the device for security reasons.
- Server-side filtering is a cleaner and more secure approach.

## 7. Assignment vs Inspection
**Distinction:**
```text
Officer
   |
   | assigned to
   v
Project / Work
   |
   | inspected by
   v
Inspection
```
An assignment from the portal creates or updates the "Pending" work available to the officer. Performing the actual work inspection creates the "Completed" inspection record.

## 8. Officer ID in Local Inspection Data
The current Flutter Inspection model and database do not explicitly contain an `officerId`. We expect to add an `officerId` field so the locally cached work/inspection is explicitly associated with the officer.

**Example:**
```text
officerId = OFF102
projectId = PRJ-2026-042
status = PENDING
```
The portal already manages the officer-to-work assignment relationship. When Flutter fetches the assignment, it receives this relationship and stores the appropriate officer ID locally.

**Expected Flutter changes to support this:**
- Update `Inspection` model.
- Update SQLite `inspections` table.
- Update `toMap()`, `fromMap()`, and `copyWith()` methods.
- Apply a database migration/version bump.
- Update database queries and synchronization logic.

## 9. SQLite Synchronization
SQLite is our local cache. 

**On Refresh:**
1. Get current officer ID.
2. Request that officer's assignments.
3. Receive projects from the portal.
4. Match records using the stable project ID.
5. Insert new projects.
6. Update changed project information.
7. Associate records with the current officer.
8. Reload the Pending screen from SQLite.

*(Exact behavior for removed or reassigned projects still needs to be agreed upon.)*

## 10. New Assignments

**Example Scenario:**
Initially:
- `OFF102 -> PRJ001`
- `OFF102 -> PRJ042`

Later, the portal assigns:
- `OFF102 -> PRJ999`

Until the "Refresh" button is pressed, Flutter continues showing its locally cached data (`PRJ001`, `PRJ042`).

**After Refresh:**
```text
Portal -> PRJ001, PRJ042, PRJ999
            |
            v
         SQLite
            |
            v
      Pending screen
```

## 11. Real Portal Data Will Replace Demo Data
The current Flutter app contains demo/mock officer and project data. Once the portal is connected:
- Real assigned works will come directly from the portal.
- Flutter's models may need additional or changed fields to match the portal.
- The SQLite schema may need structural changes.
- The Pending screen UI may need modifications to reflect actual portal responses.
- Existing hardcoded demo projects will eventually be removed/replaced entirely.

## 12. Completed Inspection → Portal Sync

When an inspection is completed:
1. The canonical JSON is generated.
2. The completed inspection is first stored safely in SQLite.
3. `sent_to_portal` should initially be `0`.
4. The app can then attempt to POST the canonical inspection JSON to the Spring Boot portal.
5. The photos themselves remain on IPFS and the JSON contains their CIDs.

**Proposed API:**
```http
POST /api/inspections
```
*(Note: This endpoint name is only a proposed example and must be finalized with the Spring Boot developer.)*

**If the portal is available:**
```text
Inspection completed
       ↓
Canonical JSON
       ↓
SQLite
       ↓
POST to Portal
       ↓
Success
       ↓
sent_to_portal = 1
```

**If the portal/server is unavailable:**
*(For example, if the Spring Boot server is stopped/asleep or there is no network connection)*
```text
Inspection completed
       ↓
Canonical JSON
       ↓
SQLite
       ↓
POST fails
       ↓
Keep inspection locally
       ↓
sent_to_portal = 0
```
The inspection must **NOT** be deleted or lost because the portal request failed.

### Manual Retry / Sync
Add a planned manual synchronization mechanism to the Completed Inspections screen. 
For example:

> **Completed Inspections**
> 
> **Project A**
> ✓ Completed
> ✓ Synced to Portal
> 
> **Project B**
> ✓ Completed
> ⚠ Not Synced
> `[Retry Sync]`

Also consider a global `[Sync Pending Inspections]` button which attempts to send all completed inspections where `sent_to_portal = 0`. Only after the Spring Boot backend confirms successful receipt should the Flutter app change `sent_to_portal = 0` to `sent_to_portal = 1`. This constitutes a robust retryable/offline-friendly synchronization design.

### Updated Data Flow
```text
Completed Inspection
        ↓
Canonical JSON
        ↓
SQLite
        ↓
Attempt POST to Portal
        |
        +---- Success ----> sent_to_portal = 1
        |
        +---- Failure ----> Keep locally
                                  ↓
                         Manual Retry/Sync later
```

### Important Reliability Rule
**SQLite is the local persistence layer for completed inspections.** A network/API failure must never cause a completed inspection or its canonical JSON to be discarded.

## 13. Photo/IPFS Integration
Photos remain on Pinata/IPFS. The portal does not need the actual binary image embedded inside the inspection JSON. Instead, the JSON contains only the photo CIDs.

```text
Photo
  |
  v
Pinata/IPFS
  |
  v
CID
  |
  v
Canonical inspection JSON
```

## 14. Existing Flutter Models

### Officer
Current fields:
- `id`
- `name`
- `phone`
- `email`
- `password`

### Inspection
Current fields and their purposes:
- `id`: Local primary key
- `projectName`: Name of the project
- `projectId`: Unique reference for the project
- `location`: Textual location description
- `parcelSite`: Parcel/site identifier
- `dueDate`: Deadline for inspection
- `status`: PENDING or COMPLETED
- `sentToPortal`: Sync flag
- `workVisible`, `stageMatches`, `projectOperational`, `materialsPresent`, `siteAccessible`: Form boolean answers
- `overallCondition`, `remarks`: Textual responses
- `submissionDate`, `submissionTime`: Timestamp of submission
- `submissionLat`, `submissionLng`: GPS location of submission
- `canonicalJson`: The finalized JSON payload record

### InspectionPhoto
Current fields:
- `id`
- `inspectionId`
- `localPath`
- `cid`
- `lat`
- `lng`
- `capturedAt`
- `uploadStatus`

*(Note: These are the current Flutter-side models, not necessarily the final Spring Boot entities.)*

## 15. Existing SQLite Tables

Current tables and relationships:
- `officers`: Stores officer details (`id`, `name`, `phone`, `email`, `password`)
- `inspections`: Stores pending and completed inspections.
- `inspection_photos`: Stores captured photos, linking to `inspections` via `inspection_id`.

**Expected Schema Change:**
- `inspections` table will need to add: `+ officer_id`

A database migration will be required to apply this structural change.

## 16. UI Changes

### Pending Screen
Expected UI changes:
- Add a "Refresh Assignments" button.
- Display a loading state during the refresh operation.
- Provide success/failure feedback (toast or snackbar).
- Continue reading displayed data strictly from SQLite.
- Update fields according to the real portal response.
- Maintain the current inspection workflow without disruption.

### Completed Inspections Screen
The screen will eventually need to visually distinguish states:
- Completed and synced to portal
- Completed but not yet synced
- Possibly currently syncing

It must also provide a retry/sync action for any unsynced inspections.

## 17. API Contract Needed From Spring Boot
The following details must be provided by the Spring Boot developer before Flutter integration begins:
- API base URL
- Endpoint for current officer's assignments
- Request format
- Response JSON schema
- Project fields
- Stable project ID
- Officer ID
- Assignment information
- Completed inspection endpoint
- Completed inspection request schema
- Success response
- Error response
- HTTP status codes
- Required headers
- Authentication requirements (if any)

*(Note: All endpoint names and examples mentioned are to be finalized.)*

## 18. Development Order
A practical sequence of integration:
1. Friend finalizes portal assignment API.
2. Flutter receives a sample response.
3. Compare the response with current Flutter models.
4. Modify models as required.
5. Add `officerId`.
6. Add SQLite migration.
7. Implement API service in Flutter.
8. Add "Refresh Assignments" button.
9. Synchronize assignments into SQLite.
10. Update Pending screen to reflect new data.
11. Test with multiple officers.
12. Finalize completed inspection `POST`.
13. Store completed inspection locally first, track `sent_to_portal`.
14. Attempt portal submission immediately after completion.
15. Add retry/manual sync mechanism for failed submissions.
16. Test with the Spring Boot server stopped/unavailable.
17. Start the server later and verify the previously unsynced inspection can be submitted successfully.

## 19. Example End-to-End Scenario
**Scenario:**
- Friend assigns:
  - `OFF102 -> Project A`
  - `OFF102 -> Project B`

**Flow:**
```text
Officer logs into Flutter as OFF102
        |
        v
Pending screen reads SQLite
        |
        v
Officer presses Refresh
        |
        v
Portal returns A + B
        |
        v
Flutter stores A + B in SQLite
        |
        v
Pending screen displays A + B
        |
        v
Officer performs inspection on Project A
        |
        v
Photo -> IPFS -> CID
        |
        v
Canonical JSON generated
        |
        v
Inspection stored locally
        |
        v
Future POST to portal
```

## 20. Important Constraints
- **DO NOT** download all officers' assignments to the mobile app.
- Fetch **only** the current officer's assignments.
- **DO NOT** query the portal every time Pending opens.
- Refresh must be explicitly user-triggered.
- SQLite remains the strictly isolated local cache.
- Long-running inspections should not depend on a portal JWT/session.
- Photos remain on IPFS and are referenced through CIDs.
- Do not put real secrets/tokens/passwords in this documentation.
- Do not claim future API functionality already exists.

## 21. Shared Understanding
This document serves as the shared plan for the agreed architecture. The Spring Boot backend acts as the source of truth providing data upon request, and the Flutter app acts as a robust, offline-capable local cache pulling new assignments on-demand and queuing completed inspections for upload.
