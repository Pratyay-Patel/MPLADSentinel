import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import { App } from './App';
import './styles/global.css';
import './styles/shell.css';
import './ui/ui.css';
import './pages/dashboard/dashboard.css';
import './pages/projects/projects.css';
import './pages/project-detail/project-detail.css';
import './pages/risk/risk.css';
import './pages/citizen/citizen.css';
import './pages/grievances/grievances.css';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error('Root element #root not found');
}

createRoot(rootElement).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
