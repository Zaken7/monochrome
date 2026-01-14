# Server-Side Downloads Feature

## Overview
Monochrome now supports server-side music downloads. When running in Docker or with the Node.js backend, downloaded music files are saved directly to the server's file system instead of being downloaded to the browser.

## How It Works

### Architecture
1. **Backend Server** (`server.js`): Express.js server that serves the app and handles download requests
2. **Download API** (`js/downloads-server.js`): Client-side module for communicating with the backend
3. **Modified Download Logic** (`js/downloads.js`): Automatically detects if server-side downloads are available and uses them

### API Endpoints

#### `GET /api/health`
Health check endpoint that confirms the server is running and shows the music directory path.

**Response:**
```json
{
  "status": "ok",
  "musicDir": "/music"
}
```

#### `POST /api/download/blob`
Save a blob (audio file with embedded metadata) to the server.

**Request:**
```json
{
  "blob": "base64-encoded-data",
  "filename": "Artist - Track.flac",
  "folder": "Artist Name/Album Name"
}
```

**Response:**
```json
{
  "success": true,
  "path": "/Artist Name/Album Name/Artist - Track.flac",
  "message": "File saved successfully"
}
```

#### `POST /api/download/lyrics`
Save lyrics file to the server.

**Request:**
```json
{
  "content": "[00:00.00] Lyrics content",
  "filename": "track.lrc",
  "folder": "Artist Name/Album Name"
}
```

#### `POST /api/download/track`
Download a track directly from URL to server (bypasses browser).

**Request:**
```json
{
  "url": "https://stream.tidal.com/...",
  "filename": "track.flac",
  "folder": "Artist Name"
}
```

## Configuration

### Environment Variables
- `PORT`: Server port (default: 3000, Docker uses 5173)
- `MUSIC_DIR`: Directory where music files are saved (default: `./music`, Docker uses `/music`)
- `NODE_ENV`: Environment (production/development/test)

### Docker Setup

The application automatically uses server-side downloads when running in Docker:

```bash
docker-compose up -d
```

Music files will be saved to `./music/` on the host machine, which is mounted to `/music` in the container.

## File Organization

Downloads are organized with the following structure:
```
/music/
├── Artist Name - Album Name/
│   ├── cover.jpg
│   ├── 01 - Track Name.flac
│   ├── 01 - Track Name.lrc
│   ├── 02 - Track Name.flac
│   └── ...
└── Playlist Name/
    ├── cover.jpg
    └── tracks...
```

The folder template can be customized in the app settings (default: `{albumTitle} - {albumArtist}`).

## Behavior

### Automatic Detection
When the app loads, it checks if the backend API is available:
```javascript
checkServerDownloadAvailable()
```

If available, all downloads automatically use the server-side API. Otherwise, it falls back to browser downloads.

### Download Types
All download types are supported:
- Single track downloads
- Album downloads
- Playlist downloads  
- Discography downloads
- Lyrics downloads

### Progress Tracking
Download progress notifications work the same way, showing:
- Current track being downloaded
- Progress percentage
- Success/failure status

## Testing

Unit tests are provided in `test/server.test.js`:

```bash
npm test
```

Tests cover:
- Health check endpoint
- Blob upload and file creation
- Folder structure creation
- Lyrics file saving
- Error handling (missing parameters, invalid URLs)
- Special characters and Unicode in filenames
- Path security

## Security Considerations

1. **Path Traversal Protection**: The server uses `path.join()` to safely combine paths
2. **File Size Limits**: JSON body size is limited to 50MB
3. **Music Directory Isolation**: Files can only be saved within the configured MUSIC_DIR
4. **No Public File Listing**: Files are not exposed via HTTP, only saved to disk

## Deployment

### Rebuild Docker Image
After making changes:

```bash
docker-compose down
docker-compose build
docker-compose up -d
```

### Push to Docker Hub
```bash
docker build -t zaken7/monochrome:latest .
docker push zaken7/monochrome:latest
```

## Troubleshooting

### Downloads Not Using Server
- Check browser console for "Server-side downloads enabled" message
- Verify `/api/health` endpoint is accessible
- Ensure CORS is not blocking requests

### Permission Errors
- Ensure the MUSIC_DIR has write permissions
- In Docker, the volume must be writable by the container user

### Files Not Appearing
- Check server logs for errors
- Verify MUSIC_DIR environment variable is set correctly
- Check disk space availability

## Future Enhancements

Potential improvements:
- Streaming large downloads instead of loading into memory
- Download queue management
- File deduplication
- Metadata editing API
- File browser/player interface
- Download history tracking
