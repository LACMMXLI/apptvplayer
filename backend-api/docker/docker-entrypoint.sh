#!/bin/sh
set -e

echo "Syncing database schema..."
# No committed migration history yet (prisma/migrations is empty), so use
# `db push` to create/update tables directly from schema.prisma. Safe to
# re-run on every boot — it's a no-op once the DB already matches the schema.
# Switch to `prisma migrate deploy` once real migrations are generated
# against a real database and committed to the repo.
npx prisma db push --skip-generate --accept-data-loss

echo "Starting backend-api..."
exec node dist/main.js
