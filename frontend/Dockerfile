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
COPY frontend ./frontend

# Build args
ARG VITE_API_URL
ENV VITE_API_URL=$VITE_API_URL

# Build shared-types + frontend
RUN npm run build -w @iot-monitoring/shared-types && npm run build -w frontend

# Production stage
FROM nginx:alpine AS production

# Copy custom nginx config
COPY frontend/nginx.conf /etc/nginx/conf.d/default.conf

# Copy built assets
COPY --from=builder /repo/frontend/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
