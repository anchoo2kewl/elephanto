#!/bin/bash
set -e

echo "🐘🗼 ElephantTO Events - Local Development Setup"
echo "=============================================="

# Function to check if a command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Check requirements
echo "📋 Checking requirements..."
if ! command_exists docker; then
    echo "❌ Docker is required but not installed"
    exit 1
fi

if ! command_exists docker-compose; then
    echo "❌ Docker Compose is required but not installed"
    exit 1
fi

if ! command_exists go; then
    echo "❌ Go is required but not installed"
    exit 1
fi

if ! command_exists npm; then
    echo "❌ npm is required but not installed"
    exit 1
fi

echo "✅ All requirements met"

# Setup function
setup_services() {
    echo ""
    echo "🚀 Starting infrastructure services..."
    
    # Start only postgres and mailpit
    docker-compose up -d postgres mailpit
    
    echo "⏳ Waiting for PostgreSQL to be ready..."
    until docker-compose exec -T postgres pg_isready -U elephanto -d elephanto_events; do
        sleep 2
    done
    
    echo "✅ Infrastructure services started:"
    echo "   📊 PostgreSQL: localhost:5432"
    echo "   📧 Mailpit Web UI: http://localhost:8025"
    echo "   📧 Mailpit SMTP: localhost:1025"
}

# Copy env file
setup_env() {
    echo ""
    echo "📝 Setting up environment..."
    if [ ! -f backend/.env ]; then
        cp .env.local backend/.env
        echo "✅ Created backend/.env from .env.local"
    else
        echo "⚠️  backend/.env already exists"
    fi
}

# Install dependencies
setup_deps() {
    echo ""
    echo "📦 Installing dependencies..."
    
    # Backend dependencies
    echo "   Installing Go modules..."
    cd backend && go mod download && cd ..
    
    # Frontend dependencies
    echo "   Installing npm packages..."
    cd frontend && npm install && cd ..
    
    echo "✅ Dependencies installed"
}

# Main setup
main() {
    case "${1:-all}" in
        "services")
            setup_services
            ;;
        "env")
            setup_env
            ;;
        "deps")
            setup_deps
            ;;
        "all")
            setup_services
            setup_env
            setup_deps
            echo ""
            echo "🎉 Setup complete! You can now run:"
            echo ""
            echo "   Backend:  cd backend && go run main.go"
            echo "   Frontend: cd frontend && npm run dev"
            echo ""
            echo "   Or use Docker Compose: docker-compose up -d"
            ;;
        *)
            echo "Usage: $0 [services|env|deps|all]"
            echo ""
            echo "  services  - Start infrastructure (postgres, mailpit)"
            echo "  env       - Setup environment files"
            echo "  deps      - Install dependencies"
            echo "  all       - Run all setup steps (default)"
            ;;
    esac
}

main "$@"