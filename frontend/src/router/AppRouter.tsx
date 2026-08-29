import { createBrowserRouter } from 'react-router-dom';

import { RequireRole } from '../auth';
import { AppShell } from '../layout/AppShell';
import { GovernmentDashboard } from '../pages/dashboard/GovernmentDashboard';
import { CitizenPortal } from '../pages/citizen/CitizenPortal';
import { CitizenProjectView } from '../pages/citizen/CitizenProjectView';
import { AuditPage } from '../pages/featurePages';
import { Grievances } from '../pages/grievances/Grievances';
import { HomePage } from '../pages/HomePage';
import { NotFoundPage } from '../pages/NotFoundPage';
import { ProjectDetail } from '../pages/project-detail/ProjectDetail';
import { ProjectRegister } from '../pages/projects/ProjectRegister';
import { RiskAlerts } from '../pages/risk/RiskAlerts';

/**
 * Application route table. The Overview route renders the Government Intelligence
 * Dashboard; the remaining feature routes render lightweight placeholders until
 * their own phases.
 *
 * Each area route is wrapped in {@link RequireRole} so a role without access
 * sees a "not available" state instead of the screen. This is UX only — the
 * backend authorizes every request (D5).
 */
export const appRouter = createBrowserRouter([
  {
    path: '/',
    element: <AppShell />,
    children: [
      { index: true, element: <HomePage /> },
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
      { path: '*', element: <NotFoundPage /> },
    ],
  },
]);
