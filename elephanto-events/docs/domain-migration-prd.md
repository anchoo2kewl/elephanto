# Domain Migration PRD: elephanto.ca → velvethour.ca

## Overview
Complete migration of Elephanto Events application from localhost/development domain to production domain `velvethour.ca` with full SSL/TLS security, DNS configuration, and production-ready infrastructure.

## Project Goals
- ✅ Migrate domain from localhost to `velvethour.ca`
- ✅ Implement SSL/TLS encryption with Let's Encrypt
- ✅ Configure Cloudflare DNS with proper records
- ✅ Set up nginx reverse proxy with security headers
- ✅ Enable automatic SSL certificate renewal
- ✅ Ensure high availability and performance

## Technical Implementation

### 1. DNS Configuration (Cloudflare)
**Status: ✅ COMPLETED**

#### DNS Records Created:
- **A Record**: `velvethour.ca` → `129.153.59.186`
- **CNAME Record**: `www.velvethour.ca` → `velvethour.ca`

#### API Details:
- **Zone ID**: `ff1671a76dac33855cf9c6509c05799c`
- **Email**: chaiiandchance@gmail.com
- **API Key**: Global API Key (configured)

#### Verification:
```bash
dig +short velvethour.ca
# Returns: 129.153.59.186

dig +short www.velvethour.ca
# Returns: velvethour.ca. / 129.153.59.186
```

### 2. Nginx Configuration
**Status: ✅ COMPLETED**

#### Key Features:
- **HTTP → HTTPS Redirect**: All HTTP traffic redirected to HTTPS
- **SSL/TLS Configuration**: Modern TLS 1.2 and 1.3 support
- **Security Headers**: HSTS, XSS Protection, Content Type Options
- **Gzip Compression**: Enabled for performance
- **Static Asset Caching**: 1-year cache for JS/CSS/images
- **React Router Support**: SPA routing with fallback to index.html

#### Configuration File:
```nginx
# HTTP server - redirects to HTTPS
server {
    listen 80;
    server_name velvethour.ca www.velvethour.ca;
    return 301 https://$server_name$request_uri;
}

# HTTPS server
server {
    listen 443 ssl http2;
    server_name velvethour.ca www.velvethour.ca;
    
    # SSL Configuration
    ssl_certificate /etc/letsencrypt/live/velvethour.ca/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/velvethour.ca/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    
    # Application serving
    root /usr/share/nginx/html;
    index index.html;
    
    # ... additional configuration
}
```

### 3. Docker Compose Production Setup
**Status: ✅ COMPLETED**

#### Services Updated:
1. **nginx**: New reverse proxy container
   - Ports: 80:80, 443:443
   - SSL certificate volume mount
   - Frontend static files volume

2. **frontend**: Modified for nginx integration
   - Removed direct port exposure
   - Shared volume for static files

#### Key Changes:
```yaml
nginx:
  image: nginx:alpine
  container_name: elephanto_nginx
  ports:
    - "80:80"
    - "443:443"
  volumes:
    - ./frontend/nginx.conf:/etc/nginx/conf.d/default.conf
    - /etc/letsencrypt:/etc/letsencrypt:ro
    - frontend_static:/usr/share/nginx/html
```

### 4. SSL/TLS Certificate Management
**Status: ✅ COMPLETED**

#### Let's Encrypt Setup:
- **Certificate Domain**: velvethour.ca, www.velvethour.ca
- **Email**: chaiiandchance@gmail.com
- **Auto-renewal**: Configured via cron and systemd timer

#### Setup Script: `setup-ssl.sh`
- Installs certbot automatically
- Generates SSL certificates
- Configures auto-renewal (daily check at noon)
- Sets up systemd timer as backup renewal method

#### Renewal Configuration:
- **Cron**: `0 12 * * * /usr/bin/certbot renew --quiet`
- **Systemd Timer**: Runs twice daily with randomized delay

## Security Features

### SSL/TLS Security
- **Modern Protocols**: TLS 1.2 and 1.3 only
- **Strong Ciphers**: ECDHE-RSA-AES256-GCM suite
- **Perfect Forward Secrecy**: Enabled
- **Session Management**: 10-minute timeout, shared cache

### Security Headers
```nginx
add_header X-Frame-Options "SAMEORIGIN" always;
add_header X-Content-Type-Options "nosniff" always;
add_header X-XSS-Protection "1; mode=block" always;
add_header Referrer-Policy "no-referrer-when-downgrade" always;
add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
```

