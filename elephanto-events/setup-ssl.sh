#!/bin/bash

# SSL Setup Script for velvethour.ca
set -e

echo "🔐 Setting up SSL certificates for velvethour.ca..."

# Check if certbot is installed
if ! command -v certbot &> /dev/null; then
    echo "📦 Installing certbot..."
    if command -v apt &> /dev/null; then
        sudo apt update && sudo apt install -y certbot python3-certbot-nginx
    elif command -v yum &> /dev/null; then
        sudo yum install -y epel-release && sudo yum install -y certbot python3-certbot-nginx
    elif command -v brew &> /dev/null; then
        brew install certbot
    else
        echo "❌ Please install certbot manually for your system"
        exit 1
    fi
fi

# Stop nginx if running
echo "🛑 Stopping nginx temporarily..."
sudo systemctl stop nginx 2>/dev/null || sudo docker stop elephanto_nginx 2>/dev/null || echo "Nginx not running"

# Generate SSL certificate
echo "🔒 Generating SSL certificate..."
sudo certbot certonly \
    --standalone \
    --email YOUR_EMAIL_HERE \
    --agree-tos \
    --no-eff-email \
    -d velvethour.ca \
    -d www.velvethour.ca

# Set up auto-renewal
echo "🔄 Setting up SSL certificate auto-renewal..."
sudo crontab -l 2>/dev/null | grep -v certbot | sudo crontab -
echo "0 12 * * * /usr/bin/certbot renew --quiet" | sudo crontab -

# Test certificate
echo "🧪 Testing SSL certificate..."
sudo certbot certificates

echo "✅ SSL setup complete!"
echo "📝 Next steps:"
echo "   1. Start your Docker containers: docker-compose -f docker-compose.prod.yml up -d"
echo "   2. Test the domain: https://velvethour.ca"
echo "   3. Certificates will auto-renew every 12 hours at noon"

# Create systemd timer for auto-renewal (alternative to cron)
cat << 'EOF' | sudo tee /etc/systemd/system/certbot-renew.service > /dev/null
[Unit]
Description=Certbot Renewal

[Service]
ExecStart=/usr/bin/certbot renew --post-hook "systemctl reload nginx"
EOF

cat << 'EOF' | sudo tee /etc/systemd/system/certbot-renew.timer > /dev/null
[Unit]
Description=Run certbot twice daily

[Timer]
OnCalendar=*-*-* 00,12:00:00
RandomizedDelaySec=3600
Persistent=true

[Install]
WantedBy=timers.target
EOF

sudo systemctl daemon-reload
sudo systemctl enable certbot-renew.timer
sudo systemctl start certbot-renew.timer

echo "🎯 SSL certificate auto-renewal timer configured!"