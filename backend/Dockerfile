# Build stage
FROM node:20-alpine AS builder
WORKDIR /repo

# Copy root manifests (workspace lockfile lives here)
COPY package.json package-lock.json ./

# Copy workspace package.json files so npm can resolve workspaces
COPY frontend/package.json ./frontend/package.json
COPY backend/package.json ./backend/package.json
COPY packages/shared-types/package.json ./packages/shared-types/package.json

# Install deps for all workspaces using the ROOT lockfile
RUN npm ci --workspaces

# Copy actual sources
COPY packages/shared-types ./packages/shared-types
COPY backend ./backend

# Build shared-types + backend
RUN npm run build -w @iot-monitoring/shared-types && npm run build -w backend

# Production stage
FROM node:20-alpine AS production
WORKDIR /app

# Copy root package files for workspace resolution
COPY --from=builder /repo/package.json /repo/package-lock.json ./

# Copy shared-types
COPY --from=builder /repo/packages/shared-types ./packages/shared-types

# Copy backend
COPY --from=builder /repo/backend/package.json ./backend/package.json
COPY --from=builder /repo/backend/dist ./backend/dist
COPY --from=builder /repo/node_modules ./node_modules

# Copy SQL migrations and scripts
COPY backend/sql ./backend/sql
COPY backend/scripts ./backend/scripts

ENV NODE_ENV=production
WORKDIR /app/backend

EXPOSE 3000

CMD ["node", "dist/api.js"]
