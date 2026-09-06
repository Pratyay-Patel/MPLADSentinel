# Portal ↔ Mobile App Integration Plan

**Status:** Planning. Nothing in this document is implemented yet. It is the agreed
contract between the web portal (Spring Boot + PostgreSQL) and the Flutter field
app (SQLite + Pinata/IPFS) for the Round‑2 field‑verification feature.

**Relationship to other docs:**

- Extends `decisions.md` (new decisions listed in §14) and `round1-scope.md`
  (this is the deferred P1.1–P1.3 "verification / ledger events" work, minus
  Hyperledger Fabric).
- Consumes the mobile team's `MOBILE_ARCHITECTURE.md` and
  `MOBILE_PORTAL_CONNECT_PLAN.md`. Where those two documents left an item open or
  used a placeholder ("endpoint name to be finalized", "project_id string",
  "ideally a UUID", "removed/reassigned behaviour TBD"), this document is the
  resolution.
- Governed by `CLAUDE.md`: no invented fields, risk output is an indicator not
  proof, secondary‑source data is never labelled as official MPLADS data.

---

## 1. Scope

**In scope**

1. Field‑officer accounts on the portal.
2. An authority assigning a specific work to a field officer.
3. The app pulling an officer's assignments (manual "Refresh Assignments").
4. The app submitting a completed inspection (canonical JSON + photo CIDs).
5. The portal storing inspections and showing them on the Audit page as a
   verification trail (read from PostgreSQL — **not** blockchain).
6. A mobile auth scheme that does not block offline inspection work.

**Out of scope (unchanged from Round 1 deferrals)**

- Hyperledger Fabric / on‑chain anchoring. The `field_inspection` record is
  designed so a hash can be anchored later without schema change.
- Photo files ever reaching the portal. The app uploads to Pinata/IPFS and sends
  only CIDs. The portal renders images via an IPFS gateway URL built from the CID.
- Automatic background sync, push notifications. Refresh and Sync are
  user‑triggered.
- Portal‑side geocoding of work locations (no verified lat/long for works — see §3).

---

## 2. Decisions locked (no further discussion needed)

| # | Decision |
|---|---|
| 1 | Canonical work id is the portal's numeric `sourceWorkId`. The app drops its `projectId` string format and its `MPLAD00x` / `PRJ‑xxxx` placeholders. |
| 2 | `parcelId` / `parcelSite` is dropped everywhere — not stored, not sent. |
| 3 | No project‑location map pin. The app uses only the officer's own device GPS captured during the inspection. |
| 4 | Assignment delivery is a **manual pull**: a "Refresh Assignments" action calls the portal; the Pending screen otherwise reads SQLite and never blocks on the network. |
| 5 | The app requests **only the logged‑in officer's** assignments. Officer identity comes from the auth token, not a path parameter (server‑side scoping, no other officer's data on the device). |
| 6 | Assignment payload carries description / category / location / due date / note only. No cost, payment, MP, lifecycle or risk data goes to the mobile app. |
| 7 | Each inspection has a client‑generated **UUID v4** `inspectionId`, used as the idempotency key. It replaces the current SQLite auto‑increment int. |
| 8 | Photos: app → Pinata/IPFS directly; only `cid` (plus per‑photo lat/long/captured‑at/exif‑verified) travels in the JSON. |
| 9 | Field‑officer accounts live in the portal's `app_user` table with a new `FIELD_OFFICER` role. No separate officer directory on either side. |
| 10 | Authorities that may create an assignment: `MOSPI`, `STATE`, `DISTRICT` (same subset that already administers grievances). `AUDITOR` / `MP` cannot assign. |
| 11 | The portal Audit page is populated from stored `field_inspection` rows in PostgreSQL. Fabric is a later, additive step. |
| 12 | A portal token is required only for the two online calls (Refresh, Sync). Capturing an inspection offline needs no token and no live session. |

---

## 3. Identity model

