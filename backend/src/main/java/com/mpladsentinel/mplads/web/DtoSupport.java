package com.mpladsentinel.mplads.web;

/** Small shared helpers for the web-response mappers. */
final class DtoSupport {

    private DtoSupport() {
    }

    /** {@code Short} → {@code Integer} for clean JSON numbers, preserving null. */
    static Integer box(Short value) {
        return value == null ? null : value.intValue();
    }
}
