package com.mpladsentinel.mplads.persistence;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;

import java.util.Arrays;
import java.util.List;

import org.flywaydb.core.Flyway;
import org.flywaydb.core.api.MigrationInfo;
import org.flywaydb.core.api.MigrationState;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;

import com.mpladsentinel.support.AbstractPostgresIntegrationTest;

/**
 * Verifies the Flyway migrations execute cleanly against a fresh PostgreSQL and
 * produce the expected data-layer objects.
 */
@SpringBootTest
class FlywayMigrationTest extends AbstractPostgresIntegrationTest {

    @Autowired
    private Flyway flyway;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @Test
    void allMigrationsAppliedSuccessfully() {
        List<String> applied = Arrays.stream(flyway.info().applied())
                .map(MigrationInfo::getVersion)
                .map(Object::toString)
                .toList();

        assertThat(applied).containsExactly("1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12", "13");
        assertThat(flyway.info().current().getState()).isEqualTo(MigrationState.SUCCESS);
    }

    @Test
    void flywayValidatePasses() {
        assertThatCode(() -> flyway.validate()).doesNotThrowAnyException();
    }

    @Test
    void coreTablesExist() {
        assertThat(tableExists("ingestion_run")).isTrue();
        assertThat(tableExists("raw_source_record")).isTrue();
        assertThat(tableExists("ingestion_dead_letter")).isTrue();
        assertThat(tableExists("work")).isTrue();
        assertThat(tableExists("work_payment")).isTrue();
        assertThat(tableExists("app_user")).isTrue();
        assertThat(tableExists("grievance")).isTrue();
        assertThat(tableExists("notification")).isTrue();
        assertThat(tableExists("work_recommendation")).isTrue();
    }

    @Test
    void appUserHasTheEmailColumnFromV7() {
        assertThat(columnExists("app_user", "email")).isTrue();
    }

    @Test
    void inspectionAssignmentObjectsFromV8Exist() {
        assertThat(columnExists("app_user", "officer_code")).isTrue();
        assertThat(columnExists("app_user", "phone")).isTrue();
        assertThat(tableExists("inspection_assignment")).isTrue();
        assertThat(constraintExists("ck_inspection_assignment_status")).isTrue();
        assertThat(constraintExists("uq_app_user_officer_code")).isTrue();
    }

    @Test
    void requiredPhotosColumnFromV9Exists() {
        assertThat(columnExists("inspection_assignment", "required_photos")).isTrue();
        assertThat(constraintExists("ck_inspection_assignment_required_photos")).isTrue();
    }

    @Test
    void dualSignOffColumnsFromV10Exist() {
        assertThat(columnExists("inspection_assignment", "pending_status")).isTrue();
        assertThat(columnExists("inspection_assignment", "pending_requested_by_user_id")).isTrue();
        assertThat(columnExists("inspection_assignment", "pending_justification")).isTrue();
        assertThat(columnExists("inspection_assignment", "pending_requested_at")).isTrue();
        assertThat(constraintExists("ck_inspection_assignment_pending_status")).isTrue();
        assertThat(constraintExists("ck_inspection_assignment_pending_consistent")).isTrue();
    }

    @Test
    void notificationTableFromV11Exists() {
        assertThat(tableExists("notification")).isTrue();
        assertThat(columnExists("notification", "recipient_user_id")).isTrue();
        assertThat(columnExists("notification", "category")).isTrue();
        assertThat(columnExists("notification", "source_work_id")).isTrue();
        assertThat(columnExists("notification", "is_read")).isTrue();
        assertThat(columnExists("notification", "dismissed")).isTrue();
        assertThat(constraintExists("ck_notification_category")).isTrue();
    }

    @Test
    void workRecommendationTableFromV12Exists() {
        assertThat(tableExists("work_recommendation")).isTrue();
        assertThat(columnExists("work_recommendation", "gps_coordinates_link")).isTrue();
        assertThat(columnExists("work_recommendation", "tracking_number")).isTrue();
        assertThat(columnExists("work_recommendation", "location_category")).isTrue();
        assertThat(constraintExists("uq_work_recommendation_tracking_number")).isTrue();
        assertThat(constraintExists("ck_work_recommendation_category")).isTrue();
        assertThat(constraintExists("ck_work_recommendation_status")).isTrue();
    }

    @Test
    void fundRequestTablesFromV13Exist() {
        assertThat(tableExists("fund_request")).isTrue();
        assertThat(columnExists("fund_request", "requested_by_user_id")).isTrue();
        assertThat(columnExists("fund_request", "requested_amount")).isTrue();
        assertThat(columnExists("fund_request", "status")).isTrue();
        assertThat(columnExists("fund_request", "release_notice_sent")).isTrue();
        assertThat(constraintExists("ck_fund_request_status")).isTrue();
        assertThat(constraintExists("ck_fund_request_release_notice_only_approved")).isTrue();
        assertThat(tableExists("fund_request_event")).isTrue();
        assertThat(columnExists("fund_request_event", "event_type")).isTrue();
        assertThat(constraintExists("ck_fund_request_event_type")).isTrue();
    }

    @Test
    void speculativeColumnsAreAbsentFromWork() {
        // No accessible source provides these at work level (docs/data-source.md s.14).
        assertThat(columnExists("work", "sanctioned_amount")).isFalse();
        assertThat(columnExists("work", "sanction_number")).isFalse();
        assertThat(columnExists("work", "sanction_date")).isFalse();
        assertThat(columnExists("work", "physical_progress_pct")).isFalse();
    }

    @Test
    void workNaturalKeyAndCoreConstraintsExist() {
        assertThat(constraintExists("uq_work_source_natural")).isTrue();
        assertThat(constraintExists("ck_work_lifecycle_state")).isTrue();
        assertThat(constraintExists("ck_work_payment_data_state")).isTrue();
        assertThat(constraintExists("ck_work_seen_somewhere")).isTrue();
        assertThat(constraintExists("uq_work_payment_natural")).isTrue();
    }

    private boolean tableExists(String table) {
        Integer count = jdbcTemplate.queryForObject(
                "select count(*) from information_schema.tables "
                        + "where table_schema = 'public' and table_name = ?",
                Integer.class, table);
        return count != null && count > 0;
    }

    private boolean columnExists(String table, String column) {
        Integer count = jdbcTemplate.queryForObject(
                "select count(*) from information_schema.columns "
                        + "where table_schema = 'public' and table_name = ? and column_name = ?",
                Integer.class, table, column);
        return count != null && count > 0;
    }

    private boolean constraintExists(String constraint) {
        Integer count = jdbcTemplate.queryForObject(
                "select count(*) from information_schema.table_constraints "
                        + "where constraint_schema = 'public' and constraint_name = ?",
                Integer.class, constraint);
        return count != null && count > 0;
    }
}
