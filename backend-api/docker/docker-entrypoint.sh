#!/bin/sh
# Deliberately not using `set -e` here: a schema sync failure (e.g. DB
# briefly unreachable, or a schema drift issue) should not prevent the API
# process from starting — better to serve requests (and surface the error
# to whoever calls the API) than crash-loop the whole container.

echo "Syncing database schema..."
# No committed migration history yet (prisma/migrations is empty), so use
# `db push` to create/update tables directly from schema.prisma. Safe to
# re-run on every boot — it's a no-op once the DB already matches the schema.
# Switch to `prisma migrate deploy` once real migrations are generated
# against a real database and committed to the repo.
if ! npx prisma db push --skip-generate --accept-data-loss; then
  echo "WARNING: prisma db push failed (exit $?). Starting the API anyway."
fi

echo "Starting backend-api..."
exec node dist/main.js
