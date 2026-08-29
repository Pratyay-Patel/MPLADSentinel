/**
 * HTTP client for the <em>Empowered Indian</em> MPLADS API.
 *
 * <p><strong>This phase (Empowered Indian API Client) is the transport layer only.</strong>
 * It performs HTTP calls, deserialises the verified responses into API DTOs, and
 * surfaces pagination metadata and transport/HTTP failures. It does
 * <strong>not</strong> normalise, persist, orchestrate ingestion, schedule, or
 * apply any business/risk logic &mdash; those belong to later phases.
 *
 * <ul>
 *   <li>{@link com.mpladsentinel.mplads.source.empoweredindian.EmpoweredIndianClient}
 *       &mdash; the single entry point (recommended works, completed works, work payments).</li>
 *   <li>{@code dto} &mdash; records mirroring the verified API responses
 *       (docs/data-source.md &sect;13). These are API models, kept strictly
 *       separate from the JPA entities in {@code com.mpladsentinel.mplads.domain}.</li>
 *   <li>{@code error} &mdash; the client exception hierarchy.</li>
 *   <li>{@code support} &mdash; Jackson helpers.</li>
 * </ul>
 *
 * <p>Empowered Indian is a <em>secondary</em> data-access source, not the
 * authoritative owner of MPLADS data. Its numeric {@code workId} / {@code work_id}
 * is a <em>source</em> identifier whose relationship to any official MPLADS /
 * e-SAKSHI id is unknown (docs/data-source.md &sect;13.6, &sect;14.3); it is never
 * labelled as an official identifier.
 */
package com.mpladsentinel.mplads.source.empoweredindian;
