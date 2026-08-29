package com.mpladsentinel.mplads.web;

import static org.assertj.core.api.Assertions.assertThat;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Arrays;

import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.TestInstance;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.client.TestRestTemplate;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

import com.mpladsentinel.mplads.domain.House;
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
 * End-to-end tests for the authority-facing {@code /api/works} APIs through the
 * full HTTP + security filter chain: role gating (401 / 403), the response
 * shape, 404s, the empty-vs-missing payments distinction, and the summary
 * aggregates.
 */
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@TestInstance(TestInstance.Lifecycle.PER_CLASS)
class WorkControllerTest extends AbstractPostgresIntegrationTest {

    private static final long BASE = 3_200_000_000L;
    private static final long WITH_PAYMENTS = BASE + 1;
    private static final long NO_PAYMENTS = BASE + 2;
    private static final long COMPLETED = BASE + 3;
    private static final long UNKNOWN = 999_999_999L;

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

        Work withPayments = new Work(SourceName.EMPOWERED_INDIAN, WITH_PAYMENTS,
                LifecycleState.RECOMMENDED, true, false, run);
        withPayments.setWorkDescription("CC road, ward 4");
        withPayments.setCategory("Roads");
        withPayments.setState("Kerala");
        withPayments.setDistrict("Ernakulam");
        withPayments.setHouse(House.LOK_SABHA);
        withPayments.setLsTerm((short) 18);
        withPayments.setMpName("Test MP");
        withPayments.setEstimatedCost(new BigDecimal("2500000.00"));
        withPayments.setPaymentDataState(PaymentDataState.FETCHED_PRESENT);
        withPayments.setPaymentTotalPaid(new BigDecimal("1200000.00"));
        withPayments.setPaymentInstallments(2);
        withPayments.setDataQualityFlags(new String[] {"HI_FIELDS_MIRROR_EN"});
        workRepository.saveAndFlush(withPayments);

        workPaymentRepository.saveAndFlush(payment(withPayments, "700000.00", (short) 0,
                "fp-b2-1", run, LocalDate.of(2026, 2, 1), "Vendor A"));
        workPaymentRepository.saveAndFlush(payment(withPayments, "500000.00", (short) 1,
                "fp-b2-2", run, LocalDate.of(2026, 3, 1), "Vendor B"));

        Work noPayments = new Work(SourceName.EMPOWERED_INDIAN, NO_PAYMENTS,
                LifecycleState.RECOMMENDED, true, false, run);
        noPayments.setWorkDescription("Community hall");
        noPayments.setState("Bihar");
        noPayments.setEstimatedCost(new BigDecimal("800000.00"));
        workRepository.saveAndFlush(noPayments);

        Work completed = new Work(SourceName.EMPOWERED_INDIAN, COMPLETED,
                LifecycleState.COMPLETED, false, true, run);
        completed.setWorkDescription("Bus shelter");
        completed.setState("Kerala");
        completed.setFinalCost(new BigDecimal("1900000.00"));
        completed.setCompletedOn(LocalDate.of(2026, 3, 15));
        workRepository.saveAndFlush(completed);
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

    // --- access control -------------------------------------------------

    @Test
    void listRequiresAuthentication() {
        assertThat(rest.getForEntity("/api/works", String.class).getStatusCode())
                .isEqualTo(HttpStatus.UNAUTHORIZED);
    }

