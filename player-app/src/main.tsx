import React from 'react';
import ReactDOM from 'react-dom/client';
// Bundled font: TVs (Android/Linux kiosks) don't ship Segoe UI or Roboto
// consistently, so text would otherwise render in whatever fallback exists.
import '@fontsource-variable/inter';
import App from './App';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
