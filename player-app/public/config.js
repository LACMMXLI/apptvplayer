// Local development / fallback runtime config.
// In production (Docker image), this file is generated at container start
// from environment variables by docker/entrypoint.sh — no rebuild needed
// to point the player at a different API/WS domain.
window.__RUNTIME_CONFIG__ = {
  API_URL: '',
  WS_URL: '',
  // Public URL of the admin panel. When set, the pairing screen shows a QR
  // code that opens it with this screen's code pre-filled.
  ADMIN_URL: '',
};
