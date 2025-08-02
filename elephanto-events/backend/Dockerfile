# Build stage
FROM golang:1.21-alpine AS builder

WORKDIR /app

# Add multiple repository mirrors for better connectivity
RUN echo "https://mirror.leaseweb.com/alpine/v3.20/main" > /etc/apk/repositories && \
    echo "https://mirror.leaseweb.com/alpine/v3.20/community" >> /etc/apk/repositories && \
    echo "https://dl-cdn.alpinelinux.org/alpine/v3.20/main" >> /etc/apk/repositories && \
    echo "https://dl-cdn.alpinelinux.org/alpine/v3.20/community" >> /etc/apk/repositories

RUN apk update && apk add --no-cache git ca-certificates

COPY backend/go.mod backend/go.sum ./
RUN go mod download

COPY backend/ .
COPY .env .env

RUN CGO_ENABLED=0 GOOS=linux go build -a -installsuffix cgo -o main .

# Final stage
FROM alpine:latest

RUN apk --no-cache add ca-certificates curl

WORKDIR /root/

COPY --from=builder /app/main .
COPY --from=builder /app/db ./db
COPY --from=builder /app/.env .env

EXPOSE 8080

# Create startup script with logging
RUN echo '#!/bin/sh' > /startup.sh && \
    echo 'echo "=========================================="' >> /startup.sh && \
    echo 'echo "BACKEND CONTAINER STARTING"' >> /startup.sh && \
    echo 'echo "📋 Configuration loaded from .env file"' >> /startup.sh && \
    echo 'echo "Environment Variables:"' >> /startup.sh && \
    echo 'echo "   DATABASE_URL: $DATABASE_URL"' >> /startup.sh && \
    echo 'echo "   EMAIL_SERVICE: $EMAIL_SERVICE"' >> /startup.sh && \
    echo 'echo "   SMTP_HOST: $SMTP_HOST"' >> /startup.sh && \
    echo 'echo "   FRONTEND_URL: $FRONTEND_URL"' >> /startup.sh && \
    echo 'echo "   PORT: $PORT"' >> /startup.sh && \
    echo 'echo "   AUTO_MIGRATE: $AUTO_MIGRATE"' >> /startup.sh && \
    echo 'echo "=========================================="' >> /startup.sh && \
    echo 'echo "Running database migrations..."' >> /startup.sh && \
    echo './main migrate up' >> /startup.sh && \
    echo 'echo "Starting server on port $PORT..."' >> /startup.sh && \
    echo './main serve' >> /startup.sh && \
    chmod +x /startup.sh

CMD ["/startup.sh"]