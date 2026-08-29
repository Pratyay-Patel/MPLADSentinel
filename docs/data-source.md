# MPLADSentinel — Data Sources & Data Provenance

## 1. Data Source Strategy

MPLADSentinel should prioritize official government data sources wherever suitable data is available.

The official MPLADS/MoSPI dashboard is the preferred authoritative source:

https://mplads.mospi.gov.in/digigov/dashboard.html

However, the currently accessible official dashboard does not expose all required project-level information in a convenient machine-readable form.

For granular MPLADS work/project records, the project currently uses the APIs exposed by the secondary source:

https://empoweredindian.in/mplads/

Empowered Indian is therefore treated as a **secondary data-access source**, not as the authoritative owner of MPLADS data.

---

## 2. Current Data Acquisition Method

The project will use the available Empowered Indian REST APIs directly rather than scraping the website frontend.

The currently verified API capabilities include:

- API health endpoint
- MPLADS recommended works API
- MPLADS completed works API
- Work-level payment endpoint

The exact endpoint URLs and request parameters must be verified from the running API before being hard-coded into the application.

Do not assume undocumented endpoints, parameters or response fields.

---

## 3. Verified Recommended Works Response

> **Superseded by §13.2 (Phase 2A, retrieved 2026-08-28)** — see there for the full endpoint URL, parameters, field types, nullability, and quirks.

A verified response from the recommended works API contains records with fields including:

### Work information

- `workId`
- `work_description`
- `work_description_hi`
- `category`
- `category_hi`
- `estimated_cost`
- `recommended_date`
- `recommended_year`
- `status`
- `status_hi`

### Location information

- `location`
- `location_hi`
- `district`
- `district_hi`
- `state`
- `state_hi`

### MP information

The `mp_details` object may contain:

- `name`
- `name_hi`
- `constituency`
- `party`

### Payment information

The recommended works response may also contain:

- `hasPayments`
- `totalPaid`
- `paymentCount`

### Additional fields

- `house`
- `lsTerm`
- `expected_beneficiaries`

---

## 4. Pagination

The recommended works API response provides pagination information including:

- `currentPage`
- `totalPages`
- `totalCount`
- `hasNext`
- `hasPrev`

The response also provides summary information such as:

- `totalEstimatedCost`
- `avgEstimatedCost`
- `totalWorks`

A `lastUpdated` timestamp is also provided by the response.

The application must handle pagination rather than assuming that a single API response contains the complete dataset.

---

## 5. Work-Level Payments

> **Superseded by §13.4 (Phase 2A, retrieved 2026-08-28).** Note: the "no payment records" response below is returned with **HTTP 404**, and the *same* body is returned for a non-existent work — so it cannot be read as "zero payments". Full success schema, timeline structure, and the 500 cast-error are in §13.4.

A work-level payment endpoint is available using the work identifier.

Example:

`/api/works/{workId}/payments`

A verified request for a work with no payment records returned:

```json
{
  "success": false,
  "message": "No payment records found for this work"
}
```

Therefore:

- A missing payment record must not automatically be interpreted as fraud.
- hasPayments = false or an empty payment response should be treated as a data state.
- Payment-related anomaly detection must account for missing or unavailable payment information.

The exact payment response schema must be verified using a work that actually has payment records before implementing payment-level analytics.

## 6. Completed Works Data

> **Completed in §13.3 (Phase 2A, retrieved 2026-08-28).** The completed endpoint uses **different field names** from recommended (`work_id` not `workId`, `cost` not `estimated_cost`, `completion_date`/`completion_year`, `beneficiaries`) and omits `house`, `lsTerm`, `status`, and the inline payment fields. Full verified schema in §13.3.

A completed works API is available.

Its exact response schema must be inspected and verified before implementation.

Do not assume that the completed works API contains the same fields as the recommended works API.

Before using any field from this endpoint:

1. Inspect an actual API response.
2. Confirm the field name and data type.
3. Confirm whether the field is consistently populated.
4. Document the verified field here.
## 7. Data Provenance

Data used by MPLADSentinel must retain information about its source.

For externally sourced MPLADS records, the system should maintain sufficient provenance information such as:

- Source name
- Source endpoint
- Retrieval timestamp
- Original work ID
- Last-updated information where available

The application should not represent secondary-source data as if it were directly obtained from the official MPLADS database.

## 8. Official vs Secondary Data
Preferred

Official MPLADS / MoSPI data

Use wherever the required information is directly available in a usable form.

Current granular source

Empowered Indian API

Use for project/work-level data where it provides the required granular information.

It is a secondary source and should therefore be treated accordingly.

Validation

Where feasible, important records or aggregate values should be cross-checked against official MPLADS/MoSPI information.

A secondary source should not automatically be treated as authoritative simply because it contains government-related data.

## 9. Data Integrity Rules

The following rules are mandatory:

- Never invent MPLADS records.
- Never invent missing API fields.
- Never assume an endpoint exists without verification.
- Never assume two endpoints have identical schemas.
- Never treat missing data as zero unless the source explicitly defines it as zero.
- Preserve the distinction between null, missing, zero and unavailable values.
- Record API retrieval/update timestamps where available.
- Clearly distinguish real data from synthetic/demo data.
- Do not silently substitute mock data for unavailable real data.
- If a required field is unavailable, report the limitation rather than fabricating a value.
- Validate important assumptions against actual API responses before implementing dependent functionality.