| Concept | Portal representation | On the wire | Notes |
|---|---|---|---|
| Work / "project" | `work.id` (internal PK, `BIGINT`) | **`sourceWorkId`** (`work.source_work_id`, numeric) | The value both sides pass around. Never presented as an official MPLADS/e‑SAKSHI id. |
| Field officer | `app_user.id` (internal PK) | **`officerCode`** (e.g. `OFF102`) — a new unique column on the account | Keeps the app's existing string‑id model stable; gives the portal a clean natural key for the mobile channel. Only `FIELD_OFFICER` rows have it. |
| Assignment | `inspection_assignment.id` (`BIGINT`) | **`assignmentId`** | Created by the portal, sent to the app with the assignment, echoed back on submission so the portal can close exactly that assignment. |
| Inspection | `field_inspection.id` (`BIGINT`) | **`inspectionId`** (UUID v4, client‑generated) | Idempotency key. The portal's PK is separate; the UUID is a unique column. |

**Work‑location gap:** `work` has no latitude/longitude — only `state`, `district`,
`location_raw` free text. The assignment sends a single combined `location`
string for display. The app must not expect coordinates for the work site; the
only real coordinates in the flow are the officer's device GPS (per photo and at
submission).

---

## 4. Portal data model (new — to be built)

All three tables are new. One Flyway migration (next version after `V7`), plus a
`WebRole` enum + `ck_app_user_role` check‑constraint change for `FIELD_OFFICER`.
`app_user.role` is `VARCHAR(16)` — `FIELD_OFFICER` (13 chars) fits.

### 4.1 Field‑officer account (extends `app_user`)

| Column | Type | Notes |
|---|---|---|
| *(existing columns)* | | `username`, `password_hash`, `role`, `display_name`, `enabled`, … |
| `role` | enum | new value `FIELD_OFFICER` |
| `officer_code` | `VARCHAR(16)` UNIQUE, nullable | populated only for `FIELD_OFFICER`; the wire `officerCode` |
| `phone` | `VARCHAR(32)` nullable | editable by the officer from the app profile screen |

Field‑officer accounts are **administrator/authority‑provisioned** (same rule as
other government roles — no self‑registration). A small seed set matching the
mobile team's demo officers (`OFF001` Amit Patil, `OFF002` Priya Sharma,
`OFF003` Rahul Deshmukh, plus `OFF102` used in their architecture doc) so both
apps line up during integration testing. Shared demo password handled the same
way as the existing seeded accounts.

### 4.2 `inspection_assignment`

| Column | Type | Notes |
|---|---|---|
| `id` | `BIGINT` GENERATED … PK | the wire `assignmentId` |
| `source_work_id` | `BIGINT` NOT NULL | FK‑style reference to `work.source_work_id` |
| `officer_id` | `BIGINT` NOT NULL | FK → `app_user.id` (role `FIELD_OFFICER`) |
| `assigned_by` | `BIGINT` NOT NULL | FK → `app_user.id` (the authority) |
| `status` | `VARCHAR(16)` NOT NULL | `ASSIGNED` → `IN_PROGRESS` → `COMPLETED`, or `CANCELLED` |
| `due_date` | `DATE` nullable | |
| `note` | `TEXT` nullable | authority instruction shown to the officer |
| `assigned_at` | `TIMESTAMPTZ` NOT NULL | |
| `updated_at` | `TIMESTAMPTZ` NOT NULL | |

Uniqueness: at most one **open** (`ASSIGNED`/`IN_PROGRESS`) assignment per
(`source_work_id`, `officer_id`). Re‑assigning a closed one creates a new row.

### 4.3 `field_inspection`

