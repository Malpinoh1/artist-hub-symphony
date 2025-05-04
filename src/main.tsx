
import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Make sure to use the correct DOM node and handle null possibility
const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error('Root element not found in the document');
}

createRoot(rootElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
