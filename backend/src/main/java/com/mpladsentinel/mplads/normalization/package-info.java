/**
 * Normalisation layer: the boundary between the external Empowered Indian API
 * schema and the internal MPLADSentinel domain model.
 *
 * <pre>
 *   Empowered Indian API
 *           &darr;
 *   EmpoweredIndianClient           (source.empoweredindian)
 *           &darr;
 *   External API DTOs               (source.empoweredindian.dto)
 *           &darr;
 *   Normalisation                   (this package)   &lt;-- pure mapping
 *           &darr;
 *   Work / WorkPayment domain model (mplads.domain)
 * </pre>
 *
 * <p><strong>This phase (2E-1) is normalisation only.</strong> The classes here:
 * <ul>
 *   <li>do <strong>not</strong> perform HTTP communication;</li>
 *   <li>do <strong>not</strong> contain pagination logic;</li>
 *   <li>do <strong>not</strong> orchestrate ingestion, create {@code ingestion_run}
 *       or {@code ingestion_dead_letter} rows, schedule jobs, or write to
 *       PostgreSQL;</li>
 *   <li>do <strong>not</strong> compute risk scores &mdash;
 *       {@link com.mpladsentinel.mplads.normalization.DataQualityFlags} are
 *       descriptive observations about the SECONDARY source data, never fraud
 *       findings.</li>
 * </ul>
 *
 * <p>The {@link com.mpladsentinel.mplads.domain.IngestionRun} passed to the
 * normalizers is <em>supplied by the caller</em> (the future ingestion phase)
 * solely so the produced {@link com.mpladsentinel.mplads.domain.Work} /
 * {@link com.mpladsentinel.mplads.domain.WorkPayment} keep their mandatory
 * provenance link. The normalizers never start, look up or mutate a run.
 *
 * <p>Recommended and completed are treated as two distinct source shapes
 * (docs/data-source.md &sect;13.2 vs &sect;13.3) reconciled only on the numeric
 * work id. {@code estimated_cost} (recommended) and {@code cost} (completed) are
 * never merged. Seeing a work in both endpoints is a data-quality anomaly, not a
 * proven recommended&rarr;completed transition (&sect;13.6). The Empowered Indian
 * {@code workId} / {@code work_id} is a <em>source</em> identifier of unknown
 * official provenance and is never relabelled as an official MPLADS / e-SAKSHI id.
 */
package com.mpladsentinel.mplads.normalization;