## 10. Data Requirements for Analytics

Different analytics features require different levels of data availability.

Currently suitable for initial implementation

Depending on actual field availability:

- Project/work identification
- Project status analysis
- Estimated-cost analysis
- Basic expenditure/payment analysis
- Basic project statistics
- Basic rule-based risk indicators

Requires additional verification/data
- Advanced payment-pattern analysis
- Progress–expenditure mismatch
- Cost benchmarking
- Delay prediction
- Duplicate/similar project detection
- Geospatial intelligence
- Advanced ML risk scoring

A feature must not be implemented as a meaningful analytical capability until the required underlying data has been verified.

## 11. Data Ingestion Principle

The backend should treat external APIs as source systems rather than allowing the frontend to depend directly on them.

Preferred flow:

```
MPLADS / Secondary API
          |
          v
   Spring Boot Data
     Integration
          |
          v
      PostgreSQL
          |
          v
    Backend REST API
          |
          v
     React Portal
```

The frontend should not directly call the external MPLADS/secondary data API for core application functionality.

## 12. Future Data Sources

Additional official government datasets may be integrated later if they provide useful information such as:

Detailed expenditure records,
Sanction information,
Work progress,
Completion information,
Implementing agency information,
Geographic information,
Historical project records

Any new source must be documented here with its provenance, accessibility, schema and reliability before being incorporated into core analytics.

---

## 13. Verified API Contract — Phase 2A

**Investigation type:** API contract verification only (no implementation).
**Source:** Empowered Indian — **secondary data-access source**, not the authoritative owner of MPLADS data. Official MPLADS/MoSPI remains the preferred authoritative source (CLAUDE.md §9, decisions D14).
**Retrieval window:** 2026-08-28, approx. 10:33–10:43 UTC.
**Method:** anonymous HTTPS `GET` via `curl`. Endpoint list corroborated against the site's own JS bundle
(`https://empoweredindian.in/assets/js/index-CRbTkwNh.js`), which defines the API base as
`https://api.empoweredindian.in/api` plus a constant map of paths.
**Auth:** none required on any tested endpoint.
**Transport:** served via Cloudflare (`server: cloudflare`, `cf-cache-status: DYNAMIC`).
**Rate limiting:** response headers `ratelimit-limit: 1000`, `ratelimit-policy: 1000;w=600` → **1000 requests / 600 s rolling window**; `ratelimit-remaining` and `ratelimit-reset` (seconds) are returned. The limit was not hit; the 429 body shape is **UNKNOWN**.

> The tentative field lists in §3–§6 above predate this phase. §13 is the verified contract as of the retrieval window; where they differ, §13 wins.

### 13.1 Health endpoints (two exist)

**`GET https://api.empoweredindian.in/health`** → 200

```json
{ "status": "ok", "timestamp": "<ISO8601 ms Z>", "uptime": 156608, "environment": "production" }
```

**`GET https://api.empoweredindian.in/api/health`** → 200 (even when degraded)

```json
{
  "status": "degraded",
  "timestamp": "<ISO8601 ms Z>",
  "uptime": 156963.97,
  "checks": {
    "database": { "status": "healthy" },
    "memory": { "status": "critical", "usage": "94.15%", "heapUsed": "62.71 MB",
                "heapTotal": "66.60 MB", "environment": "production",
                "thresholds": { "warning": "80%", "critical": "90%" } },
    "cache": { "status": "healthy", "keys": 612, "hits": 20854, "misses": 25462, "hitRate": "45.03%" }
  },
  "responseTime": "4ms"
}
```

No parameters. **`/api/health` returned HTTP 200 while reporting `status:"degraded"` and `memory.status:"critical"` (94%)** — HTTP 200 does not imply healthy; the `status` field must be read.

### 13.2 `GET /api/works/recommended`

**Full URL:** `https://api.empoweredindian.in/api/works/recommended` · method **GET** · no auth.

**Query parameters**

