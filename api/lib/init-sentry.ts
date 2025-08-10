/**
 * Sentry Initialization for API
 * 
 * This module initializes Sentry for all API endpoints
 */

import { initializeSentryServer } from './sentry-server';

// Initialize Sentry when this module is imported
initializeSentryServer();

export { withSentry, ServerErrorReporting } from './sentry-server';
