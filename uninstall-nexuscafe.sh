#!/bin/bash
# uninstall-nexuscafe.sh

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
log_warning() { echo -e "${YELLOW}[WARNING]${NC} $1"; }

log_info "⚠️  WARNING: This will completely remove NexusCafe"
read -p "Are you sure? (y/n): " confirm
if [[ ! "$confirm" =~ ^[Yy]$ ]]; then
    exit 0
fi

# Stop services
pm2 stop nexuscafe || true
pm2 delete nexuscafe || true
pm2 save || true
systemctl stop minio || true

# Remove files
rm -rf /var/www/nexuscafe
rm -rf /var/lib/minio
rm -rf /etc/minio
rm -f /usr/local/bin/minio

# Remove Nginx config
read -p "Enter your domain to remove nginx config (e.g., nexuscafe.yourdomain.com): " DOMAIN
if [ -n "$DOMAIN" ]; then
    rm -f /etc/nginx/conf.d/${DOMAIN}.conf
    # Remove SSL certificates
    certbot delete --cert-name $DOMAIN || true
fi

# Remove database
read -p "Remove PostgreSQL database? (y/n): " db_confirm
if [[ "$db_confirm" =~ ^[Yy]$ ]]; then
    sudo -u postgres psql -c "DROP DATABASE nexuscafe;" || true
    sudo -u postgres psql -c "DROP USER nexuscafe;" || true
fi

systemctl restart nginx || true

log_success "✅ NexusCafe uninstalled successfully"
