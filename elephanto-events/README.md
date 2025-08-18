# 🐘🗼 ElephantTO Events

**Making memories, one event at a time in Toronto**

ElephantTO Events is a modern full-stack web application for discovering and managing events in Toronto. Built with Go backend, React frontend, and featuring a beautiful glassmorphism design with email-based authentication.

## ✨ Features

- 🔐 **Magic Link Authentication** - Passwordless login via email
- 🎨 **Glassmorphism UI** - Beautiful modern design with dark/light mode
- 👥 **User Management** - Complete profile system with onboarding
- 👑 **Admin Panel** - User role management and system monitoring
- 📧 **Email Service** - Mailpit for development, Brevo for production
- 🐳 **Docker Ready** - Complete containerization with Docker Compose
- 🗄️ **Database Migrations** - Automated PostgreSQL migrations
- 🔒 **Security** - JWT tokens, CORS, rate limiting, and XSS protection

## 🏗️ Architecture

### Technology Stack
- **Backend**: Go 1.21 with Gorilla Mux
- **Frontend**: React 18 with TypeScript and Vite
- **Database**: PostgreSQL 15 with UUID primary keys
- **Email**: Brevo (production) / Mailpit (development)
- **Styling**: Tailwind CSS with glassmorphism effects
- **Container**: Docker Compose with 4 services

### Project Structure
```
elephanto-events/
├── docker-compose.yml          # Container orchestration
├── .env.example               # Environment template
├── README.md                  # This file
├── backend/                   # Go backend
│   ├── Dockerfile
│   ├── main.go               # Application entry point
│   ├── config/               # Configuration management
│   ├── db/                   # Database and migrations
│   ├── handlers/             # HTTP request handlers
│   ├── middleware/           # Authentication & CORS
│   ├── models/               # Data models
│   ├── services/             # Business logic
│   └── utils/                # Utilities (JWT, crypto)
├── frontend/                 # React frontend
│   ├── Dockerfile
│   ├── src/
│   │   ├── components/       # Reusable components
│   │   ├── pages/           # Route components
│   │   ├── contexts/        # React contexts
│   │   ├── services/        # API client
│   │   └── types/           # TypeScript types
│   └── public/
└── postgres/                 # Database initialization
    └── init.sql
```

## 🚀 Quick Start

### Prerequisites
- Docker and Docker Compose
- Git

### 1. Clone and Setup
```bash
git clone <repository-url>
cd elephanto-events
cp .env.example .env
```

### 2. Start the Application
```bash
docker-compose up --build
```

The application will be available at:
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:8080
- **Mailpit (Email)**: http://localhost:8025
- **PostgreSQL**: localhost:5432

### 3. Create Admin User
1. Go to http://localhost:3000
2. Enter your email and click "Send Magic Link"
3. Check http://localhost:8025 for the email
4. Click the magic link to sign in
5. Complete the onboarding process
6. Manually promote to admin in database or use existing admin

## 🔧 Development

### 🎛️ Development Script (Recommended)

Use the `./dev.sh` script for easy local development:

```bash
# Start services individually or all at once
./dev.sh start infrastructure    # Only postgres + mailpit (Docker)
./dev.sh start backend          # Only Go backend (native)
./dev.sh start frontend         # Only React frontend (native)  
./dev.sh start all             # Everything

# Control services
./dev.sh stop backend          # Stop individual services
./dev.sh restart all           # Restart everything
./dev.sh status               # Show status + URLs + PIDs

# Monitor and debug
./dev.sh logs backend 50       # Show last 50 log lines
./dev.sh follow frontend       # Follow logs in real-time
./dev.sh test                 # Test all endpoints
./dev.sh cleanup              # Clean up PID/log files

# Docker Compose control
./dev.sh dc start             # Full Docker Compose
./dev.sh dc logs backend      # Docker Compose logs
./dev.sh dc stop              # Stop Docker Compose
```

### Environment Variables

Environment files are automatically managed by the dev script:
- `.env` - Docker Compose configuration
- `.env.local` - Native development (auto-created)
- `backend/.env` - Backend local config (auto-created)

### Manual Setup (Alternative)

If you prefer manual control:

#### Backend (Go)
```bash
cd backend
go mod download
go run main.go  # Requires postgres + mailpit running
```

