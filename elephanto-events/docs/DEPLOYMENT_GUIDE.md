# ElephantTO Events - Complete Deployment Guide

## 🏠 Local Development

### Quick Start
```bash
# Clone and setup
git clone <repo>
cd elephanto-events

# Run setup script (installs deps, starts services)
./dev-setup.sh

# Option 1: Run with Docker Compose (recommended)
docker-compose up -d

# Option 2: Run natively (requires setup script first)
# Terminal 1: Backend
cd backend && go run main.go

# Terminal 2: Frontend  
cd frontend && npm run dev
```

### Local Service Ports
| Service | Port | URL |
|---------|------|-----|
| Frontend | 3000 | http://localhost:3000 |
| Backend | 8080 | http://localhost:8080 |
| PostgreSQL | 5432 | localhost:5432 |
| Mailpit Web | 8025 | http://localhost:8025 |
| Mailpit SMTP | 1025 | localhost:1025 |

### Environment Configuration

#### For Docker Compose (`.env`)
```bash
# Uses Docker service names
DATABASE_URL=postgres://elephanto:elephanto123@postgres:5432/elephanto_events?sslmode=disable
SMTP_HOST=mailpit
FRONTEND_URL=http://localhost:3000
```

#### For Native Go (`backend/.env` - auto-created by setup script)
```bash
# Uses localhost
DATABASE_URL=postgres://elephanto:elephanto123@localhost:5432/elephanto_events?sslmode=disable
SMTP_HOST=localhost
FRONTEND_URL=http://localhost:3000
```

## 🚀 Production Deployment

### Architecture Overview
```
Internet → VM Nginx (SSL) → Docker Containers
├── velvethour.ca:443 → nginx:80/443 → frontend:3000
├── elephantoevents.ca:443 → nginx:80/443 → frontend:3000
└── both domains/api → nginx → backend:8080
```

### 1. Development & Git Workflow
```bash
# Make changes locally
git add .
git commit -m "Your feature description

🤖 Generated with [Claude Code](https://claude.ai/code)

Co-Authored-By: Claude <noreply@anthropic.com>"

git push origin main
```

### 2. Build & Push Docker Images

#### Backend
```bash
# Build from project root (important!)
docker build -t anchoo2kewl/elephanto-backend:latest -f backend/Dockerfile .
docker push anchoo2kewl/elephanto-backend:latest
```

#### Frontend (with runtime configuration)
```bash
# Build with empty API_URL for runtime config
docker build -t anchoo2kewl/elephanto-frontend:production \
  --build-arg VITE_API_URL= \
  frontend/

docker push anchoo2kewl/elephanto-frontend:production
```

### 3. Production Deployment Commands

#### SSH into Production VM
```bash
ssh -i ~/Downloads/ssh-key-2025-08-02.key ubuntu@elephantoevents.ca
```

#### Deploy Updated Services
```bash
cd /opt/elephanto-events/elephanto-events

# Full restart (safest)
docker-compose -f docker-compose.prod.yml down
docker-compose -f docker-compose.prod.yml pull
docker-compose -f docker-compose.prod.yml up -d

# Individual service update
docker-compose -f docker-compose.prod.yml pull backend
docker-compose -f docker-compose.prod.yml stop backend
docker-compose -f docker-compose.prod.yml rm -f backend  
docker-compose -f docker-compose.prod.yml up -d backend
```

## 🔧 Configuration Details

### Multi-Domain Support Implementation

#### Production Environment (`/opt/elephanto-events/elephanto-events/.env`)
```bash
# Multi-domain CORS support
FRONTEND_URL=https://velvethour.ca,https://elephantoevents.ca

# Empty API_URL enables runtime configuration
API_URL=

# Other production settings
DATABASE_URL=postgres://elephanto:elephanto123@postgres:5432/elephanto_events?sslmode=disable
EMAIL_SERVICE=mailpit
JWT_SECRET=production-jwt-secret-change-me
```

#### Runtime Configuration System
The frontend uses **runtime configuration** instead of build-time to support multiple domains:

