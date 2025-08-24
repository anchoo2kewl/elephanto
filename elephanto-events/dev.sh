#!/bin/bash

# ElephantTO Events - Local Development Manager
# Usage: ./dev.sh [command] [options]

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Configuration
BACKEND_PORT=8080
FRONTEND_PORT=3000
POSTGRES_PORT=5432
MAILPIT_WEB_PORT=8025
MAILPIT_SMTP_PORT=1025

# PID file locations
BACKEND_PID_FILE=".dev_backend.pid"
FRONTEND_PID_FILE=".dev_frontend.pid"

# Log file locations
BACKEND_LOG_FILE=".dev_backend.log"
FRONTEND_LOG_FILE=".dev_frontend.log"

# Mode tracking
MODE_FILE=".dev_mode"

print_header() {
    echo -e "${BLUE}🐘🗼 ElephantTO Events - Development Manager${NC}"
    echo -e "${BLUE}==============================================${NC}"
}

# Port conflict detection
check_port_conflict() {
    local port="$1"
    local service_name="$2"
    
    # Check specifically for processes listening on the port (not just connections)
    if lsof -i ":$port" -s TCP:LISTEN >/dev/null 2>&1; then
        local process_info=$(lsof -i ":$port" -s TCP:LISTEN | tail -n 1)
        echo -e "${RED}❌ Port conflict detected!${NC}"
        echo -e "   Port $port (for $service_name) is already in use:"
        echo -e "   $process_info"
        return 1
    fi
    return 0
}

# Mode management
get_current_mode() {
    if [ -f "$MODE_FILE" ]; then
        cat "$MODE_FILE"
    else
        echo "none"
    fi
}

set_mode() {
    local mode="$1"
    echo "$mode" > "$MODE_FILE"
}

clear_mode() {
    rm -f "$MODE_FILE"
}

check_mode_conflict() {
    local new_mode="$1"
    local current_mode=$(get_current_mode)
    
    if [ "$current_mode" = "none" ]; then
        return 0  # No conflict
    fi
    
    if [ "$current_mode" = "$new_mode" ]; then
        return 0  # Same mode, no conflict
    fi
    
    # Different modes detected
    echo -e "${YELLOW}⚠️  Mode conflict detected!${NC}"
    echo -e "   Current mode: ${CYAN}$current_mode${NC}"
    echo -e "   Requested mode: ${CYAN}$new_mode${NC}"
    echo ""
    echo -e "${YELLOW}You cannot run both native and Docker modes simultaneously.${NC}"
    echo -e "Choose one of the following:"
    echo -e "  1. Stop current services: ${GREEN}./dev.sh stop all${NC}"
    echo -e "  2. Use current mode: ${GREEN}./dev.sh status${NC}"
    echo ""
    return 1
}

show_mode_status() {
    local current_mode=$(get_current_mode)
    case "$current_mode" in
        "native")
            echo -e "   ${CYAN}Mode: Native Development${NC} (Backend + Frontend native, Infrastructure Docker)"
            ;;
        "docker")
            echo -e "   ${CYAN}Mode: Full Docker${NC} (All services in containers)"
            ;;
        "none")
            echo -e "   ${CYAN}Mode: None${NC} (No services running)"
            ;;
        *)
            echo -e "   ${CYAN}Mode: Unknown${NC}"
            ;;
    esac
}

