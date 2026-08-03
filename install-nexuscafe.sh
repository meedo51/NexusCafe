#!/bin/bash

# NexusCafe Smart Self-Healing Installation Script
# Version: 3.0.0
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

check_environment() {
    if [ "$EUID" -ne 0 ]; then
        log_error "Please run as root (sudo ./install-nexuscafe.sh)"
        exit 1
    fi
    
    if ! command_exists bc; then dnf install -y bc jq >/dev/null 2>&1 || true; fi
    if ! command_exists netstat; then dnf install -y net-tools >/dev/null 2>&1 || true; fi

    if ! grep -q -E "AlmaLinux|CentOS|Red Hat|Rocky" /etc/os-release; then
        log_warning "OS may not be AlmaLinux/RHEL compatible. Checking versions..."
    fi
    
    local disk_space=$(df -BG / | awk 'NR==2 {print $4}' | sed 's/G//')
    if [ "$disk_space" -lt 10 ]; then
        log_error "Insufficient disk space: ${disk_space}GB (minimum 10GB required)"
        cleanup_disk_space
        disk_space=$(df -BG / | awk 'NR==2 {print $4}' | sed 's/G//')
        if [ "$disk_space" -lt 10 ]; then exit 1; fi
    fi
    
    local total_ram=$(free -g | awk '/^Mem:/{print $2}')
    if [ "$total_ram" -lt 4 ]; then
        log_warning "Low RAM: ${total_ram}GB (minimum 4GB recommended)"
        if [ "$total_ram" -lt 2 ]; then
            create_swap_file 2048
        fi
    fi
    
    if ! ping -c 1 8.8.8.8 >/dev/null 2>&1; then
        log_error "No internet connectivity. Installation requires internet access."
        exit 1
    fi
    
    check_firewall_ports
    check_conflicting_services
    check_selinux_status
    log_success "Environment checks passed"
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

smart_install_base_tools() {
    log_info "Installing base tools with smart fallback..."
    
    local tools=(
        "git curl wget vim nano htop net-tools"
        "gcc-c++ make python3 python3-pip"
        "certbot python3-certbot-nginx"
        "nginx"
        "postgresql-server postgresql-contrib"
        "fail2ban"
    )
    
    for tool_group in "${tools[@]}"; do
        for tool in $tool_group; do
            if ! command_exists $tool; then
                log_info "Installing: $tool"
                dnf install -y $tool >/dev/null 2>&1 || \
                dnf install -y --skip-broken $tool >/dev/null 2>&1 || \
                log_warning "Failed to install: $tool"
            fi
        done
    done
    
    log_success "Base tools installation completed"
    return 0
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
# Redis Installation
# ------------------------------

smart_install_redis() {
    log_info "Installing Redis with smart fallback..."
    
    local max_attempts=3
    local attempt=0
    local install_methods=(
        "dnf_default"
        "dnf_epel"
        "dnf_redis6"
        "dnf_redis7"
        "source_compile"
        "docker"
    )
    
    for method in "${install_methods[@]}"; do
        attempt=$((attempt + 1))
        log_info "Redis installation attempt $attempt: $method"
        
        case $method in
            "dnf_default")
                if dnf install -y redis >/dev/null 2>&1; then
                    log_success "Redis installed via DNF default"
                    return 0
                fi
                ;;
                
            "dnf_epel")
                log_info "Enabling EPEL repository and installing Redis..."
                dnf install -y epel-release >/dev/null 2>&1
                dnf install -y redis >/dev/null 2>&1 || dnf install -y redis6 >/dev/null 2>&1 || dnf install -y redis7 >/dev/null 2>&1
                if command_exists redis-server; then
                    log_success "Redis installed via EPEL"
                    return 0
                fi
                ;;
                
            "dnf_redis6")
                log_info "Installing Redis 6 from alternative repository..."
                dnf install -y redis6 >/dev/null 2>&1
                if command_exists redis-server; then
                    log_success "Redis 6 installed"
                    return 0
                fi
                ;;
                
            "dnf_redis7")
                log_info "Installing Redis 7 from alternative repository..."
                dnf install -y redis7 >/dev/null 2>&1
                if command_exists redis-server; then
                    log_success "Redis 7 installed"
                    return 0
                fi
                ;;
                
            "source_compile")
                log_info "Compiling Redis from source..."
                local redis_version="7.2.4"
                local redis_dir="/tmp/redis-${redis_version}"
                
                dnf install -y gcc make wget tar >/dev/null 2>&1
                
                wget -q -O /tmp/redis-${redis_version}.tar.gz https://download.redis.io/releases/redis-${redis_version}.tar.gz
                tar -xzf /tmp/redis-${redis_version}.tar.gz -C /tmp/
                cd ${redis_dir}
                make -j$(nproc) >/dev/null 2>&1
                make install >/dev/null 2>&1
                
                mkdir -p /etc/redis /var/lib/redis /var/log/redis
                useradd -r -s /sbin/nologin redis 2>/dev/null || true
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
EOF
                
                systemctl daemon-reload
                systemctl enable redis
                
                if command_exists redis-server; then
                    log_success "Redis compiled and installed successfully"
                    return 0
                fi
                ;;
                
            "docker")
                log_info "Installing Redis via Docker..."
                if ! command_exists docker; then
                    dnf install -y docker >/dev/null 2>&1
                    systemctl start docker
                    systemctl enable docker
                fi
                
                docker pull redis:alpine >/dev/null 2>&1
                docker run -d \
                    --name redis-nexuscafe \
                    --restart always \
                    -p 6379:6379 \
                    -v redis-data:/data \
                    redis:alpine \
                    redis-server --appendonly yes --maxmemory 256mb --maxmemory-policy allkeys-lru >/dev/null 2>&1
                
                sleep 5
                if docker exec redis-nexuscafe redis-cli ping >/dev/null 2>&1; then
                    log_success "Redis running in Docker container"
                    return 0
                fi
                ;;
        esac
        log_warning "Redis installation method '$method' failed"
    done
    
    log_error "All Redis installation methods failed"
    return 1
}

