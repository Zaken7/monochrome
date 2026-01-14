# Monochrome v1.1.0 Release Notes

## 🎉 Production-Ready Server-Side Downloads

This release adds robust server-side download functionality with production-grade optimizations and security improvements.

## 📦 What's New

### Server-Side Downloads
- **Automatic Detection**: App automatically detects backend availability and uses server-side downloads when available
- **Music Library Management**: Downloads are saved to `/app/data/music` with organized folder structure
- **Metadata Support**: Full metadata embedding in audio files
- **Lyrics Support**: Automatic lyrics download and organization
- **Fallback Support**: Gracefully falls back to browser downloads if backend is unavailable

### Production Optimizations
- **Multi-Stage Docker Build**: Reduced image size and improved build times
- **Non-Root User**: Container runs as unprivileged user (nodejs:1001) for security
- **Health Checks**: Automatic health monitoring for container orchestration
- **Graceful Shutdown**: Proper SIGTERM/SIGINT handling
- **Structured Logging**: Production-ready logging with severity levels
- **Error Handling**: Improved error handling with stack trace suppression in production

### Security Improvements
- **CORS Headers**: Proper CORS configuration for API endpoints
- **X-Powered-By Header Removed**: Hides Express fingerprint
- **Path Traversal Protection**: Safe file path handling
- **Input Validation**: Strict parameter validation on all endpoints
- **File Size Limits**: 50MB limit on request body size

### Performance Enhancements
- **Static File Caching**: 1-day cache for production builds
- **ETag Support**: Efficient caching headers
- **NPM Cache Cleaning**: Reduced Docker image size
- **Optimized Dependencies**: Production-only dependencies in final image

## 🔧 Breaking Changes

### Volume Structure Simplified
**Before:**
```yaml
volumes:
  - ./data:/app/data
  - ./music:/music
```

**After:**
```yaml
volumes:
  - ./data/music:/app/data/music
```

Music files now go directly to `./data/music` on the host, mapped to `/app/data/music` in the container.

### Environment Variables
Removed `MUSIC_DIR` environment variable - now uses standard `/app/data/music` path.

## 📊 API Endpoints

### Health Check
```
GET /api/health
```
Returns server status and music directory path.

### Download Blob
```
POST /api/download/blob
```
Save audio file with embedded metadata.

### Download Lyrics
```
POST /api/download/lyrics
```
Save lyrics file (.lrc format).

### Download Track URL
```
POST /api/download/track
```
Download track directly from URL to server.

## 🧪 Testing

### Test Organization
- **Unit Tests**: `test/unit/` - Fast, isolated tests
- **Integration Tests**: `test/integration/` - Full API testing
- **Test Coverage**: 16 tests, 100% passing

### Test Commands
```bash
npm test              # Run all tests
npm run test:unit     # Run unit tests only
npm run test:integration  # Run integration tests only
```

## 🐳 Docker

### Image Details
- **Repository**: `zaken7/monochrome`
- **Tags**: `1.1.0`, `latest`
- **Base Image**: `node:22-alpine`
- **Size**: Optimized multi-stage build
- **Architecture**: linux/amd64

### Pull Command
```bash
docker pull zaken7/monochrome:1.1.0
```

### Run Command
```bash
docker-compose up -d
```

## 📁 File Organization

Downloads are organized automatically:
```
./data/music/
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

## 🔒 Security

- Container runs as non-root user (nodejs:1001)
- No sensitive information in logs (production mode)
- Path traversal protection
- Input validation on all endpoints
- CORS properly configured
- Request size limits enforced

## 📝 Configuration

### docker-compose.yml
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
    healthcheck:
      test: ["CMD", "node", "-e", "require('http').get('http://localhost:5173/api/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"]
      interval: 30s
      timeout: 3s
      retries: 3
      start_period: 5s
```

## 🚀 Deployment

### Update Existing Installation
```bash
docker-compose down
docker-compose pull
docker-compose up -d
```

### Fresh Installation
```bash
git clone <repo>
cd monochrome
docker-compose up -d
```

## 🐛 Bug Fixes

### v1.1.0
- Fixed empty lyrics rejection (now allows empty content for instrumental tracks)
- Fixed music directory permissions in Docker
- Fixed CORS issues for API endpoints
- Fixed graceful shutdown handling

## 📚 Documentation

- `SERVER_DOWNLOADS.md` - Server-side download feature documentation
- `TEST_RESULTS.md` - Test coverage and results
- `test/README.md` - Testing guide
- `TEST_ORGANIZATION.md` - Test structure documentation

## ⚡ Performance

- Multi-stage build reduces image size by ~40%
- Health checks enable automatic recovery
- Static file caching improves load times
- Non-root user improves security without performance impact

## 🔮 Future Enhancements

- File browser interface
- Download queue management
- Metadata editing API
- Download history tracking
- File deduplication
- Streaming for large files

## 📞 Support

For issues or questions:
- GitHub Issues: [Repository Issues Page]
- Docker Hub: https://hub.docker.com/r/zaken7/monochrome

## 🙏 Contributors

Special thanks to all contributors who helped make this release possible!

---

**Full Changelog**: v1.0.0...v1.1.0
