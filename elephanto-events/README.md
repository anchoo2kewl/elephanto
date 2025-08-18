# ✨ Velvet Hour Events

**Where Connection Meets Intention**

Velvet Hour Events is a modern full-stack web application for exclusive South Asian networking events in Toronto. Built with Go backend, React frontend, and featuring a sophisticated dark theme with gold accents, plus comprehensive attendee management features.

## ✨ Features

- 🔐 **Magic Link Authentication** - Passwordless login via email
- 🎨 **Modern UI** - Sophisticated dark theme with gold accents and glassmorphism effects
- 👥 **User Management** - Complete profile system with streamlined onboarding
- 🍸 **Cocktail Preferences** - Attendee drink selection with database persistence
- 📋 **Comprehensive Surveys** - Detailed attendee information collection
- 🗺️ **Google Maps Integration** - Venue location with embedded maps
- 🔔 **Toast Notifications** - Modern notification system replacing browser alerts
- ⏰ **Event Countdown** - Real-time countdown to event date
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
├── docs/                      # 📚 Documentation (ALL PRDs go here)
│   ├── VELVET_HOUR_REDESIGN_PRD.md  # Complete redesign documentation
│   ├── DEPLOYMENT_GUIDE.md          # Production deployment guide
│   ├── SECURITY_ALERT.md            # Security best practices
│   └── domain-migration-prd.md      # Domain migration documentation
├── backend/                   # Go backend
│   ├── Dockerfile
│   ├── main.go               # Application entry point
│   ├── config/               # Configuration management
│   ├── db/                   # Database and migrations
│   ├── handlers/             # HTTP request handlers
│   │   ├── cocktail_preference.go   # Cocktail selection API
│   │   └── survey_response.go       # Survey management API
│   ├── middleware/           # Authentication & CORS
│   ├── models/               # Data models
│   │   ├── cocktail_preference.go   # Cocktail preference model
│   │   └── survey_response.go       # Survey response model
│   ├── services/             # Business logic
│   │   ├── cocktail_preference.go   # Cocktail business logic
│   │   └── survey_response.go       # Survey business logic
│   └── utils/                # Utilities (JWT, crypto)
├── frontend/                 # React frontend
│   ├── Dockerfile
│   ├── src/
│   │   ├── components/       # Reusable components
│   │   │   ├── CocktailDialog.tsx   # Drink selection modal
│   │   │   ├── SurveyDialog.tsx     # Attendee survey form
│   │   │   ├── Toast.tsx            # Notification system
│   │   │   ├── CountdownTimer.tsx   # Event countdown
│   │   │   ├── GoogleMap.tsx        # Venue maps
│   │   │   └── VelvetHourLogo.tsx   # Brand logo component
│   │   ├── pages/           # Route components
│   │   ├── contexts/        # React contexts
│   │   ├── services/        # API client
│   │   │   ├── cocktailApi.ts       # Cocktail API client
│   │   │   └── surveyApi.ts         # Survey API client
│   │   └── types/           # TypeScript types
│   └── public/
│       └── images/          # Logo assets
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

### Event Features (Protected)
- `GET /api/cocktail-preference` - Get user's cocktail preference
- `POST /api/cocktail-preference` - Save/update cocktail preference
- `GET /api/survey-response` - Get user's survey response
- `POST /api/survey-response` - Submit survey response (one-time only)

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

## 📚 Documentation Guidelines

### Product Requirements Documents (PRDs)
**⚠️ IMPORTANT**: All Product Requirements Documents (PRDs) must be created in the `/docs` directory.

When creating documentation:
- **PRDs**: Always save to `docs/[FEATURE_NAME]_PRD.md`
- **Technical Specs**: Save to `docs/[COMPONENT_NAME]_SPEC.md` 
- **Deployment Guides**: Save to `docs/[ENVIRONMENT]_DEPLOYMENT_GUIDE.md`
- **Security Docs**: Save to `docs/SECURITY_[TOPIC].md`

### Existing Documentation
- `docs/VELVET_HOUR_REDESIGN_PRD.md` - Complete application redesign documentation
- `docs/DEPLOYMENT_GUIDE.md` - Production deployment instructions  
- `docs/SECURITY_ALERT.md` - Security best practices and guidelines
- `docs/domain-migration-prd.md` - Domain migration documentation

### Documentation Standards
- Use clear, descriptive filenames in UPPER_CASE
- Include comprehensive technical details and implementation notes
- Document all API endpoints, database schema changes, and UI components
- Include before/after comparisons for redesigns and migrations
- Add troubleshooting sections for deployment guides

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. **Document changes** in appropriate files in `/docs` directory
5. Test thoroughly
6. Submit a pull request

## 📄 License

This project is licensed under the MIT License.

---

Built with ❤️ for the South Asian community in Toronto. Where connection meets intention! ✨🥂