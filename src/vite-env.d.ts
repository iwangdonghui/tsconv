/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SENTRY_DSN: string;
  readonly VITE_APP_VERSION: string;
  readonly VITE_API_BASE_URL: string;
  readonly VITE_ENABLE_ERROR_TRACKING: string;
  readonly VITE_ENABLE_PERFORMANCE_MONITORING: string;
  readonly VITE_ENABLE_USER_FEEDBACK: string;
  readonly VITE_ENABLE_ERROR_DASHBOARD: string;
  readonly VITE_ENABLE_DEBUG_MODE: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
