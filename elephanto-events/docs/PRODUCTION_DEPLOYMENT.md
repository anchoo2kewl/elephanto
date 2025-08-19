# Production Deployment Guide

This guide provides step-by-step instructions for deploying frontend and backend changes to production.

## Prerequisites

- SSH access to production server with key: `~/Downloads/ssh-key-2025-08-02.key`
- Docker Hub account with push access to `anchoo2kewl/elephanto-*` repositories
- Local development environment set up

## Quick Deployment Steps

### 1. Prepare Changes

```bash
# Navigate to project root
cd /Users/anshumanbiswas/play/elephanto/elephanto-events

# Stage and commit all changes
git add -A
git commit -m "Your descriptive commit message"
git push
```

### 2. Deploy Backend Changes

```bash
# Build and push backend Docker image
docker build -t anchoo2kewl/elephanto-events-backend:latest -f backend/Dockerfile .
docker push anchoo2kewl/elephanto-events-backend:latest

# Tag for production (optional but recommended)
docker tag anchoo2kewl/elephanto-events-backend:latest anchoo2kewl/elephanto-events-backend:production
docker push anchoo2kewl/elephanto-events-backend:production

# Deploy to production
ssh -i ~/Downloads/ssh-key-2025-08-02.key ubuntu@elephantoevents.ca \
  "docker stop elephanto_backend && \
   docker rm elephanto_backend && \
   docker run -d --name elephanto_backend \
   --network elephanto-events_elephanto_network \
   --env-file /opt/elephanto-events/elephanto-events/.env \
   --health-cmd='curl -f http://localhost:8080/api/health || exit 1' \
   --health-interval=30s --health-timeout=10s --health-retries=3 \
   -p 8080:8080 anchoo2kewl/elephanto-events-backend:latest"
```

### 3. Deploy Frontend Changes

```bash
# Build and push frontend Docker image
docker build -t anchoo2kewl/elephanto-frontend:production -f frontend/Dockerfile frontend/
docker push anchoo2kewl/elephanto-frontend:production

# Deploy to production
ssh -i ~/Downloads/ssh-key-2025-08-02.key ubuntu@elephantoevents.ca \
  "docker stop elephanto_frontend && \
   docker rm elephanto_frontend && \
   docker run -d --name elephanto_frontend \
   --network elephanto-events_elephanto_network \
   --env-file /opt/elephanto-events/elephanto-events/.env \
   -p 3000:3000 anchoo2kewl/elephanto-frontend:production"
```

### 4. Verify Deployment

```bash
# Check all containers are running
ssh -i ~/Downloads/ssh-key-2025-08-02.key ubuntu@elephantoevents.ca "docker ps"

# Test website accessibility
curl -I https://velvethour.ca
curl -I https://elephantoevents.ca

# Test API endpoints
curl -X GET "https://velvethour.ca/api/events/active" -s | jq .event.title
curl -X GET "https://velvethour.ca/api/admin/events" -H "Authorization: Bearer invalid_token" -s
```

## Database Migrations

### Running Migrations

If your changes include database migrations:

```bash
# SSH into production
ssh -i ~/Downloads/ssh-key-2025-08-02.key ubuntu@elephantoevents.ca

# Run migrations manually (if auto-migrate is disabled)
docker exec elephanto_backend ./main migrate up

# Check migration status
docker exec elephanto_postgres psql -U elephanto -d elephanto_events -c "SELECT version, dirty FROM schema_migrations;"
```

### Manual Database Changes

For urgent fixes that require direct database changes:

```bash
# Connect to production database
ssh -i ~/Downloads/ssh-key-2025-08-02.key ubuntu@elephantoevents.ca \
  "docker exec elephanto_postgres psql -U elephanto -d elephanto_events"

# Example: Add missing column
ALTER TABLE events ADD COLUMN the_hour_link VARCHAR(500);

# Update migration version if needed
UPDATE schema_migrations SET version = 12;
```

## Environment Configuration

### Production Environment Variables

Located at: `/opt/elephanto-events/elephanto-events/.env`

Key variables:
```bash
# Database
DATABASE_URL=postgres://elephanto:elephanto123@postgres:5432/elephanto_events?sslmode=disable

# Frontend URLs for CORS
FRONTEND_URL=https://velvethour.ca,https://elephantoevents.ca

# Runtime API configuration
API_URL=

# Auto-migrate setting
AUTO_MIGRATE=true
```

### Updating Environment Variables

```bash
# SSH to production
ssh -i ~/Downloads/ssh-key-2025-08-02.key ubuntu@elephantoevents.ca

# Edit environment file
cd /opt/elephanto-events/elephanto-events
sudo nano .env

# Restart affected containers
docker restart elephanto_backend elephanto_frontend
```

## Troubleshooting

### Common Issues

1. **500 Errors on API**
   ```bash
   # Check backend logs
   ssh -i ~/Downloads/ssh-key-2025-08-02.key ubuntu@elephantoevents.ca "docker logs elephanto_backend --tail=50"
   ```

2. **502 Bad Gateway**
   ```bash
   # Check if frontend container is running
   ssh -i ~/Downloads/ssh-key-2025-08-02.key ubuntu@elephantoevents.ca "docker ps | grep frontend"
   ```

3. **Database Connection Issues**
   ```bash
   # Check postgres container
   ssh -i ~/Downloads/ssh-key-2025-08-02.key ubuntu@elephantoevents.ca "docker ps | grep postgres"
   
   # Test database connection
   ssh -i ~/Downloads/ssh-key-2025-08-02.key ubuntu@elephantoevents.ca \
     "docker exec elephanto_postgres psql -U elephanto -d elephanto_events -c 'SELECT 1;'"
   ```

### Container Management

```bash
# View all containers
ssh -i ~/Downloads/ssh-key-2025-08-02.key ubuntu@elephantoevents.ca "docker ps -a"

# Restart all services
ssh -i ~/Downloads/ssh-key-2025-08-02.key ubuntu@elephantoevents.ca \
  "cd /opt/elephanto-events/elephanto-events && docker-compose down && docker-compose up -d"

# Check container logs
ssh -i ~/Downloads/ssh-key-2025-08-02.key ubuntu@elephantoevents.ca "docker logs [container_name] --tail=20"
```

## Rollback Procedure

If deployment fails:

```bash
# List available Docker images
docker images | grep anchoo2kewl/elephanto

# Deploy previous version
ssh -i ~/Downloads/ssh-key-2025-08-02.key ubuntu@elephantoevents.ca \
  "docker stop elephanto_backend && \
   docker rm elephanto_backend && \
   docker run -d --name elephanto_backend \
   --network elephanto-events_elephanto_network \
   --env-file /opt/elephanto-events/elephanto-events/.env \
   -p 8080:8080 anchoo2kewl/elephanto-events-backend:[previous_tag]"
```

## Production URLs

- **Primary**: https://velvethour.ca
- **Secondary**: https://elephantoevents.ca
- **Backend API**: https://velvethour.ca/api
- **Admin Panel**: https://velvethour.ca (login required)

## Support Commands

```bash
# Check website status
curl -I https://velvethour.ca

# Test API health
curl -X GET "https://velvethour.ca/api/health" -s

# Check active event
curl -X GET "https://velvethour.ca/api/events/active" -s | jq .

# Monitor backend logs in real-time
ssh -i ~/Downloads/ssh-key-2025-08-02.key ubuntu@elephantoevents.ca "docker logs elephanto_backend --follow"
```

---

**Note**: Always test changes in local development environment before deploying to production. Use the `./dev.sh` script for local development management.