#### Frontend (React)
```bash
cd frontend
npm install
npm run dev
```

### Database Migrations

The backend includes a migration system:

```bash
# Run migrations
go run main.go migrate up

# Check migration status
go run main.go migrate status

# Run migrations and start server
go run main.go
```

## 📡 API Endpoints

### Authentication
- `POST /api/auth/request-login` - Send magic link
- `GET /api/auth/verify?token={token}` - Verify magic link
- `GET /api/auth/me` - Get current user (protected)
- `POST /api/auth/logout` - Logout (protected)

### User Management
- `PUT /api/users/profile` - Update profile (protected)

### Admin (Admin Only)
- `GET /api/admin/users` - List all users
- `PUT /api/admin/users/:id/role` - Update user role
- `GET /api/admin/migrations` - Migration status

### System
- `GET /api/health` - Health check

## 🎨 UI Design

The application features a modern glassmorphism design with:
- **Glass Cards**: Translucent backgrounds with backdrop blur
- **Color Schemes**: 
  - Light mode: `bg-white/10` glass effects
  - Dark mode: `bg-white/5` glass effects
- **Animations**: Fade-in, slide-up, and floating effects
- **Responsive**: Mobile-first design
- **Theme Toggle**: Seamless light/dark mode switching

## 🔐 Security Features

- **Magic Link Authentication**: No passwords, secure email-based login
- **JWT Tokens**: Secure session management with expiration
- **CORS Protection**: Configured for frontend origin only
- **Rate Limiting**: Protection against brute force attacks
- **SQL Injection Prevention**: Parameterized queries
- **XSS Protection**: Content Security Policy headers
- **CSRF Protection**: SameSite cookies

## 🐳 Docker Configuration

The application uses a multi-service Docker setup:

- **postgres**: PostgreSQL 15 with data persistence
- **mailpit**: Local email testing server
- **backend**: Go application with auto-migrations
- **frontend**: React app served by Nginx

Each service includes health checks and proper networking.

## 📧 Email Configuration

### Development (Mailpit)
- Set `EMAIL_SERVICE=mailpit`
- Access emails at http://localhost:8025
- No API keys required

### Production (Brevo)
- Set `EMAIL_SERVICE=brevo`
- Add `BREVO_API_KEY` to environment
- Configure sender domain

## 🚀 Deployment

### Environment Setup
1. Copy `.env.example` to `.env`
2. Update all production values:
   - Strong JWT secret
   - Production database URL
   - Brevo API key for emails
   - Frontend production URL

### Docker Deployment
```bash
# Production build
docker-compose -f docker-compose.yml up -d --build

# Scale if needed
docker-compose up --scale backend=2
```

### Database Backups
```bash
# Backup
docker exec elephanto_postgres pg_dump -U elephanto elephanto_events > backup.sql

# Restore
docker exec -i elephanto_postgres psql -U elephanto elephanto_events < backup.sql
```

## 🧪 Testing

### Manual Testing Checklist
- [ ] User registration with magic link
- [ ] Email delivery and link verification
- [ ] Onboarding flow completion
- [ ] Profile updates
- [ ] Admin user management
- [ ] Theme switching
- [ ] Responsive design
- [ ] Database migrations

### API Testing
```bash
# Health check
curl http://localhost:8080/api/health

# Request login
curl -X POST http://localhost:8080/api/auth/request-login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com"}'
```

## 🔧 Troubleshooting

### Common Issues

**Database Connection Failed**
- Check PostgreSQL is running
- Verify DATABASE_URL format
- Ensure database exists

**Email Not Sending**
- For Mailpit: Check container is running on port 1025
- For Brevo: Verify API key and sender configuration

**Frontend Build Issues**
- Clear node_modules: `rm -rf node_modules package-lock.json && npm install`
- Check Node.js version (18+ required)

**Migration Errors**
- Check database connectivity
- Run migrations manually: `go run main.go migrate up`
- Reset if needed: Drop database and recreate

### Logs
```bash
# View all logs
docker-compose logs

# Specific service
docker-compose logs backend
docker-compose logs frontend
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License.

---

Built with ❤️ by the Elephanto team. Making memories, one event at a time! 🐘✨