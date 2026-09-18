package com.mpladsentinel.notification;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import com.mpladsentinel.auth.AppUser;
import com.mpladsentinel.auth.AppUserRepository;
import com.mpladsentinel.auth.WebRole;
import com.mpladsentinel.mplads.domain.LifecycleState;
import com.mpladsentinel.mplads.domain.SourceName;
import com.mpladsentinel.mplads.domain.Work;
import com.mpladsentinel.mplads.repository.WorkRepository;
import com.mpladsentinel.mplads.risk.RiskAssessment;
import com.mpladsentinel.mplads.risk.RiskEngine;
import com.mpladsentinel.mplads.risk.RiskLevel;

/**
 * Unit tests for {@link NotificationService} against mocked collaborators —
 * deterministic and independent of what other test classes leave in the
 * shared Postgres instance (unlike a full HTTP integration test, which would
 * see every work every other test class has ever created). The RBAC /
 * persistence wiring itself is covered by {@link NotificationControllerTest}.
 */
@ExtendWith(MockitoExtension.class)
class NotificationServiceTest {

    @Mock
    private NotificationRepository notifications;
    @Mock
    private AppUserRepository users;
    @Mock
    private WorkRepository works;
    @Mock
    private RiskEngine riskEngine;

    private NotificationService service;

    private NotificationService service() {
        return new NotificationService(notifications, users, works, riskEngine);
    }

    private static RiskAssessment risk(long sourceWorkId, RiskLevel level, int score) {
        return new RiskAssessment(sourceWorkId, level, score, List.of("Some reason"), Instant.now());
    }

    // --- high-risk bootstrap ---------------------------------------------

    @Test
    void seedsOnlyHighRiskWorksCappedAtTheLimitWhenTheRecipientHasNoneYet() {
        service = service();
        when(notifications.countByRecipientUserIdAndCategory(9L, NotificationCategory.HIGH_RISK_WORK))
                .thenReturn(0L);
        // 6 HIGH + a MEDIUM and a LOW that must be ignored; the cap is 5.
        List<RiskAssessment> assessments = new ArrayList<>();
        for (long id = 1; id <= 6; id++) {
            assessments.add(risk(id, RiskLevel.HIGH, 60));
        }
        assessments.add(risk(100, RiskLevel.MEDIUM, 30));
        assessments.add(risk(101, RiskLevel.LOW, 5));
        when(riskEngine.assessAll()).thenReturn(assessments);
        when(works.findBySourceWorkIdIn(any())).thenReturn(List.of());
        when(notifications.findByRecipientUserIdAndDismissedFalseOrderByCreatedAtDesc(9L))
                .thenReturn(List.of());

        service.listFor(9L, WebRole.MOSPI);

        ArgumentCaptor<Notification> saved = ArgumentCaptor.forClass(Notification.class);
        verify(notifications, times(NotificationService.MAX_SEEDED_HIGH_RISK_ALERTS)).save(saved.capture());
        assertThat(saved.getAllValues())
                .allSatisfy(n -> assertThat(n.getCategory()).isEqualTo(NotificationCategory.HIGH_RISK_WORK))
                .allSatisfy(n -> assertThat(n.getRecipientUserId()).isEqualTo(9L));
    }

    @Test
    void fallsBackToAGenericTitleWhenTheWorkRowIsNotFound() {
        service = service();
        when(notifications.countByRecipientUserIdAndCategory(9L, NotificationCategory.HIGH_RISK_WORK))
                .thenReturn(0L);
        when(riskEngine.assessAll()).thenReturn(List.of(risk(555L, RiskLevel.HIGH, 60)));
        when(works.findBySourceWorkIdIn(any())).thenReturn(List.of());
        when(notifications.findByRecipientUserIdAndDismissedFalseOrderByCreatedAtDesc(9L))
                .thenReturn(List.of());

        service.listFor(9L, WebRole.MOSPI);

        ArgumentCaptor<Notification> saved = ArgumentCaptor.forClass(Notification.class);
        verify(notifications).save(saved.capture());
        assertThat(saved.getValue().getTitle()).contains("Work #555");
    }

    @Test
    void doesNotReseedOnceTheRecipientAlreadyHasAHighRiskAlert() {
        service = service();
        when(notifications.countByRecipientUserIdAndCategory(9L, NotificationCategory.HIGH_RISK_WORK))
                .thenReturn(1L);
        when(notifications.findByRecipientUserIdAndDismissedFalseOrderByCreatedAtDesc(9L))
                .thenReturn(List.of());

        service.listFor(9L, WebRole.MOSPI);

        verifyNoInteractions(riskEngine);
        verify(notifications, never()).save(any());
    }

