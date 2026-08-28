package com.mpladsentinel.mplads.source.empoweredindian;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Optional;

import org.junit.jupiter.api.Test;

import com.mpladsentinel.mplads.source.empoweredindian.dto.PaymentInstallmentDto;
import com.mpladsentinel.mplads.source.empoweredindian.dto.WorkPaymentsResponse;
import com.mpladsentinel.mplads.source.empoweredindian.error.EmpoweredIndianApiException;
import com.mpladsentinel.mplads.source.empoweredindian.error.EmpoweredIndianResponseException;

import okhttp3.mockwebserver.MockResponse;
import okhttp3.mockwebserver.RecordedRequest;

class WorkPaymentsClientTest extends AbstractEmpoweredIndianClientTest {

    @Test
    void mapsAVerifiedPaymentsResponse() throws InterruptedException {
        server.enqueue(new MockResponse()
                .setResponseCode(200)
                .setHeader("Content-Type", "application/json")
                .setBody(fixture("payments-present.json")));

        Optional<WorkPaymentsResponse> result = defaultClient().fetchWorkPayments(187_484L);

        RecordedRequest request = server.takeRequest();
        assertThat(request.getPath()).isEqualTo("/api/works/187484/payments");

        assertThat(result).isPresent();
        WorkPaymentsResponse payments = result.orElseThrow();
        assertThat(payments.workId()).isEqualTo(187_484L);
        assertThat(payments.summary().totalInstallments()).isEqualTo(1);
        assertThat(payments.summary().totalAmountPaid()).isEqualByComparingTo(new BigDecimal("1350689"));
        assertThat(payments.summary().successfulPayments()).isEqualTo(1);
        assertThat(payments.summary().pendingPayments()).isZero();
        assertThat(payments.summary().firstPaymentDate()).isEqualTo(LocalDate.of(2026, 8, 5));
        assertThat(payments.summary().lastPaymentDate()).isEqualTo(LocalDate.of(2026, 8, 5));

        assertThat(payments.allPayments()).hasSize(1);
        PaymentInstallmentDto installment = payments.allPayments().get(0);
        assertThat(installment.amount()).isEqualByComparingTo(new BigDecimal("1350689"));
        assertThat(installment.date()).isEqualTo(LocalDate.of(2026, 8, 5));
        assertThat(installment.status()).isEqualTo("Payment Success");
        assertThat(installment.vendor()).isEqualTo("Sulata Baroi");
        assertThat(installment.ida()).contains("NORTH AND MIDDLE ANDAMAN");

        // workDetails.description is the generic scheme string, NOT work_description
        assertThat(payments.workDetails().description())
                .isEqualTo("Construction of community centers and community halls");
    }

    @Test
    void a404NoPaymentRecordsBodyMeansUnknownNotZeroAndNotAnError() {
        // §13.4: this exact 404 body is returned both for a real work with no
        // payments AND for a workId that does not exist. It must NOT be read as
        // "zero paid" and must NOT surface as an error.
        server.enqueue(new MockResponse()
                .setResponseCode(404)
                .setHeader("Content-Type", "application/json")
                .setBody(fixture("payments-none-404.json")));

        Optional<WorkPaymentsResponse> result = defaultClient().fetchWorkPayments(1_845L);

        assertThat(result).isEmpty();
    }

    @Test
    void anUnexpected404RouteNotFoundBodyIsAnError() {
        server.enqueue(new MockResponse()
                .setResponseCode(404)
                .setHeader("Content-Type", "application/json")
                .setBody(fixture("route-not-found-404.json")));

        assertThatThrownBy(() -> defaultClient().fetchWorkPayments(260_540L))
                .isInstanceOf(EmpoweredIndianApiException.class)
                .satisfies(ex -> assertThat(((EmpoweredIndianApiException) ex).statusCode()).isEqualTo(404));
    }

    @Test
    void the500CastErrorForANonNumericIdSurfacesAsAnApiException() {
        // The client only ever sends a numeric id, but the endpoint's 500 shape
        // is verified (§13.4) and must map to a clean exception, not a crash.
        server.enqueue(new MockResponse()
                .setResponseCode(500)
                .setHeader("Content-Type", "application/json")
                .setBody(fixture("error-500-cast.json")));

        assertThatThrownBy(() -> clientWith(properties(
                java.time.Duration.ofSeconds(2), java.time.Duration.ofSeconds(2), 1, java.time.Duration.ofMillis(1)))
                .fetchWorkPayments(999L))
                .isInstanceOf(EmpoweredIndianApiException.class)
                .satisfies(ex -> assertThat(((EmpoweredIndianApiException) ex).statusCode()).isEqualTo(500));
    }

    @Test
    void aMalformedSuccessBodyIsAResponseException() {
        server.enqueue(new MockResponse()
                .setResponseCode(200)
                .setHeader("Content-Type", "application/json")
                .setBody("{ \"success\": true, \"data\": "));

        assertThatThrownBy(() -> defaultClient().fetchWorkPayments(187_484L))
                .isInstanceOf(EmpoweredIndianResponseException.class);
    }

    @Test
    void rejectsNonPositiveWorkId() {
        assertThatThrownBy(() -> defaultClient().fetchWorkPayments(0L))
                .isInstanceOf(IllegalArgumentException.class);
    }
}