| Column | Type | Notes |
|---|---|---|
| `id` | `BIGINT` GENERATED … PK | |
| `inspection_id` | `VARCHAR(36)` UNIQUE NOT NULL | client UUID v4 — idempotency key |
| `assignment_id` | `BIGINT` NOT NULL | FK → `inspection_assignment.id` |
| `source_work_id` | `BIGINT` NOT NULL | denormalised for querying |
| `officer_id` | `BIGINT` NOT NULL | FK → `app_user.id` |
| `officer_name` | `VARCHAR(256)` | as submitted (snapshot) |
| `submitted_date` | `DATE` | from payload `submission.date` |
| `submitted_time` | `TIME` | from payload `submission.time` |
| `submission_lat` | `DOUBLE PRECISION` | device GPS at submission |
| `submission_lng` | `DOUBLE PRECISION` | |
| `resp_work_visible` | `BOOLEAN` | payload `responses.work_visible` |
| `resp_stage_matches` | `BOOLEAN` | `responses.stage_matches` |
| `resp_project_operational` | `BOOLEAN` | `responses.project_operational` |
| `resp_materials_present` | `BOOLEAN` | `responses.materials_present` |
| `resp_site_accessible` | `BOOLEAN` | `responses.site_accessible` |
| `overall_condition` | `VARCHAR(16)` | `GOOD` \| `MODERATE` \| `POOR` (portal upper‑cases on ingest) |
| `remarks` | `TEXT` nullable | |
| `canonical_json` | `JSONB` | the exact payload as received, stored verbatim for audit/hash |
| `received_at` | `TIMESTAMPTZ` NOT NULL | server timestamp |

`canonical_json` is kept byte‑faithful so a later Fabric step can hash the same
artifact the officer's device produced.

### 4.4 `field_inspection_photo`

| Column | Type | Notes |
|---|---|---|
| `id` | `BIGINT` GENERATED … PK | |
| `field_inspection_id` | `BIGINT` NOT NULL | FK → `field_inspection.id` |
| `ordinal` | `INT` NOT NULL | position in the payload `photos[]` |
| `cid` | `VARCHAR(128)` NOT NULL | IPFS CID |
| `captured_lat` | `DOUBLE PRECISION` nullable | payload `photos[].latitude` |
| `captured_lng` | `DOUBLE PRECISION` nullable | payload `photos[].longitude` |
| `captured_at` | `VARCHAR(32)` nullable | payload `photos[].captured_at` (kept as sent) |
| `exif_verified` | `BOOLEAN` nullable | payload `photos[].exif_verified` |

The portal builds a viewable URL as `<<PINATA_GATEWAY>>/ipfs/{cid}` at read time;
the gateway base is portal config, not stored per row.

---

## 5. RBAC additions (`SecurityConfig`)

- New role `FIELD_OFFICER`. It has access to **`/api/mobile/**` only** — no
  access to `/api/works/**`, grievances, or any authority screen.
- `/api/mobile/auth/login` and `/api/mobile/auth/refresh` are `permitAll`
  (they *are* the authentication).
- All other `/api/mobile/**` require a valid **mobile access token** (see §6)
  and role `FIELD_OFFICER`.
- Assignment write endpoints require `hasAnyRole("MOSPI","STATE","DISTRICT")`.
- Assignment read endpoints for the authority UI require any government role.
- The Audit page endpoints require any government role (unchanged `audit` area).
- The existing web session flow (`/api/auth/login`, cookie) is untouched.

---

## 6. Mobile authentication

**Portal today uses a server‑side session, no JWT (decision D31).** That
mechanism is wrong for a long‑lived, mostly‑offline mobile client. The mobile
channel gets its own token scheme, deliberately shaped around the mobile team's
constraint that *the inspection workflow must not depend on a live
session/token*.

### 6.1 Which calls need a token

| Action | Portal call? | Token required? |
|---|---|---|
| Login | `POST /api/mobile/auth/login` | no (issues the tokens) |
| Refresh Assignments | `GET /api/mobile/assignments` | **yes** (online action) |
| Start inspection, capture photos, upload to IPFS, fill form, generate canonical JSON, save to SQLite | none | **no** |
| Sync a completed inspection | `POST /api/mobile/inspections` | **yes** (online action) |
| Edit profile (phone/email) | `PATCH /api/mobile/me` | yes |

An officer can complete a full day of inspections with an expired token and no
network. The token only has to be valid at the instant Refresh or Sync runs.

### 6.2 Token design

- **Access token:** signed JWT, short TTL (**30–60 min**), stateless, sent as
  `Authorization: Bearer <token>`.
- **Refresh token:** long TTL (**60–90 days**), stored on device in secure
  storage (Keystore/Keychain via `flutter_secure_storage`).
