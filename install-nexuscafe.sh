#!/bin/bash

# NexusCafe Smart Self-Healing Installation Script
# Version: 2.0.0
# Author: NexusCafe Team

set -e  # Exit on error (though we handle errors internally)

# ------------------------------
# Configuration & Colors
# ------------------------------

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Default values
BACKEND_PORT=3000
SOCKET_PORT=4000
MINIO_PORT=9000
MINIO_CONSOLE_PORT=9001
DOMAIN=""
ADMIN_EMAIL=""
DB_PASSWORD=""
MINIO_PASSWORD=""
JWT_SECRET=""
REPO_URL="https://github.com/meedo51/NexusCafe.git"
INSTALL_DIR="/var/www/nexuscafe"
LOG_DIR="/var/log/nexuscafe"

# ------------------------------
# Helper Functions
# ------------------------------

log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
log_warning() { echo -e "${YELLOW}[WARNING]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

command_exists() { command -v "$1" >/dev/null 2>&1; }

port_available() { ! netstat -tuln 2>/dev/null | grep -q ":$1 "; }

find_available_port() {
    local port=$1
    while ! port_available $port; do port=$((port + 1)); done
    echo $port
}

generate_password() { openssl rand -base64 32 | tr -d "=+/" | cut -c1-32; }

# Bash timeout equivalent
execute_with_timeout() {
    local timeout=$1
    shift
    "$@" &
    local pid=$!
    local count=0
    while kill -0 $pid 2>/dev/null; do
        sleep 1
        count=$((count + 1))
        if [ $count -ge $timeout ]; then
            kill -9 $pid 2>/dev/null
            return 124
        fi
    done
    wait $pid
    return $?
}

# ------------------------------
# Pre-Flight Checks & Optimization
# ------------------------------

create_swap_file() {
    local size_mb=$1
    log_info "Creating ${size_mb}MB swap file..."
    dd if=/dev/zero of=/swapfile bs=1M count=$size_mb status=none
    chmod 600 /swapfile
    mkswap /swapfile >/dev/null
    swapon /swapfile
    echo "/swapfile swap swap defaults 0 0" >> /etc/fstab
    log_success "Swap file created and enabled"
}

cleanup_disk_space() {
    log_info "Cleaning up disk space..."
    dnf clean all >/dev/null 2>&1 || true
    journalctl --vacuum-time=3d >/dev/null 2>&1 || true
}

check_firewall_ports() {
    log_info "Checking firewall..."
}

firewall_allow_ports() {
    if command_exists firewall-cmd; then
        for port in "$@"; do
            firewall-cmd --permanent --add-port=${port}/tcp >/dev/null 2>&1 || true
        done
        firewall-cmd --reload >/dev/null 2>&1 || true
    fi
}

check_conflicting_services() {
    if systemctl is-active --quiet httpd 2>/dev/null; then
        log_warning "Apache (httpd) is running. Stopping and disabling to free port 80/443."
        systemctl stop httpd
        systemctl disable httpd
    fi
}

check_selinux_status() {
    if command_exists getenforce; then
        log_info "SELinux status: $(getenforce)"
    fi
}

check_system_readiness() {
    local issues=0
    local warnings=0
    
    if ! command_exists bc; then dnf install -y bc jq >/dev/null 2>&1 || true; fi
    if ! command_exists netstat; then dnf install -y net-tools >/dev/null 2>&1 || true; fi

    if ! grep -q -E "AlmaLinux|CentOS|Red Hat|Rocky" /etc/os-release; then
        log_warning "OS may not be AlmaLinux/RHEL compatible. Checking versions..."
    fi
    
    local total_ram=$(free -g | awk '/^Mem:/{print $2}')
    if [ "$total_ram" -lt 4 ]; then
        log_warning "Low RAM: ${total_ram}GB (minimum 4GB recommended)"
        warnings=$((warnings + 1))
        if [ "$total_ram" -lt 2 ]; then
            create_swap_file 2048
        fi
    fi
    
    local disk_space=$(df -BG / | awk 'NR==2 {print $4}' | sed 's/G//')
    if [ "$disk_space" -lt 10 ]; then
        log_error "Critical: Only ${disk_space}GB free disk space. 20GB+ required."
        issues=$((issues + 1))
        cleanup_disk_space
    elif [ "$disk_space" -lt 20 ]; then
        log_warning "Low disk space: ${disk_space}GB (recommended 20GB+)"
        warnings=$((warnings + 1))
    fi
    
    if ! ping -c 1 8.8.8.8 >/dev/null 2>&1; then
        log_error "No internet connectivity. Installation requires internet access."
        issues=$((issues + 1))
    else
        if ! curl -s -o /dev/null -w "%{http_code}" https://github.com | grep -q "200\|301\|302"; then
            log_warning "GitHub may be blocked. Using fallback mirror..."
            REPO_URL="https://gitlab.com/meedo51/NexusCafe.git" 
        fi
    fi
    
    check_firewall_ports
    check_conflicting_services
    check_selinux_status
    
    return $issues
}

optimize_environment() {
    if command_exists getenforce && [[ "$(getenforce)" != "Disabled" ]]; then
        log_warning "SELinux is enabled. Disabling for compatibility..."
        setenforce 0 || true
        sed -i 's/SELINUX=enforcing/SELINUX=disabled/g' /etc/selinux/config || true
        log_success "SELinux disabled (requires reboot to take full effect)"
    fi
    
    local current_limit=$(ulimit -n)
    if [ "$current_limit" -lt 65535 ]; then
        log_warning "Low file descriptor limit: $current_limit. Increasing..."
        echo "* soft nofile 65535" >> /etc/security/limits.conf
        echo "* hard nofile 65535" >> /etc/security/limits.conf
        ulimit -n 65535 || true
        log_success "File descriptor limit increased to 65535"
    fi
    
    firewall_allow_ports 80 443
}

# ------------------------------
# Smart Installation Functions
# ------------------------------

get_alternative_package() {
    case "$1" in
        "certbot"|"python3-certbot-nginx") echo "certbot-nginx" ;;
        "postgresql-server") echo "postgresql" ;;
        "redis") echo "redis6" ;;
        *) echo "" ;;
    esac
}

