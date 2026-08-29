import { createBrowserRouter } from 'react-router-dom';

import { AppShell } from '../layout/AppShell';
import { GovernmentDashboard } from '../pages/dashboard/GovernmentDashboard';
import {
  AuditPage,
  CitizenPage,
  GrievancesPage,
  ProjectDetailPage,
  ProjectsPage,
  RiskPage,
} from '../pages/featurePages';
import { HomePage } from '../pages/HomePage';
import { NotFoundPage } from '../pages/NotFoundPage';

/**
 * Application route table. The Overview route renders the Government Intelligence
 * Dashboard; the remaining feature routes render lightweight placeholders until
 * their own phases.
 */
export const appRouter = createBrowserRouter([
  {
    path: '/',
    element: <AppShell />,
    children: [
      { index: true, element: <HomePage /> },
      { path: 'dashboard', element: <GovernmentDashboard /> },
      { path: 'projects', element: <ProjectsPage /> },
      { path: 'projects/:id', element: <ProjectDetailPage /> },
      { path: 'risk', element: <RiskPage /> },
      { path: 'audit', element: <AuditPage /> },
      { path: 'citizen', element: <CitizenPage /> },
      { path: 'grievances', element: <GrievancesPage /> },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
]);