| Param | Type / rules | Verified behaviour |
|---|---|---|
| `page` | integer ≥ 1, default **1** | `page=0` → 400 `{"success":false,"error":"Validation Error: page must be greater than or equal to 1"}`. Page past the end → 200, clamped to last page (`hasNext:false`), `currentPage` echoes the requested number verbatim (observed `99999999`). |
| `limit` | integer **1–100**, default **20** | `limit=0`/negative → 400 `… must be greater than or equal to 1`. `limit=101`+ → 400 `… must be less than or equal to 100`. `limit=abc` → 400 `… limit must be a number`. |
| `state` | string | **VERIFIED filter.** Exact match on the `state` value (e.g. `Kerala` → `totalCount` 4566). Echoed in `data.filters`. |
| `search` | string | **VERIFIED.** Text/substring search over work description (`search=road` → `totalCount` 15742). Echoed in `data.filters`. |
| `sort` | string, Mongoose style: `field` asc / `-field` desc | **Partially verified.** `sort=-workId` / `sort=workId` → results ordered by `workId`. `sort=-estimated_cost` had **no effect** (identical order both directions). Other sortable fields UNKNOWN. |
| `status` | string | Accepted and echoed in `data.filters`. `status=Completed` → `totalCount` 0 (the recommended set contained only `status:"Recommended"` in every sampled record). |
| `district` | string | Accepted and echoed. `district=Wayanad` → 0 (stored value is `WAYANAD`; filter appears case-sensitive — exact semantics UNKNOWN). |
| `category` | string | Present in the SPA, but the server rejects values containing `/`: 400 `Validation Error: category with value Normal/Others fails to match the required pattern: /^[a-zA-Z0-9\s_-]+$/`. Real category values contain `/` (e.g. `"Normal/Others"`) → this filter is effectively unusable for them. |
| `min_amount`, `max_amount`, `yearFrom`, `yearTo`, `year`, `lsTerm`, `sector`, `searchType`, `sortOrder` | — | Emitted by the SPA. **No effect on results or `totalCount`** observed in testing (`year=2024` was echoed into `data.filters` but did not change the count). Treat as **UNKNOWN / unverified**. |

**Response — 200 envelope:** `{"success":true,"data":{ … }}`

`data` keys: `recommendedWorks` (array), `pagination` (object), `summary` (object), `filters` (object — echoes only recognised filters, `{}` if none; incomplete), `lastUpdated` (string ISO8601 ms Z).

> `lastUpdated` equals the server response time and changes on every call. It is **not** a data-freshness indicator.

**`data.recommendedWorks[]` record fields** (types and nullability from actual responses; "identical to English" means the `*_hi` value was byte-for-byte the English value in every sample):

| Field | Type | Observed | Example |
|---|---|---|---|
| `_id` | string (Mongo ObjectId, 24 hex) | always present; **differs per endpoint** — not a cross-endpoint key | `"6a89c8052f87e3172f71db3f"` |
| `workId` | integer | always present; unique per work | `260540` |
| `house` | string | `"Lok Sabha"` / `"Rajya Sabha"` | `"Lok Sabha"` |
| `lsTerm` | integer \| **null** | `18` for Lok Sabha; **`null`** for Rajya Sabha records | `18` / `null` |
| `work_description` | string | always present; free text, variable quality (typos, embedded agency notes) | `"Extension of CC Road …"` |
| `work_description_hi` | string | present; identical to English in all samples | — |
| `category` | string | present | `"Normal/Others"` |
| `category_hi` | string | present; identical to `category` | `"Normal/Others"` |
| `estimated_cost` | integer | present; appears to be **INR rupees** (no currency field; unit not stated by API) | `2500000` |
| `recommended_date` | string ISO8601, `YYYY-MM-DDT00:00:00.000Z` | present; time component always zero → **day precision** | `"2026-01-20T00:00:00.000Z"` |
| `recommended_year` | integer | present | `2026` |
| `status` | string | present; **only `"Recommended"` observed** | `"Recommended"` |
| `status_hi` | string | present; identical to `status` | `"Recommended"` |
| `location` | string | present; free text mixing place + implementing authority | `"SOUTH ANDAMANS(Implementing District Authority(SA))"` |
| `location_hi` | string | present; identical to `location` | — |
| `district` | string | present; **UPPERCASE** | `"ANDAMAN AND NICOBAR ISLANDS"` |
| `district_hi` | string | present; identical | — |
| `state` | string | present; **Title Case** | `"Andaman And Nicobar Islands"` |
| `state_hi` | string | present; identical | — |
| `expected_beneficiaries` | integer | present; **`0` in 100/100 sampled records** — effectively unpopulated | `0` |
| `mp_details` | object | present in 100/100; sub-keys `name`, `name_hi`, `constituency`, `party` | — |
| `mp_details.name` | string | present; UPPERCASE free text; **no MP id** | `"BISHNU PADA RAY"` |
| `mp_details.name_hi` | string | present; identical to `name` | — |
| `mp_details.constituency` | string | present; UPPERCASE; often equals state/district for UT/at-large MPs | `"ANDAMAN AND NICOBAR ISLANDS"` |
| `mp_details.party` | string | present but **mis-populated** — value is the House (`"Lok Sabha"`), not a political party, in 100/100 samples | `"Lok Sabha"` |
| `hasPayments` | boolean | present; `false` in 91/100 samples | `false` |
| `totalPaid` | integer | present; `0` when no payments | `0` / `1350689` |
| `paymentCount` | integer | present; `0` when no payments | `0` / `1` |

**`data.pagination`:** `{currentPage:int, totalPages:int, totalCount:int, hasNext:bool, hasPrev:bool}`.

> **`totalCount` is inconsistent by request shape.** With `page=1` (or no `page`) → **83 797** (`totalPages` 4190 at `limit=20`). With any other shape (`page=2`, `limit=1`, any filter, `sort`, `lsTerm`) → **83 533**. Both values are stable on repeat at the same timestamp (not per-request noise). Difference: 264. Treat `totalCount` as approximate.