1. **Container Startup** generates `config.js`:
   ```javascript
   window.__APP_CONFIG__ = {
     API_URL: "" // Empty means use current domain
   };
   ```

2. **Frontend API Detection** (`frontend/src/services/api.ts`):
   ```typescript
   const getAPIURL = () => {
     // Check runtime config first
     if (typeof window !== 'undefined' && (window as any).__APP_CONFIG__?.API_URL !== undefined) {
       return (window as any).__APP_CONFIG__.API_URL;
     }
     // Fallback to build-time config
     return (import.meta as any).env.VITE_API_URL || 'http://localhost:8080';
   };
   ```

3. **Backend CORS** supports comma-separated domains:
   ```go
   allowedOrigins := strings.Split(frontendURLs, ",")
   ```

4. **Email Links** use request origin:
   ```go
   // Extract Origin header → pass through auth service → use in email links
   magicLink := fmt.Sprintf("%s/verify?token=%s", origin, token)
   ```

### VM Nginx Configuration
```nginx
# /etc/nginx/conf.d/elephanto-events.conf
server {
    listen 443 ssl http2;
    server_name velvethour.ca elephantoevents.ca;
    
    ssl_certificate /etc/letsencrypt/live/velvethour.ca/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/velvethour.ca/privkey.pem;
    
    # Frontend
    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
    
    # Backend API
    location /api/ {
        proxy_pass http://localhost:8080/api/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;  
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

## 🔍 Debugging & Monitoring

### Service Health Checks
```bash
# Check all containers
docker-compose -f docker-compose.prod.yml ps

# Service logs
docker logs elephanto_backend --tail 50 -f
docker logs elephanto_frontend --tail 50 -f

# Test endpoints
curl https://velvethour.ca/api/health
curl https://elephantoevents.ca/api/health
```

### Test Multi-Domain Login
```bash
# Test from velvethour.ca
curl -X POST https://velvethour.ca/api/auth/request-login \
  -H "Content-Type: application/json" \
  -H "Origin: https://velvethour.ca" \
  -d '{"email": "test@velvethour.ca"}'

# Test from elephantoevents.ca
curl -X POST https://elephantoevents.ca/api/auth/request-login \
  -H "Content-Type: application/json" \
  -H "Origin: https://elephantoevents.ca" \
  -d '{"email": "test@elephanto.ca"}'
```

### Check Email Links (SSH to VM)
```bash
# Get recent emails
curl -s http://localhost:8025/api/v1/messages | jq '.messages[0:2] | .[] | {from, to, subject, created: .Created}'

# Extract magic links from specific email
curl -s "http://localhost:8025/api/v1/message/MESSAGE_ID" | jq -r '.HTML' | grep -o 'https://[^/]*/verify?token=[^"]*'
```

### SSL Certificate Management
```bash
# Check certificates
sudo certbot certificates

# Test renewal
sudo certbot renew --dry-run

# Reload nginx
sudo systemctl reload nginx
```

### Database Access
```bash
# Connect to database
docker exec -it elephanto_postgres psql -U elephanto -d elephanto_events

# Useful queries
SELECT u.email, at.token, at.created_at, at.expires_at 
FROM authTokens at 
JOIN users u ON at.userId = u.id 
ORDER BY at.created_at DESC LIMIT 5;
```

## 🚨 Troubleshooting Common Issues

### 1. "SSL is not enabled on the server"
- Running `go run main.go` without starting PostgreSQL first
- **Fix**: Run `./dev-setup.sh services` or `docker-compose up -d postgres`

### 2. Frontend shows localhost:8080 in production  
- Build-time API URL baked into image
- **Fix**: Rebuild frontend with `--build-arg VITE_API_URL=`

### 3. CORS errors on one domain
- Backend FRONTEND_URL not properly comma-separated
- **Fix**: Ensure `FRONTEND_URL=https://domain1.com,https://domain2.com` (no spaces)

### 4. Wrong email domain in magic links
- Backend not receiving Origin header
- **Fix**: Check nginx proxy headers include `X-Forwarded-*`

### 5. Docker build fails "backend: not found"
- Building from wrong directory
- **Fix**: Build from project root: `docker build -f backend/Dockerfile .`