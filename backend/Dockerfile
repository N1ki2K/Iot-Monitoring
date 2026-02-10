# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Copy shared-types first
COPY packages/shared-types ./packages/shared-types

# Build shared-types
WORKDIR /app/packages/shared-types
RUN npm ci && npm run build

# Copy backend
WORKDIR /app/backend
COPY backend/package*.json ./
RUN npm ci

COPY backend/tsconfig.json ./
COPY backend/src ./src

RUN npm run build

# Production stage
FROM node:20-alpine AS production

WORKDIR /app

# Copy shared-types dist
COPY --from=builder /app/packages/shared-types ./packages/shared-types

# Copy backend
COPY --from=builder /app/backend/package*.json ./
COPY --from=builder /app/backend/dist ./dist
COPY --from=builder /app/backend/node_modules ./node_modules

# Copy SQL migrations if needed
COPY backend/sql ./sql
COPY backend/scripts ./scripts

ENV NODE_ENV=production

EXPOSE 3000

CMD ["node", "dist/api.js"]