    @Test
    void neverSeedsHighRiskAlertsForACitizenOrFieldOfficer() {
        service = service();
        when(notifications.findByRecipientUserIdAndDismissedFalseOrderByCreatedAtDesc(9L))
                .thenReturn(List.of());

        service.listFor(9L, WebRole.CITIZEN);
        service.listFor(9L, WebRole.FIELD_OFFICER);

        verifyNoInteractions(riskEngine);
        verify(notifications, never()).countByRecipientUserIdAndCategory(any(), any());
        verify(notifications, never()).save(any());
    }

    // --- send notice -------------------------------------------------

    @Test
    void sendSlaNoticeAddressesTheSeededDistrictAccount() {
        service = service();
        Work work = new Work(SourceName.EMPOWERED_INDIAN, 42L, LifecycleState.RECOMMENDED, true, false, null);
        work.setWorkDescription("Test work");
        AppUser district = new AppUser("district", "hash", WebRole.DISTRICT, "District Authority");
        setId(district, 77L);

        when(works.findFirstBySourceWorkIdOrderByIdAsc(42L)).thenReturn(Optional.of(work));
        when(users.findByRoleOrderByOfficerCodeAsc(WebRole.DISTRICT)).thenReturn(List.of(district));
        when(notifications.save(any())).thenAnswer(inv -> inv.getArgument(0));

        NotificationResponse response = service.sendSlaNotice(new SendNoticeRequest(42L));

        assertThat(response.category()).isEqualTo(NotificationCategory.SLA_NOTICE);
        assertThat(response.sourceWorkId()).isEqualTo(42L);
        ArgumentCaptor<Notification> saved = ArgumentCaptor.forClass(Notification.class);
        verify(notifications).save(saved.capture());
        assertThat(saved.getValue().getRecipientUserId()).isEqualTo(77L);
    }

    @Test
    void sendSlaNoticeRejectsAnUnknownWork() {
        service = service();
        when(works.findFirstBySourceWorkIdOrderByIdAsc(999L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.sendSlaNotice(new SendNoticeRequest(999L)))
                .isInstanceOf(IllegalArgumentException.class);
        verifyNoInteractions(users);
    }

    // --- mark read / mark all read / clear -----------------------------

    @Test
    void markReadIgnoresANotificationThatBelongsToSomeoneElse() {
        service = service();
        Notification n = new Notification(5L, NotificationCategory.SLA_NOTICE, "t", "m", null);
        when(notifications.findById(1L)).thenReturn(Optional.of(n));

        Optional<NotificationResponse> result = service.markRead(1L, 999L);

        assertThat(result).isEmpty();
        verify(notifications, never()).save(any());
    }

    @Test
    void markReadUpdatesTheOwnersNotification() {
        service = service();
        Notification n = new Notification(5L, NotificationCategory.SLA_NOTICE, "t", "m", null);
        when(notifications.findById(1L)).thenReturn(Optional.of(n));
        when(notifications.save(eq(n))).thenReturn(n);

        Optional<NotificationResponse> result = service.markRead(1L, 5L);

        assertThat(result).isPresent();
        assertThat(result.get().read()).isTrue();
    }

    @Test
    void markAllReadMarksEveryUnreadOneOfTheRecipient() {
        service = service();
        Notification a = new Notification(5L, NotificationCategory.SLA_NOTICE, "a", "m", null);
        Notification b = new Notification(5L, NotificationCategory.HIGH_RISK_WORK, "b", "m", null);
        when(notifications.findByRecipientUserIdAndReadFalseAndDismissedFalse(5L)).thenReturn(List.of(a, b));

        service.markAllRead(5L);

        assertThat(a.isRead()).isTrue();
        assertThat(b.isRead()).isTrue();
        verify(notifications).saveAll(List.of(a, b));
    }

    @Test
    void clearAllDismissesRatherThanDeletes() {
        service = service();
        Notification a = new Notification(5L, NotificationCategory.SLA_NOTICE, "a", "m", null);
        when(notifications.findByRecipientUserIdAndDismissedFalseOrderByCreatedAtDesc(5L))
                .thenReturn(List.of(a));

        service.clearAll(5L);

        assertThat(a.isDismissed()).isTrue();
        verify(notifications).saveAll(List.of(a));
    }

    private static void setId(AppUser user, long id) {
        try {
            var field = AppUser.class.getDeclaredField("id");
            field.setAccessible(true);
            field.set(user, id);
        } catch (ReflectiveOperationException e) {
            throw new RuntimeException(e);
        }
    }
}
