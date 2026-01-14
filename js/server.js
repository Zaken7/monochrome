import express from 'express';
import { createWriteStream, mkdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { pipeline } from 'stream/promises';

const __dirname = dirname(fileURLToPath(import.meta.url));
const APP_ROOT = join(__dirname, '..');

const app = express();
const PORT = process.env.PORT || 3000;
const MUSIC_DIR = process.env.MUSIC_DIR || join(APP_ROOT, 'data', 'music');
const NODE_ENV = process.env.NODE_ENV || 'development';
const IS_PRODUCTION = NODE_ENV === 'production';

// Ensure music directory exists
if (!existsSync(MUSIC_DIR)) {
    try {
        mkdirSync(MUSIC_DIR, { recursive: true });
    } catch (error) {
        console.error(`Warning: Could not create music directory at ${MUSIC_DIR}:`, error.message);
        console.error('Server will continue but downloads will fail unless directory is created manually.');
    }
}

// Security and performance middleware
app.disable('x-powered-by');
app.use(express.json({ limit: '50mb' }));

// CORS headers for API endpoints
app.use((req, res, next) => {
    if (req.path.startsWith('/api/')) {
        res.header('Access-Control-Allow-Origin', '*');
        res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
        res.header('Access-Control-Allow-Headers', 'Content-Type');
        if (req.method === 'OPTIONS') {
            return res.sendStatus(200);
        }
    }
    next();
});

// Serve static files if dist exists
const distPath = join(APP_ROOT, 'dist');
if (existsSync(distPath)) {
    app.use(express.static(distPath, {
        maxAge: IS_PRODUCTION ? '1d' : 0,
        etag: true
    }));
}

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', musicDir: MUSIC_DIR });
});

// Server download config endpoint
app.get('/api/config', (req, res) => {
    const serverDownloadEnabled = process.env.SERVER_DOWNLOAD === 'ENABLED';
    res.json({ 
        serverDownload: serverDownloadEnabled ? 'enabled' : 'disabled',
        musicDir: MUSIC_DIR 
    });
});

// Download single track endpoint
app.post('/api/download/track', async (req, res) => {
    try {
        const { url, filename, folder } = req.body;

        if (!url || !filename) {
            return res.status(400).json({ error: 'Missing url or filename' });
        }

        // Create folder structure if specified
        const targetDir = folder ? join(MUSIC_DIR, folder) : MUSIC_DIR;
        if (!existsSync(targetDir)) {
            mkdirSync(targetDir, { recursive: true });
        }

        const filePath = join(targetDir, filename);

        // Fetch the audio stream from the URL
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`Failed to fetch audio: ${response.status}`);
        }

        // Stream the audio to file
        const fileStream = createWriteStream(filePath);
        await pipeline(response.body, fileStream);

        res.json({ 
            success: true, 
            path: filePath.replace(MUSIC_DIR, ''),
            message: 'Track downloaded successfully' 
        });

    } catch (error) {
        console.error('[ERROR] Track download failed:', error.message);
        if (!IS_PRODUCTION) console.error(error.stack);
        res.status(500).json({ error: 'Failed to download track' });
    }
});

// Download blob data (for metadata-embedded files)
app.post('/api/download/blob', async (req, res) => {
    try {
        const { blob, filename, folder } = req.body;

        if (!blob || !filename) {
            return res.status(400).json({ error: 'Missing blob data or filename' });
        }

        // Create folder structure if specified
        const targetDir = folder ? join(MUSIC_DIR, folder) : MUSIC_DIR;
        if (!existsSync(targetDir)) {
            mkdirSync(targetDir, { recursive: true });
        }

        const filePath = join(targetDir, filename);

        // Convert base64 blob to buffer
        const base64Data = blob.split(',')[1] || blob;
        const buffer = Buffer.from(base64Data, 'base64');

        // Write buffer to file
        const fileStream = createWriteStream(filePath);
        fileStream.write(buffer);
        fileStream.end();

        await new Promise((resolve, reject) => {
            fileStream.on('finish', resolve);
            fileStream.on('error', reject);
        });

        res.json({ 
            success: true, 
            path: filePath.replace(MUSIC_DIR, ''),
            message: 'File saved successfully' 
        });

    } catch (error) {
        console.error('[ERROR] Blob save failed:', error.message);
        if (!IS_PRODUCTION) console.error(error.stack);
        res.status(500).json({ error: 'Failed to save file' });
    }
});

// Download lyrics file
app.post('/api/download/lyrics', async (req, res) => {
    try {
        const { content, filename, folder } = req.body;

        if (content === undefined || !filename) {
            return res.status(400).json({ error: 'Missing content or filename' });
        }

        const targetDir = folder ? join(MUSIC_DIR, folder) : MUSIC_DIR;
        if (!existsSync(targetDir)) {
            mkdirSync(targetDir, { recursive: true });
        }

        const filePath = join(targetDir, filename);
        const fileStream = createWriteStream(filePath);
        fileStream.write(content);
        fileStream.end();

        await new Promise((resolve, reject) => {
            fileStream.on('finish', resolve);
            fileStream.on('error', reject);
        });

        res.json({ 
            success: true, 
            path: filePath.replace(MUSIC_DIR, ''),
            message: 'Lyrics saved successfully' 
        });

    } catch (error) {
        console.error('[ERROR] Lyrics save failed:', error.message);
        if (!IS_PRODUCTION) console.error(error.stack);
        res.status(500).json({ error: 'Failed to save lyrics' });
    }
});

// List downloaded files
app.get('/api/files', (req, res) => {
    try {
        // This is a basic implementation - you can enhance it to recursively list files
        res.json({ 
            musicDir: MUSIC_DIR,
            message: 'Files are stored in the music directory'
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Serve the SPA for all other routes (only if dist exists)
app.get('*', (req, res) => {
    const indexPath = join(APP_ROOT, 'dist', 'index.html');
    if (existsSync(indexPath)) {
        res.sendFile(indexPath);
    } else {
        res.status(404).json({ error: 'App not built yet. Run npm run build first.' });
    }
});

// Global error handler
app.use((err, req, res, next) => {
    console.error('[ERROR] Unhandled error:', err.message);
    if (!IS_PRODUCTION) console.error(err.stack);
    res.status(500).json({ error: 'Internal server error' });
});

// Start server
const server = app.listen(PORT, '0.0.0.0')
  .on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.error(`[ERROR] Port ${PORT} is already in use. Please free the port or use a different one.`);
      process.exit(1);
    } else {
      console.error('[ERROR] Server error:', err);
      process.exit(1);
    }
  })
  .on('listening', () => {
    const appVersion = process.env.APP_VERSION || '1.1.0';
    console.log(`[INFO] Monochrome server v${appVersion}`);
    console.log(`[INFO] Environment: ${NODE_ENV}`);
    console.log(`[INFO] Server running on port ${PORT}`);
    console.log(`[INFO] Music directory: ${MUSIC_DIR}`);
  });

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('[INFO] SIGTERM received, shutting down gracefully...');
    server.close(() => {
        console.log('[INFO] Server closed');
        process.exit(0);
    });
});

process.on('SIGINT', () => {
    console.log('[INFO] SIGINT received, shutting down gracefully...');
    server.close(() => {
        console.log('[INFO] Server closed');
        process.exit(0);
    });
});