print_status() {
    echo -e "${CYAN}📊 Service Status${NC}"
    echo "----------------"
    show_mode_status
    echo ""
    
    # Check Docker services
    echo -e "${YELLOW}Infrastructure (Docker):${NC}"
    if docker-compose ps postgres 2>/dev/null | grep -q "Up"; then
        echo -e "  ✅ PostgreSQL: ${GREEN}Running${NC} (localhost:${POSTGRES_PORT})"
    else
        echo -e "  ❌ PostgreSQL: ${RED}Stopped${NC}"
    fi
    
    if docker-compose ps mailpit 2>/dev/null | grep -q "Up"; then
        echo -e "  ✅ Mailpit: ${GREEN}Running${NC} (web: localhost:${MAILPIT_WEB_PORT}, smtp: localhost:${MAILPIT_SMTP_PORT})"
    else
        echo -e "  ❌ Mailpit: ${RED}Stopped${NC}"
    fi
    
    # Check native services
    echo -e "${YELLOW}Application (Native):${NC}"
    if [ -f "$BACKEND_PID_FILE" ] && kill -0 $(cat "$BACKEND_PID_FILE") 2>/dev/null; then
        echo -e "  ✅ Backend: ${GREEN}Running${NC} (localhost:${BACKEND_PORT}) - PID: $(cat $BACKEND_PID_FILE)"
    else
        echo -e "  ❌ Backend: ${RED}Stopped${NC}"
    fi
    
    if [ -f "$FRONTEND_PID_FILE" ] && kill -0 $(cat "$FRONTEND_PID_FILE") 2>/dev/null; then
        echo -e "  ✅ Frontend: ${GREEN}Running${NC} (localhost:${FRONTEND_PORT}) - PID: $(cat $FRONTEND_PID_FILE)"
    else
        echo -e "  ❌ Frontend: ${RED}Stopped${NC}"
    fi
    
    echo ""
}

print_urls() {
    echo -e "${CYAN}🌐 Service URLs${NC}"
    echo "---------------"
    echo -e "Frontend:    ${GREEN}http://localhost:${FRONTEND_PORT}${NC}"
    echo -e "Backend API: ${GREEN}http://localhost:${BACKEND_PORT}/api${NC}"
    echo -e "Database:    ${GREEN}localhost:${POSTGRES_PORT}${NC}"
    echo -e "Mailpit Web: ${GREEN}http://localhost:${MAILPIT_WEB_PORT}${NC}"
    echo -e "Mailpit SMTP: ${GREEN}localhost:${MAILPIT_SMTP_PORT}${NC}"
    echo ""
}

check_requirements() {
    local missing=0
    
    if ! command -v docker &> /dev/null; then
        echo -e "${RED}❌ Docker is required but not installed${NC}"
        missing=1
    fi
    
    if ! command -v docker-compose &> /dev/null; then
        echo -e "${RED}❌ Docker Compose is required but not installed${NC}"
        missing=1
    fi
    
    if ! command -v go &> /dev/null; then
        echo -e "${RED}❌ Go is required but not installed${NC}"
        missing=1
    fi
    
    if ! command -v npm &> /dev/null; then
        echo -e "${RED}❌ npm is required but not installed${NC}"
        missing=1
    fi
    
    if [ $missing -eq 1 ]; then
        exit 1
    fi
}

setup_env() {
    echo -e "${YELLOW}📝 Setting up environment...${NC}"
    
    # Create backend .env if it doesn't exist
    if [ ! -f "backend/.env" ]; then
        if [ -f ".env.local" ]; then
            cp .env.local backend/.env
            echo -e "  ✅ Created backend/.env from .env.local"
        else
            echo -e "${RED}❌ No .env.local found. Run setup first.${NC}"
            exit 1
        fi
    else
        echo -e "  ℹ️  backend/.env already exists"
    fi
}

start_infrastructure() {
    echo -e "${YELLOW}🚀 Starting infrastructure services...${NC}"
    
    # Start postgres and mailpit
    docker-compose up -d postgres mailpit
    
    # Wait for postgres
    echo -e "  ⏳ Waiting for PostgreSQL..."
    until docker-compose exec -T postgres pg_isready -U elephanto -d elephanto_events &>/dev/null; do
        sleep 1
    done
    
    echo -e "  ✅ Infrastructure started"
}

stop_infrastructure() {
    echo -e "${YELLOW}🛑 Stopping infrastructure services...${NC}"
    docker-compose stop postgres mailpit
    echo -e "  ✅ Infrastructure stopped"
}

