/**
 * Cross-module building blocks shared by the MPLADSentinel modules: common web
 * response shapes, error handling, and small utilities.
 *
 * <p>Code here must stay free of module-specific business logic. Anything tied to
 * a particular capability (projects, risk scoring, data ingestion, audit,
 * evidence, grievances) belongs in that capability's own package.
 */
package com.mpladsentinel.common;