- On a `401` from a `/api/mobile/**` call, the app calls
  `POST /api/mobile/auth/refresh` with the refresh token, gets a new access
  token, and retries the original request once — transparent to the officer.
- Only if the **refresh token** is also expired/invalid (app hasn't synced in
  ~2–3 months) does the officer re‑enter credentials — and only at Refresh/Sync
  time, never mid‑inspection. Locally stored inspections are untouched and sync
  once the officer re‑authenticates.
- Logout / revocation: refresh‑token `jti` may be stored for revocation. Optional
  for the demo; access tokens are short‑lived regardless.

### 6.3 Phasing note

Until `/api/mobile/auth/*` exists, the mobile app keeps its current local mock
login. Refresh/Sync integration testing can run against a portal build that
temporarily permits `/api/mobile/**` in a dev profile, but the demo build must
have the real token path enabled (the portal now enforces auth on every other
route).

---

## 7. API contract

Base path `/api/mobile`. All request/response bodies JSON. Errors use the
portal's standard `ApiErrorResponse` shape (`timestamp`, `status`, `error`,
`message`, `path`).

### 7.1 `POST /api/mobile/auth/login`

Request:
```json
{ "officerCode": "OFF102", "password": "..." }
```
Response `200`:
```json
{
  "accessToken": "<jwt>",
  "refreshToken": "<token>",
  "expiresIn": 3600,
  "officer": { "officerCode": "OFF102", "name": "Rahul Sharma", "phone": "...", "email": "..." }
}
```
`401` on bad credentials or disabled account.

### 7.2 `POST /api/mobile/auth/refresh`

Request `{ "refreshToken": "<token>" }` → `200` `{ "accessToken": "<jwt>", "expiresIn": 3600 }`.
`401` if the refresh token is expired/invalid/revoked.

### 7.3 `GET /api/mobile/assignments`

Officer is derived from the access token. No query parameters. Returns the
officer's current open assignments (`ASSIGNED` + `IN_PROGRESS`).

