/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Base path/URL for backend API calls. Defaults to "/api". */
  readonly VITE_API_BASE_URL?: string;
  /**
   * Which data provider the frontend uses: "demo" (default) serves local demo
   * fixtures; "api" serves real data via the Spring Boot backend.
   */
  readonly VITE_DATA_SOURCE?: 'demo' | 'api';
  /**
   * "true" runs the frontend with no backend: the session is chosen from a
   * persona picker and held client-side. Used only for the Vercel demo build.
   * Absent (the default) uses the real backend auth path.
   */
  readonly VITE_DEMO_AUTH?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