start_backend() {
    # Check mode conflict
    if ! check_mode_conflict "native"; then
        return 1
    fi
    
    # Check if already running
    if [ -f "$BACKEND_PID_FILE" ] && kill -0 $(cat "$BACKEND_PID_FILE") 2>/dev/null; then
        echo -e "${YELLOW}  ⚠️  Backend already running (PID: $(cat $BACKEND_PID_FILE))${NC}"
        return
    fi
    
    # Check port conflict
    if ! check_port_conflict "$BACKEND_PORT" "backend"; then
        return 1
    fi
    
    echo -e "${YELLOW}🚀 Starting backend with hot reload (native mode)...${NC}"
    
    # Ensure infrastructure is running
    if ! docker-compose ps postgres 2>/dev/null | grep -q "Up"; then
        echo -e "  📋 PostgreSQL not running, starting infrastructure..."
        start_infrastructure
    fi
    
    # Setup environment
    setup_env
    
    # Set mode
    set_mode "native"
    
    # Check if air (Go hot reload) is available
    if command -v air &> /dev/null; then
        echo -e "  🔥 Using air for hot reload..."
        cd backend
        air > "../$BACKEND_LOG_FILE" 2>&1 &
        echo $! > "../$BACKEND_PID_FILE"
        cd ..
    else
        echo -e "  ⚠️  air not found, using standard go run (no hot reload)..."
        cd backend
        go run main.go > "../$BACKEND_LOG_FILE" 2>&1 &
        echo $! > "../$BACKEND_PID_FILE"
        cd ..
    fi
    
    # Wait for backend to start
    sleep 3
    if curl -s http://localhost:$BACKEND_PORT/api/health > /dev/null 2>&1; then
        echo -e "  ✅ Backend started with hot reload (PID: $(cat $BACKEND_PID_FILE))"
    else
        echo -e "  ❌ Backend failed to start. Check logs: ./dev.sh logs backend"
        rm -f "$BACKEND_PID_FILE"
    fi
}

stop_backend() {
    local stopped=false
    
    # First, try to stop via PID file
    if [ -f "$BACKEND_PID_FILE" ]; then
        local pid=$(cat "$BACKEND_PID_FILE")
        if kill -0 "$pid" 2>/dev/null; then
            echo -e "${YELLOW}🛑 Stopping backend (PID: $pid)...${NC}"
            kill "$pid"
            rm -f "$BACKEND_PID_FILE"
            echo -e "  ✅ Backend stopped"
            stopped=true
        else
            echo -e "  ⚠️  Backend PID file exists but process not running"
            rm -f "$BACKEND_PID_FILE"
        fi
    fi
    
    # Check for orphaned processes on the backend port
    if lsof -ti ":$BACKEND_PORT" >/dev/null 2>&1; then
        local port_pids=$(lsof -ti ":$BACKEND_PORT")
        if [ -n "$port_pids" ]; then
            echo -e "${YELLOW}🛑 Found orphaned processes on port $BACKEND_PORT, cleaning up...${NC}"
            for pid in $port_pids; do
                # Check if it's our Go process (main or go run)
                if ps -p "$pid" -o command= | grep -q -E "(main|go run)"; then
                    echo -e "  🧹 Killing orphaned backend process (PID: $pid)"
                    kill "$pid" 2>/dev/null || true
                    stopped=true
                fi
            done
        fi
    fi
    
    if [ "$stopped" = false ]; then
        echo -e "  ⚠️  Backend not running"
    fi
    
    # Check if all services are stopped
    check_all_services_stopped
}

start_frontend() {
    # Check mode conflict
    if ! check_mode_conflict "native"; then
        return 1
    fi
    
    # Check if already running
    if [ -f "$FRONTEND_PID_FILE" ] && kill -0 $(cat "$FRONTEND_PID_FILE") 2>/dev/null; then
        echo -e "${YELLOW}  ⚠️  Frontend already running (PID: $(cat $FRONTEND_PID_FILE))${NC}"
        return
    fi
    
    # Check port conflict
    if ! check_port_conflict "$FRONTEND_PORT" "frontend"; then
        return 1
    fi
    
    echo -e "${YELLOW}🚀 Starting frontend with hot reload (native mode)...${NC}"
    
    # Check if node_modules exists
    if [ ! -d "frontend/node_modules" ]; then
        echo -e "  📦 Installing npm dependencies..."
        cd frontend && npm install && cd ..
    fi
    
    # Set mode
    set_mode "native"
    
    # Start frontend in background
    cd frontend
    npm run dev > "../$FRONTEND_LOG_FILE" 2>&1 &
    echo $! > "../$FRONTEND_PID_FILE"
    cd ..
    
    echo -e "  ✅ Frontend started with hot reload (PID: $(cat $FRONTEND_PID_FILE))"
    echo -e "  ⏳ Frontend will be available at http://localhost:$FRONTEND_PORT"
}

