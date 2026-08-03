# NexusCafe VPS Deployment Guide

This repository contains automated deployment scripts to set up NexusCafe on an AlmaLinux VPS.

## Prerequisites

- AlmaLinux 9+ (or RHEL-based equivalent like CentOS/Rocky)
- Root or `sudo` access
- A domain name pointing to the VPS IP
- Open ports: 22 (SSH), 80 (HTTP), 443 (HTTPS)
- Minimum 4GB RAM (8GB+ recommended)

## Installation Instructions

1. **Download the Installation Script**
   SSH into your VPS and download the installation script:
   ```bash
   curl -O https://raw.githubusercontent.com/meedo51/NexusCafe/main/install-nexuscafe.sh
   ```

2. **Make it Executable**
   ```bash
   chmod +x install-nexuscafe.sh
   ```

3. **Run the Script**
   Run the script as root:
   ```bash
   sudo ./install-nexuscafe.sh
   ```

4. **Follow the Prompts**
   - Provide your domain name (e.g., `pos.yourdomain.com`).
   - Provide an admin email for Let's Encrypt SSL.
   - Confirm to proceed.

The script will automatically configure Node.js, PostgreSQL, Redis, MinIO, Nginx, and Certbot, and then deploy the application using PM2.

## Management Scripts

Included in this repository are additional scripts to manage your deployment:

- **Update:** Run `./update-nexuscafe.sh` to pull the latest changes, rebuild, and restart.
- **Backup:** Run `./backup-nexuscafe.sh` to backup the database, configs, and application files to `/var/backups/nexuscafe`.
- **Uninstall:** Run `./uninstall-nexuscafe.sh` to cleanly remove the application and its dependencies from the server.

## Troubleshooting

See `TROUBLESHOOTING.md` for common issues and resolutions.
