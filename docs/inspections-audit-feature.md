# Inspections & Audit Trail — build spec (demo)

**Status:** In progress. Feature branch: `feature/inspections-audit` (recommended;
owner creates). Parent contract: `docs/portal-app-integration-plan.md` — this
document is the *portal-only, buildable-now* slice of it, plus a **read-only
Pinata/IPFS demo**.

**What this delivers**

1. **Field-officer accounts** on the portal — pre-seeded (`OFF101`…`OFF105`),
   authority-provisioned, never self-registered. New `FIELD_OFFICER` web role.
2. **Inspections page** (new hamburger tab) — an authority picks a work and
   assigns a field officer (dropdown of the seeded officers), with an optional
   due date and instruction note, then advances the assignment through
   `ASSIGNED → IN_PROGRESS → COMPLETED` (or cancels it). Persisted in PostgreSQL.
   Advancing status is the demo stand-in for the mobile app reporting progress.
3. **Audit Trail page** (currently a placeholder) — work-level chronological
   timeline: *Inspection Assigned* (real, from the assignment row) → *Inspection
   Completed* (findings block — **hardcoded demo values**, shown for any
   assignment whose status is `COMPLETED`) → *Field Evidence* (the **two most
   recent photos from our Pinata account**, fetched live by the backend).
   **Dates only — no time is ever rendered on this page.**

**Demo boundary — what is real vs hardcoded**

