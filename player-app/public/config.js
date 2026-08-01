// Local development / fallback runtime config.
// In production (Docker image), this file is generated at container start
// from environment variables by docker/entrypoint.sh — no rebuild needed
// to point the player at a different API/WS domain.
window.__RUNTIME_CONFIG__ = {
  API_URL: '',
  WS_URL: '',
};
