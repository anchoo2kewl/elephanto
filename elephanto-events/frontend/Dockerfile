# Build stage - using Ubuntu for better package availability
FROM node:18-bullseye AS builder

WORKDIR /app

# Accept build arguments
ARG VITE_API_URL=http://localhost:8080

# Log what we're building with
RUN echo "=========================================="
RUN echo "FRONTEND BUILD STARTING"
RUN echo "🔧 VITE_API_URL = $VITE_API_URL"
RUN echo "=========================================="

# Set environment variable for build
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

# Production stage - using Debian for consistency
FROM nginx:1.25-bullseye

COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Create startup script that shows what we're serving
ARG VITE_API_URL=http://localhost:8080
RUN echo '#!/bin/sh' > /docker-entrypoint-log.sh && \
    echo 'echo "=========================================="' >> /docker-entrypoint-log.sh && \
    echo 'echo "FRONTEND CONTAINER STARTING"' >> /docker-entrypoint-log.sh && \
    echo "echo '🔧 Built with VITE_API_URL = $VITE_API_URL'" >> /docker-entrypoint-log.sh && \
    echo 'echo "Serving from: /usr/share/nginx/html"' >> /docker-entrypoint-log.sh && \
    echo 'echo "API URLs in served files:"' >> /docker-entrypoint-log.sh && \
    echo 'find /usr/share/nginx/html -name "*.js" -exec grep -Ho "localhost:8080\|elephantoevents.ca" {} \; | head -5 || echo "   No API URLs found"' >> /docker-entrypoint-log.sh && \
    echo 'echo "Frontend ready on port 3000"' >> /docker-entrypoint-log.sh && \
    echo 'echo "=========================================="' >> /docker-entrypoint-log.sh && \
    echo 'exec "$@"' >> /docker-entrypoint-log.sh

RUN chmod +x /docker-entrypoint-log.sh

EXPOSE 3000

ENTRYPOINT ["/docker-entrypoint-log.sh"]
CMD ["nginx", "-g", "daemon off;"]