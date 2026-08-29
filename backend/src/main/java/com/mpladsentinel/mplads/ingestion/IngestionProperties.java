package com.mpladsentinel.mplads.ingestion;

import java.time.Duration;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.boot.context.properties.bind.DefaultValue;
import org.springframework.validation.annotation.Validated;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;

/**
 * Configuration for the ingestion pipeline, bound from {@code mplads.ingestion.*}
 * (see {@code application.yml}; every value has a safe conservative default).
 *
 * @param worksPageSize              {@code limit} used for works pages (1..100; the verified API bound)
 * @param worksMaxPages              absolute per-run page ceiling (defence-in-depth against a contract change)
 * @param worksInterPageDelay        pause between works pages (rate-limit courtesy)
 * @param deadLetterCapPerRun        max dead-letter rows a single run will create; further un-normalisable
 *                                   records are counted and noted on the run but not written (Q5)
 * @param partialOnDeadLetters       when {@code true}, a run that produced any dead letter finishes {@code PARTIAL}
 * @param paymentsMaxWorksPerRun     max works whose payments are fetched in one payment run (Q4)
 * @param paymentsInterRequestDelay  pause between per-work payment requests (Q4)
 * @param paymentsRecheckAbsentAfter a {@code FETCHED_ABSENT} work becomes a payment candidate again once its
 *                                   {@code last_ingested_at} is older than this (Q6; approximate — there is no
 *                                   dedicated last-checked column and none is being added)
 * @param paymentsRecheckPresentAfter a {@code FETCHED_PRESENT} work is refreshed once older than this
 */
@ConfigurationProperties(prefix = "mplads.ingestion")
@Validated
public record IngestionProperties(

        @DefaultValue("100") @Min(1) int worksPageSize,

        @DefaultValue("6000") @Min(1) int worksMaxPages,

        @DefaultValue("0ms") @NotNull Duration worksInterPageDelay,

        @DefaultValue("500") @Min(0) int deadLetterCapPerRun,

        @DefaultValue("false") boolean partialOnDeadLetters,

        @DefaultValue("200") @Min(1) int paymentsMaxWorksPerRun,

        @DefaultValue("200ms") @NotNull Duration paymentsInterRequestDelay,

        @DefaultValue("7d") @NotNull Duration paymentsRecheckAbsentAfter,

        @DefaultValue("30d") @NotNull Duration paymentsRecheckPresentAfter
) {

    /** The API rejects {@code limit > 100}; keep the effective page size within the verified bound. */
    public int effectiveWorksPageSize() {
        return Math.min(worksPageSize, 100);
    }
}
