import { RouterProvider } from 'react-router-dom';

import { DataProviderProvider } from './data/DataProviderProvider';
import { appRouter } from './router/AppRouter';

export function App() {
  return (
    <DataProviderProvider>
      <RouterProvider router={appRouter} />
    </DataProviderProvider>
  );
}
