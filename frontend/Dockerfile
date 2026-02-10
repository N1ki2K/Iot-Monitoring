# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Copy shared-types first
COPY packages/shared-types ./packages/shared-types

# Build shared-types
WORKDIR /app/packages/shared-types
RUN npm ci && npm run build

# Copy frontend
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm ci

COPY frontend/tsconfig*.json ./
COPY frontend/vite.config.ts ./
COPY frontend/tailwind.config.js ./
COPY frontend/postcss.config.js ./
COPY frontend/eslint.config.js ./
COPY frontend/index.html ./
COPY frontend/src ./src
COPY frontend/public ./public

ARG VITE_API_URL
ENV VITE_API_URL=$VITE_API_URL

RUN npm run build

# Production stage - nginx
FROM nginx:alpine AS production

# Copy custom nginx config
COPY frontend/nginx.conf /etc/nginx/conf.d/default.conf

# Copy built assets
COPY --from=builder /app/frontend/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