**`data.summary`:** `{totalEstimatedCost, avgEstimatedCost, totalWorks, uniqueCategories[], uniqueDistricts[], statusDistribution[], totalExpectedBeneficiaries}` — **all zero / empty on the unfiltered request** (`totalWorks:0`, arrays `[]`). Not a usable aggregate as-is. Behaviour with filters not characterised (UNKNOWN).

### 13.3 `GET /api/works/completed`

**Full URL:** `https://api.empoweredindian.in/api/works/completed` · method **GET** · no auth.

**Query parameters:** `page` / `limit` behave as for recommended (default page 1, default limit 20; bound-validation not re-tested on this endpoint — **assumed identical, not verified**). `state` filter **VERIFIED** (`state=Kerala` → `totalCount` 1256). `sort=-cost` **VERIFIED** (returns `cost` descending).

**Response — 200 envelope:** `{"success":true,"data":{ … }}`
`data` keys: `completedWorks` (array), `pagination`, `summary`, `filters`, `lastUpdated`.

**`data.completedWorks[]` record fields — FIELD NAMES DIFFER FROM RECOMMENDED:**

| Field | Type | Notes | Example |
|---|---|---|---|
| `_id` | string ObjectId | per-endpoint, not a cross-endpoint key | `"6a90da2960cc5ec1e4c4bcff"` |
| `work_id` | integer | **`work_id`**, not `workId` | `134703` |
| `work_description` | string | free text | — |
| `work_description_hi` | string | identical to English | — |
| `category` | string | — | `"Normal/Others"` |
| `category_hi` | string | identical | — |
| `cost` | number | **`cost`**, not `estimated_cost`; integers observed, but `summary.totalCost` is a 2-dp float → some values may be non-integer | `499993` |
| `completion_date` | string ISO8601 `…T00:00:00.000Z` | **day precision** | `"2025-01-31T00:00:00.000Z"` |
| `completion_year` | integer | — | `2025` |
| `location` / `location_hi` | string | identical pair; free text incl. authority | `"CHITTOOR(DISTRICT COLLECTOR CHITTOOR_IDA)"` |
| `district` / `district_hi` | string | UPPERCASE | `"CHITTOOR"` |
| `state` / `state_hi` | string | Title Case | `"Andhra Pradesh"` |
| `beneficiaries` | integer | **`beneficiaries`**, not `expected_beneficiaries`; `0` in samples | `0` |
| `mp_details` | object | `{name, name_hi, constituency, party}` — same shape as recommended; `party` also mis-populated (`"Lok Sabha"`) | — |

**Not present on completed records** (present on recommended): `house`, `lsTerm`, `status`, `status_hi`, `hasPayments`, `totalPaid`, `paymentCount`.

**`data.pagination`:** same shape. `totalCount` **43 667**, stable across requests with and without params (no page-1 inconsistency seen here).

**`data.summary`:** `{_id:null, totalCost:float, avgCost:float, totalWorks:int, uniqueCategories:[…], uniqueDistricts:[…], totalBeneficiaries:int, avgBeneficiaries:number}` — **populated with real values** (unlike the recommended summary): e.g. `totalCost 23832006686.61`, `avgCost 545766.98`, `totalWorks 43667`, `totalBeneficiaries 0`, `avgBeneficiaries 0`.
`summary.uniqueDistricts` contains **non-district values** (`"Sitting Rajya Sabha"`, `"Nominated Rajya Sabha"`) and inconsistent casing (`"Puducherry"`, `"Diphu"`, `"Darrang-Udalguri"`).

### 13.4 `GET /api/works/{workId}/payments`

**Full URL:** `https://api.empoweredindian.in/api/works/{workId}/payments` · method **GET** · no auth.
**Path param:** numeric work identifier. **Shared ID space** — resolves for both recommended `workId` (e.g. 187484) and completed `work_id` (e.g. 134703, 135593). No query params observed.

**Success (payment rows exist) — 200:**

```json
{
  "success": true,
  "data": {
    "workId": 187484,
    "workDetails": {
      "description": "Construction of community centers and community halls",
      "mpName": "BISHNU PADA RAY",
      "constituency": "ANDAMAN AND NICOBAR ISLANDS",
      "ida": "NORTH AND MIDDLE ANDAMAN(Implementing District Authority(N&MA))"
    },
    "summary": {
      "totalInstallments": 1,
      "totalAmountPaid": 1350689,
      "successfulPayments": 1,
      "pendingPayments": 0,
      "firstPaymentDate": "2026-08-05T00:00:00.000Z",
      "lastPaymentDate": "2026-08-05T00:00:00.000Z"
    },
    "paymentTimeline": [
      { "date": "2026-08-05",
        "payments": [ { "amount": 1350689, "vendor": "Sulata Baroi", "status": "Payment Success", "ida": "NORTH AND MIDDLE ANDAMAN(…)" } ],
        "totalAmount": 1350689, "count": 1 }
    ],
    "allPayments": [
      { "amount": 1350689, "date": "2026-08-05T00:00:00.000Z", "status": "Payment Success", "vendor": "Sulata Baroi", "ida": "NORTH AND MIDDLE ANDAMAN(…)" }
    ]
  },
  "lastUpdated": "2026-08-28T10:39:08.492Z"
}
```

