package com.mpladsentinel.mplads.web;

import static org.assertj.core.api.Assertions.assertThat;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Arrays;

import com.fasterxml.jackson.databind.JsonNode;

import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.TestInstance;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.client.TestRestTemplate;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

import com.mpladsentinel.mplads.domain.IngestionEndpoint;
import com.mpladsentinel.mplads.domain.IngestionRun;
import com.mpladsentinel.mplads.domain.IngestionRunStatus;
import com.mpladsentinel.mplads.domain.IngestionTrigger;
import com.mpladsentinel.mplads.domain.LifecycleState;
import com.mpladsentinel.mplads.domain.PaymentDataState;
import com.mpladsentinel.mplads.domain.SourceName;
import com.mpladsentinel.mplads.domain.Work;
import com.mpladsentinel.mplads.domain.WorkPayment;
import com.mpladsentinel.mplads.repository.IngestionRunRepository;
import com.mpladsentinel.mplads.repository.WorkPaymentRepository;
import com.mpladsentinel.mplads.repository.WorkRepository;
import com.mpladsentinel.support.AbstractPostgresIntegrationTest;
import com.mpladsentinel.support.SessionLogin;

/**
 * End-to-end tests for the {@code /api/public/works} APIs used by the Citizen
 * Portal: a citizen can read them, an authority can too, an anonymous caller
 * cannot, and — most importantly — the payload carries ONLY publicly releasable
 * fields (no risk, no data-quality flags, no payment internals, no provenance).
 */
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@TestInstance(TestInstance.Lifecycle.PER_CLASS)
class PublicWorkControllerTest extends AbstractPostgresIntegrationTest {

    private static final long BASE = 3_300_000_000L;
    private static final long REF = BASE + 1;
    private static final long UNREADABLE_LOW_ID = BASE + 5;   // low id, unusable description
    private static final long READABLE_HIGH_ID = BASE + 50;   // high id, good description
    private static final long NO_PAYMENTS = BASE + 60;
    private static final long UNKNOWN = 999_999_998L;

    private static final String[] FORBIDDEN_FIELDS = {
        "dataQualityFlags", "sourceName", "seenInRecommended", "seenInCompleted",
        "firstIngestedAt", "risk",
    };

    @Autowired
    private TestRestTemplate rest;
    @Autowired
    private WorkRepository workRepository;
    @Autowired
    private WorkPaymentRepository workPaymentRepository;
    @Autowired
    private IngestionRunRepository ingestionRunRepository;

    @BeforeAll
    void seed() {
        IngestionRun run = ingestionRunRepository.save(new IngestionRun(
                SourceName.EMPOWERED_INDIAN, IngestionEndpoint.WORKS_RECOMMENDED,
                "https://api.empoweredindian.in/api", IngestionTrigger.MANUAL,
                IngestionRunStatus.RUNNING));

        Work work = new Work(SourceName.EMPOWERED_INDIAN, REF,
                LifecycleState.RECOMMENDED, true, false, run);
        work.setWorkDescription("Drinking water pipeline");
        work.setCategory("Water");
        work.setState("Kerala");
        work.setDistrict("Thrissur");
        work.setMpName("Test MP");
        work.setEstimatedCost(new BigDecimal("1500000.00"));
        work.setPaymentDataState(PaymentDataState.FETCHED_PRESENT);
        work.setPaymentTotalPaid(new BigDecimal("900000.00"));
        work.setPaymentInstallments(1);
        // internal-only fields that must NOT leak through the public endpoint
        work.setDataQualityFlags(new String[] {"HI_FIELDS_MIRROR_EN"});
        workRepository.saveAndFlush(work);

        workPaymentRepository.saveAndFlush(payment(work, "900000.00", (short) 0,
                "fp-public-1", run, LocalDate.of(2026, 4, 1), "Vendor A"));

        Work noPayments = new Work(SourceName.EMPOWERED_INDIAN, NO_PAYMENTS,
                LifecycleState.RECOMMENDED, true, false, run);
        noPayments.setWorkDescription("Community hall");
        noPayments.setState("Bihar");
        workRepository.saveAndFlush(noPayments);

        Work unreadable = new Work(SourceName.EMPOWERED_INDIAN, UNREADABLE_LOW_ID,
                LifecycleState.RECOMMENDED, true, false, run);
        unreadable.setWorkDescription("?? ?? ??");
        unreadable.setState("Uttar Pradesh");
        unreadable.setDataQualityFlags(new String[] {"UNREADABLE_WORK_DESCRIPTION"});
        workRepository.saveAndFlush(unreadable);

        Work readableHigh = new Work(SourceName.EMPOWERED_INDIAN, READABLE_HIGH_ID,
                LifecycleState.RECOMMENDED, true, false, run);
        readableHigh.setWorkDescription("Community toilet block");
        readableHigh.setState("Uttar Pradesh");
        workRepository.saveAndFlush(readableHigh);
    }

    private static WorkPayment payment(Work work, String amount, short ordinal, String fingerprint,
                                       IngestionRun run, LocalDate paidOn, String vendor) {
        WorkPayment p = new WorkPayment(work, new BigDecimal(amount), fingerprint, run);
        p.setSourceOrdinal(ordinal);
        p.setPaidOn(paidOn);
        p.setVendorName(vendor);
        p.setStatusRaw("Payment Success");
        return p;
    }