### Infrastructure Security
- **Firewall**: Ports 80, 443 open; other ports protected
- **Container Isolation**: Docker network isolation
- **Certificate Protection**: SSL private keys secured

## Performance Optimizations

### Compression
- **Gzip Enabled**: 1KB minimum file size
- **File Types**: HTML, CSS, JS, XML, JSON
- **Vary Header**: Proper cache control

### Caching Strategy
- **Static Assets**: 1-year browser cache
- **Cache-Control**: Immutable assets marked
- **SSL Session Cache**: 10MB shared cache

### HTTP/2
- **Protocol**: HTTP/2 enabled for HTTPS
- **Performance**: Multiplexed connections
- **Compatibility**: Fallback to HTTP/1.1

## Deployment Instructions

### Prerequisites
- Server with Docker and Docker Compose
- Domain pointing to server IP (129.153.59.186)
- Sudo access for SSL certificate generation

### Step-by-Step Deployment

1. **Run SSL Setup**:
   ```bash
   sudo ./setup-ssl.sh
   ```

2. **Deploy Application**:
   ```bash
   docker-compose -f docker-compose.prod.yml up -d
   ```

3. **Verify Deployment**:
   ```bash
   curl -I https://velvethour.ca
   docker-compose -f docker-compose.prod.yml logs nginx
   ```

4. **Test SSL**:
   ```bash
   openssl s_client -connect velvethour.ca:443 -servername velvethour.ca
   ```

## Monitoring & Maintenance

### SSL Certificate Monitoring
- **Expiry Check**: `sudo certbot certificates`
- **Renewal Test**: `sudo certbot renew --dry-run`
- **Logs**: `/var/log/letsencrypt/`

### Application Monitoring
- **Health Checks**: Built into Docker Compose
- **Nginx Logs**: `docker logs elephanto_nginx`
- **SSL Status**: Browser security indicator

### Backup & Recovery
- **SSL Certificates**: `/etc/letsencrypt/` directory
- **Nginx Config**: Version controlled in repository
- **Database**: Included in docker-compose setup

## Troubleshooting Guide

### Common Issues

#### SSL Certificate Issues
```bash
# Check certificate status
sudo certbot certificates

# Manual renewal
sudo certbot renew --force-renewal

# Test configuration
sudo nginx -t
```

#### DNS Issues
```bash
# Check DNS propagation
dig +short velvethour.ca
nslookup velvethour.ca 8.8.8.8
```

#### Docker Issues
```bash
# Check container status
docker-compose -f docker-compose.prod.yml ps

# View logs
docker-compose -f docker-compose.prod.yml logs -f nginx
```

## Success Metrics

### Performance Targets
- **Page Load Time**: < 2 seconds
- **SSL Handshake**: < 100ms
- **Time to First Byte**: < 500ms

### Security Compliance
- **SSL Rating**: A+ on SSL Labs
- **HSTS**: Properly configured
- **Security Headers**: All implemented

### Availability
- **Uptime Target**: 99.9%
- **SSL Certificate**: Auto-renewal functioning
- **Monitoring**: Health checks passing

## Rollback Plan

### Emergency Rollback
1. **Stop Production**:
   ```bash
   docker-compose -f docker-compose.prod.yml down
   ```

2. **Revert DNS**:
   ```bash
   # Use Cloudflare API to update A record back to previous IP
   curl -X PUT "https://api.cloudflare.com/client/v4/zones/ff1671a76dac33855cf9c6509c05799c/dns_records/RECORD_ID" \
     -H "X-Auth-Email: chaiiandchance@gmail.com" \
     -H "X-Auth-Key: 1424814b9ee4603597bc84613842e782692e4" \
     -H "Content-Type: application/json" \
     --data '{"type":"A","name":"velvethour.ca","content":"OLD_IP"}'
   ```

3. **Start Previous Configuration**:
   ```bash
   docker-compose -f docker-compose.yml up -d
   ```

## Future Enhancements

### Planned Improvements
- **CDN Integration**: Cloudflare CDN for global performance
- **WAF Configuration**: Web Application Firewall rules
- **Rate Limiting**: API and request rate limiting
- **Monitoring**: Application performance monitoring
- **Backup Automation**: Automated database backups

### Infrastructure Scaling
- **Load Balancer**: Multiple backend instances
- **Database Clustering**: High availability database
- **Container Orchestration**: Kubernetes migration
- **CI/CD Pipeline**: Automated deployments

---

**Document Version**: 1.0  
**Last Updated**: August 18, 2025  
**Status**: Production Ready  
**Contact**: chaiiandchance@gmail.com