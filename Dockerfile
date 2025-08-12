# TSConv - Multi-stage Docker build for production deployment
# This Dockerfile creates an optimized production image with nginx

# ============================================================================
# Build Stage
# ============================================================================
FROM node:24-alpine AS builder

# Set working directory
WORKDIR /app

# Install build dependencies
RUN apk add --no-cache \
    git \
    python3 \
    make \
    g++ \
    && rm -rf /var/cache/apk/*

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production --prefer-offline --no-audit

# Copy source code
COPY . .

# Optimize images
RUN npm run optimize-images

# Build application
RUN npm run build

# ============================================================================
# Production Stage
# ============================================================================
FROM nginx:alpine AS production

# Install additional tools
RUN apk add --no-cache \
    curl \
    jq \
    && rm -rf /var/cache/apk/*

# Copy built application
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy optimized nginx configuration
COPY docker/nginx.conf /etc/nginx/nginx.conf
COPY docker/default.conf /etc/nginx/conf.d/default.conf

# Copy health check script
COPY docker/health-check.sh /usr/local/bin/health-check.sh
RUN chmod +x /usr/local/bin/health-check.sh

# Create nginx user and set permissions
RUN addgroup -g 1001 -S nginx-app && \
    adduser -S -D -H -u 1001 -h /var/cache/nginx -s /sbin/nologin -G nginx-app -g nginx-app nginx-app && \
    chown -R nginx-app:nginx-app /usr/share/nginx/html && \
    chown -R nginx-app:nginx-app /var/cache/nginx && \
    chown -R nginx-app:nginx-app /var/log/nginx && \
    chown -R nginx-app:nginx-app /etc/nginx/conf.d && \
    touch /var/run/nginx.pid && \
    chown -R nginx-app:nginx-app /var/run/nginx.pid

# Switch to non-root user
USER nginx-app

# Expose port
EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD /usr/local/bin/health-check.sh

# Labels for metadata
LABEL maintainer="TSConv Team" \
      version="1.0.0" \
      description="TSConv - Timestamp Converter Application" \
      org.opencontainers.image.title="TSConv" \
      org.opencontainers.image.description="A powerful timestamp converter and date utility application" \
      org.opencontainers.image.vendor="TSConv Team" \
      org.opencontainers.image.licenses="MIT"

# Start nginx
CMD ["nginx", "-g", "daemon off;"]
