# How Railway builds and runs the backend.
#
# It sits at the root of the repo, not inside backend/, because the backend
# imports maths from shared/, so both folders have to be copied in.
#
# The database is NOT inside this image. Railway mounts a volume (a disk that
# survives restarts and redeploys) at /data, and NESTWORTH_DB_FILE points there.

FROM node:22-slim

# better-sqlite3 usually downloads a ready-made binary. These tools let it
# compile from source instead if that download is ever missing.
RUN apt-get update \
  && apt-get install -y --no-install-recommends python3 make g++ \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install packages first, on their own. Docker caches this step, so later
# deploys that only change code skip the slow install.
COPY backend/package.json backend/package-lock.json ./backend/
RUN cd backend && npm ci --omit=dev

# Then the code itself.
COPY shared ./shared
COPY backend/src ./backend/src
COPY backend/scripts ./backend/scripts

ENV NODE_ENV=production

WORKDIR /app/backend
CMD ["node", "src/server.js"]
