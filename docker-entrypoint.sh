#!/bin/sh
set -e

echo "==> Starting Perfecto server on ${HOSTNAME}:${PORT}..."
exec node server.js
