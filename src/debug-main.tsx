import React from 'react';
import ReactDOM from 'react-dom/client';
import DebugApp from './DebugApp';

console.log('Debug main.tsx is loading');
console.log('React version:', React.version);
console.log('ReactDOM loaded successfully');

// 检查环境
console.log('Environment:', {
  NODE_ENV: process.env.NODE_ENV,
  userAgent: navigator.userAgent,
  location: window.location.href,
});

const rootElement = document.getElementById('root');
console.log('Root element:', rootElement);

if (rootElement) {
  console.log('Creating React root');

  try {
    const root = ReactDOM.createRoot(rootElement);

    console.log('Rendering DebugApp');
    root.render(
      <React.StrictMode>
        <DebugApp />
      </React.StrictMode>
    );
    console.log('DebugApp rendered successfully');
  } catch (error) {
    console.error('Error creating or rendering React app:', error);

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
  console.error('Root element not found!');
  document.body.innerHTML = `
    <div style="padding: 20px; font-family: Arial, sans-serif;">
      <h1>Root Element Not Found</h1>
      <p>The element with id="root" was not found in the DOM.</p>
    </div>
  `;
}
