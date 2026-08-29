import { createBrowserRouter } from 'react-router-dom';

import { AppShell } from '../layout/AppShell';
import {
  AuditPage,
  CitizenPage,
  DashboardPage,
  GrievancesPage,
  ProjectDetailPage,
  ProjectsPage,
  RiskPage,
} from '../pages/featurePages';
import { HomePage } from '../pages/HomePage';
import { NotFoundPage } from '../pages/NotFoundPage';

/**
 * Application route table. Feature routes currently render lightweight
 * placeholders (see `pages/featurePages.tsx`); each is replaced by its real
 * screen in a later phase.
 */
export const appRouter = createBrowserRouter([
  {
    path: '/',
    element: <AppShell />,
    children: [
      { index: true, element: <HomePage /> },
      { path: 'dashboard', element: <DashboardPage /> },
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