Field notes:
- `data.workDetails.description` is a **generic scheme work-type string**, NOT equal to the work's `work_description` (for `work_id` 134703 it was `"Construction of roads, link roads, pathways or any other road with or without drainage system"` vs the work's specific `"Upgradation of Road from Madhavaram Village…"`). Two different description concepts.
- `allPayments[].amount`, `paymentTimeline[].payments[].amount`, `summary.totalAmountPaid` — integers (INR).
- `allPayments[].date` — ISO8601 `…T00:00:00.000Z`; `paymentTimeline[].date` — date-only `YYYY-MM-DD`.
- Only payment `status` value observed: **`"Payment Success"`**. `summary.pendingPayments` counter exists, so a "pending" string likely exists but was **not observed** (UNKNOWN).
- For two fully-paid completed works, `summary.totalAmountPaid == completedWorks.cost` (134703 → 499993; 135593 → 448722). Indicative that completed `cost` reflects amount paid, not a separate estimate — **2 samples, not conclusive**.

**No payment rows — HTTP 404:** `{"success":false,"message":"No payment records found for this work"}`.
**The same 404 body is returned for a real work with no payments AND for a workId that does not exist** (tested `1845` and `999999999` → identical). → **A 404 here must NOT be read as "zero payments"**; it means "no payment rows found; the work may or may not exist."

**Non-numeric workId — HTTP 500:** `{"error":"Cast to Number failed for value \"abc\" (type string) at path \"workId\" for model \"Expenditure\"","status":500,"correlationId":"unknown"}` — leaks the backend model name; different envelope (`error`/`status`/`correlationId`, no `success`). Backend inferred to be Node/Express + MongoDB/Mongoose.

### 13.5 Error model (consolidated — the API is not consistent)

| Situation | HTTP | Body |
|---|---|---|
| Success (works) | 200 | `{"success":true,"data":…}` |
| Success (health) | 200 | `{"status":"ok"|…,…}` |
| Parameter validation failure | 400 | `{"success":false,"error":"Validation Error: <detail>"}` |
| No payment rows (work exists or not) | 404 | `{"success":false,"message":"No payment records found for this work"}` |
| Unknown route | 404 | `{"error":"Not Found","message":"Route <path> not found"}` |
| Server / cast error | 500 | `{"error":"<msg>","status":500,"correlationId":"<id>"}` |
| Rate limit (429) | — | **UNKNOWN** — not triggered |
| Auth error | — | N/A — no auth on any tested endpoint |

**Empty result set on list endpoints** (e.g. `status=Completed` on `/works/recommended`) → **HTTP 200** with `data.recommendedWorks: []` and `pagination.totalCount: 0` — **not** a 404. Empty ≠ error for list endpoints.

### 13.6 Cross-endpoint relationships

- **Join key is the numeric work id**, but the field NAME differs by endpoint:
  `recommendedWorks[].workId` == `completedWorks[].work_id` == payments path `{workId}` == payments `data.workId`. Same integer space (verified by resolving ids across all three).
- **Recommended and completed appear disjoint.** A completed work's description searched on `/works/recommended` → 0 hits; the recommended sample was 100% `status:"Recommended"`. Consistent with a lifecycle: a work is served by `/recommended` until completed, then by `/completed`. **PLAUSIBLE, not proven** — no explicit status transition observed, no single work confirmed in both sets, and the sets were not exhaustively cross-checked.
- **Payments attach to works in either set** (a recommended `workId` and completed `work_id`s all had payment rows).
- **No structured link from work → MP record.** MP appears only as embedded `mp_details` free text (name/constituency, UPPERCASE, no id); MP-level joins would require string matching.
- **`_id` (ObjectId) is per-endpoint** and cannot be used as a cross-endpoint key.
- **No "work-in-progress" / sanction endpoint** among the four. The SPA bundle also references (NOT verified this phase): `/summary/overview|states|mps|constituencies`, `/mplads/mps|search|constituencies|sectors|trends|terms`, `/works/categories|constituencies`, `/analytics/trends|top-performers|performance-distribution`, `/expenditures`, `/expenditures/categories`.

### 13.7 Data volume (retrieved 2026-08-28 ~10:34–10:43 UTC)

| Endpoint | `totalCount` | `totalPages` @ `limit=20` | Notes |
|---|---|---|---|
| `/api/works/recommended` | **83 797** (page 1) / **83 533** (other request shapes) | 4 190 | count depends on request params; each value stable on repeat |
| `/api/works/completed` | **43 667** | 2 184 | stable across request shapes |
| `/api/works/{workId}/payments` | n/a (per work) | — | — |

Not a permanent total. Ingestion appears ongoing (every response carries `lastUpdated` = current time; the page-1 vs other-page count gap suggests a cached landing count). Record retrieval timestamp with any stored count.

### 13.8 Data-quality observations (source data left unaltered)