| Real | Hardcoded for the demo |
|---|---|
| Field-officer accounts, assignment create / status / persistence | Inspection findings checklist, Overall Condition, Remarks |
| Pinata auth + Files API call (latest 2 files) → CID / name / gateway URL | The link between a specific inspection and specific photos — the demo just shows the account's latest 2 uploads |
| Audit timeline "Assigned" / "Completed" events (from the row's status + dates) | The "Completed" event's *contents* |

**Explicitly deferred** (shaped for, but not built — see parent doc §4.3, §6, §10):

- The Flutter `/api/mobile/**` channel: JWT auth, `GET /api/mobile/assignments`,
  `POST /api/mobile/inspections`.
- `field_inspection` + `field_inspection_photo` tables and canonical-JSON ingest.
  No inspection JSON reaches the portal yet; photos are **not** matched to an
  inspection via CIDs in a payload.
- Hyperledger Fabric anchoring.

The `inspection_assignment` schema below is a strict subset of the parent doc so
the deferred pieces attach with no migration rewrite.

---

## Data model (new)

### Migration `V8__inspection_assignment.sql`

**`app_user`** — two nullable columns, populated only for `FIELD_OFFICER` rows:

| Column | Type | Notes |
|---|---|---|
| `officer_code` | `VARCHAR(16)` UNIQUE | the wire id, e.g. `OFF102` |
| `phone` | `VARCHAR(32)` | officer contact number |

`ck_app_user_role` is dropped and recreated to add `FIELD_OFFICER`
(`VARCHAR(16)` column — 13 chars, fits).

**`inspection_assignment`**

| Column | Type | Notes |
|---|---|---|
| `id` | `BIGINT` GENERATED … PK | the wire `assignmentId` |
| `source_work_id` | `BIGINT` NOT NULL | reference to `work.source_work_id` (not an FK — a work may not be ingested) |
| `officer_id` | `BIGINT` NOT NULL | FK → `app_user.id`, role `FIELD_OFFICER` |
| `assigned_by_user_id` | `BIGINT` NOT NULL | FK → `app_user.id` (the authority) |
| `status` | `VARCHAR(16)` NOT NULL DEFAULT `'ASSIGNED'` | `ASSIGNED` → `IN_PROGRESS` → `COMPLETED`, or `CANCELLED` |
| `due_date` | `DATE` | nullable |
| `note` | `TEXT` | authority instruction, nullable |
| `assigned_at` | `TIMESTAMPTZ` NOT NULL DEFAULT `now()` | |
| `updated_at` | `TIMESTAMPTZ` NOT NULL DEFAULT `now()` | |

- `CONSTRAINT ck_inspection_assignment_status CHECK (status IN ('ASSIGNED','IN_PROGRESS','COMPLETED','CANCELLED'))`
- Partial unique index: at most one **open** assignment per work+officer —
  `CREATE UNIQUE INDEX uq_inspection_assignment_open ON inspection_assignment (source_work_id, officer_id) WHERE status IN ('ASSIGNED','IN_PROGRESS');`
- `CREATE INDEX ix_inspection_assignment_work ON inspection_assignment (source_work_id, assigned_at DESC);`
- `CREATE INDEX ix_inspection_assignment_officer ON inspection_assignment (officer_id, assigned_at DESC);`

**Status vocabulary.** The stored enum keeps the parent contract's values
(`ASSIGNED`/`IN_PROGRESS`/`COMPLETED`/`CANCELLED`) so the mobile channel attaches
unchanged. The UI *labels* them "Requested / In progress / Completed / Cancelled"
per the owner's wording.

### Seeded field officers (`FieldOfficerSeeder`)

Idempotent, startup, gated by the existing `mplads.auth.seeding-enabled` /
`mplads.auth.seed-password`. Clearly demo data (CLAUDE.md §8).

| `officer_code` | display name | phone |
|---|---|---|
| `OFF101` | Amit Patil | +91 98200 10101 |
| `OFF102` | Rahul Sharma | +91 98200 10102 |
| `OFF103` | Priya Deshmukh | +91 98200 10103 |
| `OFF104` | Sneha Iyer | +91 98200 10104 |
| `OFF105` | Vikram Rao | +91 98200 10105 |

`username` = lowercase officer code (`off101`…); `role = FIELD_OFFICER`.
`OFF102 / Rahul Sharma` matches the mobile team's `MOBILE_ARCHITECTURE.md` §9.

---

## HTTP API (authority-facing, web session auth — no mobile endpoints here)

Base `/api/assignments`, `/api/officers`. Bodies JSON, errors are the standard
`ApiErrorResponse`.

| Method / path | Roles | Purpose |
|---|---|---|
| `GET /api/officers` | any government role | field-officer dropdown: `officerCode`, `name`, `phone` |
| `POST /api/assignments` | `MOSPI` / `STATE` / `DISTRICT` | create — body `{ sourceWorkId, officerCode, dueDate?, note? }` → `201` |
| `GET /api/assignments?status=&officerCode=&sourceWorkId=` | any government role | queue view, newest first |
| `GET /api/assignments/{id}` | any government role | one assignment |
| `PATCH /api/assignments/{id}` | `MOSPI` / `STATE` / `DISTRICT` | `{ status?, dueDate?, note? }` — advance status / cancel / edit |
| `GET /api/audit/{sourceWorkId}/photos` | any government role | latest 2 files from our Pinata account → `{ photos: [{ cid, name, url }], configured }` |

### Pinata / IPFS (real, read-only, backend-only)

- Credential lives **only** as backend env `PINATA_JWT` — never in React / Vercel
  / browser / git / source. Bound via `PinataProperties` (`mplads.pinata.*`).
- `PinataClient` calls `GET https://api.pinata.cloud/v3/files/{network}?order=DESC&limit=2`
  (`network` = `public`, config-overridable) with `Authorization: Bearer <jwt>`.
- Maps each returned file to `{ cid, name }`; builds `url` as
  `<gateway-base>/ipfs/<cid>` (`mplads.pinata.gateway-base`, default
  `https://gateway.pinata.cloud/ipfs/`). Per the owner: order by Pinata's
  upload/creation time, **not** EXIF.
- If `PINATA_JWT` is unset the endpoint returns `200` with `photos: []` and
  `configured: false` so the Audit page renders before the credential is wired.

**Validation** (`POST`): `sourceWorkId` must resolve to a `work` row;
`officerCode` must resolve to an enabled `FIELD_OFFICER`; reject if an open
assignment already exists for that work+officer (`409`).
**`PATCH` status transitions:** `ASSIGNED→IN_PROGRESS→COMPLETED`, and
`ASSIGNED|IN_PROGRESS→CANCELLED`. Any other transition → `422`.

`SecurityConfig`: add the two write matchers above; GETs fall through to
`anyRequest().authenticated()` but are additionally guarded in the controller /
config to government roles (mirrors the works-API rule).

---

## Frontend

- **DataProvider seam** (`src/data/`): new methods `listFieldOfficers`,
  `listAssignments`, `createAssignment`, `updateAssignment`. `DemoDataProvider`
  serves in-memory fixtures (seeded officers + 2–3 sample assignments across
  statuses); `ApiDataProvider` calls the REST endpoints via `src/api/`.
- **New types** (`src/data/types.ts`): `FieldOfficer`, `AssignmentStatus`,
  `InspectionAssignment`, `AssignmentInput`, `AssignmentPatch`.
- **Feature service** `data/features/inspections.ts` (+ `useInspectionsService`)
  — composes `listProjects` (work picker) + `listFieldOfficers` +
  `listAssignments`, forwards create/update.
- **`/inspections` page** — new nav item in the *Monitoring* group next to Audit;
  `Area` `'inspections'`; visible to all government roles, the assign action
  gated to `MOSPI`/`STATE`/`DISTRICT` (`assignsInspections(role)` in `access.ts`,
  same subset as `actionsGrievances`). Work search + officer `<select>` + due
  date + note; table of existing assignments with status badges and a
  status-advance / cancel control for the authorised roles.
- **Audit Trail page** — replace the placeholder (`pages/featurePages.tsx`) with
  `pages/audit/AuditPage.tsx`: a work picker (works that have an assignment) →
  the selected work's timeline. Events:
  - **Inspection Assigned** — real: officer, `status` label, `assigned_at`
    (**date only**).
  - **Inspection Completed** — rendered only when `status === 'COMPLETED'`;
    `updated_at` (**date only**) + a **hardcoded** findings block
    (Work Visible ✓, Reported Stage Matches ✓, Project Operational ✗, Materials
    Present ✓, Site Accessible ✓, Overall Condition **GOOD**, Remarks
    "Construction is approximately 70% complete.").
  - **Field Evidence** — the two photos from `GET /api/audit/{workId}/photos`:
    thumbnails, a lightbox / "Open full image", CID caption, "Stored on IPFS".
    Empty-but-fine state when `configured: false`.
  Vibrant multi-colour timeline nodes — one hue per event type, each paired with
  a label + icon (dataviz status-colour rule). **No time rendered anywhere** —
  add a `formatDateOnly` helper; the page must never show a clock time,
  capture time, or timestamp.

Risk copy unaffected. No confident "verified" language — the trail shows *what
was recorded / uploaded*, not proof of site condition.

---

## Build sequence (stop + commit after each)

1. **Backend — persistence.** ✅ `V8` migration, `WebRole.FIELD_OFFICER`,
   `AppUser` `officerCode`/`phone`, repo finders, `FieldOfficerSeeder`,
   `inspection` package: `InspectionAssignment` + `AssignmentStatus` +
   repository, seeder tests. (Also repaired the pre-existing broken
   `AuthUserSeederTest`.)
2. **Backend — assignment + officer APIs.** DTOs,
   `InspectionAssignmentService`, `InspectionAssignmentController`,
   `FieldOfficerController`, `SecurityConfig` matchers, targeted tests.
3. **Backend — Pinata evidence.** `PinataProperties` + `PinataClient`,
   `AuditController` `GET /api/audit/{workId}/photos`, `SecurityConfig` +
   `.env.example` `PINATA_JWT`, graceful-unconfigured path, targeted tests.
4. **Frontend — seam + Inspections page.** types, DataProvider methods
   (demo + api), `src/api/*`, `data/features/inspections.ts`, `/inspections`
   route + nav + `Area` + access, page + css, targeted tests.
5. **Frontend — Audit Trail page.** `data/features/audit.ts`, timeline +
   evidence components + css, `formatDateOnly`, replace the placeholder,
   targeted tests.
6. **Docs.** `decisions.md` **D34** (field-officer accounts & inspection
   assignment; verification trail from PostgreSQL; Pinata read-only demo; Fabric
   additive), `round1-scope.md` P1.3 note, statuses here.