    @Test
    void citizenIsForbiddenFromTheAuthorityWorkApis() {
        ResponseEntity<String> response = rest.exchange(
                "/api/works", HttpMethod.GET, as("citizen"), String.class);
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.FORBIDDEN);
    }

    // --- list / detail ------------------------------------------------

    @Test
    void authorityListsWorksWithTheFullShape() {
        ResponseEntity<WorkResponse[]> response = rest.exchange(
                "/api/works", HttpMethod.GET, as("mospi"), WorkResponse[].class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        WorkResponse row = Arrays.stream(response.getBody())
                .filter(w -> w.sourceWorkId() == WITH_PAYMENTS)
                .findFirst().orElseThrow();

        assertThat(row.state()).isEqualTo("Kerala");
        assertThat(row.estimatedCost().amount()).isEqualByComparingTo("2500000.00");
        assertThat(row.estimatedCost().currency()).isEqualTo("INR");
        assertThat(row.dataQualityFlags()).containsExactly("HI_FIELDS_MIRROR_EN");
        assertThat(row.paymentDataState()).isEqualTo(PaymentDataState.FETCHED_PRESENT);
        assertThat(row.recordedPayments().amount()).isEqualByComparingTo("1200000.00");
        assertThat(row.lifecycleState()).isEqualTo(LifecycleState.RECOMMENDED);
    }

    @Test
    void recordedPaymentsIsNullWhenPaymentDataStateIsNotPresent() {
        WorkResponse row = rest.exchange("/api/works/" + NO_PAYMENTS, HttpMethod.GET,
                as("auditor"), WorkResponse.class).getBody();

        assertThat(row).isNotNull();
        assertThat(row.recordedPayments()).isNull();
        assertThat(row.finalCost()).isNull();
    }

    @Test
    void getByUnknownSourceWorkIdIs404() {
        assertThat(rest.exchange("/api/works/" + UNKNOWN, HttpMethod.GET, as("mospi"), String.class)
                .getStatusCode()).isEqualTo(HttpStatus.NOT_FOUND);
    }

    // --- payments ---------------------------------------------------

    @Test
    void paymentsReturnsInstallmentsInOrder() {
        ResponseEntity<WorkPaymentResponse[]> response = rest.exchange(
                "/api/works/" + WITH_PAYMENTS + "/payments", HttpMethod.GET,
                as("mospi"), WorkPaymentResponse[].class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).hasSize(2);
        assertThat(response.getBody()[0].ordinal()).isEqualTo(0);
        assertThat(response.getBody()[0].amount().amount()).isEqualByComparingTo("700000.00");
        assertThat(response.getBody()[0].vendorName()).isEqualTo("Vendor A");
        assertThat(response.getBody()[1].ordinal()).isEqualTo(1);
    }

    @Test
    void paymentsIsAnEmptyArrayForAKnownWorkWithNoPaymentRows() {
        ResponseEntity<WorkPaymentResponse[]> response = rest.exchange(
                "/api/works/" + NO_PAYMENTS + "/payments", HttpMethod.GET,
                as("mospi"), WorkPaymentResponse[].class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).isEmpty();
    }

    @Test
    void paymentsForAnUnknownWorkIs404() {
        assertThat(rest.exchange("/api/works/" + UNKNOWN + "/payments", HttpMethod.GET,
                as("mospi"), String.class).getStatusCode()).isEqualTo(HttpStatus.NOT_FOUND);
    }

    // --- summary --------------------------------------------------

    @Test
    void summaryHasEveryEnumKeyAndMatchesTheRowCount() {
        WorkSummaryResponse summary = rest.exchange("/api/works/summary", HttpMethod.GET,
                as("state"), WorkSummaryResponse.class).getBody();

        assertThat(summary).isNotNull();
        assertThat(summary.totalProjects()).isEqualTo(workRepository.count());
        assertThat(summary.byLifecycleState().keySet())
                .containsExactlyInAnyOrder("RECOMMENDED", "COMPLETED", "RECOMMENDED_AND_COMPLETED");
        assertThat(summary.byPaymentDataState().keySet())
                .containsExactlyInAnyOrder("NOT_FETCHED", "FETCHED_PRESENT", "FETCHED_ABSENT", "FETCH_ERROR");
        assertThat(summary.byLifecycleState().get("RECOMMENDED")).isGreaterThanOrEqualTo(2L);
        assertThat(summary.totalEstimatedCost().currency()).isEqualTo("INR");
        assertThat(summary.totalEstimatedCost().amount()).isGreaterThan(BigDecimal.ZERO);
        assertThat(summary.totalRecordedPayments().amount())
                .isGreaterThanOrEqualTo(new BigDecimal("1200000.00"));
    }
}
