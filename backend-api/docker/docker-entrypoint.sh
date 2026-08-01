#!/bin/sh
set -e

echo "Running database migrations..."
npx prisma migrate deploy

echo "Starting backend-api..."
exec node dist/main.js