- **Hindi fields are placeholders.** Every `*_hi` field (`work_description_hi`, `category_hi`, `status_hi`, `location_hi`, `district_hi`, `state_hi`, `mp_details.name_hi`) equals its English counterpart in every sampled record. No real Hindi content.
- **`mp_details.party` is wrong** — contains the House name (`"Lok Sabha"`), not a political party, on both endpoints.
- **`expected_beneficiaries` / `beneficiaries` = 0 everywhere sampled** (100/100 recommended; completed samples; `summary.totalBeneficiaries 0`). Effectively unpopulated — do not use as a measure; do not treat `0` as "zero beneficiaries".
- **Recommended `summary` is all zeros** on the unfiltered request — not a usable aggregate.
- **Completed `summary.uniqueDistricts`** contains non-districts and mixed casing.
- **Casing inconsistency:** `state`/`state_hi` Title Case; `district`/`district_hi`/`mp_details.constituency` UPPERCASE; some district values Title Case (`"Puducherry"`). Filters appear case-sensitive.
- **`location` mixes concerns** — place + implementing authority in one free-text string. There is **no structured implementing-agency field** on work records; the authority appears only inside `location` (works) and `ida` (payments).
- **`mp_details.constituency` frequently equals the state/district** for UT / at-large MPs.
- **Dates are day precision** — all `…T00:00:00.000Z`; `paymentTimeline[].date` is date-only. The time/`Z` is cosmetic.
- **Currency:** bare integers (`estimated_cost`, `cost`, `amount`, `totalPaid`, `totalAmountPaid`); no currency field; magnitudes consistent with **INR rupees** (not paise). `completed.summary.totalCost` is a 2-dp float, so some `cost` values may be non-integer.
- **`payments.workDetails.description` ≠ `work_description`** (see §13.4).
- **`totalCount` is not authoritative** (see §13.7).
- **`lastUpdated` is the response time**, not data freshness. No true freshness timestamp exists on any endpoint.
- **HTTP 500 leaks backend internals** (Mongoose model `Expenditure`, "Cast to Number failed").
- **Free-text quality varies** — typos and embedded notes in `work_description` (e.g. "Executive agency DRDA", "Gonvind Nagar", "AmudalaHW", "MAndal").

### 13.9 Round-1-relevant fields — VERIFIED / NOT PROVIDED / UNKNOWN

| Data point | Status | Where / notes |
|---|---|---|
| Project/work identification | **VERIFIED** | `workId` (recommended), `work_id` (completed); integer; shared id space; used by payments path |
| Work description | **VERIFIED** | `work_description` (both). `work_description_hi` present but = English |
| MP | **VERIFIED** | `mp_details.name` (both) — UPPERCASE free text; no MP id |
| House (Lok Sabha / Rajya Sabha) | **VERIFIED (recommended)** / **NOT PROVIDED (completed)** | `house` on recommended only |
| Constituency | **VERIFIED** | `mp_details.constituency` (both) — UPPERCASE, sometimes = state |
| State | **VERIFIED** | `state` (both), Title Case |
| District | **VERIFIED** | `district` (both), UPPERCASE |
| Location | **VERIFIED** | `location` (both) — free text incl. implementing authority |
| Category | **VERIFIED** | `category` (both). `category_hi` = English. `category` **filter** rejects `/` |
| Sector | **UNKNOWN** | `sector` filter param emitted by SPA; no effect observed; no `sector` field on records |
| Estimated cost | **VERIFIED (recommended)** / **NOT PROVIDED (completed)** | `estimated_cost` (int, INR) on recommended; completed has `cost` instead |
| Actual / final cost | **VERIFIED (completed)** / **NOT PROVIDED (recommended)** | `cost` on completed |
| Recommended date | **VERIFIED (recommended)** / **NOT PROVIDED (completed)** | `recommended_date` (day precision) |
| Recommended year | **VERIFIED (recommended)** / **NOT PROVIDED (completed)** | `recommended_year` (int) |
| Completion status | **VERIFIED (implicit)** | membership of `/works/completed`; `status` field is recommended-only and only value seen is `"Recommended"` |
| Completion date | **VERIFIED (completed)** / **NOT PROVIDED (recommended)** | `completion_date` (day precision), `completion_year` |
| Work status field (enumerated) | **PARTIAL / UNKNOWN** | `status`/`status_hi` on recommended only; single observed value `"Recommended"`; full value list not obtained. NOT PROVIDED on completed |
| Sanction information (no. / date / amount) | **NOT PROVIDED** | no sanction field on any verified endpoint |
| Payment / expenditure information | **VERIFIED** | recommended inline: `hasPayments`, `totalPaid`, `paymentCount`. `/works/{id}/payments`: per-installment `amount`, `date`, `status`, `vendor`, `ida` + `summary` (`totalInstallments`, `totalAmountPaid`, `successful`/`pendingPayments`, `first`/`lastPaymentDate`) |
| Vendor / payee | **VERIFIED (payments only)** | `allPayments[].vendor`, `paymentTimeline[].payments[].vendor` |
| Fund release / installment schedule | **VERIFIED (payments only)** | `paymentTimeline`, `summary.totalInstallments`, `first`/`lastPaymentDate` |
| Physical progress (% / milestones) | **NOT PROVIDED** | no progress/percentage field anywhere |
| Work-in-progress state | **NOT PROVIDED** | no endpoint/field (SPA text mentions it; no verified source) |
| Expected beneficiaries | **NOT PROVIDED (effectively)** | field exists (`expected_beneficiaries` / `beneficiaries`) but `0` in 100% of samples |
| Implementing agency (structured) | **NOT PROVIDED** | only embedded in `location` free text and payments `ida` string |
| Geo coordinates (lat/long) | **NOT PROVIDED** | none anywhere |
| Data-freshness timestamp | **NOT PROVIDED** | `lastUpdated` = response time only |
| Record id stable across endpoints | **NOT PROVIDED** | `_id` differs per endpoint; only the numeric workId is shared |

