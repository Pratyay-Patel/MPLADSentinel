import { createBrowserRouter } from 'react-router-dom';

import { RequireAuth, RequireRole } from '../auth';
import { AppShell } from '../layout/AppShell';
import { AnalyticsPage } from '../pages/analytics/AnalyticsPage';
import { AssistantPage } from '../pages/assistant/AssistantPage';
import { GovernmentDashboard } from '../pages/dashboard/GovernmentDashboard';
import { CitizenPortal } from '../pages/citizen/CitizenPortal';
import { CitizenProjectView } from '../pages/citizen/CitizenProjectView';
import { AuditPage } from '../pages/audit/AuditPage';
import { Grievances } from '../pages/grievances/Grievances';
import { RecommendWork } from '../pages/recommend/RecommendWork';
import { InspectionsPage } from '../pages/inspections/InspectionsPage';
import { EscrowFundControl } from '../pages/escrow/EscrowFundControl';
import { FundRequestDetail } from '../pages/escrow/FundRequestDetail';
import { LoginPage } from '../pages/LoginPage';
import { RegisterPage } from '../pages/RegisterPage';
import { NotFoundPage } from '../pages/NotFoundPage';
import { ProjectDetail } from '../pages/project-detail/ProjectDetail';
import { ProjectRegister } from '../pages/projects/ProjectRegister';
import { RiskAlerts } from '../pages/risk/RiskAlerts';
import { DuplicateWorks } from '../pages/duplicates/DuplicateWorks';
import { CartelMatrixPage } from '../pages/cartel/CartelMatrixPage';
import { CompareMps } from '../pages/compare/CompareMps';
import { IndexRedirect } from './IndexRedirect';

/**
 * Application route table. The Overview route renders the Government Intelligence
 * Dashboard; the remaining feature routes render lightweight placeholders until
 * their own phases.
 *
 * The whole shell is wrapped in {@link RequireAuth}: an unauthenticated visitor
 * is redirected to `/login`. Each area route is additionally wrapped in
 * {@link RequireRole} so a signed-in role without access to that area sees a
 * "not available" state. Both are UX only — the backend authorizes every
 * request (D5 / D31).
 */
export const appRouter = createBrowserRouter([
  {
    path: '/login',
    element: <LoginPage />,
  },
  {
    path: '/register',
    element: <RegisterPage />,
  },
  {
    path: '/',
    element: (
      <RequireAuth>
        <AppShell />
      </RequireAuth>
    ),
    children: [
      { index: true, element: <IndexRedirect /> },
      {
        path: 'dashboard',
        element: (
          <RequireRole area="overview">
            <GovernmentDashboard />
          </RequireRole>
        ),
      },
      {
        path: 'projects',
        element: (
          <RequireRole area="projects">
            <ProjectRegister />
          </RequireRole>
        ),
      },
      {
        path: 'projects/:id',
        element: (
          <RequireRole area="projects">
            <ProjectDetail />
          </RequireRole>
        ),
      },
      {
        path: 'risk',
        element: (
          <RequireRole area="risk">
            <RiskAlerts />
          </RequireRole>
        ),
      },
      {
        path: 'duplicates',
        element: (
          <RequireRole area="duplicates">
            <DuplicateWorks />
          </RequireRole>
        ),
      },
      {
        path: 'cartel',
        element: (
          <RequireRole area="cartel">
            <CartelMatrixPage />
          </RequireRole>
        ),
      },
      {
        path: 'compare',
        element: (
          <RequireRole area="compare">
            <CompareMps />
          </RequireRole>
        ),
      },
      {
        path: 'analytics',
        element: (
          <RequireRole area="analytics">
            <AnalyticsPage />
          </RequireRole>
        ),
      },
      {
        path: 'assistant',
        element: (
          <RequireRole area="assistant">
            <AssistantPage />
          </RequireRole>
        ),
      },
      {
        path: 'inspections',
        element: (
          <RequireRole area="inspections">
            <InspectionsPage />
          </RequireRole>
        ),
      },
      {
        path: 'escrow',
        element: (
          <RequireRole area="escrow">
            <EscrowFundControl />
          </RequireRole>
        ),
      },
      {
        path: 'escrow/:id',
        element: (
          <RequireRole area="escrow">
            <FundRequestDetail />
          </RequireRole>
        ),
      },
      {
        path: 'audit',
        element: (
          <RequireRole area="audit">
            <AuditPage />
          </RequireRole>
        ),
      },
      {
        path: 'citizen',
        element: (
          <RequireRole area="citizen">
            <CitizenPortal />
          </RequireRole>
        ),
      },
      {
        path: 'citizen/:id',
        element: (
          <RequireRole area="citizen">
            <CitizenProjectView />
          </RequireRole>
        ),
      },
      {
        path: 'grievances',
        element: (
          <RequireRole area="grievances">
            <Grievances />
          </RequireRole>
        ),
      },
      {
        path: 'recommend',
        element: (
          <RequireRole area="recommendations">
            <RecommendWork />
          </RequireRole>
        ),
      },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
]);
