import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Intercept fetch to support VITE_API_BASE_URL when hosted on static frontends (Vercel, Netlify, etc.)
const originalFetch = window.fetch;
window.fetch = function (input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const apiBase = import.meta.env.VITE_API_BASE_URL || "";
  if (apiBase && typeof input === "string" && input.startsWith("/api")) {
    return originalFetch(apiBase + input, init);
  }
  return originalFetch(input, init);
};

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
