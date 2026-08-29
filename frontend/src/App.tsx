import { RouterProvider } from 'react-router-dom';

import { SessionProvider } from './auth';
import { DataProviderProvider } from './data/DataProviderProvider';
import { appRouter } from './router/AppRouter';

export function App() {
  return (
    <SessionProvider>
      <DataProviderProvider>
        <RouterProvider router={appRouter} />
      </DataProviderProvider>
    </SessionProvider>
  );
}
