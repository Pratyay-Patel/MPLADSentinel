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
  paymentRatio,
  riskHeadline,
  type DashboardService,
  type DashboardData,
  type DashboardFilterOptions,
  type AttentionItem,
  type StateWorkCount,
} from './features/dashboard';
export { useDashboardService } from './features/useDashboardService';

export {
  createProjectDetailService,
  type ProjectDetailService,
  type ProjectDetailData,
} from './features/projectDetail';
export { useProjectDetailService } from './features/useProjectDetailService';
