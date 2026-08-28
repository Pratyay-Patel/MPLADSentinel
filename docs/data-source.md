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