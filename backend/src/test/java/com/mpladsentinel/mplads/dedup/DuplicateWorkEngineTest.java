package com.mpladsentinel.mplads.dedup;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.math.BigDecimal;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneId;
import java.time.ZoneOffset;
import java.util.List;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import com.mpladsentinel.mplads.domain.LifecycleState;
import com.mpladsentinel.mplads.domain.SourceName;
import com.mpladsentinel.mplads.domain.Work;
import com.mpladsentinel.mplads.repository.WorkRepository;

/**
 * Unit tests for {@link DuplicateWorkEngine} + {@link DuplicateRuleSet} (F7,
 * decision D35): grouping boundaries, each signal individually, combined
 * scoring, and that missing location/category data is skipped rather than
 * throwing.
 */
@ExtendWith(MockitoExtension.class)
class DuplicateWorkEngineTest {

    @Mock
    private WorkRepository works;
    private DuplicateWorkEngine engine;

    @BeforeEach
    void setUp() {
        engine = new DuplicateWorkEngine(works, new DuplicateRuleSet());
    }

    private static Work work(long id) {
        return new Work(SourceName.EMPOWERED_INDIAN, id, LifecycleState.RECOMMENDED, true, false, null);
    }

    private static Work locatedWork(long id, String state, String district, String category) {
        Work w = work(id);
        w.setState(state);
        w.setDistrict(district);
        w.setCategory(category);
        return w;
    }

    @Test
    void noPairsWhenGroupHasOnlyOneWork() {
        Work w = locatedWork(1, "Rajasthan", "Jaipur", "Roads");
        w.setWorkDescription("construction of community hall in gram panchayat area for public use");

        when(works.findAll()).thenReturn(List.of(w));

        assertThat(engine.findAll()).isEmpty();
    }

    @Test
    void noPairWhenSameGroupButNoSignalFires() {
        Work a = locatedWork(1, "Rajasthan", "Jaipur", "Roads");
        a.setWorkDescription("solar panel installation on school rooftop premises");
        a.setEstimatedCost(new BigDecimal("1000000"));

        Work b = locatedWork(2, "Rajasthan", "Jaipur", "Roads");
        b.setWorkDescription("renovation of ancient temple boundary wall structure");
        b.setEstimatedCost(new BigDecimal("5000000"));

        when(works.findAll()).thenReturn(List.of(a, b));

        assertThat(engine.findAll()).isEmpty();
    }

    @Test
    void flagsNearIdenticalDescriptionsAsHighConfidence() {
        Work a = locatedWork(1, "Rajasthan", "Jaipur", "Roads");
        a.setWorkDescription("construction of community hall in gram panchayat area for public use");

        Work b = locatedWork(2, "Rajasthan", "Jaipur", "Roads");
        b.setWorkDescription("construction of community hall in gram panchayat area for general use");

        when(works.findAll()).thenReturn(List.of(a, b));

        List<DuplicatePair> pairs = engine.findAll();
        assertThat(pairs).hasSize(1);
        DuplicatePair pair = pairs.get(0);
        assertThat(pair.confidence()).isEqualTo(DuplicateConfidence.HIGH);
        assertThat(pair.reasons()).anyMatch(r -> r.contains("similar"));
        assertThat(pair.workA().sourceWorkId()).isEqualTo(1);
        assertThat(pair.workB().sourceWorkId()).isEqualTo(2);
    }

    @Test
    void flagsOverlappingCostsAsMediumConfidenceWhenDescriptionsDiffer() {
        Work a = locatedWork(1, "Rajasthan", "Jaipur", "Roads");
        a.setWorkDescription("solar panel installation on school rooftop premises");
        a.setEstimatedCost(new BigDecimal("1000000"));

        Work b = locatedWork(2, "Rajasthan", "Jaipur", "Roads");
        b.setWorkDescription("renovation of ancient temple boundary wall structure");
        b.setEstimatedCost(new BigDecimal("920000")); // 8% apart

        when(works.findAll()).thenReturn(List.of(a, b));

        List<DuplicatePair> pairs = engine.findAll();
        assertThat(pairs).hasSize(1);
        assertThat(pairs.get(0).confidence()).isEqualTo(DuplicateConfidence.MEDIUM);
        assertThat(pairs.get(0).reasons()).anyMatch(r -> r.contains("within 8% of each other"));
    }

