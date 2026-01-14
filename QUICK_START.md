# Monochrome Quick Start Guide

## Prerequisites
- Docker and Docker Compose installed
- Port 8173 available

## Installation

### 1. Clone or Download
```bash
git clone <repository-url>
cd monochrome
```

Or download and extract the files.

### 2. Create Data Directory
```bash
mkdir -p data/music
```

### 3. Set Permissions
**Important:** The container runs as user 1001 for security. Set proper permissions:

```bash
# Linux/Mac - Set ownership to container user
sudo chown -R 1001:1001 data/music

# Make directory group-writable so you can manage files
sudo chmod -R 775 data/music
```

**To manage files without sudo (optional):**
```bash
# Add yourself to group 1001
sudo groupadd -g 1001 nodejs 2>/dev/null || true
sudo usermod -a -G 1001 $(whoami)

# Log out and log back in for group changes to take effect
# Then you can delete/manage files without sudo
```

**Windows (WSL2):**
```bash
mkdir -p data/music
# Permissions are usually handled automatically
```

### 4. Start Container
```bash
docker-compose up -d
```

### 5. Access Application
Open your browser to: **http://localhost:8173**

## Verify Setup

### Check Container Status
```bash
docker-compose ps
```

Should show:
```
NAME         STATUS    PORTS
monochrome   Up        0.0.0.0:8173->5173/tcp
```

### Check Configuration
```bash
curl http://localhost:8173/api/config
```

Should return:
```json
{
  "serverDownload": "enabled",
  "musicDir": "/app/data/music"
}
```

### Check Browser Console
1. Open http://localhost:8173
2. Open browser console (F12)
3. Look for:
```
[Downloads] Server-side downloads: ENABLED
[Downloads] Files will be saved to server at /app/data/music
```

## Test Download

1. Search for any artist/album
2. Click download on a track
3. **No file picker should appear**
4. Check that file appears in `./data/music/`

```bash
ls -la data/music/
```

## Troubleshooting

### Permission Errors
If you see `EACCES: permission denied` in logs:

```bash
# Check current permissions
ls -la data/

# Fix permissions
sudo chown -R 1001:1001 data/music

# Restart container
docker-compose restart
```

### File Picker Still Appears
1. Hard refresh browser: `Ctrl+Shift+R` (or `Cmd+Shift+R`)
2. Clear browser cache
3. Check `/api/config` returns `"serverDownload": "enabled"`

### Container Won't Start
```bash
# Check logs
docker logs monochrome

# Check if port is in use
sudo netstat -tlnp | grep 8173

# Restart
docker-compose down
docker-compose up -d
```

### Files Not Appearing
```bash
# Check volume mount
docker inspect monochrome | grep -A 5 Mounts

# Check container can write
docker exec monochrome touch /app/data/music/test.txt
docker exec monochrome rm /app/data/music/test.txt
```

## Configuration Options

### Disable Server Downloads
Edit `docker-compose.yml`:
```yaml
environment:
  - SERVER_DOWNLOAD=DISABLED
```

Then restart:
```bash
docker-compose restart
```

### Change Port
Edit `docker-compose.yml`:
```yaml
ports:
  - "8080:5173"  # Change 8173 to your preferred port
```

### Use Different Volume Path
Edit `docker-compose.yml`:
```yaml
volumes:
  - /path/to/your/music:/app/data/music
```

Remember to set permissions:
```bash
sudo chown -R 1001:1001 /path/to/your/music
```

## Updating

### Update to Latest Version
```bash
docker-compose pull
docker-compose up -d
```

### Check Version
```bash
docker logs monochrome | grep "Monochrome server"
```

Should show: `[INFO] Monochrome server v1.1.0`

## Default Settings

| Setting | Value |
|---------|-------|
| External Port | 8173 |
| Internal Port | 5173 |
| Music Directory | `./data/music` |
| Server Downloads | ENABLED |
| Container User | nodejs (1001:1001) |

## Backup

### Backup Music Library
```bash
# Simple copy
cp -r data/music /backup/location/

# Using rsync (preserves permissions)
rsync -av data/music/ /backup/music/

# Using tar
tar -czf music-backup-$(date +%Y%m%d).tar.gz data/music/
```

### Restore
```bash
# From backup
cp -r /backup/location/music data/

# Fix permissions
sudo chown -R 1001:1001 data/music

# Restart
docker-compose restart
```

## Uninstall

### Remove Container (Keep Data)
```bash
docker-compose down
```

### Remove Everything
```bash
docker-compose down -v
rm -rf data/
```

## Advanced Setup

### Behind Reverse Proxy (Nginx)
```nginx
location / {
    proxy_pass http://localhost:8173;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
}
```

### With Custom Domain
Update your DNS and reverse proxy configuration, then access via your domain.

### Integration with Plex/Jellyfin
Share the music volume:
```yaml
services:
  monochrome:
    volumes:
      - shared-music:/app/data/music

  plex:
    volumes:
      - shared-music:/music:ro

volumes:
  shared-music:
```

## Support

- **Documentation**: Check `SERVER_DOWNLOAD_CONFIG.md` for detailed configuration
- **Issues**: GitHub Issues
- **Docker Hub**: https://hub.docker.com/r/zaken7/monochrome

## Next Steps

1. ✅ Set up complete
2. Configure quality settings in app
3. Set up Last.fm integration (optional)
4. Configure Firebase sync (optional)
5. Enjoy your music library!
