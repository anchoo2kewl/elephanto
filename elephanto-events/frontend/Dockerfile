# Build stage
FROM node:18-alpine AS builder

WORKDIR /app

# Accept build arguments
ARG VITE_API_URL=""

# Log what we're building with
RUN echo "=========================================="
RUN echo "FRONTEND BUILD STARTING"
RUN echo "🔧 VITE_API_URL = $VITE_API_URL (empty for runtime config)"
RUN echo "=========================================="

# Only set environment variable if provided (for runtime config)
ENV VITE_API_URL=$VITE_API_URL

COPY package*.json ./
RUN npm install

COPY . .

# Log again before build
RUN echo "Building frontend with API URL: $VITE_API_URL"
RUN npm run build

# Check what was built
RUN echo "Build complete! Checking output:"
RUN find dist/ -name "*.js" -exec grep -l "localhost\|elephantoevents" {} \; || echo "No API URLs found"

# Production stage
FROM nginx:alpine

COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Create runtime startup script
RUN echo '#!/bin/sh' > /docker-entrypoint-runtime.sh && \
    echo 'echo "=========================================="' >> /docker-entrypoint-runtime.sh && \
    echo 'echo "FRONTEND CONTAINER STARTING"' >> /docker-entrypoint-runtime.sh && \
    echo 'echo "🔧 Runtime API_URL: ${API_URL:-/api}"' >> /docker-entrypoint-runtime.sh && \
    echo 'echo "Generating runtime configuration..."' >> /docker-entrypoint-runtime.sh && \
    echo '' >> /docker-entrypoint-runtime.sh && \
    echo '# Generate runtime config.js with current environment' >> /docker-entrypoint-runtime.sh && \
    echo 'cat > /usr/share/nginx/html/config.js << EOF' >> /docker-entrypoint-runtime.sh && \
    echo 'window.__APP_CONFIG__ = {' >> /docker-entrypoint-runtime.sh && \
    echo '  API_URL: "${API_URL:-}"' >> /docker-entrypoint-runtime.sh && \
    echo '};' >> /docker-entrypoint-runtime.sh && \
    echo 'EOF' >> /docker-entrypoint-runtime.sh && \
    echo '' >> /docker-entrypoint-runtime.sh && \
    echo 'echo "Runtime config generated:"' >> /docker-entrypoint-runtime.sh && \
    echo 'cat /usr/share/nginx/html/config.js' >> /docker-entrypoint-runtime.sh && \
    echo 'echo "Serving from: /usr/share/nginx/html"' >> /docker-entrypoint-runtime.sh && \
    echo 'echo "Frontend ready on port 3000"' >> /docker-entrypoint-runtime.sh && \
    echo 'echo "=========================================="' >> /docker-entrypoint-runtime.sh && \
    echo 'exec "$@"' >> /docker-entrypoint-runtime.sh

RUN chmod +x /docker-entrypoint-runtime.sh

EXPOSE 3000

ENTRYPOINT ["/docker-entrypoint-runtime.sh"]
CMD ["nginx", "-g", "daemon off;"]