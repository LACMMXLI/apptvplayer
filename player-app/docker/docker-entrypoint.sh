#!/bin/sh
set -e

cat > /usr/share/nginx/html/config.js <<EOF
window.__RUNTIME_CONFIG__ = {
  API_URL: "${API_URL:-}",
  WS_URL: "${WS_URL:-}"
};
EOF

exec nginx -g "daemon off;"
