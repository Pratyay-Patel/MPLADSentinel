package com.mpladsentinel.mplads.normalization;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

import com.mpladsentinel.mplads.domain.IngestionEndpoint;
import com.mpladsentinel.mplads.domain.IngestionRun;
import com.mpladsentinel.mplads.domain.IngestionRunStatus;
import com.mpladsentinel.mplads.domain.IngestionTrigger;
import com.mpladsentinel.mplads.domain.SourceName;
import com.mpladsentinel.mplads.source.empoweredindian.dto.CompletedWorkDto;
import com.mpladsentinel.mplads.source.empoweredindian.dto.MpDetailsDto;
import com.mpladsentinel.mplads.source.empoweredindian.dto.PaymentInstallmentDto;
import com.mpladsentinel.mplads.source.empoweredindian.dto.RecommendedWorkDto;
import com.mpladsentinel.mplads.source.empoweredindian.dto.WorkPaymentDetailsDto;
import com.mpladsentinel.mplads.source.empoweredindian.dto.WorkPaymentsResponse;
import com.mpladsentinel.mplads.source.empoweredindian.dto.WorkPaymentsSummaryDto;

/**
 * Controlled DTO fixtures for the normalisation unit tests. Values mirror the
 * verified examples in docs/data-source.md &sect;13.2 / &sect;13.3 / &sect;13.4.
 * No live API is contacted anywhere in these tests.
 */
final class NormalizationFixtures {

    private NormalizationFixtures() {
    }

    /** A detached provenance run; the normalizers only read {@code source_work_id} off the work, never the run. */
    static IngestionRun run(IngestionEndpoint endpoint) {
        return new IngestionRun(SourceName.EMPOWERED_INDIAN, endpoint,
                "https://api.empoweredindian.in/api", IngestionTrigger.MANUAL, IngestionRunStatus.RUNNING);
    }

    static RecommendedBuilder recommended() {
        return new RecommendedBuilder();
    }

    static CompletedBuilder completed() {
        return new CompletedBuilder();
    }

    static MpDetailsDto mp() {
        return new MpDetailsDto("BISHNU PADA RAY", "BISHNU PADA RAY", "ANDAMAN AND NICOBAR ISLANDS", "Lok Sabha");
    }

    static PaymentInstallmentDto installment(String amount, LocalDate date, String vendor) {
        return new PaymentInstallmentDto(new BigDecimal(amount), date, "Payment Success", vendor,
                "NORTH AND MIDDLE ANDAMAN(Implementing District Authority(N&MA))");
    }

    static WorkPaymentsResponse paymentsResponse(WorkPaymentsSummaryDto summary,
                                                 List<PaymentInstallmentDto> installments) {
        return new WorkPaymentsResponse(
                187_484L,
                new WorkPaymentDetailsDto("Construction of community centers and community halls",
                        "BISHNU PADA RAY", "ANDAMAN AND NICOBAR ISLANDS",
                        "NORTH AND MIDDLE ANDAMAN(Implementing District Authority(N&MA))"),
                summary,
                installments);
    }

    static WorkPaymentsSummaryDto summary(int totalInstallments, String totalAmountPaid,
                                          int successful, int pending, LocalDate first, LocalDate last) {
        return new WorkPaymentsSummaryDto(totalInstallments, new BigDecimal(totalAmountPaid),
                successful, pending, first, last);
    }

    /** Mutable builder for {@link RecommendedWorkDto}; defaults match the §13.2 worked example. */
    static final class RecommendedBuilder {
        String sourceObjectId = "6a89c8052f87e3172f71db3f";
        Long workId = 260_540L;
        String house = "Lok Sabha";
        Integer lsTerm = 18;
        String workDescription = "Extension of CC Road for 120 mtrs at Gonvind Nagar";
        String workDescriptionHi = "Extension of CC Road for 120 mtrs at Gonvind Nagar";
        String category = "Normal/Others";
        String categoryHi = "Normal/Others";
        BigDecimal estimatedCost = new BigDecimal("2500000");
        LocalDate recommendedDate = LocalDate.of(2026, 1, 20);
        Integer recommendedYear = 2026;
        String status = "Recommended";
        String statusHi = "Recommended";
        String location = "SOUTH ANDAMANS(Implementing District Authority(SA))";
        String locationHi = "SOUTH ANDAMANS(Implementing District Authority(SA))";
        String district = "ANDAMAN AND NICOBAR ISLANDS";
        String districtHi = "ANDAMAN AND NICOBAR ISLANDS";
        String state = "Andaman And Nicobar Islands";
        String stateHi = "Andaman And Nicobar Islands";
        Integer expectedBeneficiaries = 0;
        MpDetailsDto mpDetails = mp();
        Boolean hasPayments = Boolean.FALSE;
        BigDecimal totalPaid = BigDecimal.ZERO;
        Integer paymentCount = 0;

