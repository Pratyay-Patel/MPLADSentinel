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
  BackendHealth,
  DataSource,
  Grievance,
  GrievanceInput,
  GrievanceStatus,
  GrievanceStatusPatch,
  LifecycleState,
  Money,
  PaymentDataState,
  PaymentInstallment,
  Project,
  ProjectHouse,
  ProjectRisk,
  ProjectSummary,
  RiskLevel,
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
  type DashboardService,
  type DashboardData,
  type DashboardFilterOptions,
  type AttentionItem,
  type StateWorkCount,
  type RegionStat,
} from './features/dashboard';
export { useDashboardService } from './features/useDashboardService';

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
  createGrievancesService,
  GRIEVANCE_CATEGORIES,
  GRIEVANCE_STATUSES,
  GRIEVANCE_STATUS_LABEL,
  type GrievancesService,
  type GrievancesData,
  type GrievanceWorkOption,
} from './features/grievances';
export { useGrievancesService } from './features/useGrievancesService';

export { deriveRisk, riskHeadline, paymentRatio, RISK_RULES, type RiskContext } from './risk/rules';
export {
  classifyRiskReason,
  summarizeRiskFactors,
  RISK_FACTOR_CATEGORIES,
  type RiskFactorCategory,
  type RiskFactorCount,
} from './risk/riskFactors';
export {
  recommendedAction,
  riskDimensions,
  RISK_DIMENSIONS,
  type RiskDimension,
  type RecommendedAction,
} from './risk/riskInsights';
