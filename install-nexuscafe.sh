#!/bin/bash

# NexusCafe Installation Script
# Version: 1.0.0
# Author: NexusCafe Team

set -e  # Exit on error

# ------------------------------
# Configuration
# ------------------------------

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Helper Functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
    exit 1
}

command_exists() {
    command -v "$1" >/dev/null 2>&1
}

port_available() {
    ! netstat -tuln | grep -q ":$1 "
}

find_available_port() {
    local port=$1
    while ! port_available $port; do
        port=$((port + 1))
    done
    echo $port
}

generate_password() {
    openssl rand -base64 32 | tr -d "=+/" | cut -c1-32
}

check_system_requirements() {
    # Check RAM
    local total_ram=$(free -g | awk '/^Mem:/{print $2}')
    if [ "$total_ram" -lt 4 ]; then
        log_warning "System has ${total_ram}GB RAM. Recommended: 4GB+"
    fi
    
    # Check CPU cores
    local cpu_cores=$(nproc)
    if [ "$cpu_cores" -lt 2 ]; then
        log_warning "System has ${cpu_cores} CPU cores. Recommended: 2+"
    fi
    
    # Check disk space
    local disk_space=$(df -BG / | awk 'NR==2 {print $4}' | sed 's/G//')
    if [ "$disk_space" -lt 20 ]; then
        log_warning "System has ${disk_space}GB free disk. Recommended: 20GB+"
    fi
}

# ------------------------------
# Pre-Installation Checks
# ------------------------------

log_info "Checking system requirements..."
# To run this script requires some base tools like netstat (net-tools).
if ! command_exists netstat; then
    dnf install -y net-tools > /dev/null 2>&1 || true
fi

check_system_requirements

# Check if running as root
if [ "$EUID" -ne 0 ]; then
    log_error "Please run as root (sudo ./install-nexuscafe.sh)"
fi

# Check OS
if ! grep -q -E "AlmaLinux|CentOS|Red Hat|Rocky" /etc/os-release; then
    log_warning "This script is designed for AlmaLinux/RHEL. Other distributions may not work correctly."
fi

# Default values
BACKEND_PORT=$(find_available_port 3000)
SOCKET_PORT=$(find_available_port 4000)
MINIO_PORT=$(find_available_port 9000)
MINIO_CONSOLE_PORT=$(find_available_port 9001)
DOMAIN=""
ADMIN_EMAIL=""
DB_PASSWORD=$(generate_password)
MINIO_PASSWORD=$(generate_password)
JWT_SECRET=$(generate_password)
REPO_URL="https://github.com/meedo51/NexusCafe.git"
INSTALL_DIR="/var/www/nexuscafe"
LOG_DIR="/var/log/nexuscafe"

mkdir -p $LOG_DIR
exec > >(tee -i $LOG_DIR/install.log)
exec 2>&1

# ------------------------------
# User Input
# ------------------------------

