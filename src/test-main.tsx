import React from 'react';
import ReactDOM from 'react-dom/client';
import TestApp from './TestApp';

console.log('Test main.tsx is loading');

const rootElement = document.getElementById('root');
console.log('Root element:', rootElement);

if (rootElement) {
  console.log('Creating React root');
  const root = ReactDOM.createRoot(rootElement);
  
  console.log('Rendering TestApp');
  root.render(
    <React.StrictMode>
      <TestApp />
    </React.StrictMode>
  );
  console.log('TestApp rendered');
} else {
  console.error('Root element not found!');
}
