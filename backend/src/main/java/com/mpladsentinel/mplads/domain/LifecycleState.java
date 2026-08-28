package com.mpladsentinel.mplads.domain;

/**
 * Which source endpoint(s) a work has been observed in.
 *
 * <p>This is descriptive only. {@link #RECOMMENDED_AND_COMPLETED} is a
 * data-quality anomaly (the same {@code source_work_id} seen in both listings);
 * it is <strong>not</strong> proof of a recommended&rarr;completed transition,
 * which the source does not establish (see {@code docs/data-source.md} 13.6).
 * Names match the {@code ck_work_lifecycle_state} check constraint.
 */
public enum LifecycleState {
    RECOMMENDED,
    COMPLETED,
    RECOMMENDED_AND_COMPLETED
}