stop_frontend() {
    if [ -f "$FRONTEND_PID_FILE" ]; then
        local pid=$(cat "$FRONTEND_PID_FILE")
        if kill -0 "$pid" 2>/dev/null; then
            echo -e "${YELLOW}🛑 Stopping frontend (PID: $pid)...${NC}"
            kill "$pid"
            rm -f "$FRONTEND_PID_FILE"
            echo -e "  ✅ Frontend stopped"
        else
            echo -e "  ⚠️  Frontend not running"
            rm -f "$FRONTEND_PID_FILE"
        fi
    else
        echo -e "  ⚠️  Frontend not running"
    fi
    
    # Check if all services are stopped
    check_all_services_stopped
}

show_logs() {
    local service="$1"
    local lines="${2:-50}"
    
    case "$service" in
        "backend")
            if [ -f "$BACKEND_LOG_FILE" ]; then
                echo -e "${CYAN}📋 Backend Logs (last $lines lines):${NC}"
                tail -n "$lines" "$BACKEND_LOG_FILE"
            else
                echo -e "${RED}❌ No backend log file found${NC}"
            fi
            ;;
        "frontend")
            if [ -f "$FRONTEND_LOG_FILE" ]; then
                echo -e "${CYAN}📋 Frontend Logs (last $lines lines):${NC}"
                tail -n "$lines" "$FRONTEND_LOG_FILE"
            else
                echo -e "${RED}❌ No frontend log file found${NC}"
            fi
            ;;
        "postgres")
            echo -e "${CYAN}📋 PostgreSQL Logs (last $lines lines):${NC}"
            docker-compose logs --tail="$lines" postgres
            ;;
        "mailpit")
            echo -e "${CYAN}📋 Mailpit Logs (last $lines lines):${NC}"
            docker-compose logs --tail="$lines" mailpit
            ;;
        *)
            echo -e "${RED}❌ Unknown service: $service${NC}"
            echo "Available services: backend, frontend, postgres, mailpit"
            ;;
    esac
}

follow_logs() {
    local service="$1"
    
    case "$service" in
        "backend")
            if [ -f "$BACKEND_LOG_FILE" ]; then
                echo -e "${CYAN}📋 Following Backend Logs (Ctrl+C to stop):${NC}"
                tail -f "$BACKEND_LOG_FILE"
            else
                echo -e "${RED}❌ No backend log file found${NC}"
            fi
            ;;
        "frontend")
            if [ -f "$FRONTEND_LOG_FILE" ]; then
                echo -e "${CYAN}📋 Following Frontend Logs (Ctrl+C to stop):${NC}"
                tail -f "$FRONTEND_LOG_FILE"
            else
                echo -e "${RED}❌ No frontend log file found${NC}"
            fi
            ;;
        "postgres")
            echo -e "${CYAN}📋 Following PostgreSQL Logs (Ctrl+C to stop):${NC}"
            docker-compose logs -f postgres
            ;;
        "mailpit")
            echo -e "${CYAN}📋 Following Mailpit Logs (Ctrl+C to stop):${NC}"
            docker-compose logs -f mailpit
            ;;
        *)
            echo -e "${RED}❌ Unknown service: $service${NC}"
            echo "Available services: backend, frontend, postgres, mailpit"
            ;;
    esac
}

cleanup() {
    echo -e "${YELLOW}🧹 Cleaning up...${NC}"
    rm -f "$BACKEND_PID_FILE" "$FRONTEND_PID_FILE"
    rm -f "$BACKEND_LOG_FILE" "$FRONTEND_LOG_FILE"
    clear_mode
    echo -e "  ✅ Cleanup complete"
}

