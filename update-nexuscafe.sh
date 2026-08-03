#!/bin/bash
# update-nexuscafe.sh

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }

log_info "🔄 Updating NexusCafe..."

INSTALL_DIR="/var/www/nexuscafe"

if [ ! -d "$INSTALL_DIR" ]; then
    echo "NexusCafe installation not found at $INSTALL_DIR"
    exit 1
fi

cd $INSTALL_DIR

# Pull latest code
git pull origin main

# Update dependencies & Build
npm install
npm run build

# Run migrations
npm run db:push || true

# Restart application
pm2 restart nexuscafe

log_success "✅ NexusCafe updated successfully"
