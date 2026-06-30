#!/bin/sh
set -e

echo "==> Applying database migrations (prisma migrate deploy)..."
node ./node_modules/prisma/build/index.js migrate deploy

echo "==> Starting Perfecto server on ${HOSTNAME}:${PORT}..."
exec node server.js
