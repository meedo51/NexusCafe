#!/bin/bash
# fix-nexuscafe-installation.sh
# Comprehensive fix script for NexusCafe installation issues

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
log_warning() { echo -e "${YELLOW}[WARNING]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

command_exists() { command -v "$1" >/dev/null 2>&1; }

# Diagnostic function
run_diagnostics() {
    log_info "🔍 Running comprehensive diagnostics..."
    
    echo "=== System Information ==="
    echo "OS: $(cat /etc/os-release | grep PRETTY_NAME | cut -d'"' -f2)"
    echo "Kernel: $(uname -r)"
    echo "CPU: $(nproc) cores"
    echo "RAM: $(free -h | awk '/^Mem:/{print $2}')"
    echo "Disk: $(df -h / | awk 'NR==2{print $2}') total, $(df -h / | awk 'NR==2{print $4}') free"
    echo ""
    
    echo "=== Service Status ==="
    for service in nginx postgresql redis minio; do
        if systemctl is-active --quiet $service 2>/dev/null; then
            echo "$service: RUNNING"
        elif systemctl is-enabled --quiet $service 2>/dev/null; then
            echo "$service: INSTALLED (not running)"
        else
            echo "$service: NOT INSTALLED"
        fi
    done
    echo ""
    
    echo "=== Port Usage ==="
    netstat -tuln | grep -E ':(80|443|3000|4000|5432|6379|9000|9001)' || echo "No relevant ports in use"
    echo ""
    
    echo "=== Application Status ==="
    if command_exists pm2; then
        pm2 status || echo "PM2 not running"
    else
        echo "PM2 not installed"
    fi
    echo ""
    
    if [ -d "/opt/NexusCafe" ]; then
        echo "✅ /opt/NexusCafe exists"
    else
        echo "❌ /opt/NexusCafe does not exist"
    fi
    
    if [ -d "/root/NexusCafe" ]; then
        echo "⚠️  /root/NexusCafe exists (should be moved to /opt/NexusCafe)"
    fi
    
    echo "=== End of Diagnostics ==="
}

move_to_opt() {
    log_info "📦 Moving installation to /opt/NexusCafe..."
    
    pm2 stop nexuscafe-backend 2>/dev/null || true
    pm2 delete nexuscafe-backend 2>/dev/null || true
    pm2 stop nexuscafe 2>/dev/null || true
    pm2 delete nexuscafe 2>/dev/null || true
    
    mkdir -p /opt/NexusCafe
    
    if [ -d "/root/NexusCafe" ]; then
        log_info "Copying from /root/NexusCafe to /opt/NexusCafe..."
        cp -r /root/NexusCafe/* /opt/NexusCafe/ || true
        cp -r /root/NexusCafe/.[!.]* /opt/NexusCafe/ 2>/dev/null || true
        log_success "Files copied successfully"
    elif [ -d "/var/www/nexuscafe" ]; then
        log_info "Copying from /var/www/nexuscafe to /opt/NexusCafe..."
        cp -r /var/www/nexuscafe/* /opt/NexusCafe/ || true
        cp -r /var/www/nexuscafe/.[!.]* /opt/NexusCafe/ 2>/dev/null || true
        log_success "Files copied successfully"
    elif [ -d "/opt/NexusCafe/.git" ] || [ -f "/opt/NexusCafe/package.json" ]; then
        log_info "/opt/NexusCafe already populated, skipping copy"
    else
        log_error "No NexusCafe installation found"
        return 1
    fi
    
    chown -R $(whoami):$(whoami) /opt/NexusCafe
    chmod -R 755 /opt/NexusCafe
    
    if [ -f "/opt/NexusCafe/.env" ]; then
        sed -i 's|/root/NexusCafe|/opt/NexusCafe|g' /opt/NexusCafe/.env
        sed -i 's|/var/www/nexuscafe|/opt/NexusCafe|g' /opt/NexusCafe/.env
    fi
    
    log_success "Installation moved to /opt/NexusCafe"
    return 0
}

fix_redis() {
    log_info "🔧 Fixing Redis installation..."
    
    systemctl stop redis 2>/dev/null || true
    pkill redis-server 2>/dev/null || true
    docker stop redis-nexuscafe 2>/dev/null || true
    docker rm redis-nexuscafe 2>/dev/null || true
    
    dnf remove -y redis redis6 redis7 2>/dev/null || true
    
    rm -rf /var/lib/redis 2>/dev/null || true
    rm -rf /var/log/redis 2>/dev/null || true
    rm -f /etc/redis/redis.conf 2>/dev/null || true
    
    log_info "Installing Redis from Remi repository..."
    dnf install -y https://rpms.remirepo.net/enterprise/remi-release-9.rpm >/dev/null 2>&1 || true
    dnf module enable redis:remi-7.2 -y >/dev/null 2>&1 || true
    dnf install -y redis >/dev/null 2>&1 || true
    
    if command_exists redis-server; then
        log_success "Redis installed successfully"
        
        mkdir -p /var/lib/redis /var/log/redis /etc/redis
        chown redis:redis /var/lib/redis /var/log/redis
        
        cat > /etc/redis/redis.conf << 'EOF'
bind 127.0.0.1
port 6379
daemonize no
pidfile /var/run/redis_6379.pid
logfile /var/log/redis/redis.log
dir /var/lib/redis
maxmemory 256mb
maxmemory-policy allkeys-lru
appendonly yes
appendfilename "appendonly.aof"
save 900 1
save 300 10
save 60 10000
EOF
        
        systemctl daemon-reload
        systemctl enable redis
        systemctl start redis
        
        if redis-cli ping >/dev/null 2>&1; then
            log_success "Redis is running and responding"
            return 0
        else
            log_warning "Redis installed but not responding. Trying direct start..."
            redis-server /etc/redis/redis.conf --daemonize yes
            sleep 3
            if redis-cli ping >/dev/null 2>&1; then
                log_success "Redis started directly"
                return 0
            fi
        fi
    fi
    
    log_info "Compiling Redis from source..."
    dnf install -y gcc make wget tar >/dev/null 2>&1
    
    cd /tmp
    wget -q https://download.redis.io/redis-stable.tar.gz
    tar -xzf redis-stable.tar.gz
    cd redis-stable
    make -j$(nproc) >/dev/null 2>&1
    make install >/dev/null 2>&1
    
    useradd -r -s /sbin/nologin redis 2>/dev/null || true
    mkdir -p /var/lib/redis /var/log/redis
    chown redis:redis /var/lib/redis /var/log/redis
    
    cat > /etc/systemd/system/redis.service << 'EOF'
[Unit]
Description=Redis In-Memory Data Store
After=network.target

[Service]
User=redis
Group=redis
ExecStart=/usr/local/bin/redis-server /etc/redis/redis.conf
ExecStop=/usr/local/bin/redis-cli shutdown
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
EOF
    
    mkdir -p /etc/redis
    cat > /etc/redis/redis.conf << 'EOF'
bind 127.0.0.1
port 6379
daemonize no
pidfile /var/run/redis_6379.pid
logfile /var/log/redis/redis.log
dir /var/lib/redis
maxmemory 256mb
maxmemory-policy allkeys-lru
appendonly yes
EOF
    
    systemctl daemon-reload
    systemctl enable redis
    systemctl start redis
    
    if redis-cli ping >/dev/null 2>&1; then
        log_success "Redis compiled and running"
        return 0
    fi
    
    log_error "Redis installation failed completely"
    return 1
}

fix_nginx() {
    log_info "🔧 Fixing Nginx configuration..."
    
    systemctl stop nginx 2>/dev/null || true
    
    mkdir -p /etc/nginx/backup_$(date +%Y%m%d)
    cp -r /etc/nginx/conf.d/* /etc/nginx/backup_$(date +%Y%m%d)/ 2>/dev/null || true
    
    rm -f /etc/nginx/conf.d/*.conf
    
    if [ -z "$DOMAIN" ]; then
        if grep -q "APP_URL" /opt/NexusCafe/.env 2>/dev/null; then
            DOMAIN=$(grep APP_URL /opt/NexusCafe/.env | cut -d'=' -f2 | sed 's|https://||' | sed 's|http://||')
        elif grep -q "Domain:" /root/nexuscafe-credentials.txt 2>/dev/null; then
            DOMAIN=$(grep "Domain:" /root/nexuscafe-credentials.txt | awk '{print $2}')
        fi
        
        if [ -z "$DOMAIN" ]; then
            read -p "Enter your domain (e.g., cafe.s2u.me): " DOMAIN
        fi
    fi
    
    cat > /etc/nginx/conf.d/nexuscafe.conf << EOF
server {
    listen 80;
    server_name ${DOMAIN};
    return 301 https://\$server_name\$request_uri;
}

server {
    listen 443 ssl http2;
    server_name ${DOMAIN};
    
    # SSL certificates will be added by Certbot
    # ssl_certificate /etc/letsencrypt/live/${DOMAIN}/fullchain.pem;
    # ssl_certificate_key /etc/letsencrypt/live/${DOMAIN}/privkey.pem;
    # Temp fallback before certbot:
    ssl_certificate /etc/pki/tls/certs/localhost.crt;
    ssl_certificate_key /etc/pki/tls/private/localhost.key;
    
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;
    
    client_max_body_size 50M;
    
    location / {
        root /opt/NexusCafe/dist;
        try_files \$uri \$uri/ /index.html;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
    
    location /api {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_cache_bypass \$http_upgrade;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }
    
    location /storage {
        proxy_pass http://localhost:9000;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_request_buffering off;
        proxy_buffering off;
    }
}
EOF
    
    if nginx -t >/dev/null 2>&1; then
        log_success "Nginx configuration is valid"
        systemctl start nginx
        systemctl enable nginx
        
        if systemctl is-active --quiet nginx; then
            log_success "Nginx started successfully"
            return 0
        else
            log_error "Nginx started but failed to stay running"
            journalctl -u nginx -n 20 --no-pager
            return 1
        fi
    else
        log_error "Nginx configuration test failed"
        nginx -t 2>&1
        return 1
    fi
}

setup_ssl() {
    log_info "🔐 Setting up SSL certificate..."
    
    if [ -z "$DOMAIN" ]; then
        read -p "Enter your domain: " DOMAIN
    fi
    if [ -z "$ADMIN_EMAIL" ]; then
        read -p "Enter admin email: " ADMIN_EMAIL
    fi
    
    if ! command_exists certbot; then
        dnf install -y certbot python3-certbot-nginx >/dev/null 2>&1
    fi
    
    systemctl stop nginx || true
    
    certbot certonly --standalone \
        -d ${DOMAIN} \
        --non-interactive \
        --agree-tos \
        --email ${ADMIN_EMAIL} \
        --keep-until-expiring >/dev/null 2>&1
        
    if [ $? -eq 0 ]; then
        log_success "SSL certificate obtained successfully"
        
        sed -i "s|ssl_certificate /etc/pki/tls/certs/localhost.crt;|ssl_certificate /etc/letsencrypt/live/${DOMAIN}/fullchain.pem;|g" /etc/nginx/conf.d/nexuscafe.conf
        sed -i "s|ssl_certificate_key /etc/pki/tls/private/localhost.key;|ssl_certificate_key /etc/letsencrypt/live/${DOMAIN}/privkey.pem;|g" /etc/nginx/conf.d/nexuscafe.conf
        
        systemctl start nginx
        return 0
    else
        log_warning "SSL certificate failed. Using HTTP-only mode / fallback SSL."
        systemctl start nginx || true
        return 1
    fi
}

fix_database_migration() {
    log_info "🔧 Fixing database migration..."
    
    cd /opt/NexusCafe
    
    if [ ! -d "node_modules" ]; then
        log_info "Installing dependencies..."
        npm install >/dev/null 2>&1
    fi
    
    if ! systemctl is-active --quiet postgresql; then
        systemctl start postgresql || true
    fi
    
    log_info "Pushing database schema..."
    if npm run db:push >/dev/null 2>&1; then
        log_success "Database schema pushed successfully"
        return 0
    else
        log_error "Database migration failed"
        return 1
    fi
}

fix_pm2_startup() {
    log_info "🔧 Fixing PM2 startup..."
    
    cd /opt/NexusCafe
    
    if ! command_exists pm2; then
        npm install -g pm2 >/dev/null 2>&1
    fi
    
    log_info "Building application..."
    npm run build >/dev/null 2>&1 || {
        log_warning "Build failed. Installing typescript..."
        npm install -D typescript @types/node >/dev/null 2>&1
        npm run build >/dev/null 2>&1
    }
    
    cat > ecosystem.config.js << 'EOF'
module.exports = {
  apps: [{
    name: 'nexuscafe-backend',
    script: 'dist/server.cjs',
    instances: 'max',
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    error_file: '/var/log/nexuscafe/backend-error.log',
    out_file: '/var/log/nexuscafe/backend-out.log',
    log_file: '/var/log/nexuscafe/backend-combined.log',
    time: true,
    max_memory_restart: '1G',
    watch: false,
    merge_logs: true,
    kill_timeout: 5000,
    listen_timeout: 5000
  }]
};
EOF
    
    mkdir -p /var/log/nexuscafe
    
    pm2 delete nexuscafe-backend 2>/dev/null || true
    pm2 start ecosystem.config.js >/dev/null 2>&1
    pm2 save >/dev/null 2>&1
    
    pm2 startup | grep -v "sudo" | bash 2>/dev/null || true
    
    sleep 5
    if pm2 status | grep -q "online"; then
        log_success "PM2 started successfully"
        return 0
    else
        log_error "PM2 failed to start"
        pm2 logs --lines 20 --nostream
        return 1
    fi
}

final_verification() {
    log_info "🔍 Final verification..."
    
    local issues=0
    
    for service in nginx postgresql redis minio; do
        if systemctl is-active --quiet $service 2>/dev/null; then
            log_success "✅ $service is running"
        else
            log_error "❌ $service is not running"
            issues=$((issues + 1))
        fi
    done
    
    if pm2 status 2>/dev/null | grep -q "online"; then
        log_success "✅ Application is running"
    else
        log_error "❌ Application is not running"
        issues=$((issues + 1))
    fi
    
    if sudo -u postgres psql -c "SELECT 1" >/dev/null 2>&1; then
        log_success "✅ Database is accessible"
    else
        log_error "❌ Database is not accessible"
        issues=$((issues + 1))
    fi
    
    if curl -s -o /dev/null -w "%{http_code}" http://localhost:80 | grep -q "200\|301\|302"; then
        log_success "✅ Web server is responding"
    else
        log_error "❌ Web server is not responding"
        issues=$((issues + 1))
    fi
    
    if [ -f "/opt/NexusCafe/dist/index.html" ]; then
        log_success "✅ Frontend build exists"
    else
        log_error "❌ Frontend build failed"
        issues=$((issues + 1))
    fi
    
    if [ $issues -eq 0 ]; then
        log_success "🎉 All checks passed!"
        return 0
    else
        log_error "⚠️ $issues issues found"
        return 1
    fi
}

cleanup_installation() {
    log_info "🧹 Cleaning up..."
    rm -rf /tmp/nexuscafe_* 2>/dev/null || true
    rm -rf /var/tmp/nexuscafe_* 2>/dev/null || true
    
    if [ -d "/root/NexusCafe" ] && [ -d "/opt/NexusCafe" ]; then
        log_info "Old installation remaining at /root/NexusCafe."
    fi
    if [ -d "/var/www/nexuscafe" ] && [ -d "/opt/NexusCafe" ]; then
        log_info "Old installation remaining at /var/www/nexuscafe."
    fi
    
    log_success "Cleanup completed"
}

main() {
    echo "========================================="
    echo "  NexusCafe Installation Fix Script"
    echo "  Self-Healing Recovery v1.0"
    echo "========================================="
    echo ""
    
    log_info "Running pre-flight diagnostics..."
    run_diagnostics
    
    echo ""
    read -p "Continue with fixes? (y/n): " confirm
    if [[ ! "$confirm" =~ ^[Yy]$ ]]; then
        log_info "Exiting..."
        exit 0
    fi
    
    local steps=(
        "move_to_opt"
        "fix_redis"
        "fix_nginx"
        "setup_ssl"
        "fix_database_migration"
        "fix_pm2_startup"
        "final_verification"
        "cleanup_installation"
    )
    
    local total=${#steps[@]}
    local current=0
    local failed=()
    
    for step in "${steps[@]}"; do
        current=$((current + 1))
        log_info "▶️  Step $current/$total: $step"
        
        if $step; then
            log_success "✅ $step completed"
        else
            log_error "❌ $step failed"
            failed+=("$step")
            if [ ${#failed[@]} -gt 3 ]; then
                log_error "Too many failures. Stopping..."
                break
            fi
            read -p "Continue with remaining steps? (y/n): " continue_fix
            if [[ ! "$continue_fix" =~ ^[Yy]$ ]]; then
                break
            fi
        fi
        echo ""
    done
    
    echo "========================================="
    echo "  Installation Fix Complete"
    echo "========================================="
    
    if [ ${#failed[@]} -eq 0 ]; then
        log_success "🎉 All issues fixed successfully!"
        if [ -n "$DOMAIN" ]; then
            log_info "🌐 Access NexusCafe at: https://${DOMAIN}"
        fi
        log_info "📋 Check /root/nexuscafe-credentials.txt for credentials if generated"
    else
        log_warning "⚠️ Some steps failed:"
        for f in "${failed[@]}"; do
            log_warning "  - $f"
        done
        log_info "Check the installation log for details"
    fi
}

main