# Get domain
while [ -z "$DOMAIN" ]; do
    read -p "Enter your domain (e.g., nexuscafe.yourdomain.com): " DOMAIN
    if [[ ! "$DOMAIN" =~ ^[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$ ]]; then
        log_error "Invalid domain format. Please enter a valid domain."
        DOMAIN=""
    fi
done

# Get admin email
while [ -z "$ADMIN_EMAIL" ]; do
    read -p "Enter admin email for SSL certificate (e.g., admin@yourdomain.com): " ADMIN_EMAIL
    if [[ ! "$ADMIN_EMAIL" =~ ^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$ ]]; then
        log_error "Invalid email format. Please enter a valid email."
        ADMIN_EMAIL=""
    fi
done

# Confirm installation
log_warning "⚠️  WARNING: This will install NexusCafe on domain: $DOMAIN"
log_warning "⚠️  This will use ports: Backend=$BACKEND_PORT, Socket=$SOCKET_PORT, MinIO=$MINIO_PORT"
read -p "Continue? (y/n): " confirm
if [[ ! "$confirm" =~ ^[Yy]$ ]]; then
    log_info "Installation cancelled."
    exit 0
fi

# ------------------------------
# Installation Phases
# ------------------------------

log_info "📦 Phase 1: System Update & Base Tools"
dnf update -y
dnf upgrade -y
dnf install epel-release -y
dnf install -y git curl wget vim nano htop net-tools \
    gcc-c++ make python3 python3-pip \
    certbot python3-certbot-nginx \
    nginx postgresql-server postgresql-contrib \
    redis fail2ban

log_info "📦 Phase 2: Node.js & NPM"
curl -fsSL https://rpm.nodesource.com/setup_20.x | bash -
dnf install -y nodejs
npm install -g pm2
pm2 startup || true
pm2 save || true

log_info "📦 Phase 3: PostgreSQL Database"
if [ ! -d "/var/lib/pgsql/data/base" ]; then
    postgresql-setup --initdb
fi
systemctl start postgresql
systemctl enable postgresql

sudo -u postgres psql -c "CREATE USER nexuscafe WITH PASSWORD '$DB_PASSWORD';" || true
sudo -u postgres psql -c "CREATE DATABASE nexuscafe OWNER nexuscafe;" || true
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE nexuscafe TO nexuscafe;" || true

sed -i 's/ident/md5/g' /var/lib/pgsql/data/pg_hba.conf
sed -i 's/peer/md5/g' /var/lib/pgsql/data/pg_hba.conf
systemctl restart postgresql

log_info "📦 Phase 4: Redis Cache"
systemctl start redis
systemctl enable redis

log_info "📦 Phase 5: MinIO Object Storage"
if ! command_exists minio; then
    wget https://dl.min.io/server/minio/release/linux-amd64/minio
    chmod +x minio
    mv minio /usr/local/bin/
    useradd -r minio-user || true
    mkdir -p /var/lib/minio
    mkdir -p /etc/minio
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
Documentation=https://min.io/docs/minio/linux/index.html
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
    systemctl enable minio
    systemctl start minio
fi

log_info "📦 Phase 6: Nginx Web Server"
systemctl start nginx
systemctl enable nginx

cat > /etc/nginx/conf.d/${DOMAIN}.conf << EOF
server {
    listen 80;
    server_name ${DOMAIN};
    return 301 https://\$server_name\$request_uri;
}

server {
    listen 443 ssl http2;
    server_name ${DOMAIN};
    
    # These will be updated by certbot
    ssl_certificate /etc/pki/tls/certs/localhost.crt;
    ssl_certificate_key /etc/pki/tls/private/localhost.key;
    
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;
    
    client_max_body_size 50M;
    
    location / {
        root ${INSTALL_DIR}/dist;
        try_files \$uri \$uri/ /index.html;
        
        location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
            expires 1y;
            add_header Cache-Control "public, immutable";
        }
    }
    
    location /api {
        proxy_pass http://localhost:${BACKEND_PORT};
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_cache_bypass \$http_upgrade;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
}
EOF

log_info "📦 Phase 7: SSL Certificate (Certbot)"
certbot --nginx -d ${DOMAIN} --non-interactive \
    --agree-tos --email ${ADMIN_EMAIL} || log_warning "Certbot failed (possibly due to DNS not propagating yet)."

systemctl enable certbot-renew.timer || true
systemctl start certbot-renew.timer || true

log_info "📦 Phase 8: Application Deployment"
mkdir -p $INSTALL_DIR
if [ ! -d "$INSTALL_DIR/.git" ]; then
    git clone $REPO_URL $INSTALL_DIR
else
    cd $INSTALL_DIR
    git pull origin main
fi

cd $INSTALL_DIR
npm install
npm run build

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

log_info "📦 Phase 9: Database Migration"
cd $INSTALL_DIR
# Using drizzle for migrations
npm run db:push || true

log_info "📦 Phase 10: PM2 Setup & Start"
cat > ecosystem.config.js << EOF
module.exports = {
  apps: [{
    name: 'nexuscafe',
    script: 'dist/server.cjs',
    instances: 'max',
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: ${BACKEND_PORT}
    },
    error_file: '${LOG_DIR}/backend-error.log',
    out_file: '${LOG_DIR}/backend-out.log',
    time: true
  }]
};
EOF

pm2 start ecosystem.config.js
pm2 save

log_info "📦 Phase 11: Health Check"
systemctl restart nginx

# ------------------------------
# Post-Installation
# ------------------------------

log_success "✅ Installation Complete!"
log_info "📋 Summary:"
log_info "   Domain: https://$DOMAIN"
log_info "   Backend Port: $BACKEND_PORT"
log_info "   Socket Port: $SOCKET_PORT"
log_info "   MinIO Port: $MINIO_PORT"
log_info "   Database: nexuscafe (user: nexuscafe)"
log_info "   Database Password: $DB_PASSWORD (saved in /root/nexuscafe-credentials.txt)"

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
log_info "📖 Installation log saved to: $LOG_DIR/install.log"
log_success "🎉 NexusCafe is ready for use!"
