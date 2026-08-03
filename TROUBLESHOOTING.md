# NexusCafe VPS Troubleshooting Guide

## 1. Nginx 502 Bad Gateway
**Symptom:** You can access the site, but get a 502 error.
**Cause:** The backend Node.js process is likely not running or crashed.
**Resolution:**
1. Check PM2 status: `pm2 status`
2. Check application logs: `pm2 logs nexuscafe`
3. Restart the app: `pm2 restart nexuscafe`

## 2. SSL Certificate Not Issuing
**Symptom:** Certbot fails during installation.
**Cause:** DNS hasn't propagated or port 80/443 is blocked.
**Resolution:**
1. Ensure your domain's A record points to your VPS IP.
2. Check firewall rules: `firewall-cmd --list-all`
3. If using a cloud provider (AWS, GCP, DigitalOcean), ensure their network firewall allows HTTP/HTTPS.
4. Rerun certbot manually: `certbot --nginx -d yourdomain.com`

## 3. Database Connection Failed
**Symptom:** App logs show `ECONNREFUSED` or authentication failure for PostgreSQL.
**Cause:** PostgreSQL isn't running or credentials in `.env` are mismatched.
**Resolution:**
1. Check Postgres status: `systemctl status postgresql`
2. Verify credentials in `/var/www/nexuscafe/.env` match `/root/nexuscafe-credentials.txt`.
3. Ensure the DB user has access: `sudo -u postgres psql -c "\du"`

## 4. MinIO Access Errors
**Symptom:** File uploads fail.
**Cause:** MinIO service is down or credentials mismatch.
**Resolution:**
1. Check MinIO status: `systemctl status minio`
2. View MinIO logs: `journalctl -u minio.service -f`
3. Verify `MINIO_ACCESS_KEY` and `MINIO_SECRET_KEY` in `.env`.

## 5. Updates Failing (Git Conflicts)
**Symptom:** `./update-nexuscafe.sh` fails to pull changes.
**Cause:** Local modifications in `/var/www/nexuscafe`.
**Resolution:**
1. Navigate to the dir: `cd /var/www/nexuscafe`
2. Stash or reset local changes: `git reset --hard HEAD && git pull origin main`
3. Re-run the update script.
