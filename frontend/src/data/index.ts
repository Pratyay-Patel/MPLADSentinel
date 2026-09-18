/**
 * Frontend data-access layer.
 *
 *   React screens
 *        ↓  feature service  (features/*, e.g. useProjectsService)
 *        ↓  DataProvider     (chosen from VITE_DATA_SOURCE)
 *        ↓
 *   DemoDataProvider  ──→ demo fixtures
 *   ApiDataProvider   ──→ src/api/client.ts ──→ Spring Boot REST API
 *
 * Screens import from here (or a feature module); they never import a concrete
 * provider, the demo fixtures, or `src/api/*` directly.
 */

export type {
  AppNotification,
  AssignmentInput,
  AssignmentPatch,
  AssignmentStatus,
  AuditEvidence,
  AuditPhoto,
  BackendHealth,
  DataSource,
  DuplicateConfidence,
  DuplicatePair,
  DuplicatePairsResult,
  DuplicateWorkSummary,
  FieldOfficer,
  FundRequest,
  FundRequestEvent,
  FundRequestEventType,
  FundRequestInput,
  FundRequestStatus,
  Grievance,
  GrievanceInput,
  GrievanceStatus,
  GrievanceStatusPatch,
  InspectionAssignment,
  LifecycleState,
  LocationCategory,
  Money,
  NotificationCategory,
  PaymentDataState,
  PaymentInstallment,
  Project,
  ProjectHouse,
  ProjectRisk,
  ProjectSummary,
  RecommendationStatus,
  RiskLevel,
  WorkRecommendation,
  WorkRecommendationInput,
  WorkRecommendationStatusPatch,
} from './types';

export type { DataProvider } from './DataProvider';
export type { AsyncState } from './asyncState';
export { ProviderError, type ProviderErrorKind } from './errors';

export { DataProviderProvider } from './DataProviderProvider';
export { useDataProvider } from './context';
export { useAsyncData } from './useAsyncData';
export { resolveDataSource, selectDataProvider } from './selectDataProvider';

export { createProjectsService, type ProjectsService } from './features/projects';
export { useProjectsService } from './features/useProjectsService';

export {
  createDashboardService,
  buildFilterOptions,
  topStatesByWorkCount,
  regionStats,
  deriveDashboardGroupings,
  filterDashboardView,
  type DashboardService,
  type DashboardData,
  type DashboardFilterOptions,
  type AttentionItem,
  type StateWorkCount,
  type RegionStat,
} from './features/dashboard';
export { useDashboardService } from './features/useDashboardService';

export {
  createAnalyticsService,
  UTILISATION_BANDS,
  type AnalyticsService,
  type AnalyticsData,
  type StateUtilisation,
  type MpUtilisation,
  type UtilisationBucket,
  type UtilisationBand,
} from './features/analytics';
export { useAnalyticsService } from './features/useAnalyticsService';

export {
  createCitizenAnalyticsService,
  buildCitizenAnalytics,
  type CitizenAnalyticsService,
} from './features/citizenAnalytics';
export { useCitizenAnalyticsService } from './features/useCitizenAnalyticsService';

export {
  createAssistantService,
  type AssistantService,
  type AssistantData,
  type AssistantWork,
  type AssistantMp,
  type AssistantState,
  type AssistantCategory,
} from './features/assistant';
export { useAssistantService } from './features/useAssistantService';

export {
  createProjectDetailService,
  type ProjectDetailService,
  type ProjectDetailData,
} from './features/projectDetail';
export { useProjectDetailService } from './features/useProjectDetailService';

export {
  createRiskService,
  type RiskService,
  type RiskListData,
  type RiskRow,
} from './features/risk';
export { useRiskService } from './features/useRiskService';

export { createDuplicatesService, type DuplicatesService } from './features/duplicates';
export { useDuplicatesService } from './features/useDuplicatesService';

export {
  createEscrowService,
  pickRiskBalancedSample,
  type EscrowService,
  type EscrowData,
  type EscrowWorkOption,
  type FundRequestSummary,
} from './features/escrow';
export { useEscrowService } from './features/useEscrowService';

