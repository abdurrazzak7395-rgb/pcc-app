

#!/usr/bin/env bash
set -e

echo "Starting Railway boot sequence..."

# Prisma CLI can be omitted in strict production installs.
if [ -x "./node_modules/.bin/prisma" ]; then
  echo "Generating Prisma client..."
  ./node_modules/.bin/prisma generate

  echo "Running Prisma migrations (deploy)..."
  ./node_modules/.bin/prisma migrate deploy
else
  echo "Prisma CLI not found in node_modules. Skipping generate/migrate."
fi

echo "Launching API..."
npm start
