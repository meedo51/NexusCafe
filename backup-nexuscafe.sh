#!/bin/bash
# backup-nexuscafe.sh

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }

BACKUP_DIR="/var/backups/nexuscafe"
DATE=$(date +%Y%m%d_%H%M%S)
mkdir -p $BACKUP_DIR

log_info "Creating backup at $BACKUP_DIR..."

# Backup database
sudo -u postgres pg_dump -U nexuscafe nexuscafe > $BACKUP_DIR/nexuscafe_$DATE.sql || log_info "Database backup failed or skipped."

# Backup application files
tar -czf $BACKUP_DIR/nexuscafe_files_$DATE.tar.gz /var/www/nexuscafe

# Backup Nginx config
cp /etc/nginx/conf.d/*.conf $BACKUP_DIR/ || true

# Backup environment variables
cp /var/www/nexuscafe/.env $BACKUP_DIR/env_$DATE.txt || true

log_success "✅ Backup completed: $BACKUP_DIR"