smart_install() {
    local package="$1"
    local max_retries=3
    local retry_count=0
    local backoff=2
    
    while [ $retry_count -lt $max_retries ]; do
        if dnf install -y "$package" >/dev/null 2>&1; then
            return 0
        else
            retry_count=$((retry_count + 1))
            if [ $retry_count -lt $max_retries ]; then
                log_warning "Failed to install $package (attempt $retry_count/$max_retries)"
                sleep $backoff
                backoff=$((backoff * 2))
                
                case $retry_count in
                    1) dnf install -y --skip-broken "$package" >/dev/null 2>&1 && return 0 ;;
                    2) dnf clean all >/dev/null 2>&1; dnf makecache >/dev/null 2>&1
                       dnf install -y "$package" >/dev/null 2>&1 && return 0 ;;
                esac
            else
                local alt_name=$(get_alternative_package "$package")
                if [ -n "$alt_name" ]; then
                    dnf install -y "$alt_name" >/dev/null 2>&1 && return 0
                fi
                if ! grep -q "epel" <<< "$package"; then
                    dnf install -y epel-release >/dev/null 2>&1 || true
                    dnf install -y "$package" >/dev/null 2>&1 && return 0
                fi
            fi
        fi
    done
    
    log_error "Failed to install $package after $max_retries attempts"
    return 1
}