check_all_services_stopped() {
    local native_stopped=true
    local docker_stopped=true
    
    # Check native services
    if [ -f "$BACKEND_PID_FILE" ] && kill -0 $(cat "$BACKEND_PID_FILE") 2>/dev/null; then
        native_stopped=false
    fi
    if [ -f "$FRONTEND_PID_FILE" ] && kill -0 $(cat "$FRONTEND_PID_FILE") 2>/dev/null; then
        native_stopped=false
    fi
    
    # Check Docker services
    if docker-compose ps 2>/dev/null | grep -q "Up"; then
        docker_stopped=false
    fi
    
    # Clear mode if all services are stopped
    if [ "$native_stopped" = true ] && [ "$docker_stopped" = true ]; then
        clear_mode
    fi
}

test_services() {
    echo -e "${CYAN}🧪 Testing Services${NC}"
    echo "------------------"
    
    # Test backend
    if curl -s http://localhost:$BACKEND_PORT/api/health > /dev/null 2>&1; then
        echo -e "  ✅ Backend API: ${GREEN}Responding${NC}"
    else
        echo -e "  ❌ Backend API: ${RED}Not responding${NC}"
    fi
    
    # Test frontend (check if port is listening)
    if nc -z localhost $FRONTEND_PORT 2>/dev/null; then
        echo -e "  ✅ Frontend: ${GREEN}Port open${NC}"
    else
        echo -e "  ❌ Frontend: ${RED}Port closed${NC}"
    fi
    
    # Test postgres
    if docker-compose exec -T postgres pg_isready -U elephanto -d elephanto_events &>/dev/null; then
        echo -e "  ✅ PostgreSQL: ${GREEN}Ready${NC}"
    else
        echo -e "  ❌ PostgreSQL: ${RED}Not ready${NC}"
    fi
    
    # Test mailpit
    if curl -s http://localhost:$MAILPIT_WEB_PORT > /dev/null 2>&1; then
        echo -e "  ✅ Mailpit: ${GREEN}Responding${NC}"
    else
        echo -e "  ❌ Mailpit: ${RED}Not responding${NC}"
    fi
}

docker_compose_cmd() {
    local action="$1"
    local service="$2"
    local option="$3"
    
    case "$action" in
        "start"|"up")
            # Check mode conflict for full Docker mode
            if [ -z "$service" ] || [ "$service" = "all" ]; then
                if ! check_mode_conflict "docker"; then
                    return 1
                fi
                
                # Check for port conflicts with key services
                if ! check_port_conflict "$BACKEND_PORT" "backend (Docker)"; then
                    return 1
                fi
                if ! check_port_conflict "$FRONTEND_PORT" "frontend (Docker)"; then
                    return 1
                fi
            fi
            
            echo -e "${YELLOW}🐳 Starting Docker Compose services...${NC}"
            if [ -n "$service" ] && [ "$service" != "all" ]; then
                docker-compose up -d "$service"
            else
                set_mode "docker"
                docker-compose up -d
            fi
            docker-compose ps
            ;;
        "stop"|"down")
            echo -e "${YELLOW}🛑 Stopping Docker Compose services...${NC}"
            if [ -n "$service" ] && [ "$service" != "all" ]; then
                docker-compose stop "$service"
            else
                docker-compose down
                # Check if all services are stopped to clear mode
                check_all_services_stopped
            fi
            ;;
        "restart")
            echo -e "${YELLOW}🔄 Restarting Docker Compose services...${NC}"
            if [ -n "$service" ] && [ "$service" != "all" ]; then
                docker-compose restart "$service"
            else
                docker-compose restart
            fi
            docker-compose ps
            ;;
        "logs")
            local lines="${option:-50}"
            if [ -n "$service" ] && [ "$service" != "all" ]; then
                echo -e "${CYAN}📋 Docker Compose Logs for $service (last $lines lines):${NC}"
                docker-compose logs --tail="$lines" "$service"
            else
                echo -e "${CYAN}📋 Docker Compose Logs (last $lines lines):${NC}"
                docker-compose logs --tail="$lines"
            fi
            ;;
        "follow")
            if [ -n "$service" ] && [ "$service" != "all" ]; then
                echo -e "${CYAN}📋 Following Docker Compose Logs for $service (Ctrl+C to stop):${NC}"
                docker-compose logs -f "$service"
            else
                echo -e "${CYAN}📋 Following Docker Compose Logs (Ctrl+C to stop):${NC}"
                docker-compose logs -f
            fi
            ;;
        "status"|"ps")
            echo -e "${CYAN}🐳 Docker Compose Status:${NC}"
            docker-compose ps
            ;;
        "build")
            echo -e "${YELLOW}🔨 Building Docker Compose services...${NC}"
            if [ -n "$service" ] && [ "$service" != "all" ]; then
                docker-compose build "$service"
            else
                docker-compose build
            fi
            ;;
        "exec")
            if [ -z "$service" ]; then
                echo -e "${RED}❌ Please specify service for exec${NC}"
                echo "Example: ./dev.sh dc exec backend bash"
                return 1
            fi
            local cmd="${option:-bash}"
            echo -e "${CYAN}🔧 Executing '$cmd' in $service container:${NC}"
            docker-compose exec "$service" $cmd
            ;;
        *)
            echo -e "${RED}❌ Unknown Docker Compose action: $action${NC}"
            echo ""
            echo -e "${YELLOW}Available Docker Compose actions:${NC}"
            echo "  start/up [service]    Start services"
            echo "  stop/down [service]   Stop services"
            echo "  restart [service]     Restart services" 
            echo "  logs [service] [n]    Show logs"
            echo "  follow [service]      Follow logs"
            echo "  status/ps             Show status"
            echo "  build [service]       Build images"
            echo "  exec <service> [cmd]  Execute command in container"
            return 1
            ;;
    esac
}

