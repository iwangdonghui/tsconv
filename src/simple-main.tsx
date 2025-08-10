import React from 'react';
import ReactDOM from 'react-dom/client';
import SimpleApp from './SimpleApp';

console.log('Simple main.tsx is loading');

const rootElement = document.getElementById('root');
console.log('Root element:', rootElement);

if (rootElement) {
  console.log('Creating React root');
  const root = ReactDOM.createRoot(rootElement);
  
  console.log('Rendering SimpleApp');
  root.render(
    <React.StrictMode>
      <SimpleApp />
    </React.StrictMode>
  );
  console.log('SimpleApp rendered');
} else {
  console.error('Root element not found!');
}