### 13.10 Explicit UNKNOWNs (not established this phase)

- `limit` / `page` bound validation on `/works/completed` (assumed same as recommended; not retested).
- 429 rate-limit response body.
- Effect/semantics of `min_amount`, `max_amount`, `yearFrom`, `yearTo`, `year`, `lsTerm`, `sector`, `searchType` (SPA emits them; no effect seen).
- Full enumeration of `status` values; whether `/works/recommended` ever returns non-`"Recommended"`.
- Whether `sort` accepts fields beyond `workId` (recommended) / `cost` (completed).
- Exact matching semantics (case sensitivity, exact vs partial) of `state`, `district`, `status` filters.
- Whether any single work legitimately appears in BOTH `/works/recommended` and `/works/completed`.
- Payment `status` values other than `"Payment Success"`.
- Whether `cost` / `estimated_cost` are ever non-integer (the float `summary.totalCost` hints yes).
- Dataset stability over days/weeks.
- Whether `docs/data-source.md` §5's earlier `{"success": false, "message": "No payment records found for this work"}` note implied a 200 — it is actually **HTTP 404** (now recorded in §13.4).

### 13.11 Notes for later phases (no code produced this phase)

- Treat recommended and completed as **two distinct source shapes** normalised onto the numeric work id; never conflate `estimated_cost` (recommended) with `cost` (completed).
- Keep a raw/staging layer preserving original source field names, plus `source_endpoint` + `retrieved_at` per row.
- Store payments separately, keyed by the numeric work id; **treat a payments 404 as "unknown / not found", never as "0 paid"**.
- Do not rely on `totalCount`, the recommended `summary`, any `*_hi` field, `expected_beneficiaries`/`beneficiaries`, or `mp_details.party`.
- Expect day-precision dates; store as date, not timestamp.
- Plan case-normalisation for state / district / constituency matching.
- This source provides no progress, sanction, structured implementing-agency, or geo data → requirements F5 (progress–expenditure mismatch), F9 (geospatial), and cost benchmarking beyond estimated-vs-paid are **not supported by this source as-is**.

---

## 14. Official MPLADS Portal Investigation

**Investigation type:** read-only investigation of official Government of India MPLADS surfaces. No implementation, no schema change.
**Date:** 2026-08-28.
**Trigger:** before finalising the Round-1 database schema, check whether the official MPLADS portal provides authoritative work-level data — especially per-work **sanctioned amount** and **physical progress** — that is not available through the Empowered Indian API.
**Access rules observed:** only publicly reachable pages and the public `data.gov.in` Open Government Data API were read. No authentication, CAPTCHA, or access control was bypassed or attempted.

This section records findings under three headings — **(A) verified facts**, **(B) inferred / could not be verified**, **(C) future possibilities** — and does not remove or supersede any earlier finding in this document.

### 14.1 Environment limitation

- `mplads.mospi.gov.in` (official MoSPI e-SAKSHI portal + public dashboard) — reachable and inspected.
- `www.data.gov.in` / `api.data.gov.in` (GoI Open Government Data Platform) — reachable and queried.
- `www.mplads.gov.in` (NIC-hosted, `164.100.213.140`) — **unreachable from the investigation environment** (DNS resolves; TCP port 443 times out). Its e-SAKSHI report surfaces (Work Register, Recommended / Completed / Non-Progress Works, Work Details, Expenditure reports, Fund Release Statements, GIS dashboard) could **not** be opened directly. Statements about those surfaces below are inferred from the e-SAKSHI public dashboard's own client code, official PIB press releases, and the `data.gov.in` catalog, and are marked as inferred.

### 14.2 Verified facts (A)

