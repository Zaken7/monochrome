# Server Download Configuration

## Overview
Monochrome v1.1.0+ supports configurable server-side downloads via the `SERVER_DOWNLOAD` environment variable.

## Environment Variable

### `SERVER_DOWNLOAD`

**Values:**
- `ENABLED` - Downloads saved to server at `/app/data/music`
- Any other value or unset - Downloads go to browser (default behavior)

**Default:** `ENABLED` (in Docker)

## Configuration

### Docker Compose

**Enable Server Downloads (Default):**
```yaml
version: "3.8"

services:
  monochrome:
    image: zaken7/monochrome:latest
    container_name: monochrome
    restart: unless-stopped
    ports:
      - "8173:5173"
    volumes:
      - ./data/music:/app/data/music
    environment:
      - NODE_ENV=production
      - SERVER_DOWNLOAD=ENABLED  # Files saved to server
```

**Disable Server Downloads (Browser Mode):**
```yaml
environment:
  - NODE_ENV=production
  - SERVER_DOWNLOAD=DISABLED  # Files downloaded to browser
```

Or simply remove the variable:
```yaml
environment:
  - NODE_ENV=production
  # SERVER_DOWNLOAD not set = browser downloads
```

### Docker CLI

**With Server Downloads:**
```bash
docker run -d \
  -p 8173:5173 \
  -v ./data/music:/app/data/music \
  -e SERVER_DOWNLOAD=ENABLED \
  zaken7/monochrome:latest
```

**Without Server Downloads:**
```bash
docker run -d \
  -p 8173:5173 \
  -e SERVER_DOWNLOAD=DISABLED \
  zaken7/monochrome:latest
```

## Behavior

### When `SERVER_DOWNLOAD=ENABLED`

✅ **Downloads saved to server**
- Files: `/app/data/music/Artist - Album/Track.flac`
- No file picker prompts
- Organized folder structure
- All users share the same library
- Ideal for: Home servers, shared libraries, NAS setups

**File Organization:**
```
/app/data/music/
├── Pink Floyd - Dark Side of the Moon/
│   ├── cover.jpg
│   ├── 01 - Speak to Me.flac
│   ├── 01 - Speak to Me.lrc
│   └── ...
└── Queen - A Night at the Opera/
    ├── cover.jpg
    └── ...
```

### When `SERVER_DOWNLOAD=DISABLED` (or not set)

✅ **Downloads to browser**
- Files go to user's Downloads folder
- File picker shown for large downloads (≥20 tracks)
- Each user has their own downloads
- Ideal for: Personal use, multi-user systems

## Checking Current Configuration

### Via API

**Check Config Endpoint:**
```bash
curl http://localhost:8173/api/config
```

**Response:**
```json
{
  "serverDownload": "enabled",  // or "disabled"
  "musicDir": "/app/data/music"
}
```

### Via Browser Console

Open browser console and look for:
```
[Downloads] Server-side downloads: ENABLED
[Downloads] Files will be saved to server at /app/data/music
```

Or:
```
[Downloads] Server-side downloads: DISABLED
[Downloads] Files will be downloaded to browser
```

### Via JavaScript

```javascript
// Check if server downloads are enabled
fetch('/api/config')
  .then(r => r.json())
  .then(data => {
    console.log('Server downloads:', data.serverDownload);
  });
```

## Use Cases

### Home Server (Recommended: ENABLED)
```yaml
environment:
  - SERVER_DOWNLOAD=ENABLED
volumes:
  - /mnt/nas/music:/app/data/music
```
- Centralized music library
- All downloads go to NAS
- Access from any device

### Personal Desktop (Either Mode)
```yaml
environment:
  - SERVER_DOWNLOAD=DISABLED
```
- Downloads to local Downloads folder
- Traditional browser behavior
- No server storage needed

### Multi-User Environment
```yaml
# Option 1: Shared library (ENABLED)
environment:
  - SERVER_DOWNLOAD=ENABLED

# Option 2: Individual downloads (DISABLED)
environment:
  - SERVER_DOWNLOAD=DISABLED
```

## Troubleshooting

### Downloads Still Go to Browser

**Check 1: Verify environment variable**
```bash
docker exec monochrome env | grep SERVER_DOWNLOAD
```

**Check 2: Check API config**
```bash
curl http://localhost:8173/api/config
```

**Check 3: Check browser console**
Look for `[Downloads]` log messages

### File Picker Still Appears

If `SERVER_DOWNLOAD=ENABLED` but file picker shows:
1. Hard refresh browser (Ctrl+Shift+R)
2. Clear browser cache
3. Check browser console for errors
4. Verify `/api/config` returns `"serverDownload": "enabled"`

### Files Not Appearing in Volume

1. Check volume mount: `docker inspect monochrome`
2. Check permissions: `ls -la ./data/music`
3. Check container logs: `docker logs monochrome`

## Migration

### Switching from Browser to Server Downloads

1. Update docker-compose.yml:
   ```yaml
   environment:
     - SERVER_DOWNLOAD=ENABLED
   ```

2. Restart container:
   ```bash
   docker-compose down
   docker-compose up -d
   ```

3. Verify in browser console

### Switching from Server to Browser Downloads

1. Update docker-compose.yml:
   ```yaml
   environment:
     - SERVER_DOWNLOAD=DISABLED
   ```

2. Restart and verify

**Note:** Existing files on server remain untouched.

## API Reference

### GET /api/config

Returns server configuration including download mode.

**Response:**
```json
{
  "serverDownload": "enabled|disabled",
  "musicDir": "/app/data/music"
}
```

**Status Codes:**
- 200: Success
- 500: Server error

## Security Considerations

### ENABLED Mode
- Files stored on server filesystem
- All users share the same library
- Consider file permissions
- Monitor disk space

### DISABLED Mode
- Files stored on user's device
- No server storage impact
- Standard browser security applies

## Best Practices

1. **Use ENABLED for servers:** Centralized storage, easier backups
2. **Use DISABLED for personal use:** No server storage needed
3. **Monitor disk space:** Server downloads can consume significant space
4. **Regular backups:** Always backup `/app/data/music` volume
5. **Check logs:** Monitor for download failures

## Examples

### Example 1: Plex/Jellyfin Integration
```yaml
services:
  monochrome:
    environment:
      - SERVER_DOWNLOAD=ENABLED
    volumes:
      - /media/music:/app/data/music  # Share with Plex

  plex:
    volumes:
      - /media/music:/music:ro  # Read-only access
```

### Example 2: Backup Script
```bash
#!/bin/bash
# Backup music library
rsync -av ./data/music/ /backup/music/
```

### Example 3: Dynamic Configuration
```bash
# Enable for production, disable for dev
SERVER_DOWNLOAD=${PRODUCTION:-DISABLED}
```

## Version History

- **v1.1.0:** Added `SERVER_DOWNLOAD` configuration
- **v1.0.0:** Server downloads always auto-detected

## Support

For issues or questions:
- GitHub Issues
- Docker Hub: zaken7/monochrome
- Check `/api/config` endpoint for current settings