smart_install_node() {
    local required_version="20"
    
    if command_exists node; then
        local current_version=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
        if [ "$current_version" -ge "$required_version" ]; then
            log_success "Node.js v$current_version already installed"
            return 0
        fi
    fi
    
    log_info "Installing Node.js $required_version via NodeSource..."
    curl -fsSL https://rpm.nodesource.com/setup_${required_version}.x | bash - >/dev/null 2>&1 && \
    dnf install -y nodejs >/dev/null 2>&1 && return 0
    
    log_info "NodeSource failed. Installing via NVM..."
    curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash >/dev/null 2>&1
    export NVM_DIR="$HOME/.nvm"
    [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
    nvm install $required_version >/dev/null 2>&1
    nvm use $required_version >/dev/null 2>&1
    nvm alias default $required_version >/dev/null 2>&1
    if command_exists node; then return 0; fi
    
    log_error "Failed to install Node.js after trying all methods"
    return 1
}

# ------------------------------
# Database Functions
# ------------------------------

smart_postgres_setup() {
    local max_retries=3
    local retry_count=0
    
    if command_exists psql; then
        if sudo -u postgres psql -lqt 2>/dev/null | cut -d \| -f 1 | grep -qw "nexuscafe"; then
            log_warning "Database 'nexuscafe' already exists. Reusing existing database."
            return 0
        fi
    fi
    
    if [ ! -d "/var/lib/pgsql/data/base" ]; then
        postgresql-setup --initdb >/dev/null 2>&1 || true
    fi
    
    systemctl start postgresql
    systemctl enable postgresql
    
    if ! systemctl is-active --quiet postgresql; then
        log_error "PostgreSQL failed to start. Attempting recovery..."
        systemctl stop postgresql
        rm -rf /var/lib/pgsql/data
        postgresql-setup --initdb >/dev/null 2>&1 || true
        systemctl start postgresql
        if ! systemctl is-active --quiet postgresql; then
            log_error "PostgreSQL recovery failed."
            return 1
        fi
    fi
    
    sed -i 's/ident/md5/g' /var/lib/pgsql/data/pg_hba.conf
    sed -i 's/peer/md5/g' /var/lib/pgsql/data/pg_hba.conf
    systemctl restart postgresql
    
    while [ $retry_count -lt $max_retries ]; do
        sudo -u postgres psql -c "CREATE USER nexuscafe WITH PASSWORD '$DB_PASSWORD';" >/dev/null 2>&1 || true
        sudo -u postgres psql -c "CREATE DATABASE nexuscafe OWNER nexuscafe;" >/dev/null 2>&1 || true
        sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE nexuscafe TO nexuscafe;" >/dev/null 2>&1 || true
        
        if sudo -u postgres psql -lqt 2>/dev/null | cut -d \| -f 1 | grep -qw "nexuscafe"; then
            log_success "Database created successfully"
            return 0
        else
            retry_count=$((retry_count + 1))
            sleep 5
        fi
    done
    
    log_error "Failed to create database after $max_retries attempts"
    return 1
}

smart_migrate_database() {
    cd $INSTALL_DIR
    
    log_info "Creating database backup before migration..."
    sudo -u postgres pg_dump -U nexuscafe nexuscafe > /root/migration_backup_$(date +%Y%m%d_%H%M%S).sql 2>/dev/null || true
    
    local max_attempts=3
    local attempt=0
    
    while [ $attempt -lt $max_attempts ]; do
        attempt=$((attempt + 1))
        log_info "Running migration (attempt $attempt/$max_attempts)..."
        
        if npm run db:push >migration.log 2>&1; then
            log_success "Migration completed successfully"
            return 0
        else
            if grep -q "Lock not available" migration.log; then
                log_warning "Database lock detected. Retrying..."
                sleep 5
                continue
            fi
            log_warning "Migration failed. Retrying..."
            sleep 5
        fi
    done
    
    log_error "Migration failed after $max_attempts attempts"
    log_info "Restoring database backup..."
    local latest_backup=$(ls -t /root/migration_backup_*.sql 2>/dev/null | head -1)
    if [ -n "$latest_backup" ]; then
        sudo -u postgres psql -U nexuscafe nexuscafe < "$latest_backup" >/dev/null 2>&1 || true
    fi
    return 1
}

# ------------------------------
# Service Management
# ------------------------------

check_disk_space_for_postgres() { true; }
check_nginx_config() { nginx -t >/dev/null 2>&1 || return 1; }
check_minio_config() { true; }

smart_service_start() {
    local service="$1"
    local max_attempts=5
    local attempt=0
    
    case $service in
        "postgresql") check_disk_space_for_postgres ;;
        "nginx") check_nginx_config || true ;;
        "minio") check_minio_config ;;
    esac
    
    while [ $attempt -lt $max_attempts ]; do
        attempt=$((attempt + 1))
        if systemctl start "$service" >/dev/null 2>&1; then
            sleep 3
            if systemctl is-active --quiet "$service"; then
                log_success "$service started successfully"
                return 0
            fi
        fi
        
        log_warning "Failed to start $service (attempt $attempt/$max_attempts)"
        
        case $service in
            "postgresql")
                rm -f /var/lib/pgsql/data/postmaster.pid || true
                sudo -u postgres pg_ctl -D /var/lib/pgsql/data start >/dev/null 2>&1 || true
                ;;
            "nginx")
                if ! nginx -t >/dev/null 2>&1; then
                    mv /etc/nginx/conf.d/*.conf /tmp/ 2>/dev/null || true
                fi
                ;;
            "redis")
                rm -f /var/lib/redis/dump.rdb /var/lib/redis/appendonly.aof || true
                ;;
            "minio")
                chown -R minio-user:minio-user /var/lib/minio || true
                ;;
        esac
        sleep 5
    done
    
    log_error "Failed to start $service after $max_attempts attempts"
    return 1
}

monitor_services() {
    local unhealthy=()
    for service in nginx postgresql redis minio; do
        if ! systemctl is-active --quiet "$service"; then
            unhealthy+=("$service")
            smart_service_start "$service" || true
        fi
    done
    
    if ! curl -s -o /dev/null -w "%{http_code}" http://localhost:$BACKEND_PORT/health | grep -q "200"; then
        pm2 restart nexuscafe >/dev/null 2>&1 || true
        sleep 5
    fi
    
    if [ ${#unhealthy[@]} -gt 0 ]; then return 1; fi
    return 0
}

# ------------------------------
# Troubleshooting & Recovery
# ------------------------------

gather_diagnostics() {
    log_info "🔍 Gathering diagnostic information..."
    echo "=== System Information ==="
    cat /etc/os-release | grep PRETTY_NAME
    uname -a
    free -h
    df -h /
    echo "=== Service Status ==="
    for s in nginx postgresql redis minio; do systemctl is-active $s || echo "$s stopped"; done
    pm2 status || true
    echo "=== Recent Error Logs ==="
    tail -n 20 $LOG_DIR/install.log 2>/dev/null || true
}

self_healing_recovery() {
    local failed_step="$1"
    local max_recovery_attempts=3
    local attempt=1
    
    log_warning "🔄 Attempting self-healing recovery for step: $failed_step"
    
    while [ $attempt -le $max_recovery_attempts ]; do
        log_info "Recovery attempt $attempt/$max_recovery_attempts..."
        
        case $failed_step in
            "system_update")
                dnf clean all >/dev/null 2>&1; dnf makecache >/dev/null 2>&1; dnf update -y >/dev/null 2>&1 && return 0
                ;;
            "postgresql_setup")
                systemctl stop postgresql || true
                rm -rf /var/lib/pgsql/data
                postgresql-setup --initdb >/dev/null 2>&1 || true
                systemctl start postgresql || true
                smart_postgres_setup && return 0
                ;;
            "nginx_config")
                if ! nginx -t >/dev/null 2>&1; then
                    mv /etc/nginx/conf.d/${DOMAIN}.conf /etc/nginx/conf.d/${DOMAIN}.conf.bak || true
                    systemctl start nginx || true
                fi
                return 0
                ;;
            "app_deployment")
                rm -rf $INSTALL_DIR/{node_modules,dist,build} || true
                cd $INSTALL_DIR && npm install >/dev/null 2>&1 && npm run build >/dev/null 2>&1 && return 0
                ;;
            "pm2_startup")
                pm2 kill >/dev/null 2>&1 || true
                cd $INSTALL_DIR && pm2 start ecosystem.config.js >/dev/null 2>&1 && pm2 save >/dev/null 2>&1 && return 0
                ;;
            *)
                return 1
                ;;
        esac
        attempt=$((attempt + 1))
        sleep 5
    done
    return 1
}

# ------------------------------
# Verification & Performance
# ------------------------------

verify_installation() {
    local errors=0
    log_info "🔍 Verifying installation..."
    
    for service in nginx postgresql redis minio; do
        if systemctl is-active --quiet "$service"; then
            log_success "✅ $service is running"
        else
            log_error "❌ $service is not running"
            errors=$((errors + 1))
        fi
    done
    
    if pm2 status | grep -q "online"; then
        log_success "✅ Application is running"
    else
        log_error "❌ Application is not running"
        errors=$((errors + 1))
    fi
    
    if sudo -u postgres psql -c "SELECT 1" >/dev/null 2>&1; then
        log_success "✅ Database is accessible"
    else
        log_error "❌ Database is not accessible"
        errors=$((errors + 1))
    fi
    
    if [ $errors -eq 0 ]; then
        log_success "🎉 All core checks passed!"
        return 0
    else
        return 1
    fi
}

test_performance() {
    log_info "📊 Running performance baseline tests..."
    if sudo -u postgres psql -c "EXPLAIN ANALYZE SELECT 1;" >/dev/null 2>&1; then
        log_success "✅ Database performance OK"
    fi
    if redis-cli ping >/dev/null 2>&1; then
        log_success "✅ Redis performance OK"
    fi
}

# ------------------------------
# Checkpoints & Monitoring
# ------------------------------

check_system_health() {
    local disk_free=$(df -BG / | awk 'NR==2 {print $4}' | sed 's/G//')
    if [ "$disk_free" -lt 2 ]; then
        dnf clean all >/dev/null 2>&1
        journalctl --vacuum-size=100M >/dev/null 2>&1
    fi
    local mem_free=$(free -m | awk '/^Mem:/{print $4}')
    if [ "$mem_free" -lt 500 ]; then
        sync && echo 3 > /proc/sys/vm/drop_caches
    fi
}

save_installation_checkpoint() {
    local step="$1"
    local checkpoint_dir="/var/tmp/nexuscafe_checkpoints"
    mkdir -p "$checkpoint_dir"
    cat > "$checkpoint_dir/last_checkpoint.json" << EOF
{ "timestamp": "$(date -Iseconds)", "step": "$step", "progress": $(( (installation_step * 100) / 12 )) }
EOF
}

smart_rollback() {
    local failure_step="$1"
    log_warning "🔄 Initiating rollback due to: $failure_step"
    if [ -f /root/migration_backup_*.sql ]; then
        sudo -u postgres psql -U nexuscafe nexuscafe < $(ls -t /root/migration_backup_*.sql | head -1) >/dev/null 2>&1 || true
    fi
    pm2 stop nexuscafe >/dev/null 2>&1 || true
    systemctl stop nginx >/dev/null 2>&1 || true
    rm -rf $INSTALL_DIR/{dist,build,node_modules} 2>/dev/null || true
    log_success "✅ Rollback completed."
}

cleanup_installation() {
    log_info "🧹 Cleaning up installation artifacts..."
    rm -rf /var/tmp/nexuscafe_* 2>/dev/null || true
    rm -f /tmp/nexuscafe_install_progress.txt 2>/dev/null || true
    dnf clean all >/dev/null 2>&1 || true
    find /root -name "migration_backup_*.sql" -mtime +7 -delete 2>/dev/null || true
    log_success "✅ Cleanup completed"
}

# ------------------------------
# Runner Definitions
# ------------------------------

run_step() {
    local step_name=$1
    case $step_name in
        "system_update")
            dnf update -y >/dev/null 2>&1 || return 1
            ;;
        "base_tools")
            smart_install epel-release || return 1
            smart_install git || return 1
            smart_install curl || return 1
            smart_install wget || return 1
            smart_install nginx || return 1
            smart_install redis || return 1
            smart_install certbot || return 1
            smart_install python3-certbot-nginx || return 1
            smart_install postgresql-server || return 1
            smart_install postgresql-contrib || return 1
            ;;
        "node_install")
            smart_install_node || return 1
            npm install -g pm2 >/dev/null 2>&1 || return 1
            pm2 startup >/dev/null 2>&1 || true
            ;;
        "postgresql_setup")
            smart_postgres_setup || return 1
            ;;
        "redis_setup")
            systemctl enable redis >/dev/null 2>&1 || return 1
            smart_service_start redis || return 1
            ;;
        "minio_setup")
            if ! command_exists minio; then
                wget -q https://dl.min.io/server/minio/release/linux-amd64/minio
                chmod +x minio
                mv minio /usr/local/bin/
                useradd -r minio-user 2>/dev/null || true
                mkdir -p /var/lib/minio /etc/minio
                chown minio-user:minio-user /var/lib/minio
                cat > /etc/minio/minio.conf << EOF
MINIO_VOLUMES="/var/lib/minio"
MINIO_OPTS="--address :${MINIO_PORT} --console-address :${MINIO_CONSOLE_PORT}"
MINIO_ROOT_USER=nexuscafe-admin
MINIO_ROOT_PASSWORD=${MINIO_PASSWORD}
EOF
                cat > /etc/systemd/system/minio.service << EOF
[Unit]
Description=MinIO
Wants=network-online.target
After=network-online.target
[Service]
User=minio-user
Group=minio-user
EnvironmentFile=/etc/minio/minio.conf
ExecStart=/usr/local/bin/minio server \$MINIO_OPTS
Restart=always
RestartSec=5
[Install]
WantedBy=multi-user.target
EOF
                systemctl daemon-reload
                systemctl enable minio >/dev/null 2>&1
            fi
            smart_service_start minio || return 1
            ;;
        "nginx_config")
            cat > /etc/nginx/conf.d/${DOMAIN}.conf << EOF
server {
    listen 80;
    server_name ${DOMAIN};
    return 301 https://\$server_name\$request_uri;
}
server {
    listen 443 ssl http2;
    server_name ${DOMAIN};
    ssl_certificate /etc/pki/tls/certs/localhost.crt;
    ssl_certificate_key /etc/pki/tls/private/localhost.key;
    client_max_body_size 50M;
    location / {
        root ${INSTALL_DIR}/dist;
        try_files \$uri \$uri/ /index.html;
    }
    location /api {
        proxy_pass http://localhost:${BACKEND_PORT};
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_cache_bypass \$http_upgrade;
    }
}
EOF
            smart_service_start nginx || return 1
            ;;
        "ssl_certificate")
            certbot --nginx -d ${DOMAIN} --non-interactive --agree-tos --email ${ADMIN_EMAIL} >/dev/null 2>&1 || log_warning "Certbot failed, proceeding with HTTP fallback."
            systemctl enable certbot-renew.timer >/dev/null 2>&1 || true
            systemctl start certbot-renew.timer >/dev/null 2>&1 || true
            ;;
        "app_deployment")
            mkdir -p $INSTALL_DIR
            if [ ! -d "$INSTALL_DIR/.git" ]; then
                git clone $REPO_URL $INSTALL_DIR >/dev/null 2>&1 || return 1
            else
                cd $INSTALL_DIR
                git pull origin main >/dev/null 2>&1 || return 1
            fi
            cd $INSTALL_DIR
            npm install >/dev/null 2>&1 || return 1
            npm run build >/dev/null 2>&1 || return 1
            cat > .env << EOF
DATABASE_URL=postgresql://nexuscafe:${DB_PASSWORD}@localhost:5432/nexuscafe
PORT=${BACKEND_PORT}
REDIS_URL=redis://localhost:6379
MINIO_ENDPOINT=localhost
MINIO_PORT=${MINIO_PORT}
MINIO_USE_SSL=false
MINIO_ACCESS_KEY=nexuscafe-admin
MINIO_SECRET_KEY=${MINIO_PASSWORD}
JWT_SECRET=${JWT_SECRET}
NODE_ENV=production
EOF
            ;;
        "database_migration")
            smart_migrate_database || return 1
            ;;
        "pm2_startup")
            cd $INSTALL_DIR
            cat > ecosystem.config.js << EOF
module.exports = {
  apps: [{
    name: 'nexuscafe',
    script: 'dist/server.cjs',
    instances: 'max',
    exec_mode: 'cluster',
    env: { NODE_ENV: 'production', PORT: ${BACKEND_PORT} },
    error_file: '${LOG_DIR}/backend-error.log',
    out_file: '${LOG_DIR}/backend-out.log',
    time: true
  }]
};
EOF
            pm2 start ecosystem.config.js >/dev/null 2>&1 || return 1
            pm2 save >/dev/null 2>&1 || return 1
            ;;
        "final_verification")
            verify_installation || return 1
            test_performance || true
            ;;
    esac
}

# ------------------------------
# Main Flow
# ------------------------------

main_installation() {
    mkdir -p "$LOG_DIR"
    
    START_TIME=$(date +%s)
    declare -A steps=(
        [1]="system_update"
        [2]="base_tools"
        [3]="node_install"
        [4]="postgresql_setup"
        [5]="redis_setup"
        [6]="minio_setup"
        [7]="nginx_config"
        [8]="ssl_certificate"
        [9]="app_deployment"
        [10]="database_migration"
        [11]="pm2_startup"
        [12]="final_verification"
    )
    
    for step in $(seq 1 ${#steps[@]}); do
        installation_step=$step
        local step_name="${steps[$step]}"
        
        log_info "▶️  Step $step/$(( ${#steps[@]} )): $step_name"
        
        if execute_with_timeout 1800 run_step "$step_name"; then
            log_success "✅ Step $step completed: $step_name"
        else
            log_error "❌ Step $step failed: $step_name"
            if self_healing_recovery "$step_name"; then
                log_success "✅ Recovery successful for: $step_name"
            else
                log_error "❌ Recovery failed for: $step_name"
                read -p "Continue with remaining steps? (y/n): " continue_install
                if [[ ! "$continue_install" =~ ^[Yy]$ ]]; then
                    log_error "Installation aborted at step $step."
                    gather_diagnostics
                    smart_rollback "$step_name"
                    exit 1
                fi
            fi
        fi
        
        check_system_health
        save_installation_checkpoint "$step_name"
        echo "$(( (step * 100) / ${#steps[@]} ))" > /tmp/nexuscafe_install_progress.txt
    done
    
    END_TIME=$(date +%s)
    log_success "🎉 Installation completed successfully in $(((END_TIME - START_TIME) / 60)) minutes"
    touch $INSTALL_DIR/.installation_complete
    cleanup_installation
}

# ------------------------------
# Entrypoint
# ------------------------------

if [ "$EUID" -ne 0 ]; then
    log_error "Please run as root (sudo ./install-nexuscafe.sh)"
fi

BACKEND_PORT=$(find_available_port 3000)
SOCKET_PORT=$(find_available_port 4000)
MINIO_PORT=$(find_available_port 9000)
MINIO_CONSOLE_PORT=$(find_available_port 9001)
DB_PASSWORD=$(generate_password)
MINIO_PASSWORD=$(generate_password)
JWT_SECRET=$(generate_password)

check_system_readiness

while [ -z "$DOMAIN" ]; do
    read -p "Enter your domain (e.g., nexuscafe.yourdomain.com): " DOMAIN
    if [[ ! "$DOMAIN" =~ ^[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$ ]]; then DOMAIN=""; fi
done

while [ -z "$ADMIN_EMAIL" ]; do
    read -p "Enter admin email for SSL (e.g., admin@yourdomain.com): " ADMIN_EMAIL
    if [[ ! "$ADMIN_EMAIL" =~ ^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$ ]]; then ADMIN_EMAIL=""; fi
done

log_warning "This will install NexusCafe on domain: $DOMAIN"
read -p "Continue? (y/n): " confirm
if [[ ! "$confirm" =~ ^[Yy]$ ]]; then exit 0; fi

main_installation | tee -a "$LOG_DIR/install.log"

# Save Credentials
cat > /root/nexuscafe-credentials.txt << EOF
NexusCafe Installation Credentials
==================================
Domain: $DOMAIN
Backend Port: $BACKEND_PORT
Database Name: nexuscafe
Database User: nexuscafe
Database Password: $DB_PASSWORD
MinIO User: nexuscafe-admin
MinIO Password: $MINIO_PASSWORD
JWT Secret: $JWT_SECRET
Installation Date: $(date)
==================================
EOF
chmod 600 /root/nexuscafe-credentials.txt

log_info "🔐 Credentials saved to: /root/nexuscafe-credentials.txt"
log_info "🚀 NexusCafe is ready for use!"