show_help() {
    print_header
    echo -e "${CYAN}Usage: ./dev.sh [command] [options]${NC}"
    echo ""
    echo -e "${YELLOW}Native Development Commands:${NC}"
    echo "  start [service]     Start all services or specific service (native + Docker infrastructure)"
    echo "  stop [service]      Stop all services or specific service" 
    echo "  restart [service]   Restart all services or specific service"
    echo "  status              Show service status and URLs"
    echo "  logs <service> [n]  Show last n lines of service logs (default: 50)"
    echo "  follow <service>    Follow service logs in real-time"
    echo "  test               Test all service endpoints"
    echo "  cleanup            Clean up PID and log files"
    echo "  setup              Setup dependencies and environment"
    echo ""
    echo -e "${YELLOW}Docker Compose Commands:${NC}"
    echo "  dc <action> [service] [option]  Docker Compose control"
    echo "    Actions:"
    echo "    start/up [service]     Start Docker Compose services"
    echo "    stop/down [service]    Stop Docker Compose services"
    echo "    restart [service]      Restart Docker Compose services"
    echo "    logs [service] [n]     Show Docker Compose logs"
    echo "    follow [service]       Follow Docker Compose logs"
    echo "    status/ps              Show Docker Compose status"
    echo "    build [service]        Build Docker images"
    echo "    exec <service> [cmd]   Execute command in container"
    echo ""
    echo -e "${YELLOW}Services:${NC}"
    echo "  infrastructure     PostgreSQL + Mailpit (Docker)"
    echo "  backend           Go backend (native or Docker)"
    echo "  frontend          React frontend (native or Docker)"
    echo "  postgres          PostgreSQL database"
    echo "  mailpit           Email testing service"
    echo "  all               All services (default)"
    echo ""
    echo -e "${YELLOW}Examples:${NC}"
    echo "  ${GREEN}Native Development:${NC}"
    echo "  ./dev.sh start                    # Start all services (mixed mode)"
    echo "  ./dev.sh start backend            # Start only native backend"
    echo "  ./dev.sh logs backend 100         # Show last 100 backend log lines"
    echo "  ./dev.sh follow frontend          # Follow frontend logs"
    echo ""
    echo "  ${GREEN}Docker Compose:${NC}"
    echo "  ./dev.sh dc start                 # Start all Docker services"
    echo "  ./dev.sh dc start backend         # Start only backend container"
    echo "  ./dev.sh dc logs backend 50       # Show backend container logs"
    echo "  ./dev.sh dc exec backend bash     # Shell into backend container"
    echo "  ./dev.sh dc build frontend        # Rebuild frontend image"
}

