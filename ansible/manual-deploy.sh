#!/bin/bash

# Manual deployment script for ElephantTO Events
# Run this on the server after copying files

set -e

echo "🚀 Starting ElephantTO Events manual deployment..."

# Variables
APP_DIR="/opt/elephanto-events"
DOMAIN="elephantoevents.ca"
EMAIL="admin@elephantoevents.ca"

# Update system
echo "📦 Updating system packages..."
sudo dnf update -y

# Install required packages
echo "📦 Installing required packages..."
sudo dnf install -y git nginx firewalld python3-pip curl wget unzip rsync

# Install Docker
echo "🐳 Installing Docker..."
sudo dnf config-manager --add-repo https://download.docker.com/linux/centos/docker-ce.repo || true
sudo dnf install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

# Start Docker
echo "🐳 Starting Docker service..."
sudo systemctl start docker
sudo systemctl enable docker
sudo usermod -aG docker opc

# Install Docker Compose standalone
echo "🐳 Installing Docker Compose..."
sudo curl -L "https://github.com/docker/compose/releases/download/v2.24.0/docker-compose-linux-aarch64" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Create app directory
echo "📁 Creating application directory..."
sudo mkdir -p $APP_DIR
sudo chown opc:opc $APP_DIR

# Create environment file
echo "⚙️ Creating environment configuration..."
cat > $APP_DIR/.env << EOF
# Database Configuration
DATABASE_URL=postgres://elephanto:elephanto_password@postgres:5432/elephanto_events

# Email Configuration
EMAIL_SERVICE=smtp
SMTP_HOST=mailpit
SMTP_PORT=1025

# Application Configuration
FRONTEND_URL=https://$DOMAIN
JWT_SECRET=$(date +%s)$(hostname)secret
AUTO_MIGRATE=true

# Server Configuration
PORT=8080
EOF

# Copy application files (you need to copy the elephanto-events directory to /opt/ first)
echo "📋 Note: Make sure to copy your application files to $APP_DIR"
echo "📋 You can use: rsync -av --exclude=ansible --exclude=node_modules --exclude=.git your-local-path/ $APP_DIR/"

# Configure firewall
echo "🔥 Configuring firewall..."
sudo systemctl start firewalld
sudo systemctl enable firewalld
sudo firewall-cmd --permanent --add-service=ssh
sudo firewall-cmd --permanent --add-service=http
sudo firewall-cmd --permanent --add-service=https
sudo firewall-cmd --reload

# Create basic nginx config
echo "🌐 Creating nginx configuration..."
sudo tee /etc/nginx/conf.d/elephanto-events.conf > /dev/null << EOF
upstream backend {
    server localhost:8080;
}

upstream frontend {
    server localhost:3000;
}

server {
    listen 80;
    server_name $DOMAIN;
    
    # API routes to backend
    location /api/ {
        proxy_pass http://backend;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # Frontend routes
    location / {
        proxy_pass http://frontend;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }

    # Mailpit access
    location /mailpit/ {
        proxy_pass http://localhost:8025/;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }

    # Let's Encrypt verification
    location /.well-known/acme-challenge/ {
        root /var/www/html;
        allow all;
    }
}
EOF

# Create web root for Let's Encrypt
sudo mkdir -p /var/www/html

# Start nginx
echo "🌐 Starting nginx..."
sudo systemctl start nginx
sudo systemctl enable nginx

# Create systemd service
echo "⚡ Creating systemd service..."
sudo tee /etc/systemd/system/elephanto-events.service > /dev/null << EOF
[Unit]
Description=ElephantTO Events Docker Compose
Requires=docker.service
After=docker.service

[Service]
Type=oneshot
RemainAfterExit=yes
WorkingDirectory=$APP_DIR
ExecStart=/usr/local/bin/docker-compose up -d
ExecStop=/usr/local/bin/docker-compose down
TimeoutStartSec=0
User=opc
Group=opc

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl daemon-reload
sudo systemctl enable elephanto-events

echo ""
echo "✅ Base deployment completed!"
echo ""
echo "📋 Next steps:"
echo "1. Copy your application files to $APP_DIR"
echo "2. Run: cd $APP_DIR && sudo -u opc /usr/local/bin/docker-compose build --no-cache"
echo "3. Run: cd $APP_DIR && sudo -u opc /usr/local/bin/docker-compose up -d"
echo "4. Run: sudo systemctl start elephanto-events"
echo "5. Test: curl http://$DOMAIN/api/health"
echo "6. Install SSL: sudo dnf install python3-certbot python3-certbot-nginx"
echo "7. Get SSL cert: sudo certbot --nginx -d $DOMAIN"
echo ""
echo "🌐 Your site should be available at: http://$DOMAIN"
echo "📧 Mailpit will be at: http://$DOMAIN/mailpit/"