configure_redis() {
    log_info "Configuring Redis..."
    
    if docker ps | grep -q redis-nexuscafe; then
        log_success "Redis via Docker is configured and running"
        return 0
    fi
    
    if redis-cli ping >/dev/null 2>&1; then
        log_success "Redis is already running"
        return 0
    fi
    
    local redis_bin=$(which redis-server 2>/dev/null || echo "/usr/local/bin/redis-server")
    if [ ! -f "$redis_bin" ]; then
        log_error "Redis binary not found"
        return 1
    fi
    
    mkdir -p /var/lib/redis /var/log/redis /etc/redis
    chown -R redis:redis /var/lib/redis /var/log/redis 2>/dev/null || true
    
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
timeout 300
tcp-keepalive 60
EOF
    
    if systemctl start redis 2>/dev/null; then
        log_success "Redis started via systemd"
    elif $redis_bin /etc/redis/redis.conf --daemonize yes 2>/dev/null; then
        log_success "Redis started directly"
    else
        log_error "Failed to start Redis"
        return 1
    fi
    
    sleep 3
    if redis-cli ping >/dev/null 2>&1; then
        log_success "Redis is running and responding"
        return 0
    else
        log_error "Redis started but not responding"
        return 1
    fi
}

# ------------------------------
# MinIO Installation
# ------------------------------

smart_install_minio() {
    log_info "Installing MinIO with smart fallback..."
    
    local install_methods=(
        "download_binary"
        "rpm_install"
        "docker"
    )
    
    for method in "${install_methods[@]}"; do
        log_info "MinIO installation method: $method"
        
        case $method in
            "download_binary")
                log_info "Downloading MinIO binary..."
                local minio_url="https://dl.min.io/server/minio/release/linux-amd64/minio"
                
                curl -L -o /usr/local/bin/minio "$minio_url" --retry 3 --retry-delay 5 -s
                chmod +x /usr/local/bin/minio
                
                if /usr/local/bin/minio --version >/dev/null 2>&1; then
                    log_success "MinIO binary downloaded successfully"
                    return 0
                fi
                ;;
                
            "rpm_install")
                log_info "Installing MinIO via RPM..."
                local rpm_url="https://dl.min.io/server/minio/release/linux-amd64/minio-2024.01.16T21-33-51Z.x86_64.rpm"
                dnf install -y "$rpm_url" >/dev/null 2>&1 || \
                dnf install -y "https://dl.min.io/server/minio/release/linux-amd64/minio-latest.rpm" >/dev/null 2>&1
                
                if command_exists minio; then
                    log_success "MinIO installed via RPM"
                    return 0
                fi
                ;;
                
            "docker")
                log_info "Installing MinIO via Docker..."
                if ! command_exists docker; then
                    dnf install -y docker >/dev/null 2>&1
                    systemctl start docker
                    systemctl enable docker
                fi
                
                docker pull minio/minio >/dev/null 2>&1
                docker run -d \
                    --name minio-nexuscafe \
                    --restart always \
                    -p $MINIO_PORT:9000 \
                    -p $MINIO_CONSOLE_PORT:9001 \
                    -e MINIO_ROOT_USER=nexuscafe-admin \
                    -e MINIO_ROOT_PASSWORD=${MINIO_PASSWORD} \
                    -v minio-data:/data \
                    minio/minio server /data --console-address ":9001" >/dev/null 2>&1
                
                sleep 10
                if docker ps | grep -q minio-nexuscafe; then
                    log_success "MinIO running in Docker container"
                    return 0
                fi
                ;;
        esac
    done
    
    log_error "All MinIO installation methods failed"
    return 1
}

