// Local development / fallback runtime config.
// In production (Docker image), this file is generated at container start
// from environment variables by docker/entrypoint.sh — no rebuild needed
// to point the admin panel at a different API domain.
window.__RUNTIME_CONFIG__ = {
  API_URL: '',
};
