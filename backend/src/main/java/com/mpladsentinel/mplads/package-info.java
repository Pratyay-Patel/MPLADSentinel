/**
 * MPLADS data module of the modular monolith.
 *
 * <p>This phase (PostgreSQL Data Layer) contains only the persistence side:
 * <ul>
 *   <li>{@code domain} &mdash; JPA entities and the enumerations they use,</li>
 *   <li>{@code repository} &mdash; Spring Data JPA repositories.</li>
 * </ul>
 *
 * <p>The external API client, normalisation, and the ingestion pipeline are
 * <strong>not</strong> part of this module yet and are added in a later phase.
 * Flyway (see {@code src/main/resources/db/migration}) is the single source of
 * truth for the schema; Hibernate only maps onto it.
 *
 * <p>All data currently modelled originates from the <em>Empowered Indian</em>
 * API, a secondary data-access source. See {@code docs/data-source.md}.
 */
package com.mpladsentinel.mplads;