# Main command dispatcher
main() {
    local command="${1:-help}"
    local service="${2:-all}"
    local option="${3:-50}"
    
    case "$command" in
        "dc")
            # Docker Compose commands
            local dc_action="$2"
            local dc_service="$3"
            local dc_option="$4"
            
            if [ -z "$dc_action" ]; then
                echo -e "${RED}❌ Please specify Docker Compose action${NC}"
                echo "Usage: ./dev.sh dc <action> [service] [option]"
                echo "Run './dev.sh help' for available actions"
                exit 1
            fi
            print_header
            check_requirements
            docker_compose_cmd "$dc_action" "$dc_service" "$dc_option"
            ;;
            
        "start")
            print_header
            check_requirements
            
            case "$service" in
                "infrastructure")
                    start_infrastructure
                    ;;
                "backend")
                    start_backend
                    ;;
                "frontend")
                    start_frontend
                    ;;
                "all")
                    start_infrastructure
                    start_backend
                    start_frontend
                    echo ""
                    print_status
                    print_urls
                    ;;
                *)
                    echo -e "${RED}❌ Unknown service: $service${NC}"
                    exit 1
                    ;;
            esac
            ;;
        "stop")
            print_header
            
            case "$service" in
                "infrastructure")
                    stop_infrastructure
                    ;;
                "backend")
                    stop_backend
                    ;;
                "frontend")
                    stop_frontend
                    ;;
                "all")
                    stop_frontend
                    stop_backend
                    stop_infrastructure
                    echo ""
                    print_status
                    ;;
                *)
                    echo -e "${RED}❌ Unknown service: $service${NC}"
                    exit 1
                    ;;
            esac
            ;;
        "restart")
            print_header
            
            case "$service" in
                "infrastructure")
                    stop_infrastructure
                    start_infrastructure
                    ;;
                "backend")
                    stop_backend
                    start_backend
                    ;;
                "frontend")
                    stop_frontend
                    start_frontend
                    ;;
                "all")
                    stop_frontend
                    stop_backend
                    stop_infrastructure
                    start_infrastructure
                    start_backend
                    start_frontend
                    echo ""
                    print_status
                    print_urls
                    ;;
                *)
                    echo -e "${RED}❌ Unknown service: $service${NC}"
                    exit 1
                    ;;
            esac
            ;;
        "status")
            print_header
            print_status
            print_urls
            ;;
        "logs")
            if [ -z "$service" ] || [ "$service" = "all" ]; then
                echo -e "${RED}❌ Please specify a service for logs${NC}"
                echo "Available: backend, frontend, postgres, mailpit"
                exit 1
            fi
            show_logs "$service" "$option"
            ;;
        "follow")
            if [ -z "$service" ] || [ "$service" = "all" ]; then
                echo -e "${RED}❌ Please specify a service to follow${NC}"
                echo "Available: backend, frontend, postgres, mailpit"
                exit 1
            fi
            follow_logs "$service"
            ;;
        "test")
            print_header
            test_services
            ;;
        "cleanup")
            print_header
            cleanup
            ;;
        "setup")
            print_header
            check_requirements
            echo -e "${YELLOW}📦 Installing dependencies...${NC}"
            cd backend && go mod download && cd ..
            cd frontend && npm install && cd ..
            setup_env
            echo -e "${GREEN}✅ Setup complete!${NC}"
            ;;
        "help"|"--help"|"-h")
            show_help
            ;;
        *)
            echo -e "${RED}❌ Unknown command: $command${NC}"
            echo ""
            show_help
            exit 1
            ;;
    esac
}

# Handle Ctrl+C gracefully
trap 'echo -e "\n${YELLOW}🛑 Interrupted. Use ./dev.sh stop to stop services.${NC}"; exit 130' INT

main "$@"