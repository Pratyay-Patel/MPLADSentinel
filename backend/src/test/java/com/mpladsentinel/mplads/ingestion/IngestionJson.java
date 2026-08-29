package com.mpladsentinel.mplads.ingestion;

import java.util.List;
import java.util.StringJoiner;

/**
 * Hand-built JSON envelopes mirroring the verified Empowered Indian responses
 * (docs/data-source.md &sect;13.2 / &sect;13.3 / &sect;13.4). Kept as raw strings so
 * the tests exercise the real client deserialisation path.
 */
final class IngestionJson {

    private IngestionJson() {
    }

    static String recommendedPage(int currentPage, int totalPages, long totalCount, boolean hasNext,
                                  String... workObjects) {
        return """
                {"success":true,"data":{"recommendedWorks":[%s],\
                "pagination":{"currentPage":%d,"totalPages":%d,"totalCount":%d,"hasNext":%s,"hasPrev":%s},\
                "summary":{},"filters":{},"lastUpdated":"2026-08-29T07:50:00.000Z"}}"""
                .formatted(join(workObjects), currentPage, totalPages, totalCount,
                        hasNext, currentPage > 1);
    }

    static String completedPage(int currentPage, int totalPages, long totalCount, boolean hasNext,
                                String... workObjects) {
        return """
                {"success":true,"data":{"completedWorks":[%s],\
                "pagination":{"currentPage":%d,"totalPages":%d,"totalCount":%d,"hasNext":%s,"hasPrev":%s},\
                "summary":{},"filters":{},"lastUpdated":"2026-08-29T07:50:00.000Z"}}"""
                .formatted(join(workObjects), currentPage, totalPages, totalCount,
                        hasNext, currentPage > 1);
    }

    /** A recommended-work object. Pass {@code workId=null} literal by using {@link #recommendedNoId}. */
    static String recommendedWork(long workId, String description, long estimatedCost) {
        return """
                {"_id":"o-%1$d","workId":%1$d,"house":"Lok Sabha","lsTerm":18,\
                "work_description":"%2$s","work_description_hi":"%2$s",\
                "category":"Normal/Others","category_hi":"Normal/Others",\
                "estimated_cost":%3$d,"recommended_date":"2026-01-20T00:00:00.000Z","recommended_year":2026,\
                "status":"Recommended","status_hi":"Recommended",\
                "location":"SOUTH ANDAMANS(IDA)","location_hi":"SOUTH ANDAMANS(IDA)",\
                "district":"ANDAMAN","district_hi":"ANDAMAN","state":"Andaman","state_hi":"Andaman",\
                "expected_beneficiaries":0,\
                "mp_details":{"name":"BISHNU PADA RAY","name_hi":"BISHNU PADA RAY",\
                "constituency":"ANDAMAN","party":"Lok Sabha"},\
                "hasPayments":false,"totalPaid":0,"paymentCount":0}"""
                .formatted(workId, description, estimatedCost);
    }

    /** A recommended-work object whose {@code workId} is null (drives a dead-letter). */
    static String recommendedNoId(String description) {
        return """
                {"_id":"o-null","workId":null,"house":"Lok Sabha","lsTerm":18,\
                "work_description":"%1$s","work_description_hi":"%1$s",\
                "category":"Normal/Others","category_hi":"Normal/Others",\
                "estimated_cost":100,"recommended_date":"2026-01-20T00:00:00.000Z","recommended_year":2026,\
                "status":"Recommended","status_hi":"Recommended",\
                "location":"L","location_hi":"L","district":"D","district_hi":"D",\
                "state":"S","state_hi":"S","expected_beneficiaries":0,\
                "mp_details":{"name":"X","name_hi":"X","constituency":"C","party":"Lok Sabha"},\
                "hasPayments":false,"totalPaid":0,"paymentCount":0}"""
                .formatted(description);
    }

    static String completedWork(long workId, String description, String cost) {
        return """
                {"_id":"c-%1$d","work_id":%1$d,\
                "work_description":"%2$s","work_description_hi":"%2$s",\
                "category":"Normal/Others","category_hi":"Normal/Others",\
                "cost":%3$s,"completion_date":"2025-01-31T00:00:00.000Z","completion_year":2025,\
                "location":"CHITTOOR(IDA)","location_hi":"CHITTOOR(IDA)",\
                "district":"CHITTOOR","district_hi":"CHITTOOR","state":"Andhra Pradesh","state_hi":"Andhra Pradesh",\
                "beneficiaries":0,\
                "mp_details":{"name":"BISHNU PADA RAY","name_hi":"BISHNU PADA RAY",\
                "constituency":"CHITTOOR","party":"Lok Sabha"}}"""
                .formatted(workId, description, cost);
    }

    /** Successful payments response with the given installments (amount pairs). */
    static String paymentsPresent(long workId, List<long[]> amountsAndDays) {
        StringJoiner rows = new StringJoiner(",");
        long total = 0;
        for (long[] ad : amountsAndDays) {
            long amount = ad[0];
            long day = ad[1];
            total += amount;
            rows.add("""
                    {"amount":%d,"date":"2026-08-%02dT00:00:00.000Z","status":"Payment Success",\
                    "vendor":"Vendor %2$d","ida":"NORTH ANDAMAN(IDA)"}""".formatted(amount, day));
        }
        long first = amountsAndDays.get(0)[1];
        long last = amountsAndDays.get(amountsAndDays.size() - 1)[1];
        return """
                {"success":true,"data":{"workId":%d,\
                "workDetails":{"description":"Construction of community centers and community halls",\
                "mpName":"BISHNU PADA RAY","constituency":"ANDAMAN","ida":"NORTH ANDAMAN(IDA)"},\
                "summary":{"totalInstallments":%d,"totalAmountPaid":%d,"successfulPayments":%d,\
                "pendingPayments":0,"firstPaymentDate":"2026-08-%02dT00:00:00.000Z",\
                "lastPaymentDate":"2026-08-%02dT00:00:00.000Z"},\
                "paymentTimeline":[],"allPayments":[%s]},"lastUpdated":"2026-08-29T07:50:00.000Z"}"""
                .formatted(workId, amountsAndDays.size(), total, amountsAndDays.size(),
                        first, last, rows.toString());
    }

    static final String PAYMENTS_404_NO_RECORDS =
            "{\"success\":false,\"message\":\"No payment records found for this work\"}";

    static final String PAYMENTS_MALFORMED_200 = "{\"success\":true,\"data\":";

    private static String join(String... objects) {
        return String.join(",", objects);
    }
}
