# Build stage
FROM node:18-alpine AS builder

WORKDIR /app

# Accept build arguments
ARG VITE_API_URL=http://localhost:8080
ENV VITE_API_URL=$VITE_API_URL

# Log the environment variable being used
RUN echo "🌐 FRONTEND BUILD: Using VITE_API_URL = $VITE_API_URL"
RUN echo "🔧 This API URL will be baked into the frontend build"

COPY package*.json ./
RUN npm install

COPY . .

# Show environment again before build
RUN echo "📦 Starting frontend build with VITE_API_URL = $VITE_API_URL"
RUN npm run build

# Verify the build contains the correct API URL
RUN echo "✅ Build complete. Checking built files for API URL..."
RUN grep -r "VITE_API_URL\|localhost:8080\|elephantoevents.ca" dist/ || echo "No API URL references found in built files"

# Production stage
FROM nginx:alpine

COPY --from=builder /app/dist /usr/share/nginx/html

COPY nginx.conf /etc/nginx/conf.d/default.conf

# Create a startup script that logs the API URL being served
RUN echo '#!/bin/sh' > /docker-entrypoint-custom.sh && \
    echo 'echo "🚀 FRONTEND CONTAINER: Starting nginx..."' >> /docker-entrypoint-custom.sh && \
    echo 'echo "📂 Serving files from /usr/share/nginx/html"' >> /docker-entrypoint-custom.sh && \
    echo 'echo "🔍 Checking for API URLs in served files:"' >> /docker-entrypoint-custom.sh && \
    echo 'grep -r "localhost:8080\|elephantoevents.ca" /usr/share/nginx/html/assets/*.js | head -3 || echo "No API URLs found"' >> /docker-entrypoint-custom.sh && \
    echo 'echo "🌐 Frontend ready to serve requests"' >> /docker-entrypoint-custom.sh && \
    echo 'exec "$@"' >> /docker-entrypoint-custom.sh && \
    chmod +x /docker-entrypoint-custom.sh

EXPOSE 3000

ENTRYPOINT ["/docker-entrypoint-custom.sh"]
CMD ["nginx", "-g", "daemon off;"]