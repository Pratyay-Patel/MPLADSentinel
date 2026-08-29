/**
 * MPLADS ingestion pipeline (Phase 2E-2).
 *
 * <p>Wires the transport client ({@code source.empoweredindian}) and the
 * normalizers ({@code mplads.normalization}) to the persistence layer
 * ({@code mplads.domain} / {@code mplads.repository}):
 *
 * <pre>
 *   EmpoweredIndianClient --&gt; DTOs --&gt; WorkNormalizer / PaymentNormalizer
 *                                          --&gt; Work / WorkPayment upsert (+ provenance)
 * </pre>
 *
 * <h2>Scope</h2>
 * <ul>
 *   <li><strong>Manual trigger only.</strong> {@link com.mpladsentinel.mplads.ingestion.IngestionService}
 *       exposes three guarded entry points (recommended works, completed works,
 *       work payments). There is deliberately no {@code @Scheduled}, background
 *       scheduler, queue or message broker (decisions D17, Q9).</li>
 *   <li>Pagination iterates one page at a time using the verified contract
 *       ({@code hasNext} terminator + empty-page and max-page guards). It never
 *       relies on {@code totalCount} as an exact bound (docs/data-source.md
 *       &sect;13.7) and never fetches the whole dataset in one payment run.</li>
 *   <li>Every write is idempotent on a natural key
 *       ({@code work(source_name, source_work_id)},
 *       {@code work_payment(work_id, source_fingerprint)},
 *       {@code raw_source_record(source_name, endpoint, source_work_id)}), so a
 *       full re-run from page 1 is the source-of-truth reconciliation mechanism
 *       (Q3).</li>
 *   <li>No normalisation, risk scoring, dashboard API, RBAC, scheduling, AI,
 *       blockchain or IPFS work lives here.</li>
 * </ul>
 *
 * <h2>Transactions (Q11)</h2>
 * <ul>
 *   <li>The {@code IngestionRun} row is created and committed before any child row.</li>
 *   <li>Each works page is applied in its own transaction; a failed page rolls
 *       back only that page and never the pages already committed.</li>
 *   <li>Run progress counters are flushed in independent
 *       ({@code REQUIRES_NEW}) transactions so partial progress survives a later
 *       failure.</li>
 *   <li>Each work's payment snapshot is replaced in its own transaction; a failed
 *       payment fetch never partially replaces the previous successful snapshot.</li>
 *   <li>HTTP calls happen outside any transaction.</li>
 * </ul>
 */
package com.mpladsentinel.mplads.ingestion;
