import { createBrowserRouter } from 'react-router-dom';

import { AppLayout } from '../layout/AppLayout';
import { HomePage } from '../pages/HomePage';
import { NotFoundPage } from '../pages/NotFoundPage';

/**
 * Application route table. Feature routes (dashboard, project details, citizen
 * portal, etc.) are registered here as their modules are implemented.
 */
export const appRouter = createBrowserRouter([
  {
    path: '/',
    element: <AppLayout />,
    children: [
      { index: true, element: <HomePage /> },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
]);
