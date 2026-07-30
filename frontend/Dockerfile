# Stage 1: Build static assets
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package manifests & install dependencies
COPY package.json package-lock.json ./
RUN npm ci

# Copy application source code
COPY . .

# Set API URL build arg (defaults to /api/v1 for relative Nginx proxying)
ARG PUBLIC_API_URL=/api/v1
ENV PUBLIC_API_URL=$PUBLIC_API_URL

# Build production distribution bundle
RUN npm run build

# Stage 2: Serve using Nginx
FROM nginx:alpine

# Copy custom Nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy build output from builder stage
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