Response `200`:
```json
{
  "officer": "OFF102",
  "assignments": [
    {
      "assignmentId": 501,
      "sourceWorkId": 4213908,
      "projectName": "Community Hall Development",
      "category": "Community hall / building",
      "location": "Haveli, Pune, Maharashtra",
      "dueDate": "2026-09-20",
      "note": "Verify against reported ~70% completion",
      "status": "ASSIGNED"
    }
  ]
}
```
`projectName` = the work description (the app's display name). `location` = a
single combined string built portal‑side from district/state/`location_raw`.

### 7.4 `POST /api/mobile/inspections`

Submits one completed inspection. Body = the app's canonical JSON with two
required additions: `assignmentId` and `sourceWorkId`.

```json
{
  "inspectionId": "d1f9c2a4-7b3e-4c1a-9f2d-6a8b0c4e5f21",
  "assignmentId": 501,
  "sourceWorkId": 4213908,
  "officer": { "id": "OFF102", "name": "Rahul Sharma" },
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
    "overall_condition": "GOOD"
  },
  "remarks": "Work is progressing as expected.",
  "photos": [
    {
      "cid": "QmHash1234567890abcdef",
      "latitude": 18.5205,
      "longitude": 73.8566,
      "captured_at": "2026-09-05 14:25:00",
      "exif_verified": true
    }
  ]
}
```

Portal validation:

- `inspectionId` present and UUID‑shaped.
- `assignmentId` exists, belongs to the token's officer, and is `ASSIGNED` or
  `IN_PROGRESS`. `sourceWorkId` must match that assignment's work.
- `officer.id` must equal the token's `officerCode`.
- `overall_condition` upper‑cased, must be `GOOD` / `MODERATE` / `POOR`.
- `photos[].cid` non‑empty. Other photo fields optional, stored as sent.

Responses:

- `201` — stored:
  ```json
  { "inspectionId": "d1f9c2a4-...", "status": "STORED", "receivedAt": "2026-09-05T09:00:12Z" }
  ```
  Side effect: the assignment moves to `COMPLETED`.
- `200` — **already stored** (same `inspectionId` seen before): same body with
  `"status": "ALREADY_STORED"`. This is a success — the app may set
  `sent_to_portal = 1`. Makes retries after a timeout safe.
- `409` — `assignmentId` is already `COMPLETED` by a *different* `inspectionId`
  (a real conflict, surfaced for a human).
- `422` — validation failure (unknown assignment, officer mismatch, bad enum).
- `401` — token expired/invalid → app refreshes and retries once.

### 7.5 `GET /api/mobile/inspections` *(optional, recommended)*

Returns `inspectionId` + `status` + `receivedAt` for the token's officer, so the
app's Completed screen can reconcile `sent_to_portal` after reinstall or a lost
local flag. Not required for the core flow.

### 7.6 `PATCH /api/mobile/me` *(small)*

`{ "phone": "...", "email": "..." }` → updates the officer's own contact fields.
Name and `officerCode` are read‑only (portal‑controlled).

### 7.7 Authority‑side (web portal, not mobile)

- `POST /api/assignments` — body `{ "sourceWorkId": …, "officerCode": "…", "dueDate": …?, "note": …? }`. Roles: `MOSPI`/`STATE`/`DISTRICT`. → `201` with the created assignment.
- `GET /api/works/{sourceWorkId}/assignments` — assignments for one work.
- `GET /api/assignments?status=&officerCode=` — queue view.
- `PATCH /api/assignments/{id}` — `CANCELLED`, or edit due date / note.
- `GET /api/works/{sourceWorkId}/inspections` — inspections for one work (feeds the work detail + Audit page).

---

## 8. Sync & idempotency semantics

- The app owns the `sent_to_portal` lifecycle: `0` on local completion, `1` only
  after a `201`/`200` from the portal.
- The portal is the idempotency authority: it dedupes on `inspection_id`. A
  repeated submission never creates a second row and never re‑triggers the
  assignment transition.
- A `401` mid‑sync is not a failure state — the app refreshes the token and
  retries the same body. `sync_status` treats it as "retry now".
- Network/server unavailable → inspection stays in SQLite at
  `sent_to_portal = 0`; the Completed screen offers per‑item **Retry Sync** and a
  global **Sync Pending Inspections**. Nothing is ever discarded on failure.

---

## 9. Assignment reconciliation on Refresh

Resolves the open item in `MOBILE_PORTAL_CONNECT_PLAN.md` §9 / §note.

The `GET /api/mobile/assignments` response is the **authoritative current set**
of the officer's open assignments. On Refresh the app:

1. Upserts every returned assignment into SQLite, matched on `assignmentId`
   (stable), updating `projectName` / `location` / `dueDate` / `note` / `status`.
2. For a locally‑cached `PENDING` assignment **not** in the response:
   - if it has **no** local inspection data → remove it (it was cancelled or
     reassigned away);
   - if it has local inspection data (in progress or completed‑unsynced) →
     **keep it**, mark it `withdrawn` in the UI, and still allow the officer to
     finish and sync. The portal will reject the sync with `422` if the
     assignment is truly gone; that is surfaced, not silently dropped.
3. Never touches `COMPLETED` inspections.

A cancelled assignment stays visible in the portal's own queue as `CANCELLED`;
the app simply stops showing it once it has no local work attached.

---

## 10. Audit page (portal side)

- The portal's Audit screen (currently a placeholder) is replaced by a
  chronological verification trail built from `field_inspection` +
  `field_inspection_photo` rows, joined to the `work`.
- Per work: assignment created → assignment picked up → inspection submitted,
  with the officer, timestamps, questionnaire answers, remarks and photo
  thumbnails (via IPFS gateway URL).
- Visible to all government roles (unchanged `audit` area rules).
- No Fabric. When Fabric is added later, each `field_inspection.canonical_json`
  is hashed and anchored, and the Audit row gains a "ledger anchored" indicator —
  additive, no schema change to the tables above.

---

## 11. Field‑name mapping (app ↔ portal)

| App canonical JSON | Portal storage | Note |
|---|---|---|
| `inspectionId` (UUID) | `field_inspection.inspection_id` | replaces app's old int id |
| `assignmentId` | `field_inspection.assignment_id` | **new field the app adds** |
| `sourceWorkId` | `field_inspection.source_work_id` | replaces app's `project_id` string |
| `officer.id` | validated vs token; stored as `officer_id` | value is `officerCode` |
| `officer.name` | `field_inspection.officer_name` | snapshot |
| `submission.date` / `.time` | `submitted_date` / `submitted_time` | |
| `submission.latitude` / `.longitude` | `submission_lat` / `submission_lng` | |
| `responses.work_visible` | `resp_work_visible` | |
| `responses.stage_matches` | `resp_stage_matches` | app keeps this name |
| `responses.project_operational` | `resp_project_operational` | |
| `responses.materials_present` | `resp_materials_present` | |
| `responses.site_accessible` | `resp_site_accessible` | |
| `responses.overall_condition` | `overall_condition` | upper‑cased to `GOOD`/`MODERATE`/`POOR` |
| `remarks` | `remarks` | |
| `photos[].cid` | `field_inspection_photo.cid` | |
| `photos[].latitude` / `.longitude` | `captured_lat` / `captured_lng` | |
| `photos[].captured_at` | `captured_at` | stored as sent |
| `photos[].exif_verified` | `exif_verified` | |
| *(dropped)* `projectName` in submission | — | portal already has the work; `projectName` only travels in the assignment payload for display |
| *(dropped)* `parcelSite` | — | |

---

## 12. Open items still needing a decision

1. **`overall_condition` casing on the wire** — app sends `GOOD` (preferred) or
   the portal upper‑cases `"Good"`. Pick one; portal will accept upper‑cased
   regardless.
2. **Demo officer seed set** — agree the exact `officerCode` / name / password
   list so both apps match during integration.
3. **Pinata gateway base URL** — portal needs the gateway origin for Audit image
   rendering. Which gateway, and is a dedicated (non‑public) gateway available?
4. **`GET /api/mobile/inspections`** (§7.5) — build it now or defer? Cheap, and
   it makes the Completed screen robust to reinstalls.
5. **Refresh‑token revocation list** — build minimal revocation now or accept
   short‑access‑token‑only for the demo?

---

## 13. Build sequence (portal side)

Feature branch: `feature/portal-app-integration` (or split: `feature/field-officer-assignments` then `feature/inspection-sync`).

1. `WebRole.FIELD_OFFICER` + check‑constraint migration; `officer_code` / `phone`
   columns; field‑officer seed.
2. `inspection_assignment` table + entity/repo/service.
3. Authority assignment APIs (`POST /api/assignments`, reads, `PATCH`).
4. Web portal UI: assign‑officer control on the work detail page (roles
   `MOSPI`/`STATE`/`DISTRICT`).
5. Mobile auth: `/api/mobile/auth/login` + `/refresh`, JWT access + refresh,
   `SecurityConfig` rules for `/api/mobile/**`.
6. `GET /api/mobile/assignments`.
7. `field_inspection` + `field_inspection_photo` tables + entities.
8. `POST /api/mobile/inspections` with idempotency + assignment transition.
9. `GET /api/works/{id}/inspections`; replace the Audit placeholder page.
10. `PATCH /api/mobile/me`; optional `GET /api/mobile/inspections`.

Each step is independently testable and does not destabilise the existing web
portal.

---

## 14. Decisions to record in `decisions.md`

- **D3x — Field‑officer accounts & assignment.** Field officers are
  `app_user` rows with role `FIELD_OFFICER` and a unique `officer_code`;
  authority‑provisioned only. Authorities `MOSPI`/`STATE`/`DISTRICT` create
  `inspection_assignment` records linking a work to an officer.
- **D3x — Mobile authentication.** The Flutter field app authenticates via a
  dedicated `/api/mobile/auth/*` endpoint issuing a short‑lived JWT access token
  and a long‑lived refresh token. This is separate from and does not change the
  web portal's session auth (D31). The inspection workflow performs no portal
  calls and requires no valid token; only Refresh Assignments and Sync do.
- **D3x — Verification trail without blockchain.** The portal Audit page is
  populated from `field_inspection` rows in PostgreSQL. Hyperledger Fabric
  anchoring remains deferred and is additive to this design.
