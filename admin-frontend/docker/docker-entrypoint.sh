#!/bin/sh
set -e

# Regenerate the runtime config from environment variables so the same
# built image can point at different API domains without a rebuild.
cat > /usr/share/nginx/html/config.js <<EOF
window.__RUNTIME_CONFIG__ = {
  API_URL: "${API_URL:-}"
};
EOF

exec nginx -g "daemon off;"
