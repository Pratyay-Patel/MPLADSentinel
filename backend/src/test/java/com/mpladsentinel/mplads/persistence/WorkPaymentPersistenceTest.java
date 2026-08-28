package com.mpladsentinel.mplads.persistence;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.concurrent.atomic.AtomicLong;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.transaction.annotation.Transactional;

import com.mpladsentinel.mplads.domain.IngestionEndpoint;
import com.mpladsentinel.mplads.domain.IngestionRun;
import com.mpladsentinel.mplads.domain.IngestionRunStatus;
import com.mpladsentinel.mplads.domain.IngestionTrigger;
import com.mpladsentinel.mplads.domain.LifecycleState;
import com.mpladsentinel.mplads.domain.PaymentDataState;
import com.mpladsentinel.mplads.domain.PaymentStatus;
import com.mpladsentinel.mplads.domain.SourceName;
import com.mpladsentinel.mplads.domain.Work;
import com.mpladsentinel.mplads.domain.WorkPayment;
import com.mpladsentinel.mplads.repository.IngestionRunRepository;
import com.mpladsentinel.mplads.repository.WorkPaymentRepository;
import com.mpladsentinel.mplads.repository.WorkRepository;
import com.mpladsentinel.support.AbstractPostgresIntegrationTest;

import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;

@SpringBootTest
@Transactional
class WorkPaymentPersistenceTest extends AbstractPostgresIntegrationTest {

    private static final AtomicLong SEQ = new AtomicLong(2_000_000_000L);

    @Autowired
    private WorkRepository workRepository;
    @Autowired
    private WorkPaymentRepository workPaymentRepository;
    @Autowired
    private IngestionRunRepository ingestionRunRepository;
    @PersistenceContext
    private EntityManager em;

    private IngestionRun run;

    private IngestionRun run() {
        if (run == null) {
            run = ingestionRunRepository.save(new IngestionRun(
                    SourceName.EMPOWERED_INDIAN, IngestionEndpoint.WORK_PAYMENTS,
                    "https://api.empoweredindian.in/api", IngestionTrigger.MANUAL,
                    IngestionRunStatus.RUNNING));
        }
        return run;
    }

    private Work savedWork() {
        return workRepository.saveAndFlush(new Work(
                SourceName.EMPOWERED_INDIAN, SEQ.incrementAndGet(),
                LifecycleState.RECOMMENDED, true, false, run()));
    }

    private WorkPayment payment(Work work, String amount, short ordinal, String fingerprint) {
        WorkPayment p = new WorkPayment(work, new BigDecimal(amount), fingerprint, run());
        p.setSourceOrdinal(ordinal);
        return p;
    }

    @Test
    void workCanHaveZeroPaymentsWithoutImplyingZeroExpenditure() {
        Work work = savedWork(); // payment_data_state defaults to NOT_FETCHED
        em.clear();

        assertThat(workPaymentRepository.countByWorkId(work.getId())).isZero();
        assertThat(workPaymentRepository.findByWorkIdOrderBySourceOrdinalAsc(work.getId())).isEmpty();

        Work reread = workRepository.findById(work.getId()).orElseThrow();
        assertThat(reread.getPaymentDataState()).isEqualTo(PaymentDataState.NOT_FETCHED);
        assertThat(reread.getPaymentTotalPaid()).isNull();
    }

    @Test
    void workCanHaveExactlyOnePayment() {
        Work work = savedWork();
        WorkPayment p = payment(work, "1350689.00", (short) 0, "fp-single");
        p.setPaidOn(LocalDate.of(2026, 8, 5));
        p.setStatusRaw("Payment Success");
        p.setStatus(PaymentStatus.SUCCESS);
        p.setVendorName("Sulata Baroi");
        p.setVendorNameNormalized("SULATA BAROI");
        p.setImplementingAuthorityText("NORTH AND MIDDLE ANDAMAN(Implementing District Authority(N&MA))");
        workPaymentRepository.saveAndFlush(p);

        work.setPaymentDataState(PaymentDataState.FETCHED_PRESENT);
        work.setPaymentTotalPaid(new BigDecimal("1350689.00"));
        work.setPaymentInstallments(1);
        workRepository.saveAndFlush(work);
        em.clear();

        List<WorkPayment> read = workPaymentRepository.findByWorkIdOrderBySourceOrdinalAsc(work.getId());
        assertThat(read).hasSize(1);
        WorkPayment only = read.get(0);
        assertThat(only.getAmount()).isEqualByComparingTo("1350689.00");
        assertThat(only.getCurrency()).isEqualTo("INR");
        assertThat(only.getPaidOn()).isEqualTo(LocalDate.of(2026, 8, 5));
        assertThat(only.getStatusRaw()).isEqualTo("Payment Success");
        assertThat(only.getStatus()).isEqualTo(PaymentStatus.SUCCESS);
        assertThat(only.getVendorName()).isEqualTo("Sulata Baroi");
        assertThat(only.getWork().getId()).isEqualTo(work.getId());

        assertThat(workRepository.findById(work.getId()).orElseThrow().getPaymentDataState())
                .isEqualTo(PaymentDataState.FETCHED_PRESENT);
    }

