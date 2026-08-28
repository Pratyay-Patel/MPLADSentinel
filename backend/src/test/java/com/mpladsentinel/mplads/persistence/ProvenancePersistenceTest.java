package com.mpladsentinel.mplads.persistence;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.time.Instant;
import java.util.concurrent.atomic.AtomicLong;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.transaction.annotation.Transactional;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.mpladsentinel.mplads.domain.IngestionDeadLetter;
import com.mpladsentinel.mplads.domain.IngestionEndpoint;
import com.mpladsentinel.mplads.domain.IngestionRun;
import com.mpladsentinel.mplads.domain.IngestionRunStatus;
import com.mpladsentinel.mplads.domain.IngestionTrigger;
import com.mpladsentinel.mplads.domain.LifecycleState;
import com.mpladsentinel.mplads.domain.RawSourceRecord;
import com.mpladsentinel.mplads.domain.SourceName;
import com.mpladsentinel.mplads.domain.Work;
import com.mpladsentinel.mplads.repository.IngestionDeadLetterRepository;
import com.mpladsentinel.mplads.repository.IngestionRunRepository;
import com.mpladsentinel.mplads.repository.RawSourceRecordRepository;
import com.mpladsentinel.mplads.repository.WorkRepository;
import com.mpladsentinel.support.AbstractPostgresIntegrationTest;

import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;

@SpringBootTest
@Transactional
class ProvenancePersistenceTest extends AbstractPostgresIntegrationTest {

    private static final AtomicLong SEQ = new AtomicLong(3_000_000_000L);
    private static final ObjectMapper JSON = new ObjectMapper();

    @Autowired
    private IngestionRunRepository ingestionRunRepository;
    @Autowired
    private RawSourceRecordRepository rawSourceRecordRepository;
    @Autowired
    private IngestionDeadLetterRepository deadLetterRepository;
    @Autowired
    private WorkRepository workRepository;
    @PersistenceContext
    private EntityManager em;

    private IngestionRun newRun(IngestionEndpoint endpoint) {
        return ingestionRunRepository.save(new IngestionRun(
                SourceName.EMPOWERED_INDIAN, endpoint,
                "https://api.empoweredindian.in/api", IngestionTrigger.MANUAL,
                IngestionRunStatus.RUNNING));
    }

    @Test
    void rawSourceRecordStoresAndReturnsJsonPayload() throws Exception {
        IngestionRun run = newRun(IngestionEndpoint.WORKS_RECOMMENDED);
        long swid = SEQ.incrementAndGet();
        String payload = "{\"workId\":" + swid + ",\"work_description\":\"x\",\"hasPayments\":false}";

        RawSourceRecord rec = new RawSourceRecord(
                SourceName.EMPOWERED_INDIAN, IngestionEndpoint.WORKS_RECOMMENDED,
                payload, "fp-" + swid, Instant.now(), run);
        rec.setSourceWorkId(swid);
        rec.setHttpStatus((short) 200);
        Long id = rawSourceRecordRepository.saveAndFlush(rec).getId();
        em.clear();

        RawSourceRecord read = rawSourceRecordRepository.findById(id).orElseThrow();
        JsonNode node = JSON.readTree(read.getPayload());
        assertThat(node.get("workId").asLong()).isEqualTo(swid);
        assertThat(node.get("hasPayments").asBoolean()).isFalse();
        assertThat(read.getSourceName()).isEqualTo(SourceName.EMPOWERED_INDIAN);
        assertThat(read.getHttpStatus()).isEqualTo((short) 200);
    }

    @Test
    void rawSourceRecordNaturalKeyIsUnique() {
        IngestionRun run = newRun(IngestionEndpoint.WORKS_RECOMMENDED);
        long swid = SEQ.incrementAndGet();

        RawSourceRecord first = new RawSourceRecord(
                SourceName.EMPOWERED_INDIAN, IngestionEndpoint.WORKS_RECOMMENDED,
                "{\"a\":1}", "fp-a", Instant.now(), run);
        first.setSourceWorkId(swid);
        rawSourceRecordRepository.saveAndFlush(first);

        RawSourceRecord dup = new RawSourceRecord(
                SourceName.EMPOWERED_INDIAN, IngestionEndpoint.WORKS_RECOMMENDED,
                "{\"a\":2}", "fp-b", Instant.now(), run);
        dup.setSourceWorkId(swid);

        assertThatThrownBy(() -> rawSourceRecordRepository.saveAndFlush(dup))
                .isInstanceOf(DataIntegrityViolationException.class);
    }

    @Test
    void deadLetterRecordPersists() {
        IngestionRun run = newRun(IngestionEndpoint.WORKS_COMPLETED);
        IngestionDeadLetter dl = new IngestionDeadLetter(
                run, IngestionEndpoint.WORKS_COMPLETED,
                "{\"work_id\":null}", "MISSING_SOURCE_WORK_ID");
        dl.setErrorDetail("work_id was null");
        Long id = deadLetterRepository.saveAndFlush(dl).getId();
        em.clear();

        IngestionDeadLetter read = deadLetterRepository.findById(id).orElseThrow();
        assertThat(read.getEndpoint()).isEqualTo(IngestionEndpoint.WORKS_COMPLETED);
        assertThat(read.getErrorType()).isEqualTo("MISSING_SOURCE_WORK_ID");
        assertThat(read.getRawPayload()).contains("work_id");
        assertThat(read.getCreatedAt()).isNotNull();
    }

    @Test
    void workRetainsProvenanceBackToASecondarySourceRun() {
        IngestionRun run = newRun(IngestionEndpoint.WORKS_RECOMMENDED);
        Work work = workRepository.saveAndFlush(new Work(
                SourceName.EMPOWERED_INDIAN, SEQ.incrementAndGet(),
                LifecycleState.RECOMMENDED, true, false, run));
        Long id = work.getId();
        em.clear();

        Work read = workRepository.findById(id).orElseThrow();
        IngestionRun provenance = read.getLastIngestionRun();
        assertThat(provenance.getSourceName()).isEqualTo(SourceName.EMPOWERED_INDIAN);
        assertThat(provenance.getEndpoint()).isEqualTo(IngestionEndpoint.WORKS_RECOMMENDED);
        assertThat(provenance.getApiBaseUrl()).contains("empoweredindian.in");
        assertThat(read.getFirstIngestedAt()).isNotNull();
        assertThat(read.getLastIngestedAt()).isNotNull();
    }
}