        RecommendedBuilder workId(Long v) { this.workId = v; return this; }
        RecommendedBuilder house(String v) { this.house = v; return this; }
        RecommendedBuilder lsTerm(Integer v) { this.lsTerm = v; return this; }
        RecommendedBuilder workDescription(String v) { this.workDescription = v; return this; }
        RecommendedBuilder category(String v) { this.category = v; return this; }
        RecommendedBuilder categoryHi(String v) { this.categoryHi = v; return this; }
        RecommendedBuilder estimatedCost(BigDecimal v) { this.estimatedCost = v; return this; }
        RecommendedBuilder recommendedDate(LocalDate v) { this.recommendedDate = v; return this; }
        RecommendedBuilder recommendedYear(Integer v) { this.recommendedYear = v; return this; }
        RecommendedBuilder status(String v) { this.status = v; return this; }
        RecommendedBuilder district(String v) { this.district = v; return this; }
        RecommendedBuilder state(String v) { this.state = v; return this; }
        RecommendedBuilder expectedBeneficiaries(Integer v) { this.expectedBeneficiaries = v; return this; }
        RecommendedBuilder mpDetails(MpDetailsDto v) { this.mpDetails = v; return this; }
        RecommendedBuilder hasPayments(Boolean v) { this.hasPayments = v; return this; }
        RecommendedBuilder totalPaid(BigDecimal v) { this.totalPaid = v; return this; }
        RecommendedBuilder paymentCount(Integer v) { this.paymentCount = v; return this; }

        /** Make every {@code *_hi} field (including {@code mp_details.name_hi}) differ from its English value. */
        RecommendedBuilder withDistinctHindi() {
            this.workDescriptionHi = "हिंदी विवरण";
            this.categoryHi = "सामान्य/अन्य";
            this.statusHi = "अनुशंसित";
            this.locationHi = "स्थान";
            this.districtHi = "जिला";
            this.stateHi = "राज्य";
            this.mpDetails = new MpDetailsDto("BISHNU PADA RAY", "बिष्णु पदा राय",
                    "ANDAMAN AND NICOBAR ISLANDS", "Lok Sabha");
            return this;
        }

        RecommendedWorkDto build() {
            return new RecommendedWorkDto(sourceObjectId, workId, house, lsTerm,
                    workDescription, workDescriptionHi, category, categoryHi, estimatedCost,
                    recommendedDate, recommendedYear, status, statusHi,
                    location, locationHi, district, districtHi, state, stateHi,
                    expectedBeneficiaries, mpDetails, hasPayments, totalPaid, paymentCount);
        }
    }

    /** Mutable builder for {@link CompletedWorkDto}; defaults match the §13.3 worked example. */
    static final class CompletedBuilder {
        String sourceObjectId = "6a90da2960cc5ec1e4c4bcff";
        Long workId = 134_703L;
        String workDescription = "Upgradation of Road from Madhavaram Village to bus stand";
        String workDescriptionHi = "Upgradation of Road from Madhavaram Village to bus stand";
        String category = "Normal/Others";
        String categoryHi = "Normal/Others";
        BigDecimal cost = new BigDecimal("499993");
        LocalDate completionDate = LocalDate.of(2025, 1, 31);
        Integer completionYear = 2025;
        String location = "CHITTOOR(DISTRICT COLLECTOR CHITTOOR_IDA)";
        String locationHi = "CHITTOOR(DISTRICT COLLECTOR CHITTOOR_IDA)";
        String district = "CHITTOOR";
        String districtHi = "CHITTOOR";
        String state = "Andhra Pradesh";
        String stateHi = "Andhra Pradesh";
        Integer beneficiaries = 0;
        MpDetailsDto mpDetails = mp();

        CompletedBuilder workId(Long v) { this.workId = v; return this; }
        CompletedBuilder workDescription(String v) { this.workDescription = v; return this; }
        CompletedBuilder cost(BigDecimal v) { this.cost = v; return this; }
        CompletedBuilder completionDate(LocalDate v) { this.completionDate = v; return this; }
        CompletedBuilder completionYear(Integer v) { this.completionYear = v; return this; }
        CompletedBuilder district(String v) { this.district = v; return this; }
        CompletedBuilder state(String v) { this.state = v; return this; }
        CompletedBuilder beneficiaries(Integer v) { this.beneficiaries = v; return this; }
        CompletedBuilder mpDetails(MpDetailsDto v) { this.mpDetails = v; return this; }

        /** Distinct {@code *_hi} values and an MP object with no {@code party} &mdash; a "clean" record. */
        CompletedBuilder withDistinctHindi() {
            this.workDescriptionHi = "हिंदी विवरण";
            this.categoryHi = "सामान्य/अन्य";
            this.locationHi = "स्थान";
            this.districtHi = "जिला";
            this.stateHi = "राज्य";
            this.mpDetails = new MpDetailsDto("BISHNU PADA RAY", "बिष्णु पदा राय",
                    "ANDAMAN AND NICOBAR ISLANDS", null);
            return this;
        }

        CompletedWorkDto build() {
            return new CompletedWorkDto(sourceObjectId, workId,
                    workDescription, workDescriptionHi, category, categoryHi, cost,
                    completionDate, completionYear,
                    location, locationHi, district, districtHi, state, stateHi,
                    beneficiaries, mpDetails);
        }
    }

}
