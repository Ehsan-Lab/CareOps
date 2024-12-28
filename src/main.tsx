/**
 * @module Main
 * @description Application entry point that bootstraps the React application
 * Sets up the root element and wraps the App component with StrictMode for development checks
 */

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Create and render the root component with StrictMode for additional development checks
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
