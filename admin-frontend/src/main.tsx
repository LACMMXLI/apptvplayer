import React from 'react';
import ReactDOM from 'react-dom/client';
// Bundled with the app (no request to Google Fonts): works offline and under
// a strict Content-Security-Policy.
import '@fontsource-variable/inter';
import App from './App';
import { initTheme } from './theme';

initTheme();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
