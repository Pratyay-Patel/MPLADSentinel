/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Base path/URL for backend API calls. Defaults to "/api". */
  readonly VITE_API_BASE_URL?: string;
  /**
   * Which data provider the frontend uses: "demo" (default) serves local demo
   * fixtures; "api" serves real data via the Spring Boot backend.
   */
  readonly VITE_DATA_SOURCE?: 'demo' | 'api';
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