    private HttpEntity<Void> as(String username) {
        return new HttpEntity<>(SessionLogin.cookieFor(rest, username));
    }

    @Test
    void anonymousCallerIsUnauthorized() {
        assertThat(rest.getForEntity("/api/public/works", String.class).getStatusCode())
                .isEqualTo(HttpStatus.UNAUTHORIZED);
    }

    @Test
    void citizenCanListPublicWorks() {
        ResponseEntity<PublicWorkResponse[]> response = rest.exchange(
                "/api/public/works", HttpMethod.GET, as("citizen"), PublicWorkResponse[].class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        PublicWorkResponse row = Arrays.stream(response.getBody())
                .filter(w -> w.reference() == REF).findFirst().orElseThrow();
        assertThat(row.memberOfParliament()).isEqualTo("Test MP");
        assertThat(row.estimatedCost().amount()).isEqualByComparingTo("1500000.00");
        assertThat(row.status()).isEqualTo(LifecycleState.RECOMMENDED);
    }

    @Test
    void publicPayloadCarriesTheRecordedPaymentSummary() {
        // Plain public expenditure data (not a risk signal) — deliberately NOT
        // in FORBIDDEN_FIELDS, unlike dataQualityFlags/risk/provenance below.
        ResponseEntity<PublicWorkResponse> response = rest.exchange(
                "/api/public/works/" + REF, HttpMethod.GET, as("citizen"), PublicWorkResponse.class);

        PublicWorkResponse row = response.getBody();
        assertThat(row).isNotNull();
        assertThat(row.paymentDataState()).isEqualTo(PaymentDataState.FETCHED_PRESENT);
        assertThat(row.recordedPayments().amount()).isEqualByComparingTo("900000.00");
        assertThat(row.paymentInstallments()).isEqualTo(1);
    }

    @Test
    void authorityCanAlsoReadThePublicWorks() {
        assertThat(rest.exchange("/api/public/works/" + REF, HttpMethod.GET, as("mp"),
                PublicWorkResponse.class).getStatusCode()).isEqualTo(HttpStatus.OK);
    }

    @Test
    void publicPayloadOmitsEveryInternalField() {
        JsonNode row = rest.exchange("/api/public/works/" + REF, HttpMethod.GET, as("citizen"),
                JsonNode.class).getBody();

        assertThat(row).isNotNull();
        assertThat(row.get("reference").asLong()).isEqualTo(REF);
        for (String field : FORBIDDEN_FIELDS) {
            assertThat(row.has(field)).as("public payload must not contain '%s'", field).isFalse();
        }
    }

    @Test
    void listsWorksWithAnUnreadableDescriptionLast() {
        PublicWorkResponse[] all = rest.exchange(
                "/api/public/works", HttpMethod.GET, as("citizen"), PublicWorkResponse[].class).getBody();

        int readableHigh = -1;
        int unreadableLow = -1;
        for (int i = 0; i < all.length; i++) {
            if (all[i].reference() == READABLE_HIGH_ID) {
                readableHigh = i;
            } else if (all[i].reference() == UNREADABLE_LOW_ID) {
                unreadableLow = i;
            }
        }
        assertThat(readableHigh).isGreaterThanOrEqualTo(0);
        assertThat(unreadableLow).isGreaterThan(readableHigh);
    }

    @Test
    void unknownReferenceIs404() {
        assertThat(rest.exchange("/api/public/works/" + UNKNOWN, HttpMethod.GET, as("citizen"),
                String.class).getStatusCode()).isEqualTo(HttpStatus.NOT_FOUND);
    }

    // --- payments (public track) ----------------------------------------

    @Test
    void citizenCanReadPaymentsThroughThePublicTrack() {
        ResponseEntity<WorkPaymentResponse[]> response = rest.exchange(
                "/api/public/works/" + REF + "/payments", HttpMethod.GET,
                as("citizen"), WorkPaymentResponse[].class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).hasSize(1);
        assertThat(response.getBody()[0].amount().amount()).isEqualByComparingTo("900000.00");
        assertThat(response.getBody()[0].vendorName()).isEqualTo("Vendor A");
    }

    @Test
    void publicPaymentsIsAnEmptyArrayForAKnownWorkWithNoPaymentRows() {
        ResponseEntity<WorkPaymentResponse[]> response = rest.exchange(
                "/api/public/works/" + NO_PAYMENTS + "/payments", HttpMethod.GET,
                as("citizen"), WorkPaymentResponse[].class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).isEmpty();
    }

    @Test
    void publicPaymentsForAnUnknownWorkIs404() {
        assertThat(rest.exchange("/api/public/works/" + UNKNOWN + "/payments", HttpMethod.GET,
                as("citizen"), String.class).getStatusCode()).isEqualTo(HttpStatus.NOT_FOUND);
    }

    @Test
    void publicPaymentsRequiresAuthentication() {
        assertThat(rest.getForEntity("/api/public/works/" + REF + "/payments", String.class)
                .getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED);
    }
}
