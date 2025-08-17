import React from 'react';
import ReactDOM from 'react-dom/client';
import DebugApp from './DebugApp';
import { logger } from './utils/logger';

logger.debug('Debug main.tsx is loading');
logger.debug('React version:', React.version);
logger.debug('ReactDOM loaded successfully');

// 检查环境
logger.debug('Environment:', {
  NODE_ENV: process.env.NODE_ENV,
  userAgent: navigator.userAgent,
  location: window.location.href,
});

const rootElement = document.getElementById('root');
logger.debug('Root element:', rootElement);

if (rootElement) {
  logger.debug('Creating React root');

  try {
    const root = ReactDOM.createRoot(rootElement);

    logger.debug('Rendering DebugApp');
    root.render(
      <React.StrictMode>
        <DebugApp />
      </React.StrictMode>
    );
    logger.debug('DebugApp rendered successfully');
  } catch (error) {
    logger.error('Error creating or rendering React app:', error);

    // 回退到简单的HTML
    rootElement.innerHTML = `
      <div style="padding: 20px; font-family: Arial, sans-serif;">
        <h1>React Initialization Failed</h1>
        <p>Error: ${error instanceof Error ? error.message : 'Unknown error'}</p>
        <p>Check the console for more details.</p>
      </div>
    `;
  }
} else {
  logger.error('Root element not found!');
  document.body.innerHTML = `
    <div style="padding: 20px; font-family: Arial, sans-serif;">
      <h1>Root Element Not Found</h1>
      <p>The element with id="root" was not found in the DOM.</p>
    </div>
  `;
}