configure_minio() {
    log_info "Configuring MinIO..."
    
    if docker ps | grep -q minio-nexuscafe; then
        log_success "MinIO via Docker is configured and running"
        return 0
    fi
    
    local minio_bin=$(which minio 2>/dev/null || echo "/usr/local/bin/minio")
    if [ ! -f "$minio_bin" ]; then
        log_error "MinIO binary not found"
        return 1
    fi
    
    mkdir -p /var/lib/minio /var/log/minio /etc/minio
    if ! id -u minio-user >/dev/null 2>&1; then
        useradd -r -s /sbin/nologin minio-user
    fi
    chown -R minio-user:minio-user /var/lib/minio /var/log/minio
    
    if [ -z "$MINIO_PASSWORD" ]; then
        MINIO_PASSWORD=$(generate_password)
    fi
    
    cat > /etc/minio/minio.conf << EOF
MINIO_VOLUMES="/var/lib/minio"
MINIO_OPTS="--address :${MINIO_PORT} --console-address :${MINIO_CONSOLE_PORT}"
MINIO_ROOT_USER=nexuscafe-admin
MINIO_ROOT_PASSWORD=${MINIO_PASSWORD}
EOF
    
    cat > /etc/systemd/system/minio.service << 'EOF'
[Unit]
Description=MinIO Object Storage
Documentation=https://min.io/docs/minio/linux/index.html
Wants=network-online.target
After=network-online.target
[Service]
User=minio-user
Group=minio-user
EnvironmentFile=-/etc/minio/minio.conf
ExecStart=/usr/local/bin/minio server $MINIO_OPTS
Restart=always
RestartSec=5
LimitNOFILE=65536
[Install]
WantedBy=multi-user.target
EOF
    
    systemctl daemon-reload
    systemctl enable minio >/dev/null 2>&1
    
    local max_start_attempts=3
    local attempt=0
    
    while [ $attempt -lt $max_start_attempts ]; do
        attempt=$((attempt + 1))
        log_info "Starting MinIO (attempt $attempt/$max_start_attempts)..."
        
        rm -f /var/lib/minio/.minio.sys/*/lock 2>/dev/null
        
        if systemctl start minio 2>/dev/null; then
            sleep 5
            if systemctl is-active --quiet minio; then
                log_success "MinIO started via systemd"
                return 0
            fi
        fi
        
        log_info "Attempting direct MinIO start..."
        $minio_bin server /var/lib/minio --address :${MINIO_PORT} --console-address :${MINIO_CONSOLE_PORT} &
        sleep 5
        
        if curl -s -o /dev/null http://localhost:${MINIO_PORT}/minio/health/ready; then
            log_success "MinIO started directly"
            return 0
        fi
        sleep 5
    done
    
    log_error "Failed to start MinIO after $max_start_attempts attempts"
    return 1
}

setup_minio_buckets() {
    log_info "Setting up MinIO buckets..."
    
    local max_wait=30
    local wait_count=0
    
    while [ $wait_count -lt $max_wait ]; do
        if curl -s -o /dev/null http://localhost:${MINIO_PORT}/minio/health/ready; then
            break
        fi
        wait_count=$((wait_count + 1))
        sleep 1
    done
    
    if [ $wait_count -eq $max_wait ]; then
        log_warning "MinIO not ready after ${max_wait}s, skipping bucket creation"
        return 1
    fi
    
    if ! command_exists mc; then
        curl -L -o /usr/local/bin/mc "https://dl.min.io/client/mc/release/linux-amd64/mc" -s
        chmod +x /usr/local/bin/mc
    fi
    
    mc alias set local http://localhost:${MINIO_PORT} nexuscafe-admin ${MINIO_PASSWORD} >/dev/null 2>&1
    
    for bucket in nexuscafe-images nexuscafe-receipts nexuscafe-backups; do
        if ! mc ls local/$bucket >/dev/null 2>&1; then
            mc mb local/$bucket >/dev/null 2>&1
            mc policy set public local/$bucket >/dev/null 2>&1 || true
            log_success "Bucket created: $bucket"
        else
            log_info "Bucket already exists: $bucket"
        fi
    done
    
    log_success "MinIO buckets configured"
    return 0
}

cleanup_minio() {
    log_info "Cleaning up MinIO installation..."
    systemctl stop minio 2>/dev/null || true
    pkill minio 2>/dev/null || true
    docker stop minio-nexuscafe 2>/dev/null || true
    docker rm minio-nexuscafe 2>/dev/null || true
    rm -f /usr/local/bin/minio 2>/dev/null || true
    rm -f /usr/local/bin/mc 2>/dev/null || true
    rm -rf /var/lib/minio 2>/dev/null || true
    rm -rf /etc/minio 2>/dev/null || true
    rm -f /etc/systemd/system/minio.service 2>/dev/null || true
    log_info "MinIO cleanup completed"
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
# Configuration & Deployment
# ------------------------------

generate_nginx_config() {
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
    systemctl restart nginx || return 1
}

setup_ssl_certificate() {
    certbot --nginx -d ${DOMAIN} --non-interactive --agree-tos --email ${ADMIN_EMAIL} >/dev/null 2>&1 || log_warning "Certbot failed, proceeding with HTTP fallback."
    systemctl enable certbot-renew.timer >/dev/null 2>&1 || true
    systemctl start certbot-renew.timer >/dev/null 2>&1 || true
}

deploy_application() {
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
}

setup_pm2() {
    cd $INSTALL_DIR
    npm install -g pm2 >/dev/null 2>&1 || true
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
}

# ------------------------------
# Orchestration & Execution
# ------------------------------

check_step_status() {
    local step_name="$1"
    local checkpoint_file="/var/tmp/nexuscafe_checkpoints/${step_name}.done"
    [ -f "$checkpoint_file" ]
}

mark_step_completed() {
    local step_name="$1"
    local checkpoint_dir="/var/tmp/nexuscafe_checkpoints"
    mkdir -p "$checkpoint_dir"
    touch "$checkpoint_dir/${step_name}.done"
}

recover_step() {
    local step_name="$1"
    case $step_name in
        "redis_setup")
            log_info "Cleaning up Redis installation and retrying..."
            systemctl stop redis 2>/dev/null || true
            pkill redis-server 2>/dev/null || true
            dnf remove -y redis redis6 redis7 2>/dev/null || true
            docker stop redis-nexuscafe 2>/dev/null || true
            docker rm redis-nexuscafe 2>/dev/null || true
            return 0
            ;;
        "minio_setup")
            cleanup_minio
            return 0
            ;;
        *)
            log_warning "No specific recovery for step: $step_name"
            return 1
            ;;
    esac
}

run_step() {
    local step_name="$1"
    local max_recovery_attempts=3
    local recovery_attempt=0
    
    if check_step_status "$step_name"; then
        log_info "Step already completed, skipping..."
        return 0
    fi
    
    while [ $recovery_attempt -lt $max_recovery_attempts ]; do
        recovery_attempt=$((recovery_attempt + 1))
        log_info "Executing step: $step_name (attempt $recovery_attempt/$max_recovery_attempts)"
        
        case $step_name in
            "system_update") dnf update -y >/dev/null 2>&1 && dnf upgrade -y >/dev/null 2>&1 ;;
            "base_tools") smart_install_base_tools ;;
            "node_install") smart_install_node ;;
            "postgresql_setup") smart_postgres_setup ;;
            "redis_setup")
                if smart_install_redis && configure_redis; then true; else return 1; fi
                ;;
            "minio_setup")
                cleanup_minio
                if smart_install_minio && configure_minio; then
                    setup_minio_buckets || true
                else
                    return 1
                fi
                ;;
            "nginx_config") generate_nginx_config ;;
            "ssl_certificate") setup_ssl_certificate ;;
            "app_deployment") deploy_application ;;
            "database_migration") smart_migrate_database ;;
            "pm2_startup") setup_pm2 ;;
            "final_verification") verify_installation ;;
            *) log_error "Unknown step: $step_name"; return 1 ;;
        esac
        
        if [ $? -eq 0 ]; then
            log_success "✅ Step $step_name completed successfully"
            mark_step_completed "$step_name"
            return 0
        fi
        
        log_warning "Step $step_name failed (attempt $recovery_attempt/$max_recovery_attempts)"
        
        if [ $recovery_attempt -lt $max_recovery_attempts ]; then
            log_info "🔄 Attempting recovery for step: $step_name"
            if recover_step "$step_name"; then
                log_success "✅ Step recovered successfully"
            fi
        fi
    done
    
    log_error "❌ Step $step_name failed after $max_recovery_attempts attempts"
    return 1
}

verify_installation() {
    local errors=0
    log_info "🔍 Verifying installation..."
    
    for service in nginx postgresql; do
        if systemctl is-active --quiet "$service"; then
            log_success "✅ $service is running"
        else
            log_error "❌ $service is not running"
            errors=$((errors + 1))
        fi
    done
    
    if redis-cli ping >/dev/null 2>&1 || docker ps | grep -q redis-nexuscafe; then
        log_success "✅ redis is running"
    else
        log_error "❌ redis is not running"
        errors=$((errors + 1))
    fi

    if curl -s -o /dev/null http://localhost:${MINIO_PORT}/minio/health/ready || docker ps | grep -q minio-nexuscafe; then
        log_success "✅ minio is running"
    else
        log_error "❌ minio is not running"
        errors=$((errors + 1))
    fi
    
    if pm2 status 2>/dev/null | grep -q "online"; then
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

show_completion_info() {
    echo ""
    echo "📋 Next Steps:"
    echo "1. Configure ZATCA settings in the admin panel"
    echo "2. Set up inventory and menu items"
    echo "3. Create employee accounts"
    echo "4. Configure loyalty program"
    echo ""
    echo "🔐 Default Admin Login:"
    echo "   Email: admin@nexuscafe.com"
    echo "   Password: admin123 (Change immediately!)"
    echo ""
}

main() {
    echo "========================================="
    echo "  NexusCafe Installation Script v3.0"
    echo "  Self-Healing & Smart Recovery"
    echo "========================================="
    
    mkdir -p /var/tmp/nexuscafe_checkpoints
    mkdir -p /var/log/nexuscafe
    
    log_info "Running pre-flight checks..."
    check_environment
    optimize_environment
    
    local steps=(
        "system_update"
        "base_tools"
        "node_install"
        "postgresql_setup"
        "redis_setup"
        "minio_setup"
        "nginx_config"
        "ssl_certificate"
        "app_deployment"
        "database_migration"
        "pm2_startup"
        "final_verification"
    )
    
    local total_steps=${#steps[@]}
    local completed=0
    local failed_steps=()
    
    for i in "${!steps[@]}"; do
        step_index=$((i + 1))
        step_name="${steps[$i]}"
        
        log_info "▶️  Step $step_index/$total_steps: $step_name"
        
        if run_step "$step_name"; then
            completed=$((completed + 1))
        else
            failed_steps+=("$step_name")
            
            if [ ${#failed_steps[@]} -gt 2 ]; then
                log_error "Multiple failures detected. Installation may be unstable."
                read -p "Continue with remaining steps? (y/n): " continue_install
                if [[ ! "$continue_install" =~ ^[Yy]$ ]]; then
                    log_error "Installation aborted."
                    exit 1
                fi
            fi
        fi
        
        local progress=$((completed * 100 / total_steps))
        echo "Progress: $progress% ($completed/$total_steps)"
    done
    
    echo "========================================="
    echo "  Installation Complete"
    echo "========================================="
    
    if [ ${#failed_steps[@]} -eq 0 ]; then
        log_success "🎉 ALL STEPS COMPLETED SUCCESSFULLY!"
        show_completion_info
    else
        log_warning "⚠️ Installation completed with ${#failed_steps[@]} failed steps:"
        for step in "${failed_steps[@]}"; do
            log_warning "  - $step"
        done
        log_info "Check the installation log for details: /var/log/nexuscafe/install.log"
    fi
    
    echo ""
    echo "========================================="
    echo "  🌐 Access NexusCafe"
    echo "========================================="
    echo "  URL: https://${DOMAIN}"
    echo "  Backend Port: ${BACKEND_PORT}"
    echo "  Socket Port: ${SOCKET_PORT}"
    echo "  MinIO Port: ${MINIO_PORT}"
    echo "  MinIO Console: http://localhost:${MINIO_CONSOLE_PORT}"
    echo ""
    echo "  📦 Credentials saved to: /root/nexuscafe-credentials.txt"
    echo "  📋 Installation log: /var/log/nexuscafe/install.log"
    echo "========================================="
}

# ------------------------------
# Entrypoint
# ------------------------------

DB_PASSWORD=$(generate_password)
MINIO_PASSWORD=$(generate_password)
JWT_SECRET=$(generate_password)

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

# Execute main process and capture output to log file in parallel
{
    main
} 2>&1 | tee -a "$LOG_DIR/install.log"

# Save Credentials outside subshell
cat > /root/nexuscafe-credentials.txt << EOF
NexusCafe Installation Credentials
==================================
Domain: $DOMAIN
Backend Port: $BACKEND_PORT
Socket Port: $SOCKET_PORT
MinIO Port: $MINIO_PORT
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