    @Test
    void workCanHaveManyPaymentsReturnedInOrder() {
        Work work = savedWork();
        workPaymentRepository.saveAndFlush(payment(work, "100.00", (short) 0, "fp-0"));
        workPaymentRepository.saveAndFlush(payment(work, "200.00", (short) 1, "fp-1"));
        workPaymentRepository.saveAndFlush(payment(work, "300.00", (short) 2, "fp-2"));
        em.clear();

        List<WorkPayment> read = workPaymentRepository.findByWorkIdOrderBySourceOrdinalAsc(work.getId());
        assertThat(read).extracting(WorkPayment::getAmount)
                .containsExactly(new BigDecimal("100.00"), new BigDecimal("200.00"), new BigDecimal("300.00"));
        assertThat(workPaymentRepository.countByWorkId(work.getId())).isEqualTo(3);
    }

    @Test
    void nullNormalisedStatusIsDistinctFromExplicitUnknown() {
        Work work = savedWork();

        WorkPayment rawOnly = payment(work, "10.00", (short) 0, "fp-null-status");
        rawOnly.setStatusRaw("Some Unmapped Status");
        rawOnly.setStatus(null); // not yet normalised

        WorkPayment explicitUnknown = payment(work, "20.00", (short) 1, "fp-unknown-status");
        explicitUnknown.setStatus(PaymentStatus.UNKNOWN);

        workPaymentRepository.saveAndFlush(rawOnly);
        workPaymentRepository.saveAndFlush(explicitUnknown);
        em.clear();

        List<WorkPayment> read = workPaymentRepository.findByWorkIdOrderBySourceOrdinalAsc(work.getId());
        assertThat(read.get(0).getStatus()).isNull();
        assertThat(read.get(0).getStatusRaw()).isEqualTo("Some Unmapped Status");
        assertThat(read.get(1).getStatus()).isEqualTo(PaymentStatus.UNKNOWN);
    }

    @Test
    void duplicatePaymentForSameWorkAndFingerprintIsRejected() {
        Work work = savedWork();
        workPaymentRepository.saveAndFlush(payment(work, "500.00", (short) 0, "fp-dup"));

        WorkPayment duplicate = payment(work, "500.00", (short) 0, "fp-dup");
        assertThatThrownBy(() -> workPaymentRepository.saveAndFlush(duplicate))
                .isInstanceOf(DataIntegrityViolationException.class);
    }

    @Test
    void negativePaymentAmountIsRejected() {
        Work work = savedWork();
        assertThatThrownBy(() ->
                workPaymentRepository.saveAndFlush(payment(work, "-0.01", (short) 0, "fp-neg")))
                .isInstanceOf(DataIntegrityViolationException.class);
    }

    @Test
    void deletingAWorkCascadesToItsPayments() {
        Work work = savedWork();
        Long workId = work.getId();
        workPaymentRepository.saveAndFlush(payment(work, "100.00", (short) 0, "fp-c0"));
        workPaymentRepository.saveAndFlush(payment(work, "200.00", (short) 1, "fp-c1"));
        em.flush();
        em.clear();
        assertThat(workPaymentRepository.countByWorkId(workId)).isEqualTo(2);

        workRepository.deleteById(workId);
        em.flush();
        em.clear();

        Number remaining = (Number) em.createNativeQuery(
                        "select count(*) from work_payment where work_id = :id")
                .setParameter("id", workId)
                .getSingleResult();
        assertThat(remaining.longValue()).isZero();
    }
}