- The **official MoSPI e-SAKSHI public dashboard** (`https://mplads.mospi.gov.in/digigov/dashboard.html`) was investigated. It is a pre-login citizen dashboard.
- **Its publicly accessible data is aggregate-level, not work-level.** It presents counts and rupee totals for *works recommended*, *works sanctioned*, *works completed*, *expenditure on completed works*, *expenditure on ongoing works*, and *amount consented for calamity*, with drill-down by **tenure → house → state → constituency → MP**. There is no public work list, no per-work record, and no per-work identifier.
- The only data endpoints observed on the public dashboard are `POST /rest/PreLoginDashboardData/getTenureData` (tenure lookup; returned an empty array for every parameter shape tried) and `POST /rest/PreLoginDashboardData/getRedirectUrl` (returns a mobile app-store URL). Drill-down calls are parameterised by `constituency,house,tenure` strings. These endpoints are string-obfuscated, undocumented, aggregate-scoped, and were not exhaustively reverse-engineered.
- The dashboard's "GIS"/map element is an **India choropleth by state** rendered client-side from the same aggregate values. No map/GIS service (WMS/WFS/ArcGIS REST) and no per-work coordinates were found.
- **Official `data.gov.in` MPLADS datasets are aggregate and historical.** The MPLADS datasets located there (Ministry of Statistics and Programme Implementation; tabled in Parliament) are **state-wise / sector-wise / year-wise / MP-wise** and cover past periods (approximately 2015–2022). They are offered as CSV / XLS / JSON / REST API. Their keys are State / Sector / Year / MP name / Lok Sabha term. **None is work-level; none carries a work identifier.**
- **No verified official public work-level identifier or join key was found** on any accessible official surface. There is currently no reliable way to link official public data to an individual Empowered Indian work record.
- **Quantitative physical-progress percentage is not publicly available** from any accessible official surface (and is also absent from Empowered Indian — see §13.9).
- Empowered Indian remains the only **verified work-level, bulk, machine-readable** source available to this project (it is itself a secondary republisher — see §1 and §8).

### 14.3 Inferred / could not be verified (B)

- The **authenticated** e-SAKSHI portal (`.../digigov/Login.zul`; used by MPs, District/State authorities, Implementing Agencies, and the scheme bank) is understood, from official press material, to hold richer operational and work-level information (proposal processing, sanction accord, implementation monitoring, and Implementing-Agency uploads such as sanction orders and stage photographs). **This project has no access to that data.** Whether it exposes any specific field — for example per-work sanctioned amount, sanction number, sanction date, physical-progress percentage, work stage / milestone, or a structured implementing-agency field — **is not publicly accessible and could not be verified without authentication**, and must not be asserted as fact.
- The origin of Empowered Indian's numeric `workId` / `work_id` remains **unknown**; it has **not** been confirmed to be an official e-SAKSHI identifier (carried from §13.10).
- Whether the pre-2023 `www.mplads.gov.in` portal still serves work-wise HTML registers, and whether any such register carries a stable identifier, is **unknown** (site unreachable during this investigation).
- Whether `data.gov.in` holds a newer 17th/18th-Lok-Sabha work-wise MPLADS dataset not matched by the search terms used is **unknown**.

### 14.4 Consequences for Round 1

- **Official per-work sanctioned amount, sanction number, and sanction date cannot currently be joined to individual Empowered Indian works.** They are not available at work level from any accessible source, and no work-level join key exists.
- The official three-stage flow *Recommended → Sanctioned → Expenditure* is available **only at aggregate level** (state / MP / constituency). At the individual-work level, only **recommended/estimated cost → payment (vendor-payment) expenditure** is available, both from Empowered Indian.
- **Round-1 work-level financial analysis is therefore based on the estimated / recommended cost and the verified payment expenditure from Empowered Indian.** Ratios or gaps involving an official *sanctioned* amount are not computable per work in Round 1.
- **"Non Progress Works" is a categorical status and must not be treated as, or converted into, a quantitative physical-progress measure.** No quantitative progress data is available; any Round-1 "stalled work" signal can only be a proxy (e.g. age of recommendation combined with absence of payment records and absence from the completed set).
- **Round-1 ingestion is NOT expanded** to include official aggregate data. The Phase 2B database/integration design (single normalised `work` model + `work_payment` + provenance columns + minimal raw-record store) stands **unchanged**. It deliberately contains no `sanctioned_amount` / `sanction_number` / `sanction_date` / `physical_progress_pct` columns, because no accessible source supplies them at work level.

### 14.5 Future possibilities (C)

- Official aggregate figures (e-SAKSHI public dashboard; `data.gov.in` datasets) **may later be added as clearly labelled contextual / reference data** — for example side panels showing a state's or an MP's overall sanctioned / expenditure / unspent position for comparison. If ever added, such data:
  - must be stored **separately** from work rows (e.g. a dedicated reference-aggregate table), never merged into `work` or `work_payment`;
  - must **not** be fed into the Round-1 risk engine;
  - must be labelled with its official source, aggregation level, and period.
- If Empowered Indian's `workId` is ever confirmed to be an official identifier, official work-level enrichment could become possible; the Phase 2B `source_name` column and raw-record store already leave room for this.
- The pre-2023 `www.mplads.gov.in` static reports could be revisited from an unrestricted network if a specific historical-aggregate need arises.

### 14.6 Provenance of this investigation

- Sources consulted: the e-SAKSHI public dashboard and its client code (`mplads.mospi.gov.in`); the public `data.gov.in` catalog and OGD API; official PIB press releases on the revamped e-SAKSHI public dashboard; Vikaspedia's e-SAKSHI page. Third-party republishers (Dataful, indiaelections.org, Empowered Indian itself) were noted only for context and are **not** treated as authoritative.
- The official MoSPI / e-SAKSHI system remains the **preferred authoritative source** for MPLADS data (see §1 and §8). Empowered Indian remains a **secondary** source and must not be represented as data originating directly from the official system.