export {
  createMpComparisonService,
  aggregateMps,
  type MpComparisonService,
  type MpComparisonData,
  type MpStat,
} from './features/mpComparison';
export { useMpComparisonService } from './features/useMpComparisonService';

export {
  createCitizenMpComparisonService,
  aggregateCitizenMps,
  type CitizenMpComparisonService,
  type CitizenMpComparisonData,
  type CitizenMpStat,
} from './features/citizenMpComparison';
export { useCitizenMpComparisonService } from './features/useCitizenMpComparisonService';

export {
  createProjectRegisterService,
  type ProjectRegisterService,
  type ProjectRegisterData,
  type RegisterRow,
  type RegisterFilterOptions,
} from './features/projectRegister';
export { useProjectRegisterService } from './features/useProjectRegisterService';

export {
  createCitizenService,
  toPublicProject,
  type CitizenService,
  type CitizenListData,
  type PublicProject,
} from './features/citizen';
export { useCitizenService } from './features/useCitizenService';

export {
  createCitizenOverviewService,
  buildCitizenOverview,
  type CitizenOverviewService,
  type CitizenOverviewData,
  type CitizenStateCount,
} from './features/citizenOverview';
export { useCitizenOverviewService } from './features/useCitizenOverviewService';

export {
  createGrievancesService,
  GRIEVANCE_CATEGORIES,
  GRIEVANCE_STATUSES,
  GRIEVANCE_STATUS_LABEL,
  type GrievancesService,
  type GrievancesData,
  type GrievanceWorkOption,
} from './features/grievances';
export { useGrievancesService } from './features/useGrievancesService';

export {
  createInspectionsService,
  ASSIGNMENT_STATUSES,
  ASSIGNMENT_STATUS_LABEL,
  nextAssignmentStatuses,
  clampPhotoCount,
  PHOTO_COUNT_MIN,
  PHOTO_COUNT_MAX,
  DEFAULT_REQUIRED_PHOTOS,
  type InspectionsService,
  type InspectionsData,
  type InspectionWorkOption,
} from './features/inspections';
export { useInspectionsService } from './features/useInspectionsService';

export {
  createAuditService,
  DEMO_INSPECTION_FINDINGS,
  DEMO_OVERALL_CONDITION,
  DEMO_INSPECTION_REMARKS,
  type AuditService,
  type AuditData,
  type AuditWorkGroup,
  type InspectionFinding,
} from './features/audit';
export { useAuditService } from './features/useAuditService';

export {
  createNotificationsService,
  type NotificationsService,
} from './features/notifications';
export { useNotificationsService } from './features/useNotificationsService';

export {
  createWorkRecommendationsService,
  RECOMMENDATION_CATEGORIES,
  RECOMMENDATION_STATUSES,
  RECOMMENDATION_STATUS_LABEL,
  type WorkRecommendationsService,
  type RecommendationsData,
  type MpOption,
} from './features/workRecommendations';
export { useWorkRecommendationsService } from './features/useWorkRecommendationsService';

export { deriveRisk, riskHeadline, paymentRatio, RISK_RULES, type RiskContext } from './risk/rules';
export { findDuplicatePairs, capDuplicatePairs, MAX_DUPLICATE_PAIRS } from './dedup/duplicateRules';
export {
  evaluateFundEligibility,
  remainingFunds,
  alreadyReleasedAmount,
  type FundEligibilityDecision,
} from './escrow/fundEligibility';
export {
  classifyRiskReason,
  summarizeRiskFactors,
  riskFactorFromSlug,
  RISK_FACTOR_CATEGORIES,
  RISK_FACTOR_SLUGS,
  RISK_FACTOR_DESCRIPTIONS,
  type RiskFactorCategory,
  type RiskFactorCount,
} from './risk/riskFactors';
export {
  recommendedAction,
  riskDimensions,
  featureContributions,
  RISK_DIMENSIONS,
  type RiskDimension,
  type RecommendedAction,
  type FactorContribution,
} from './risk/riskInsights';
