import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';
import { spawn } from 'child_process';
import { mkdir, rm, readFile, access } from 'fs/promises';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const TEST_MUSIC_DIR = join(__dirname, '..', '..', 'test-music');
const TEST_PORT = 3001;
const API_BASE = `http://localhost:${TEST_PORT}`;

let serverProcess;

describe('Monochrome Server Tests', () => {
    before(async () => {
        // Create test music directory
        await mkdir(TEST_MUSIC_DIR, { recursive: true });
        
        // Start server for testing
        const serverPath = join(__dirname, '..', '..', 'js', 'server.js');
        serverProcess = spawn('node', [serverPath], {
            env: {
                ...process.env,
                PORT: TEST_PORT,
                MUSIC_DIR: TEST_MUSIC_DIR,
                NODE_ENV: 'test'
            },
            stdio: ['ignore', 'pipe', 'pipe']
        });

        // Log server output for debugging
        serverProcess.stdout.on('data', (data) => {
            console.log(`Server: ${data}`);
        });
        serverProcess.stderr.on('data', (data) => {
            console.error(`Server Error: ${data}`);
        });

        // Wait for server to start and test health endpoint
        let retries = 20;
        while (retries > 0) {
            try {
                await new Promise(resolve => setTimeout(resolve, 500));
                const response = await fetch(`${API_BASE}/api/health`);
                if (response.ok) {
                    console.log('Server started successfully');
                    break;
                }
            } catch (err) {
                retries--;
                if (retries === 0) {
                    throw new Error('Server failed to start within timeout');
                }
            }
        }
    });

    after(async () => {
        // Stop server
        if (serverProcess) {
            serverProcess.kill();
        }
        
        // Clean up test directory
        await rm(TEST_MUSIC_DIR, { recursive: true, force: true });
    });

    describe('Health Check', () => {
        it('should return status ok', async () => {
            const response = await fetch(`${API_BASE}/api/health`);
            const data = await response.json();
            
            assert.strictEqual(response.status, 200);
            assert.strictEqual(data.status, 'ok');
            assert.strictEqual(data.musicDir, TEST_MUSIC_DIR);
        });
    });

    describe('Blob Download Endpoint', () => {
        it('should save blob data to file', async () => {
            const testContent = 'test audio data';
            const base64Content = Buffer.from(testContent).toString('base64');
            const filename = 'test-track.mp3';

            const response = await fetch(`${API_BASE}/api/download/blob`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    blob: base64Content,
                    filename: filename,
                    folder: ''
                })
            });

            const data = await response.json();
            
            assert.strictEqual(response.status, 200);
            assert.strictEqual(data.success, true);
            
            // Verify file exists
            const filePath = join(TEST_MUSIC_DIR, filename);
            await access(filePath); // Throws if file doesn't exist
        });

        it('should create folder structure', async () => {
            const testContent = 'test audio data';
            const base64Content = Buffer.from(testContent).toString('base64');
            const folder = 'Artist Name/Album Name';
            const filename = 'track.mp3';

            const response = await fetch(`${API_BASE}/api/download/blob`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    blob: base64Content,
                    filename: filename,
                    folder: folder
                })
            });

            const data = await response.json();
            
            assert.strictEqual(response.status, 200);
            assert.strictEqual(data.success, true);
            
            // Verify file exists in folder structure
            const filePath = join(TEST_MUSIC_DIR, folder, filename);
            await access(filePath);
        });

        it('should reject request without blob', async () => {
            const response = await fetch(`${API_BASE}/api/download/blob`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    filename: 'test.mp3'
                })
            });

            assert.strictEqual(response.status, 400);
            const data = await response.json();
            assert.ok(data.error);
        });

        it('should reject request without filename', async () => {
            const response = await fetch(`${API_BASE}/api/download/blob`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    blob: 'dGVzdA=='
                })
            });

            assert.strictEqual(response.status, 400);
            const data = await response.json();
            assert.ok(data.error);
        });
    });

    describe('Lyrics Download Endpoint', () => {
        it('should save lyrics to file', async () => {
            const lyricsContent = '[00:00.00] Test lyrics\n[00:05.00] Line 2';
            const filename = 'test-lyrics.lrc';

            const response = await fetch(`${API_BASE}/api/download/lyrics`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    content: lyricsContent,
                    filename: filename,
                    folder: ''
                })
            });

            const data = await response.json();
            
            assert.strictEqual(response.status, 200);
            assert.strictEqual(data.success, true);
            
            // Verify file exists and content is correct
            const filePath = join(TEST_MUSIC_DIR, filename);
            const savedContent = await readFile(filePath, 'utf8');
            assert.strictEqual(savedContent, lyricsContent);
        });

        it('should save lyrics with folder structure', async () => {
            const lyricsContent = '[00:00.00] Test';
            const folder = 'Artist/Album';
            const filename = 'track.lrc';

            const response = await fetch(`${API_BASE}/api/download/lyrics`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    content: lyricsContent,
                    filename: filename,
                    folder: folder
                })
            });

            assert.strictEqual(response.status, 200);
            
            const filePath = join(TEST_MUSIC_DIR, folder, filename);
            await access(filePath);
        });

        it('should reject request without content', async () => {
            const response = await fetch(`${API_BASE}/api/download/lyrics`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    filename: 'test.lrc'
                })
            });

            assert.strictEqual(response.status, 400);
        });
    });

    describe('Track Download Endpoint', () => {
        it('should reject invalid URL', async () => {
            const response = await fetch(`${API_BASE}/api/download/track`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    url: 'http://invalid-url-that-does-not-exist.test/track.mp3',
                    filename: 'track.mp3',
                    folder: ''
                })
            });

            assert.strictEqual(response.status, 500);
            const data = await response.json();
            assert.ok(data.error);
        });

        it('should reject request without URL', async () => {
            const response = await fetch(`${API_BASE}/api/download/track`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    filename: 'track.mp3'
                })
            });

            assert.strictEqual(response.status, 400);
        });
    });

    describe('Path Security', () => {
        it('should handle special characters in filenames', async () => {
            const testContent = 'test';
            const base64Content = Buffer.from(testContent).toString('base64');
            const filename = 'track with spaces & symbols.mp3';

            const response = await fetch(`${API_BASE}/api/download/blob`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    blob: base64Content,
                    filename: filename,
                    folder: ''
                })
            });

            assert.strictEqual(response.status, 200);
        });

        it('should handle unicode characters in folder names', async () => {
            const testContent = 'test';
            const base64Content = Buffer.from(testContent).toString('base64');
            const folder = 'Artiste Français/Álbum Español';
            const filename = 'track.mp3';

            const response = await fetch(`${API_BASE}/api/download/blob`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    blob: base64Content,
                    filename: filename,
                    folder: folder
                })
            });

            assert.strictEqual(response.status, 200);
            
            const filePath = join(TEST_MUSIC_DIR, folder, filename);
            await access(filePath);
        });
    });

    describe('File Endpoint', () => {
        it('should return music directory info', async () => {
            const response = await fetch(`${API_BASE}/api/files`);
            const data = await response.json();
            
            assert.strictEqual(response.status, 200);
            assert.strictEqual(data.musicDir, TEST_MUSIC_DIR);
        });
    });
});