    @Test
    void doesNotCompareWorksInDifferentDistricts() {
        Work a = locatedWork(1, "Rajasthan", "Jaipur", "Roads");
        a.setWorkDescription("construction of community hall in gram panchayat area for public use");

        Work b = locatedWork(2, "Rajasthan", "Jodhpur", "Roads"); // different district
        b.setWorkDescription("construction of community hall in gram panchayat area for public use");

        when(works.findAll()).thenReturn(List.of(a, b));

        assertThat(engine.findAll()).isEmpty();
    }

    @Test
    void skipsWorksMissingLocationOrCategoryInsteadOfThrowing() {
        Work a = work(1); // no state/district/category set
        a.setWorkDescription("construction of community hall in gram panchayat area for public use");
        Work b = locatedWork(2, "Rajasthan", "Jaipur", "Roads");
        b.setWorkDescription("construction of community hall in gram panchayat area for public use");

        when(works.findAll()).thenReturn(List.of(a, b));

        assertThat(engine.findAll()).isEmpty();
    }

    @Test
    void combinedSignalsSumWeightsAndStayHighConfidence() {
        Work a = locatedWork(1, "Rajasthan", "Jaipur", "Roads");
        a.setWorkDescription("construction of community hall in gram panchayat area for public use");
        a.setEstimatedCost(new BigDecimal("1000000"));

        Work b = locatedWork(2, "Rajasthan", "Jaipur", "Roads");
        b.setWorkDescription("construction of community hall in gram panchayat area for general use");
        b.setEstimatedCost(new BigDecimal("950000")); // 5% apart

        when(works.findAll()).thenReturn(List.of(a, b));

        DuplicatePair pair = engine.findAll().get(0);
        assertThat(pair.score()).isEqualTo(90); // 60 (text) + 30 (cost)
        assertThat(pair.confidence()).isEqualTo(DuplicateConfidence.HIGH);
        assertThat(pair.reasons()).hasSize(2);
    }

    // --- caching (latency fix) ------------------------------------------

    @Test
    void servesTheSecondCallFromCacheWithinTheTtl() {
        when(works.findAll()).thenReturn(matchingPair());
        TestClock clock = new TestClock(Instant.parse("2026-01-01T00:00:00Z"));
        DuplicateWorkEngine cachingEngine = new DuplicateWorkEngine(works, new DuplicateRuleSet(), clock);

        List<DuplicatePair> first = cachingEngine.findAll();
        clock.advance(Duration.ofMinutes(5)); // still within the 10-minute TTL
        List<DuplicatePair> second = cachingEngine.findAll();

        assertThat(second).isSameAs(first);
        verify(works, times(1)).findAll();
    }

    @Test
    void recomputesOnceTheTtlHasElapsed() {
        when(works.findAll()).thenReturn(matchingPair());
        TestClock clock = new TestClock(Instant.parse("2026-01-01T00:00:00Z"));
        DuplicateWorkEngine cachingEngine = new DuplicateWorkEngine(works, new DuplicateRuleSet(), clock);

        cachingEngine.findAll();
        clock.advance(Duration.ofMinutes(11)); // past the 10-minute TTL
        cachingEngine.findAll();

        verify(works, times(2)).findAll();
    }

    private static List<Work> matchingPair() {
        Work a = locatedWork(1, "Rajasthan", "Jaipur", "Roads");
        a.setWorkDescription("construction of community hall in gram panchayat area for public use");
        Work b = locatedWork(2, "Rajasthan", "Jaipur", "Roads");
        b.setWorkDescription("construction of community hall in gram panchayat area for general use");
        return List.of(a, b);
    }

    /** A {@link Clock} test double whose {@link #instant()} can be advanced on demand. */
    private static final class TestClock extends Clock {
        private Instant now;

        TestClock(Instant now) {
            this.now = now;
        }

        void advance(Duration amount) {
            now = now.plus(amount);
        }

        @Override
        public ZoneId getZone() {
            return ZoneOffset.UTC;
        }

        @Override
        public Clock withZone(ZoneId zone) {
            return this;
        }

        @Override
        public Instant instant() {
            return now;
        }
    }
}
